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
        assertEquals("a".repeat(32), row.getString("token")); assertTrue(row.getBoolean("legacy")); assertEquals("https", row.getString("access"))
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
                    assertEquals("source.m3u8", stream.getJSONObject("behaviorHints").getString("filename"))
                    assertEquals("https://player.example/", stream.getJSONObject("behaviorHints").getJSONObject("proxyHeaders").getJSONObject("request").getString("Referer"))
                    assertEquals("https://player.example", stream.getJSONArray("subtitles").getJSONObject(0).getJSONObject("headers").getString("Origin"))
                }
                assertEquals(3L, runtime.stats().requests)
            } finally { runtime.close() }
        }
    }
    @Test fun independentEndpointsPauseDeleteAndRemoteIngressIsolation() {
        val a = "a".repeat(32); val b = "b".repeat(32)
        var rows = listOf(AddonEndpoint(a, "local-only", "Local", access = "lan", lookup = { "{\"streams\":[]}" }),
            AddonEndpoint(b, "remote", "Remote", access = "https", lookup = { "{\"streams\":[]}" }))
        val local = AddonServer({ rows }, port = 0); val remote = AddonServer({ rows }, port = 0, remoteIngress = true)
        val lp = local.start(); val rp = remote.start()
        fun status(port: Int, token: String): Int {
            val c = java.net.URI("http://127.0.0.1:$port/$token/manifest.json").toURL().openConnection() as HttpURLConnection
            return try { c.responseCode } finally { c.disconnect() }
        }
        try {
            assertEquals(200, status(lp, a)); assertEquals(404, status(rp, a)); assertEquals(200, status(rp, b))
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
}
