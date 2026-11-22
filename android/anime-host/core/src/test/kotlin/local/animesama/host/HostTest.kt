package local.animesama.host

import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Test
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicInteger
import kotlin.test.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody

class HostTest {
    private fun nativeConfig() = HostConfig(JSONObject().put("episodeMetadataSource", "native"))
    @Test fun parsesExactInputCoordinatesWithoutGuessing() {
        assertEquals(EpisodeRequest("tt2098220", "tv", 2, 72), EpisodeRequest.parse("series", "tt2098220:2:72"))
        assertEquals(EpisodeRequest("tmdb:46298", "tv", 1, 1), EpisodeRequest.parse("series", "tmdb:46298:1:1"))
        assertNull(EpisodeRequest.parse("series", "tt2098220"))
        assertNull(EpisodeRequest.parse("series", "tt2098220:0:1"))
        assertNull(EpisodeRequest.parse("series", "tt2098220:2:72:extra"))
        assertNull(EpisodeRequest.parse("series", "mal:11061:1:1"))
        assertNull(EpisodeRequest.parse("movie", "https://example.org"))
    }
    @Test fun preservesSignedMasterHeadersAndCaptions() {
        val url = "https://media.example/master?token=a%2Bb&x=1&x=2"
        val input = JSONArray().put(JSONObject().put("name", "\ufe001080p · VF").put("size", "Anime-Sama · ANSEmbed\nTVDB S2E72 → E130")
            .put("url", url).put("headers", JSONObject().put("Referer", "https://player.example/"))
            .put("subtitles", JSONArray().put(JSONObject().put("id", "fr").put("lang", "fra").put("url", "https://media.example/fr.vtt"))))
        val row = addonStreams(input).getJSONObject(0)
        assertEquals(url, row.getString("url"))
        assertEquals("1080p · VF", row.getString("name"))
        assertEquals("https://player.example/", row.getJSONObject("behaviorHints").getJSONObject("proxyHeaders").getJSONObject("request").getString("Referer"))
        assertEquals("fra", row.getJSONArray("subtitles").getJSONObject(0).getString("lang"))
        assertTrue(row.getString("title").contains("E130"))
    }
    @Test fun metadataCacheExpiresAndEvictsByBytes() {
        var now = 0L
        val cache = MetadataCache(18, 30, clock = { now })
        cache.put("one", "1234"); cache.put("two", "5678")
        assertEquals("1234", cache.get("one"))
        cache.put("three", "9012"); assertNull(cache.get("two"))
        now = 30; assertNull(cache.get("one")); assertNull(cache.get("three"))
        cache.put("oversized", "12345678901234567890"); assertNull(cache.get("oversized"))
    }
    @Test fun selectedManifestMustExistAndNoImplicitFallback() {
        assertFails { HostConfig(JSONObject().put("inputMetadataAdapter", "xperience").put("aiometadataSavedManifestUrl", "https://aio.example/config/manifest.json")) }
        assertFails { HostConfig(JSONObject().put("aiometadataSavedManifestUrl", "http://aio.example/config/manifest.json")) }
        HostConfig(JSONObject().put("aiometadataSavedManifestUrl", "https://aio.example/config/manifest.json"))
    }
    @Test fun actualQuickJsRunsAsyncBinaryBindingsAndFreshRequests() = runBlocking<Unit> {
        // Runtime behavior and concurrent callers, not a mock of the JS interpreter.
        val engine = Engine("""
            async function getStreams(id,type,s,e){
              var checks=await Promise.all([Promise.resolve(atob('YQ==')),Promise.resolve(btoa('a'))]);
              if(checks[0]!=='a'||checks[1]!=='YQ==')throw Error('binary');
              return [{url:'https://media.example/master?e='+e,name:'1080p',size:'Anime-Sama'}];
            }
        """.trimIndent())
        try {
            val request = EpisodeRequest("46298", "tv", 1, 1)
            val first = engine.streams(request, nativeConfig())
            assertEquals(1, JSONObject(first).getJSONArray("streams").length())
            val next = engine.streams(request.copy(episode = 2), nativeConfig())
            assertTrue(next.contains("e=2"))
        } finally { engine.close() }
    }
    @Test fun serverRequiresTokenAndNeverExposesConfiguration() {
        val engine = Engine("async function getStreams(){return []}")
        val token = "a".repeat(32)
        val server = AddonServer(engine, nativeConfig(), token, port = 0)
        val port = server.start()
        fun get(path: String, method: String = "GET"): Pair<Int, String> {
            val connection = java.net.URI("http://127.0.0.1:$port/$path").toURL().openConnection() as HttpURLConnection
            connection.requestMethod = method
            return try {
                val code = connection.responseCode
                assertEquals("no-store", connection.getHeaderField("Cache-Control"))
                code to (if(code >= 400) connection.errorStream else connection.inputStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            } finally { connection.disconnect() }
        }
        try {
            val conflicting = AddonServer(Engine("async function getStreams(){return []}"), nativeConfig(), token, port = port)
            try { assertFailsWith<java.net.BindException> { conflicting.start() } } finally { conflicting.close() }
            assertEquals(404, get("manifest.json").first)
            assertEquals(404, get("$token/config").first)
            val manifest = get("$token/manifest.json")
            assertEquals(200, manifest.first); assertFalse(manifest.second.contains("tmdbKey"))
            assertEquals("stream", JSONObject(manifest.second).getJSONArray("resources").getJSONObject(0).getString("name"))
            assertEquals("", get("$token/manifest.json", "HEAD").second)
            assertEquals(404, get("$token/stream/series/tt2098220:0:1.json").first)
            assertEquals(200, get("$token/stream/series/tt2098220%3A1%3A1.json").first)
            assertEquals(405, get("$token/manifest.json", "POST").first)
        } finally { server.close() }
        assertFalse(server.running)
    }
    @Test fun fullPublishedEngineUsesParallelHostsAndFreshMediaEveryLookup() = runBlocking<Unit> {
        val active = AtomicInteger(); val peak = AtomicInteger(); val mediaCalls = AtomicInteger()
        val client = okhttp3.OkHttpClient.Builder().addInterceptor { chain ->
            val request = chain.request(); val url = request.url
            val count = active.incrementAndGet(); peak.updateAndGet { maxOf(it, count) }
            try {
                Thread.sleep(25)
                val body = when {
                    url.host == "anime.example" && url.encodedPath.endsWith("episodes.js") ->
                        "var eps1=['https://ansembed.net/embed.html'];var eps2=['https://smoothpre.com/embed.html'];var eps3=['https://uqload.to/embed.html'];"
                    url.host == "cdn.example" -> {
                        mediaCalls.incrementAndGet()
                        if (url.encodedPath.endsWith("master.m3u8")) "#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1280x720,BANDWIDTH=1000000\nvideo.m3u8"
                        else "#EXTM3U\n#EXTINF:10,\nsegment.ts"
                    }
                    else -> "<script>sources:[{file:'https://cdn.example/${url.host}/master.m3u8?sig=keep%2F&x=2'}];</script>"
                }
                okhttp3.Response.Builder().request(request).protocol(okhttp3.Protocol.HTTP_1_1).code(200).message("OK")
                    .body(body.toResponseBody("text/html".toMediaType())).build()
            } finally { active.decrementAndGet() }
        }.build()
        val config = HostConfig(JSONObject().put("episodeMetadataSource", "native").put("animeSamaBaseUrl", "https://anime.example")
            .put("sourceMap", """{"tv:95479":{"seasons":{"1":{"path":"/catalogue/example/saison1/","languages":["vostfr","vf"]}}}}"""))
        val bundle = java.io.File("../../../plugins/anime-sama/providers/anime-sama.js").readText()
        val engine = Engine(bundle, HttpBridge(client = client))
        try {
            val request = EpisodeRequest("95479", "tv", 1, 1)
            val parallelStarted = System.nanoTime()
            val first = coroutineScope {
                val a = async { engine.streams(request, config) }; val b = async { engine.streams(request, config) }
                assertEquals(a.await(), b.await()); a.await()
            }
            val parallelMs = (System.nanoTime() - parallelStarted) / 1_000_000
            val streams = JSONObject(first).getJSONArray("streams")
            assertEquals(6, streams.length(), engine.lastSummary)
            assertTrue(peak.get() >= 3, "Expected actual overlapping asynchronous HTTP bindings")
            val before = mediaCalls.get()
            assertEquals(6, before, "Concurrent identical lookups must share media work")
            engine.streams(request, config)
            assertEquals(before * 2, mediaCalls.get(), "Video playlists must be fetched fresh")
            for (i in 0 until streams.length()) assertTrue(streams.getJSONObject(i).getString("url").contains("sig=keep%2F&x=2"))
            val sequential = Engine(bundle, HttpBridge(client = client, parallelism = 1))
            try {
                val started = System.nanoTime()
                assertEquals(first, sequential.streams(request, config), "Parallelism must preserve exact stream data")
                println("Synthetic 25ms HTTP: parallel=$parallelMs ms, sequential=${(System.nanoTime() - started) / 1_000_000} ms, streams=${streams.length()}")
            } finally { sequential.close() }
        } finally { engine.close(); client.dispatcher.executorService.shutdownNow() }
    }
    @Test fun metadataReusedButErrorsAndMediaNotCached() = runBlocking<Unit> {
        val calls = AtomicInteger()
        val client = okhttp3.OkHttpClient.Builder().addInterceptor { chain ->
            calls.incrementAndGet()
            okhttp3.Response.Builder().request(chain.request()).protocol(okhttp3.Protocol.HTTP_1_1).code(200).message("OK")
                .header("Content-Type", "application/json").body("{\"meta\":{\"id\":\"tt2098220\"}}".toResponseBody("application/json".toMediaType())).build()
        }.build()
        val bridge = HttpBridge(client = client)
        try {
            fun req(url: String) = JSONObject().put("url", url).put("headers", JSONObject()).toString()
            val metadata = req("https://catalog.nuvio.tv/meta/series/tmdb:46298.json")
            bridge.fetch(metadata, nativeConfig()); bridge.fetch(metadata, nativeConfig()); assertEquals(1, calls.get())
            val playlist = req("https://cdn.example/stream/master.m3u8?token=fresh")
            bridge.fetch(playlist, nativeConfig()); bridge.fetch(playlist, nativeConfig()); assertEquals(3, calls.get())
        } finally { bridge.close(); client.dispatcher.executorService.shutdownNow() }
    }

    @Test fun actualHttpCancellationClosesPendingBodyAndErrorsAreNotCached() = runBlocking<Unit> {
        val certificate = okhttp3.tls.HeldCertificate.Builder().addSubjectAlternativeName("localhost").build()
        val serverTls = okhttp3.tls.HandshakeCertificates.Builder().heldCertificate(certificate).build()
        val clientTls = okhttp3.tls.HandshakeCertificates.Builder().addTrustedCertificate(certificate.certificate).build()
        val server = okhttp3.mockwebserver.MockWebServer()
        server.useHttps(serverTls.sslSocketFactory(), false); server.start()
        val client = okhttp3.OkHttpClient.Builder().sslSocketFactory(clientTls.sslSocketFactory(), clientTls.trustManager).build()
        val bridge = HttpBridge(client = client)
        try {
            server.enqueue(okhttp3.mockwebserver.MockResponse().setBody("x".repeat(10_000)).throttleBody(1, 1, java.util.concurrent.TimeUnit.SECONDS))
            val request = JSONObject().put("url", server.url("/slow").toString()).toString()
            val pending = async(Dispatchers.Default) { bridge.fetch(request, nativeConfig()) }
            assertNotNull(withContext(Dispatchers.IO) { server.takeRequest(3, java.util.concurrent.TimeUnit.SECONDS) })
            delay(100)
            withTimeout(1_000) { pending.cancelAndJoin() }
            server.enqueue(okhttp3.mockwebserver.MockResponse().setBody("ok"))
            val quick = withTimeout(2_000) { bridge.fetch(JSONObject().put("url", server.url("/next").toString()).toString(), nativeConfig()) }
            assertEquals("ok", JSONObject(quick).getString("body"))
            server.enqueue(okhttp3.mockwebserver.MockResponse().setChunkedBody("x".repeat(1_048_577), 8192))
            assertFails { bridge.fetch(JSONObject().put("url", server.url("/large").toString()).toString(), nativeConfig()) }
        } finally { bridge.close(); server.shutdown(); client.dispatcher.executorService.shutdownNow() }
    }
    @Test fun metadataRequestsCoalesceAndFailuresRemainRetryable() = runBlocking<Unit> {
        val calls = AtomicInteger()
        val client = okhttp3.OkHttpClient.Builder().addInterceptor { chain ->
            val count = calls.incrementAndGet(); Thread.sleep(40)
            okhttp3.Response.Builder().request(chain.request()).protocol(okhttp3.Protocol.HTTP_1_1)
                .code(if(count == 1) 503 else 200).message("Test").header("Content-Type", "application/json")
                .body("{\"meta\":{\"id\":\"tt2098220\"}}".toResponseBody("application/json".toMediaType())).build()
        }.build()
        val bridge = HttpBridge(client = client)
        val request = JSONObject().put("url", "https://catalog.nuvio.tv/meta/series/tmdb:46298.json").toString()
        try {
            coroutineScope {
                val a = async { bridge.fetch(request, nativeConfig()) }; val b = async { bridge.fetch(request, nativeConfig()) }
                assertEquals(503, JSONObject(a.await()).getInt("status")); assertEquals(a.await(), b.await())
            }
            assertEquals(1, calls.get())
            bridge.fetch(request, nativeConfig()); assertEquals(2, calls.get())
            bridge.fetch(request, nativeConfig()); assertEquals(2, calls.get())
        } finally { bridge.close(); client.dispatcher.executorService.shutdownNow() }
    }

    @Test fun executionDeadlineInterruptsRunawayJsAndAllowsNextLookup() = runBlocking<Unit> {
        val engine = Engine("async function getStreams(id){if(id==='1'){while(true){}}return [];}", lookupTimeoutMs = 75)
        try {
            withTimeout(3_000) { assertFailsWith<Exception> { engine.streams(EpisodeRequest("1", "tv"), nativeConfig()) } }
            val next = engine.streams(EpisodeRequest("2", "tv"), nativeConfig())
            assertEquals(0, JSONObject(next).getJSONArray("streams").length())
        } finally { engine.close() }
    }

    @Test fun networkFailuresRemainRecoverableInsideJs() = runBlocking<Unit> {
        val client = okhttp3.OkHttpClient.Builder().addInterceptor { throw java.io.IOException("Network unavailable") }.build()
        val engine = Engine("""
            async function getStreams(){var r=await fetch('https://unavailable.example/');
              return r.status===0&&!r.ok?[{url:'https://media.example/fallback.mp4',name:'VF',size:'fallback'}]:[];}
        """.trimIndent(), HttpBridge(client = client))
        try {
            val result = JSONObject(engine.streams(EpisodeRequest("1", "tv"), nativeConfig()))
            assertEquals(1, result.getJSONArray("streams").length())
        } finally { engine.close(); client.dispatcher.executorService.shutdownNow() }
    }

    @Test fun awaitedNetworkCanOutlastInitializationLimit() = runBlocking<Unit> {
        val client = okhttp3.OkHttpClient.Builder().addInterceptor { chain ->
            Thread.sleep(5_200)
            okhttp3.Response.Builder().request(chain.request()).protocol(okhttp3.Protocol.HTTP_1_1).code(200).message("OK")
                .body("ok".toResponseBody("text/plain".toMediaType())).build()
        }.build()
        val engine = Engine("""
            async function getStreams(){var r=await fetch('https://media.example/check');
              return r.ok?[{url:'https://media.example/stream.mp4',name:'VF',size:'Anime-Sama'}]:[];}
        """.trimIndent(), HttpBridge(client = client), lookupTimeoutMs = 8_000)
        try {
            val result = engine.streams(EpisodeRequest("1", "tv"), nativeConfig())
            assertEquals(1, JSONObject(result).getJSONArray("streams").length())
        } finally { engine.close(); client.dispatcher.executorService.shutdownNow() }
    }

}
