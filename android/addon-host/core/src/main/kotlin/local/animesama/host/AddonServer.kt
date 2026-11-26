package local.animesama.host

import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.json.JSONArray
import org.json.JSONObject
import java.net.*
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

/** Stream-only Stremio endpoint, with no remote configuration or file-serving routes. */
class AddonServer(private val engine: Engine, private val config: HostConfig, private val token: String,
                  private val lan: Boolean = false, private val port: Int = 8765, workerIdleMs: Long = 30_000) : AutoCloseable {
    private val workers = ThreadPoolExecutor(4, 4, workerIdleMs.also { require(it > 0) }, TimeUnit.MILLISECONDS, ArrayBlockingQueue(4)).apply { allowCoreThreadTimeOut(true) }
    val workerThreads: Int get() = workers.poolSize
    private var socket: ServerSocket? = null
    private val clients = java.util.Collections.synchronizedSet(mutableSetOf<Socket>())
    @Volatile var running = false
        private set
    fun start(): Int {
        require(token.matches(Regex("[a-f0-9]{32}")))
        check(!running)
        val listener = ServerSocket()
        try { listener.reuseAddress = true; listener.bind(InetSocketAddress(if (lan) "0.0.0.0" else "127.0.0.1", port), 8) }
        catch (e: Exception) { listener.close(); throw e }
        socket = listener; running = true
        Thread({
            while (running) {
                val client = try { listener.accept() } catch (_: Exception) { break }
                if (!client.inetAddress.isLoopbackAddress && !client.inetAddress.isSiteLocalAddress) { client.close(); continue }
                clients.add(client)
                try { workers.execute { try { serve(client) } finally { clients.remove(client); client.close() } } }
                catch (_: java.util.concurrent.RejectedExecutionException) { clients.remove(client); client.close() }
            }
        }, "anime-addon-accept").apply { isDaemon = true; start() }
        return listener.localPort
    }
    private fun serve(client: Socket) {
        try {
            client.soTimeout = 5_000
            val input = client.getInputStream()
            val header = java.io.ByteArrayOutputStream()
            var tail = 0
            val headerDeadline = System.nanoTime() + 5_000_000_000L
            while (header.size() < 16_384) {
                if (System.nanoTime() > headerDeadline) return
                val b = input.read(); if (b < 0) return
                header.write(b)
                tail = (tail shl 8) or b
                if (tail == 0x0d0a0d0a) break
            }
            if (header.size() >= 16_384) { reply(client, 431, "{}"); return }
            val line = header.toString("US-ASCII").substringBefore("\r\n").split(' ')
            if (line.size != 3 || line[2] !in listOf("HTTP/1.1", "HTTP/1.0")) { reply(client, 400, "{}"); return }
            val method = line[0]; val target = line[1]
            if (!target.startsWith("/$token/") || target.contains('?') || target.contains('#')) { reply(client, 404, "{}"); return }
            if (method == "OPTIONS") { reply(client, 204, ""); return }
            if (method !in listOf("GET", "HEAD")) { reply(client, 405, "{}"); return }
            val path = target.removePrefix("/$token/")
            if (path == "manifest.json") {
                val resource = JSONObject().put("name", "stream").put("types", JSONArray(listOf("movie", "series"))).put("idPrefixes", JSONArray(listOf("tt", "tmdb:")))
                val manifest = JSONObject().put("id", "local.animesama.host").put("version", "0.2.1").put("name", "Anime-Sama Local")
                    .put("description", "Anime-Sama hosted on your Android device")
                    .put("resources", JSONArray().put(resource)).put("types", JSONArray(listOf("movie", "series")))
                    .put("catalogs", JSONArray()).put("behaviorHints", JSONObject().put("configurable", false))
                reply(client, 200, manifest.toString(), method == "HEAD"); return
            }
            val match = Regex("^stream/(movie|series)/([^/]+)\\.json$").matchEntire(path)
            val decoded = match?.let { URLDecoder.decode(it.groupValues[2].replace("+", "%2B"), "UTF-8") }
            val request = match?.let { EpisodeRequest.parse(it.groupValues[1], decoded!!) }
            if (request == null) { reply(client, 404, "{}"); return }
            if (method == "HEAD") { reply(client, 200, "", true); return }
            val result = runBlocking { withTimeout(55_000) { engine.streams(request, config) } }
            reply(client, 200, result)
        } catch (_: Exception) { try { reply(client, 503, "{\"streams\":[]}") } catch (_: Exception) { } }
    }
    private fun reply(socket: Socket, status: Int, body: String, head: Boolean = false) {
        val bytes = body.toByteArray(Charsets.UTF_8)
        val label = when(status) {200 -> "OK"; 204 -> "No Content"; 400 -> "Bad Request"; 404 -> "Not Found"; 405 -> "Method Not Allowed"; 431 -> "Request Header Fields Too Large"; else -> "Service Unavailable"}
        val header = "HTTP/1.1 $status $label\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${bytes.size}\r\nCache-Control: no-store\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, HEAD, OPTIONS\r\nConnection: close\r\n\r\n"
        socket.getOutputStream().apply { write(header.toByteArray(Charsets.US_ASCII)); if (!head) write(bytes); flush() }
    }
    override fun close() {
        running = false; socket?.close()
        synchronized(clients) { clients.forEach { try { it.close() } catch (_: Exception) { } }; clients.clear() }
        workers.shutdownNow(); engine.close()
    }
}
