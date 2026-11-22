package local.animesama.host

import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.json.JSONObject
import org.junit.Test
import java.net.URI
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import kotlin.test.*

class CachePolicyTest {
    private fun config(key: String = "fixture-key") = HostConfig(JSONObject().put("episodeMetadataSource", "aiometadata")
        .put("inputMetadataAdapter", "xperience").put("xperienceManifestUrl", "https://xp.example/config/manifest.json"), key)
    private fun response(request: Request, text: String, code: Int = 200) = Response.Builder().request(request)
        .protocol(Protocol.HTTP_1_1).code(code).message("Fixture").header("Content-Type", "application/json")
        .body(text.toResponseBody("application/json".toMediaType())).build()
    @Test fun cacheIncludesKeyBytesAndPurgesUnvisitedExpiredEntriesLazily() {
        var now = 0L
        val cache = MetadataCache(20, 30, { now }, 2)
        cache.put("clé", "é", 10)
        assertEquals(6, cache.stats().bytes)
        cache.put("second", "v")
        now = 11
        assertEquals(1, cache.stats().entries)
        assertEquals("v", cache.get("second"))
        cache.put("x".repeat(21), "v")
        assertEquals(1, cache.stats().entries, "Oversized keys must count toward the budget")
        now = 30
        assertEquals(0, cache.stats().bytes)
        assertNull(cache.get("second"))
    }
    @Test fun verifiedIdentitySurvivesRawMetadataExpiryButNeverUsesStaleOrForeignKeyData() = runBlocking<Unit> {
        val clock = AtomicLong(); val calls = AtomicInteger(); var empty = false
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            calls.incrementAndGet()
            response(chain.request(), if(empty) "{\"tv_results\":[]}" else "{\"tv_results\":[{\"id\":46298}]}")
        }.build()
        val bridge = HttpBridge(cacheClock = { clock.get() }, client = client)
        val request = EpisodeRequest("tt2098220", "tv", 2, 72)
        try {
            assertEquals("46298", SeriesIdentity.resolve(request, config(), bridge).id)
            clock.set(31_000)
            SeriesIdentity.resolve(request.copy(episode = 73), config(), bridge)
            assertEquals(1, calls.get(), "Only verified series identity should survive the short HTTP cache")
            SeriesIdentity.resolve(request, config("other-fixture-key"), bridge)
            assertEquals(2, calls.get(), "Do not borrow another credential's cached response")
            clock.set(6 * 60 * 60 * 1000L)
            empty = true
            assertFailsWith<IdentityFailure> { SeriesIdentity.resolve(request, config(), bridge) }
            assertFailsWith<IdentityFailure> { SeriesIdentity.resolve(request, config(), bridge) }
            assertEquals(4, calls.get(), "Empty results must be retried, never promoted or negative-cached")
            empty = false
            assertEquals("46298", SeriesIdentity.resolve(request, config(), bridge).id)
            assertEquals(5, calls.get())
        } finally { bridge.close(); client.dispatcher.executorService.shutdownNow() }
    }
    @Test fun titleDetailsLiveLongerButEpisodeInventoriesAndSelectedPrivateMetadataStayFresh() = runBlocking<Unit> {
        val clock = AtomicLong(); val calls = mutableMapOf<String, Int>()
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            val path = chain.request().url.encodedPath
            synchronized(calls) { calls[path] = (calls[path] ?: 0) + 1 }
            val data = if(path.startsWith("/3/")) "{\"id\":46298}" else "{\"meta\":{\"id\":\"tt2098220\"}}"
            response(chain.request(), data)
        }.build()
        val bridge = HttpBridge(cacheClock = { clock.get() }, client = client)
        val urls = listOf("https://api.themoviedb.org/3/tv/46298", "https://api.themoviedb.org/3/tv/46298/season/1",
            "https://catalog.nuvio.tv/meta/series/tmdb:46298.json", "https://xp.example/config/meta/series/tt2098220.json")
        suspend fun fetch(url: String) = bridge.fetch(JSONObject().put("url", url).toString(), config())
        try {
            for(url in urls) fetch(url)
            clock.set(31_000)
            for(url in urls) fetch(url)
            assertEquals(1, calls["/3/tv/46298"])
            for(url in urls.drop(1)) assertEquals(2, calls[URI(url).path])
            clock.set(300_000); fetch(urls[0]); assertEquals(2, calls["/3/tv/46298"])
        } finally { bridge.close(); client.dispatcher.executorService.shutdownNow() }
    }
    @Test fun identityCacheHasASeparateSmallBound() {
        val bridge = HttpBridge()
        try {
            for(i in 1..129) bridge.rememberIdentity(EpisodeRequest("tt${10000+i}", "tv"), "fixture-key", i.toString())
            assertEquals(128, bridge.stats().identities.entries)
            assertTrue(bridge.stats().identities.bytes <= 64 * 1024)
            assertNull(bridge.verifiedIdentity(EpisodeRequest("tt10001", "tv"), "fixture-key"))
            assertEquals("129", bridge.verifiedIdentity(EpisodeRequest("tt10129", "tv"), "fixture-key"))
        } finally { bridge.close() }
    }
    @Test fun trimmingCachesDoesNotStopLookupsOrReplayMediaAndIdleDoesNoAutonomousWork() = runBlocking<Unit> {
        val clock = AtomicLong(); val calls = AtomicInteger()
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            calls.incrementAndGet()
            response(chain.request(), when(chain.request().url.host) {
                "api.themoviedb.org" -> "{\"tv_results\":[{\"id\":46298}]}"
                "catalog.nuvio.tv" -> "{\"meta\":{\"id\":\"tt2098220\"}}"
                else -> "{\"media\":true}"
            })
        }.build()
        val bridge = HttpBridge(cacheClock = { clock.get() }, client = client)
        val engine = Engine("""
            async function getStreams(id){await fetch('https://catalog.nuvio.tv/meta/series/tmdb:'+id+'.json');
              await fetch('https://cdn.example/master.m3u8?token=fresh');
              return [{url:'https://cdn.example/master.m3u8?token=fresh',name:'1080p',size:'Anime-Sama'}];}
        """.trimIndent(), bridge)
        try {
            assertEquals(0, calls.get(), "Starting a host must not start discovery/preloading")
            val request = EpisodeRequest("tt2098220", "tv")
            val first = engine.streams(request, config()); assertEquals(3, calls.get())
            assertEquals(first, engine.streams(request, config())); assertEquals(4, calls.get(), "Only media should be fetched again")
            assertEquals(0, engine.stats().active); assertEquals(0, engine.stats().queued)
            engine.trimMemory()
            assertEquals(0, engine.stats().cache.metadata.bytes); assertEquals(0, engine.stats().cache.identities.bytes)
            assertEquals(first, engine.streams(request, config())); assertEquals(7, calls.get())
            clock.set(7 * 60 * 60 * 1000L); delay(100)
            assertEquals(7, calls.get(), "Expired data must not start polling or preloading")
        } finally { engine.close(); client.dispatcher.executorService.shutdownNow() }
    }
    @Test fun httpWorkersExpireAndANewRequestStillWorks() = runBlocking<Unit> {
        val server = AddonServer(Engine("async function getStreams(){return []}"), HostConfig(JSONObject().put("episodeMetadataSource", "native")), "a".repeat(32), port = 0, workerIdleMs = 40)
        val port = server.start()
        fun manifest() = URI("http://127.0.0.1:$port/${"a".repeat(32)}/manifest.json").toURL().readText()
        try {
            assertEquals(0, server.workerThreads)
            assertTrue(manifest().contains("Anime-Sama Local"))
            withTimeout(2_000) { while(server.workerThreads != 0) delay(10) }
            assertTrue(server.running)
            assertTrue(manifest().contains("Anime-Sama Local"))
        } finally { server.close() }
    }
    @Test fun idleSnapshotsCannotObserveACountedRequestBeforeItsRegistration() = runBlocking<Unit> {
        val entered = java.util.concurrent.CountDownLatch(1)
        val proceed = java.util.concurrent.CountDownLatch(1)
        val settings = object : JSONObject() {
            override fun toString(): String { entered.countDown(); check(proceed.await(3, java.util.concurrent.TimeUnit.SECONDS)); return super.toString() }
        }.put("episodeMetadataSource", "native")
        val engine = Engine("async function getStreams(){return []}")
        try {
            val pending = async(Dispatchers.Default) { engine.streams(EpisodeRequest("46298", "tv"), HostConfig(settings)) }
            assertTrue(withContext(Dispatchers.IO) { entered.await(2, java.util.concurrent.TimeUnit.SECONDS) })
            val before = engine.stats()
            assertEquals(0L, before.requests, "A request in preparation must be counted atomically with registration")
            assertEquals(0, before.active); assertEquals(0, before.queued)
            proceed.countDown(); pending.await()
            assertEquals(1L, engine.stats().requests, "An intervening lookup must invalidate the earlier idle snapshot")
        } finally { proceed.countDown(); engine.close() }
    }

}
