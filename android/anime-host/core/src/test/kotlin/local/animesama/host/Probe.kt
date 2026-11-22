package local.animesama.host

import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.URI

/** Public native control. Prints counts/status only, never media URLs or headers. */
fun main(args: Array<String>) = runBlocking {
    val id = args.getOrNull(0) ?: "46298"
    val season = args.getOrNull(1)?.toInt() ?: 1
    val episode = args.getOrNull(2)?.toInt() ?: 1
    val client = (System.getenv("HTTPS_PROXY")?.let { raw ->
        val uri = URI(raw)
        // Managed development environment only; Android uses the public-address DNS guard.
        OkHttpClient.Builder().proxy(Proxy(Proxy.Type.HTTP, InetSocketAddress(uri.host, if(uri.port > 0) uri.port else 80))).build()
    } ?: HttpBridge.productionClient())
    val engine = Engine(File("../../../plugins/anime-sama/providers/anime-sama.js").readText(), HttpBridge(client = client))
    try {
        val result = JSONObject(engine.streams(EpisodeRequest(id, "tv", season, episode), HostConfig(JSONObject().put("episodeMetadataSource", "native"))))
        val streams = result.getJSONArray("streams")
        val report = JSONObject().put("links", streams.length()).put("summary", engine.lastSummary)
        if (streams.length() > 0) {
            val row = streams.getJSONObject(0)
            val request = Request.Builder().url(row.getString("url"))
            val headers = row.getJSONObject("behaviorHints").optJSONObject("proxyHeaders")?.optJSONObject("request")
            if(headers != null) for (name in headers.keys()) request.header(name, headers.getString(name))
            client.newCall(request.build()).execute().use { response ->
                report.put("firstPlaylistHttp", response.code)
                report.put("firstPlaylistValid", response.body?.source()?.readUtf8Line()?.trim() == "#EXTM3U")
            }
        }
        println(report.toString())
    } catch (_: Exception) {
        println(JSONObject().put("failed", true).put("summary", engine.lastSummary).toString())
        throw IllegalStateException("Public live control failed; see sanitized summary")
    } finally { engine.close(); client.dispatcher.executorService.shutdownNow() }
}
