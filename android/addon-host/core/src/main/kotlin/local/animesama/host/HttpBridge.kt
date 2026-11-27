package local.animesama.host

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.CompletableDeferred
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.security.MessageDigest
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import okhttp3.*
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.net.InetAddress
import java.util.Base64
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Shared connection pool, six global transfers, cancellation closes actual sockets. */
data class BridgeStats(val metadata: CacheStats, val identities: CacheStats, val networkRequests: Long, val sourceRequests: Long)

class HttpBridge(cacheClock: () -> Long = { System.nanoTime() / 1_000_000 },
                 private val metadata: MetadataCache = MetadataCache(clock = cacheClock),
                 private val client: OkHttpClient = productionClient(), parallelism: Int = 6,
                 private val identities: MetadataCache = MetadataCache(64 * 1024, 6 * 60 * 60 * 1000L, cacheClock, 128)) {
    private val networkRequests = AtomicLong()
    private val sourceRequests = AtomicLong()
    private val transfers = Semaphore(parallelism.also { require(it in 1..6) })
    private val metadataFlights = ConcurrentHashMap<String, CompletableDeferred<String>>()
    suspend fun fetch(raw: String, config: HostConfig): String {
        val input = JSONObject(raw)
        val url = input.getString("url").toHttpUrl()
        require(url.isHttps && url.username.isEmpty() && url.password.isEmpty()) { "HTTPS required" }
        val method = input.optString("method", "GET").uppercase()
        require(method in listOf("GET", "HEAD", "POST"))
        val rawBody = input.opt("body")
        require(rawBody == null || rawBody == JSONObject.NULL || rawBody is String) { "Text body required" }
        val body = if (rawBody is String) rawBody else ""
        require(body.toByteArray(Charsets.UTF_8).size <= 65_536) { "Request body too large" }
        require(method == "POST" || body.isEmpty()) { "Unexpected request body" }
        val headers = input.optJSONObject("headers") ?: JSONObject()
        val cacheable = method == "GET" && cacheable(url, config)
        // Include all request headers: never reuse authenticated data across configurations.
        val key = url.toString() + "\n" + headers.toString()
        if (cacheable) metadata.get(key)?.let { return it }
        val owner = if (cacheable) CompletableDeferred<String>() else null
        if (owner != null) metadataFlights.putIfAbsent(key, owner)?.let { return it.await() }
        return try {
            val result = transfers.withPermit { perform(url, method, headers, body, cacheable, key) }
            owner?.complete(result); result
        } catch (e: Exception) {
            owner?.completeExceptionally(e); throw e
        } finally { if (owner != null) metadataFlights.remove(key, owner) }
    }
    private suspend fun perform(url: HttpUrl, method: String, headers: JSONObject, body: String, cacheable: Boolean, key: String): String {
        val request = Request.Builder().url(url).method(method, if (method == "POST") body.toRequestBody(null) else null)
        for (name in headers.keys()) request.header(name, headers.getString(name))
        val call = client.newCall(request.build())
        networkRequests.incrementAndGet()
        if (!cacheable) sourceRequests.incrementAndGet()
        val response = suspendCancellableCoroutine<Payload> { continuation ->
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    if (!continuation.isCancelled) continuation.resumeWithException(IOException("Upstream unavailable"))
                }
                override fun onResponse(call: Call, response: Response) {
                    try {
                        val value = response.use { r -> encode(r, method) }
                        continuation.resume(value)
                    } catch (_: Exception) {
                        if (!continuation.isCancelled) continuation.resumeWithException(IOException("Upstream response unavailable"))
                    }
                }
            })
        }
        if (cacheable && response.data != null) {
            metadataLifetime(url, response.data)?.let { metadata.put(key, response.json, it) }
        }
        return response.json
    }
    private data class Payload(val json: String, val data: JSONObject?)
    private fun encode(r: Response, method: String): Payload {
        // Read on OkHttp's callback thread. Cancellation remains registered through
        // the entire body read, so deadlines cancel sockets rather than just JS.
        val body = r.body?.source()
        val bytes = if (method == "HEAD" || body == null) ByteArray(0) else {
            val buffer = okio.Buffer()
            while (true) {
                val read = body.read(buffer, minOf(8192L, 1_048_577L - buffer.size))
                if (read < 0) break
                require(buffer.size <= 1_048_576) { "Response too large" }
            }
            buffer.readByteArray()
        }
        val h = JSONObject(); for (name in r.headers.names()) h.put(name.lowercase(), r.headers.values(name).joinToString(", "))
        val text = bytes.toString(Charsets.UTF_8)
        val result = JSONObject().put("ok", r.isSuccessful).put("status", r.code)
            .put("url", r.request.url.toString()).put("headers", h).put("body", text)
            .put("bodyBase64", Base64.getEncoder().encodeToString(bytes)).toString()
        val data = if (r.isSuccessful && h.optString("content-type").contains("json"))
            try { JSONObject(text) } catch (_: Exception) { null } else null
        return Payload(result, data)
    }

    private fun cacheable(url: HttpUrl, config: HostConfig): Boolean {
        if (url.host in listOf("catalog.nuvio.tv", "v3-cinemeta.strem.io")) return url.encodedPath.startsWith("/meta/") && url.encodedPath.endsWith(".json")
        if (url.host == "api.themoviedb.org") return url.encodedPath.startsWith("/3/tv/") || url.encodedPath.startsWith("/3/find/")
        return config.metadataUrls().any { raw ->
            val manifest = raw.toHttpUrl()
            url.scheme == manifest.scheme && url.host == manifest.host && url.port == manifest.port &&
                url.encodedPath.startsWith(manifest.encodedPath.removeSuffix("/manifest.json") + "/meta/series/") && url.encodedPath.endsWith(".json")
        }
    }
    // Public TV title details can be reused for five minutes. Episode
    // inventories, private metadata and /find candidates keep the 30-second TTL.
    private fun metadataLifetime(url: HttpUrl, data: JSONObject): Long? {
        if (url.host == "api.themoviedb.org") {
            if (Regex("^/3/tv/[1-9][0-9]*$").matches(url.encodedPath))
                return if (data.optString("id") == url.pathSegments.last()) 300_000 else null
            if (url.encodedPath.startsWith("/3/find/")) {
                // A candidate is not a verified correspondence. Keep only a
                // single positive result briefly; SeriesIdentity alone promotes
                // a validated series correspondence into the six-hour cache.
                val rows = listOf("tv_results", "movie_results", "tv_episode_results")
                    .flatMap { key -> data.optJSONArray(key)?.let { a -> (0 until a.length()).map { a.optJSONObject(it) } } ?: emptyList() }
                return if (rows.size == 1 && rows[0]?.optString("id")?.matches(Regex("[1-9][0-9]*")) == true) 30_000 else null
            }
            return if (data.has("id")) 30_000 else null
        }
        return if (data.optJSONObject("meta")?.optString("id").isNullOrBlank()) null else 30_000
    }
    private fun identityKey(request: EpisodeRequest, key: String): String = MessageDigest.getInstance("SHA-256")
        .digest((request.type + "\n" + request.id + "\n" + key).toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it.toInt() and 255) }
    fun verifiedIdentity(request: EpisodeRequest, key: String): String? = identities.get(identityKey(request, key))
    fun rememberIdentity(request: EpisodeRequest, key: String, tmdbId: String) {
        require(request.id.matches(Regex("tt[0-9]+")) && tmdbId.matches(Regex("[1-9][0-9]{0,9}")))
        identities.put(identityKey(request, key), tmdbId)
    }
    fun stats() = BridgeStats(metadata.stats(), identities.stats(), networkRequests.get(), sourceRequests.get())
    fun clear() { metadata.clear(); identities.clear() }
    fun close() { client.dispatcher.cancelAll(); client.connectionPool.evictAll(); clear() }
    companion object {
        fun productionClient(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(7, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS).callTimeout(15, TimeUnit.SECONDS)
            .followSslRedirects(false)
            .dns(object : Dns { override fun lookup(hostname: String): List<InetAddress> {
                val addresses = Dns.SYSTEM.lookup(hostname)
                require(addresses.none { privateAddress(it) }) { "Local upstream denied" }
                return addresses
            }}).build()
        private fun privateAddress(ip: InetAddress): Boolean = ip.isAnyLocalAddress || ip.isLoopbackAddress || ip.isLinkLocalAddress || ip.isSiteLocalAddress || ip.isMulticastAddress ||
            (ip.address.size == 16 && (ip.address[0].toInt() and 0xfe) == 0xfc) ||
            (ip.address.size == 4 && (ip.address[0].toInt() and 255) == 100 && (ip.address[1].toInt() and 255) in 64..127)
    }
}
