package local.animesama.host

import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Test
import java.io.File
import java.net.HttpURLConnection
import java.security.KeyPairGenerator
import java.security.Signature
import java.util.Base64
import java.util.concurrent.atomic.AtomicInteger
import kotlin.test.*

class HostedEnginesTest {
    private class Fixture(val code: String = "async function getStreams(){return []}") : AutoCloseable {
        val directory = kotlin.io.path.createTempDirectory("engines").toFile()
        private val pair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        val publicPem = "-----BEGIN PUBLIC KEY-----\n" + Base64.getEncoder().encodeToString(pair.public.encoded) + "\n-----END PUBLIC KEY-----"
        val calls = AtomicInteger()
        var failDownload = false
        var fileCode = code
        var envelope: ByteArray = signed(1, code)
        fun manifest(sequence: Long, source: String): JSONObject {
            val families = JSONObject()
            for (family in HostedAddons.families.keys) families.put(family, JSONObject().put("version", "test-$sequence")
                .put("entries", JSONArray().put(JSONObject().put("id", family).put("file", "test.js").put("types", JSONArray(listOf("tv", "movie"))))))
            return JSONObject().put("api", 1).put("minApp", 9).put("sequence", sequence).put("engines", families)
                .put("files", JSONObject().put("test.js", JSONObject().put("sha256", EnginePackages.sha256(source.toByteArray()))
                    .put("url", "https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/${"a".repeat(40)}/plugins/test/providers/test.js")))
        }
        fun sign(payload: JSONObject): ByteArray {
            val bytes = payload.toString().toByteArray()
            val signature = Signature.getInstance("SHA256withRSA").apply { initSign(pair.private); update(bytes) }.sign()
            return JSONObject().put("payload", Base64.getEncoder().encodeToString(bytes)).put("signature", Base64.getEncoder().encodeToString(signature)).toString().toByteArray()
        }
        fun signed(sequence: Long, source: String = code) = sign(manifest(sequence, source))
        fun packages() = EnginePackages(directory, publicPem, manifest(0, code).toString(), { code }, download = { url, _ ->
            calls.incrementAndGet()
            if (failDownload) throw java.io.IOException("offline")
            if (url == EnginePackages.CHANNEL) envelope else fileCode.toByteArray()
        })
        override fun close() { directory.deleteRecursively() }
    }
    private fun config() = HostConfig(JSONObject().put("episodeMetadataSource", "native"))
    @Test fun migrationPreservesCredentialsIdentityAndLegacyCapability() {
        val old = JSONObject().put("settings", JSONObject().put("episodeMetadataSource", "native"))
            .put("token", "a".repeat(32)).put("tmdbKey", "private-key").put("tunnelPrivateKey", "private-ssh")
            .put("ngrokDomain", "example.ngrok-free.app").put("remoteEnabled", true)
        val first = HostedAddons.migrate(old); HostedAddons.validate(first)
        val row = HostedAddons.rows(first).single()
        assertEquals("a".repeat(32), row.getString("token")); assertTrue(row.getBoolean("legacy")); assertEquals("remote", row.getString("access"))
        assertEquals("private-ssh", first.getString("tunnelPrivateKey")); assertEquals("private-key", first.getString("tmdbKey"))
        assertEquals(first.toString(), HostedAddons.migrate(first).toString())
        first.put("addons", JSONArray()); assertTrue(HostedAddons.rows(HostedAddons.migrate(first)).isEmpty(), "Deleting the migrated addon must not recreate it")
    }
    @Test fun credentialsAreSharedButMetadataAndOrderRemainPerAddon() {
        val saved = JSONObject().put("settings", JSONObject().put("aiometadataSavedManifestUrl", "https://aio.example/a/manifest.json").put("xperienceManifestUrl", "https://xp.example/x/manifest.json"))
            .put("tmdbKey", "shared")
        fun addon(family: String, adapter: String, order: String) = JSONObject().put("family", family).put("access", "lan")
            .put("options", JSONObject().put("inputMetadataAdapter", adapter).put("inputMetadataProvider", order))
        val a = HostedAddons.config(saved, addon("anime-sama", "xperience", "auto"))
        val b = HostedAddons.config(saved, addon("sources-en", "aiometadata", "tvdb"))
        assertEquals("shared", a.tmdbKey); assertEquals(a.tmdbKey, b.tmdbKey)
        assertEquals("xperience", a.settings.getString("inputMetadataAdapter")); assertEquals("tvdb", b.settings.getString("inputMetadataProvider"))
        assertFails { HostedAddons.config(saved, addon("sources-en", "aiometadata", "auto")) }
    }
    @Test fun authenticatedAtomicUpdatePersistsAndRollbackDoesNotReinstallRejectedRelease() = runBlocking<Unit> {
        Fixture().use { f ->
            val p = f.packages(); assertEquals(0L, p.snapshot().sequence)
            assertTrue(p.check()); assertEquals(1L, p.snapshot().sequence)
            val original = p.snapshot()
            f.envelope = f.signed(2)
            assertTrue(p.check(force = true)); assertEquals(2L, p.snapshot().sequence)
            assertEquals(1L, original.sequence, "An in-flight snapshot is immutable across activation")
            val restarted = f.packages(); assertEquals(2L, restarted.snapshot().sequence)
            assertTrue(restarted.rollback()); assertEquals(1L, restarted.snapshot().sequence)
            assertFalse(restarted.check(force = true)); assertEquals(1L, restarted.snapshot().sequence)
            f.envelope = f.signed(3); assertTrue(restarted.check(force = true))
            assertTrue(File(f.directory, "3/release.json").isFile)
            assertFalse(File(f.directory, "staging").exists())
        }
    }
    @Test fun badSignatureCorruptionIncompatibilityAndOfflineNeverReplaceWorkingEngine() = runBlocking<Unit> {
        Fixture().use { f ->
            val p = f.packages(); assertTrue(p.check())
            val bad = JSONObject(f.signed(2).toString(Charsets.UTF_8)).put("signature", Base64.getEncoder().encodeToString(ByteArray(256)))
            f.envelope = bad.toString().toByteArray(); assertFalse(p.check(true))
            f.envelope = f.sign(f.manifest(2, f.code).put("minApp", 999)); assertFalse(p.check(true))
            f.envelope = f.sign(f.manifest(2, f.code).put("api", 2)); assertFalse(p.check(true))
            f.envelope = f.signed(2); f.fileCode = "corrupt"; assertFalse(p.check(true))
            f.failDownload = true; assertFalse(p.check(true)); assertEquals(1L, p.snapshot().sequence)
            assertEquals(1L, f.packages().snapshot().sequence)
            assertFalse(File(f.directory, "staging").exists())
        }
    }
    @Test fun contractFailureAndUntrustedDownloadPathAreRejectedBeforeActivation() = runBlocking<Unit> {
        Fixture().use { f ->
            val p = f.packages()
            for (code in listOf("this is invalid javascript!", "var noExport=1;", "throw Error('bad');", "while(true){}")) {
                f.fileCode = code; f.envelope = f.signed(1, code)
                assertFalse(p.check(true)); assertEquals(0L, p.snapshot().sequence)
            }
            val manifest = f.manifest(1, f.code)
            manifest.getJSONObject("files").getJSONObject("test.js").put("url", "https://foreign.example/code.js")
            f.fileCode = f.code; f.envelope = f.sign(manifest)
            assertFalse(p.check(true)); assertEquals(0L, p.snapshot().sequence)
        }
    }
    @Test fun concurrentChecksShareCooldownAndPartialStateRecoversToVerifiedFallback() = runBlocking<Unit> {
        Fixture().use { f ->
            val p = f.packages()
            coroutineScope { List(6) { async { p.check() } }.awaitAll() }
            assertEquals(2, f.calls.get(), "One manifest and one file, not six downloads")
            File(f.directory, "staging").mkdirs(); File(f.directory, "staging/partial").writeText("partial")
            File(f.directory, "state.json.tmp").writeText("interrupted")
            assertEquals(1L, f.packages().snapshot().sequence)
            File(f.directory, "1/test.js").writeText("corrupted locally")
            assertEquals(0L, f.packages().snapshot().sequence, "Corrupt installed code must never execute")
        }
    }
    @Test fun bundledProductionEnginesMatchCatalogueAndCompileOnActualQuickJs() = runBlocking<Unit> {
        val root = File("../../..")
        val m = JSONObject(File(root, "hosted-engines/bundled.json").readText())
        for (name in m.getJSONObject("files").keys()) {
            val row = m.getJSONObject("files").getJSONObject(name)
            val bytes = File(root, row.getString("path")).readBytes()
            assertEquals(row.getString("sha256"), EnginePackages.sha256(bytes))
            EnginePackages.validateEngine(bytes.toString(Charsets.UTF_8))
        }
        assertEquals(6, m.getJSONObject("engines").getJSONObject("sources-fr").getJSONArray("entries").length())
        assertEquals(2, m.getJSONObject("engines").getJSONObject("sources-en").getJSONArray("entries").length())
    }
    @Test fun everyFamilyUsesInstalledEntryIdAndPreservesMediaWithoutCachingResults() = runBlocking<Unit> {
        Fixture("""async function getStreams(id,type,s,e){return [{url:'https://media.example/'+SCRAPER_ID+'/'+e+'?sig=keep%2F',name:'1080p · MULTI',size:SCRAPER_ID,format:'m3u8',headers:{Referer:'https://player.example/'},subtitles:[{id:'en',lang:'eng',url:'https://media.example/en.vtt',headers:{Origin:'https://player.example'}}]}];}""").use { f ->
            val runtime = HostedRuntime(f.packages())
            try {
                for (family in HostedAddons.families.keys) {
                    val response = JSONObject(runtime.streams(family, EpisodeRequest("46298", "tv", 1, 1), config()))
                    val stream = response.getJSONArray("streams").getJSONObject(0)
                    assertEquals("https://media.example/$family/1?sig=keep%2F", stream.getString("url"))
                    assertTrue(stream.getJSONObject("behaviorHints").getString("filename").endsWith(".m3u8"))
                    assertEquals("hls", stream.getString("type"))
                    val filename = stream.getJSONObject("behaviorHints").getString("filename")
                    val captions = JSONObject(runtime.subtitles(family, EpisodeRequest("46298", "tv", 1, 1), config(), filename)).getJSONArray("subtitles")
                    assertEquals(1, captions.length()); assertEquals("eng", captions.getJSONObject(0).getString("lang"))
                    assertEquals("https://player.example", captions.getJSONObject(0).getJSONObject("headers").getString("Origin"))
                    assertEquals("https://player.example/", stream.getJSONObject("behaviorHints").getJSONObject("proxyHeaders").getJSONObject("request").getString("Referer"))
                    assertEquals("https://player.example", stream.getJSONArray("subtitles").getJSONObject(0).getJSONObject("headers").getString("Origin"))
                }
                assertEquals(6L, runtime.stats().requests)
            } finally { runtime.close() }
        }
    }
    @Test fun independentEndpointsPauseDeleteAndRemoteIngressIsolation() {
        val a = "a".repeat(32); val b = "b".repeat(32); val c = "c".repeat(32)
        var rows = listOf(AddonEndpoint(a, "local-only", "Local", access = "lan", lookup = { "{\"streams\":[]}" }),
            AddonEndpoint(b, "remote", "Remote", access = "https", lookup = { "{\"streams\":[]}" }),
            AddonEndpoint(c, "remote-only", "Remote only", access = "remote", lookup = { "{\"streams\":[]}" }))
        val local = AddonServer({ rows }, port = 0, lan = true); val remote = AddonServer({ rows }, port = 0, remoteIngress = true)
        val lp = local.start(); val rp = remote.start()
        fun status(port: Int, token: String, host: String = "127.0.0.1"): Int {
            val c = java.net.URI("http://$host:$port/$token/manifest.json").toURL().openConnection() as HttpURLConnection
            return try { c.responseCode } finally { c.disconnect() }
        }
        try {
            assertEquals(200, status(lp, a)); assertEquals(404, status(rp, a)); assertEquals(200, status(rp, b))
            assertEquals(200, status(rp, c)); assertEquals(200, status(lp, c))
            val lan = java.net.NetworkInterface.getNetworkInterfaces().toList().flatMap { it.inetAddresses.toList() }
                .firstOrNull { it is java.net.Inet4Address && it.isSiteLocalAddress && !it.isLoopbackAddress }?.hostAddress
            if (lan != null) { assertEquals(404, status(lp, c, lan)); assertEquals(200, status(lp, a, lan)) }
            rows = listOf(rows[0], AddonEndpoint(b, "remote", "Remote", enabled = false, access = "https", lookup = { error("paused") }))
            assertEquals(404, status(rp, b)); assertEquals(200, status(lp, a))
            rows = listOf(rows[1]); assertEquals(404, status(lp, a))
        } finally { local.close(); remote.close() }
    }
    @Test fun genuineWarningsStayNonPlayableAndMissingMappingStaysEmpty() {
        val warning = JSONObject().put("warning", true).put("warningCode", "EN_MAPPING_CONFLICT").put("url", "diagnostic:conflict").put("size", "Conflicting episode identity")
        val streams = addonStreams(JSONArray().put(warning))
        assertEquals(1, streams.length()); assertFalse(streams.getJSONObject(0).has("url")); assertTrue(streams.getJSONObject(0).has("externalUrl"))
        assertEquals(0, addonStreams(JSONArray()).length())
    }
    @Test fun runningLookupKeepsOldCodeWhileNextLookupUsesVerifiedUpdate() = runBlocking<Unit> {
        val old = "async function getStreams(){await fetch('https://media.example/wait');return [{url:'https://media.example/old.mp4',name:'720p'}]}"
        Fixture(old).use { f ->
            val entered = java.util.concurrent.CountDownLatch(1); val release = java.util.concurrent.CountDownLatch(1)
            val client = okhttp3.OkHttpClient.Builder().addInterceptor { chain ->
                entered.countDown(); check(release.await(5, java.util.concurrent.TimeUnit.SECONDS))
                okhttp3.Response.Builder().request(chain.request()).protocol(okhttp3.Protocol.HTTP_1_1).code(200).message("OK")
                    .body(okhttp3.ResponseBody.create(null, "ok")).build()
            }.build()
            val packages = f.packages(); val runtime = HostedRuntime(packages, HttpBridge(client = client))
            try {
                val running = async { runtime.streams("anime-sama", EpisodeRequest("46298", "tv"), config()) }
                assertTrue(withContext(Dispatchers.IO) { entered.await(2, java.util.concurrent.TimeUnit.SECONDS) })
                val next = "async function getStreams(){return [{url:'https://media.example/new.mp4',name:'1080p'}]}"
                f.fileCode = next; f.envelope = f.signed(1, next)
                assertTrue(packages.check()); release.countDown()
                assertTrue(running.await().contains("old.mp4"))
                assertTrue(runtime.streams("anime-sama", EpisodeRequest("46298", "tv"), config()).contains("new.mp4"))
                assertEquals(1, runtime.stats().cache.sourceRequests.toInt())
            } finally { release.countDown(); runtime.close(); client.dispatcher.executorService.shutdownNow() }
        }
    }
    @Test fun corruptCurrentOnRestartUsesPreviousAuthenticatedRelease() = runBlocking<Unit> {
        Fixture().use { f ->
            val packages = f.packages(); assertTrue(packages.check())
            f.envelope = f.signed(2); assertTrue(packages.check(true))
            File(f.directory, "2/test.js").writeText("corrupt")
            assertEquals(1L, f.packages().snapshot().sequence)
        }
    }

    @Test fun oneRunawayEntryDoesNotDiscardOtherEntryResults() = runBlocking<Unit> {
        Fixture("async function getStreams(){if(SCRAPER_ID==='slow'){while(true){}}return [{url:'https://media.example/fast.mp4',name:'1080p'}]}").use { f ->
            val base = f.manifest(0, f.code)
            base.getJSONObject("engines").getJSONObject("sources-en").put("entries", JSONArray()
                .put(JSONObject().put("id", "slow").put("file", "test.js").put("types", JSONArray(listOf("tv"))))
                .put(JSONObject().put("id", "fast").put("file", "test.js").put("types", JSONArray(listOf("tv")))))
            val packages = EnginePackages(f.directory, f.publicPem, base.toString(), { f.code })
            val runtime = HostedRuntime(packages, lookupTimeoutMs = 800)
            try {
                val result = withTimeout(3_000) { runtime.streams("sources-en", EpisodeRequest("46298", "tv"), config()) }
                val streams = JSONObject(result).getJSONArray("streams")
                assertEquals(1, streams.length()); assertTrue(streams.getJSONObject(0).getString("url").endsWith("fast.mp4"))
                assertEquals(0, runtime.stats().active); assertEquals(0, runtime.stats().queued)
            } finally { runtime.close() }
        }
    }

    @Test fun captionResourceRefreshesOnlySelectedEntryAndNeverCachesSignedCaptionUrls() = runBlocking<Unit> {
        val code = """async function getStreams(){var n=await (await fetch('https://upstream.example/'+SCRAPER_ID)).text();return [{name:'1080p · SUB',server:SCRAPER_ID,url:'https://media.example/object?token='+n,type:'hls',format:'m3u8',subtitles:[{lang:'en',name:'English',url:'https://captions.example/en.vtt?token='+n,headers:{Referer:'https://upstream.example/'}}]}]}"""
        Fixture(code).use { f ->
            val manifest = f.manifest(0, code)
            manifest.getJSONObject("engines").getJSONObject("sources-en").put("entries", JSONArray()
                .put(JSONObject().put("id", "standard").put("file", "test.js").put("types", JSONArray(listOf("tv"))))
                .put(JSONObject().put("id", "beta").put("file", "test.js").put("types", JSONArray(listOf("tv")))))
            val calls = java.util.concurrent.ConcurrentHashMap<String, AtomicInteger>()
            val client = okhttp3.OkHttpClient.Builder().addInterceptor { chain ->
                val n = calls.computeIfAbsent(chain.request().url.encodedPath) { AtomicInteger() }.incrementAndGet()
                okhttp3.Response.Builder().request(chain.request()).protocol(okhttp3.Protocol.HTTP_1_1).code(200).message("OK")
                    .body(okhttp3.ResponseBody.create(null, n.toString())).build()
            }.build()
            val packages = EnginePackages(f.directory, f.publicPem, manifest.toString(), { code })
            val runtime = HostedRuntime(packages, HttpBridge(client = client))
            val request = EpisodeRequest("46298", "tv")
            try {
                val streams = JSONObject(runtime.streams("sources-en", request, config())).getJSONArray("streams")
                val standard = (0 until streams.length()).map { streams.getJSONObject(it) }.first {
                    it.getJSONObject("behaviorHints").getString("filename").startsWith("source-sources-en-0-")
                }
                assertEquals("hls", standard.getString("type"))
                assertTrue(standard.getString("url").endsWith("token=1"))
                val filename = standard.getJSONObject("behaviorHints").getString("filename")
                val before = runtime.stats().requests
                assertEquals(0, JSONObject(runtime.subtitles("sources-en", request, config(), "foreign.m3u8")).getJSONArray("subtitles").length())
                assertEquals(before, runtime.stats().requests, "Other addons' filenames must not start discovery")
                val caption = JSONObject(runtime.subtitles("sources-en", request, config(), filename)).getJSONArray("subtitles").getJSONObject(0)
                assertTrue(caption.getString("url").endsWith("token=2")); assertEquals(2, calls["/standard"]!!.get())
                assertEquals(1, calls["/beta"]!!.get(), "Standard captions must make no Beta calls")
                assertEquals("https://upstream.example/", caption.getJSONObject("headers").getString("Referer"))
            } finally { runtime.close(); client.dispatcher.executorService.shutdownNow() }
        }
    }
    @Test fun installedSubtitleResourceParsesStremioExtrasAndKeepsEpisodeCoordinates() {
        val token = "a".repeat(32); val calls = AtomicInteger()
        val server = AddonServer({ listOf(AddonEndpoint(token, "test", "Test", lookup = { "{\"streams\":[]}" },
            captions = { request, filename ->
                calls.incrementAndGet(); assertEquals(2, request.season); assertEquals(72, request.episode)
                assertEquals("source-sources-en-0-${"a".repeat(20)}.m3u8", filename)
                "{\"subtitles\":[{\"id\":\"en\",\"lang\":\"eng\",\"url\":\"https://captions.example/en.vtt?sig=keep%2F\"}]}"
            })) }, port = 0)
        val port = server.start()
        try {
            val name = "source-sources-en-0-${"a".repeat(20)}.m3u8"
            val url = "http://127.0.0.1:$port/$token/subtitles/series/tt2098220%3A2%3A72/videoHash=ignored&filename=$name.json"
            val result = JSONObject(java.net.URI(url).toURL().readText())
            assertEquals(1, result.getJSONArray("subtitles").length()); assertEquals(1, calls.get())
            val manifest = JSONObject(java.net.URI("http://127.0.0.1:$port/$token/manifest.json").toURL().readText())
            assertEquals("subtitles", manifest.getJSONArray("resources").getJSONObject(1).getString("name"))
        } finally { server.close() }
    }

}
