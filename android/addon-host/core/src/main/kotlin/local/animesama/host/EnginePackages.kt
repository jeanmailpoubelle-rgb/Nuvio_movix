package local.animesama.host

import com.dokar.quickjs.QuickJs
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.sync.withPermit
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.concurrent.TimeUnit

class EnginePackage(val manifest: JSONObject, val sources: Map<String, String>) {
    val sequence: Long get() = manifest.getLong("sequence")
}

/** Only our signed releases run. No URL, key, script or channel can be supplied by addon clients. */
class EnginePackages(private val directory: File, publicPem: String,
                     private val bundledManifest: String, private val bundledRead: (String) -> String,
                     private val appVersion: Int = 10,
                     private val download: (String, Int) -> ByteArray = ::downloadRelease) {
    private val key = KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(Base64.getMimeDecoder().decode(
        publicPem.replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", ""))))
    private val mutex = Mutex()
    private val lock = Any()
    @Volatile var status: String = "Bundled engines ready"
        private set
    private var current: EnginePackage
    private var previous: EnginePackage? = null
    private var highest = 0L
    private var blocked = -1L
    private var lastCheck = 0L
    init {
        directory.mkdirs()
        val bundled = bundled()
        var loaded: EnginePackage? = null
        try {
            val state = JSONObject(File(directory, "state.json").readText())
            highest = state.optLong("highest"); blocked = state.optLong("blocked", -1); lastCheck = state.optLong("lastCheck")
            fun restore(n: Long): EnginePackage? = if (n <= 0) null else {
                val dir = File(directory, n.toString())
                val manifest = authenticate(File(dir, "release.json").readBytes())
                require(manifest.getLong("sequence") == n)
                readPackage(manifest) { name, _ -> File(dir, name).readBytes() }
            }
            previous = try { restore(state.optLong("previous")) } catch (_: Exception) { null }
            loaded = try { restore(state.optLong("active")) } catch (_: Exception) { previous }
        } catch (_: Exception) { /* APK fallback is always available after corrupt/interrupted storage. */ }
        current = loaded ?: bundled
        status = if (current.sequence > 0) "Verified engine release ${current.sequence}" else "Bundled engines ready"
    }
    private fun bundled(): EnginePackage {
        val m = JSONObject(bundledManifest)
        return readPackage(m) { name, _ -> bundledRead(name).toByteArray(Charsets.UTF_8) }
    }
    fun snapshot(): EnginePackage = synchronized(lock) { current }
    private fun authenticate(bytes: ByteArray): JSONObject {
        require(bytes.size <= 131_072)
        val envelope = JSONObject(bytes.toString(Charsets.UTF_8))
        val payload = Base64.getDecoder().decode(envelope.getString("payload"))
        val verifier = Signature.getInstance("SHA256withRSA").apply { initVerify(key); update(payload) }
        require(verifier.verify(Base64.getDecoder().decode(envelope.getString("signature"))))
        return JSONObject(payload.toString(Charsets.UTF_8)).also { m ->
            require(m.getInt("api") in 1..2 && m.getInt("minApp") <= appVersion)
            require(m.getLong("sequence") > 0)
        }
    }
    private fun readPackage(m: JSONObject, read: (String, JSONObject) -> ByteArray): EnginePackage {
        require(m.getInt("api") in 1..2 && m.getInt("minApp") <= appVersion)
        val files = m.getJSONObject("files")
        require(files.length() in 1..12)
        val sources = mutableMapOf<String, String>(); var total = 0
        for (name in files.keys()) {
            require(name.matches(Regex("[a-z0-9-]{1,60}\\.js")))
            val f = files.getJSONObject(name)
            val bytes = read(name, f); total += bytes.size
            require(bytes.size in 1..2_097_152 && total <= 16_777_216)
            require(sha256(bytes) == f.getString("sha256"))
            sources[name] = bytes.toString(Charsets.UTF_8)
        }
        val engines = m.getJSONObject("engines")
        require(engines.keys().asSequence().toSet() == HostedAddons.families.keys)
        for (family in engines.keys()) {
            val entries = engines.getJSONObject(family).getJSONArray("entries")
            require(entries.length() in 1..8)
            val ids = mutableSetOf<String>()
            for (i in 0 until entries.length()) {
                val entry = entries.getJSONObject(i)
                require(ids.add(entry.getString("id")))
                require(sources.containsKey(entry.getString("file")))
                val types = entry.getJSONArray("types")
                require(types.length() in 1..2 && (0 until types.length()).all { types.getString(it) in listOf("movie", "tv") })
            }
        }
        return EnginePackage(m, sources)
    }
    suspend fun check(force: Boolean = false): Boolean = mutex.withLock {
        val now = System.currentTimeMillis()
        if (!force && now >= lastCheck && now - lastCheck < 6 * 60 * 60 * 1000L) return@withLock false
        synchronized(lock) { lastCheck = now; persist() }
        status = "Checking for engine updates…"
        var staging: File? = null
        try {
            val envelope = withContext(Dispatchers.IO) { download(CHANNEL, 131_072) }
            val manifest = authenticate(envelope)
            val sequence = manifest.getLong("sequence")
            synchronized(lock) {
                require(sequence >= highest)
                if (sequence <= highest || sequence == blocked) {
                    status = "Engines up to date · active ${current.sequence}"; return@withLock false
                }
            }
            staging = File(directory, "staging").apply { deleteRecursively(); mkdirs() }
            val candidate = withContext(Dispatchers.IO) {
                readPackage(manifest) { name, f ->
                    val url = f.getString("url")
                    require(RELEASE_URL.matches(url))
                    download(url, 2_097_152).also { atomicWrite(File(staging, name), it) }
                }
            }
            // Compile/evaluate in a sandbox without fetch, then check the exported contract.
            // A candidate never reaches ordinary lookups before all bundles pass.
            for ((_, source) in candidate.sources) validateEngine(source)
            atomicWrite(File(staging, "release.json"), envelope)
            val destination = File(directory, sequence.toString())
            withContext(Dispatchers.IO) {
                if (destination.exists()) destination.deleteRecursively()
                Files.move(staging.toPath(), destination.toPath(), StandardCopyOption.ATOMIC_MOVE)
            }
            staging = null
            synchronized(lock) {
                val old = current; val oldPrevious = previous; val oldHighest = highest
                previous = current; current = candidate; highest = sequence
                try { persist() } catch (e: Exception) { current = old; previous = oldPrevious; highest = oldHighest; throw e }
            }
            status = "Installed verified engine release $sequence"
            cleanup()
            true
        } catch (e: CancellationException) { status = "Update interrupted · working engines kept"; throw e }
        catch (_: Exception) { status = "Update unavailable or rejected · working engines kept"; false }
        finally { staging?.deleteRecursively() }
    }
    /** Explicit rollback only. Empty results/outages/mapping contradictions never trigger this. */
    fun rollback(): Boolean = synchronized(lock) {
        if (current.sequence == 0L) return@synchronized false
        val old = current; val oldPrevious = previous; val oldBlocked = blocked
        blocked = current.sequence; current = previous ?: bundled(); previous = null
        try { persist() } catch (e: Exception) { current = old; previous = oldPrevious; blocked = oldBlocked; throw e }
        status = "Rolled back · active ${current.sequence}. Waiting for a newer release."
        true
    }
    private fun persist() {
        atomicWrite(File(directory, "state.json"), JSONObject().put("active", current.sequence).put("previous", previous?.sequence ?: 0)
            .put("highest", highest).put("blocked", blocked).put("lastCheck", lastCheck).toString().toByteArray())
    }
    private fun cleanup() = synchronized(lock) {
        val keep = setOf(current.sequence.toString(), previous?.sequence?.toString())
        directory.listFiles()?.filter { it.isDirectory && it.name.matches(Regex("[0-9]+")) && it.name !in keep }?.forEach { it.deleteRecursively() }
    }
    companion object {
        const val CHANNEL = "https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/hosted-engines/stable.json"
        private val RELEASE_URL = Regex("https://raw\\.githubusercontent\\.com/jeanmailpoubelle-rgb/Nuvio_movix/[a-f0-9]{40}/plugins/[a-z0-9-]+/providers/[a-z0-9-]+\\.js")
        fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it.toInt() and 255) }
        private fun atomicWrite(file: File, data: ByteArray) {
            val temp = File(file.parentFile, file.name + ".tmp")
            temp.outputStream().use { it.write(data); it.fd.sync() }
            Files.move(temp.toPath(), file.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        }
        suspend fun validateEngine(source: String) = HostExecutionBudget.contexts.withPermit {
            val js = QuickJs.create(Dispatchers.IO)
            try {
                js.memoryLimit = 64L * 1024 * 1024; js.maxStackSize = 1024L * 1024; js.evaluationTimeoutMillis = 5_000
                js.evaluate<Any?>("var console={log:function(){},warn:function(){},error:function(){}};var SCRAPER_ID='';var SCRAPER_SETTINGS={};var TMDB_API_KEY='';")
                js.evaluate<Any?>(source)
                require(js.evaluate<Boolean>("typeof getStreams==='function'"))
            } finally { js.close() }
        }
        private fun downloadRelease(url: String, limit: Int): ByteArray {
            require(url == CHANNEL || RELEASE_URL.matches(url))
            val client = OkHttpClient.Builder().followRedirects(false).followSslRedirects(false)
                .connectTimeout(7, TimeUnit.SECONDS).readTimeout(12, TimeUnit.SECONDS).callTimeout(20, TimeUnit.SECONDS).build()
            try {
                return client.newCall(Request.Builder().url(url).build()).execute().use { response ->
                    require(response.isSuccessful)
                    val source = requireNotNull(response.body).source(); val buffer = okio.Buffer()
                    while (true) {
                        if (source.read(buffer, minOf(8192L, limit.toLong() + 1 - buffer.size)) < 0) break
                        require(buffer.size <= limit)
                    }
                    buffer.readByteArray()
                }
            } finally { client.connectionPool.evictAll(); client.dispatcher.executorService.shutdown() }
        }
    }
}
