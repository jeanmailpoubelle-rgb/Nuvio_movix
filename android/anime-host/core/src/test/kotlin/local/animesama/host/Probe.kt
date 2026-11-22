package local.animesama.host

import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.net.InetSocketAddress
import java.net.Proxy
import java.net.URI

/** Native/public or explicitly configured private control. Counts/status only. */
fun main(args: Array<String>) = runBlocking {
    val id = args.getOrNull(0) ?: "46298"
    val season = args.getOrNull(1)?.toInt() ?: 1
    val episode = args.getOrNull(2)?.toInt() ?: 1
    val repeats = args.getOrNull(3)?.toInt()?.also { require(it in 1..3) } ?: 1
    val adapter = System.getenv("ANIME_HOST_INPUT_ADAPTER") ?: "native"
    val config = try {
        val settings = JSONObject().put("episodeMetadataSource", if(adapter == "native") "native" else "aiometadata")
        require(adapter in listOf("native", "xperience", "aiometadata"))
        if (adapter != "native") {
            settings.put("inputMetadataAdapter", adapter).put("inputMetadataProvider", "auto")
                .put(if(adapter == "xperience") "xperienceManifestUrl" else "aiometadataSavedManifestUrl", System.getenv("ANIME_HOST_MANIFEST_URL") ?: "")
            require(!System.getenv("ANIME_HOST_TMDB_KEY").isNullOrBlank())
        }
        HostConfig(settings, System.getenv("ANIME_HOST_TMDB_KEY") ?: "")
    } catch (_: Exception) { throw IllegalStateException("Probe configuration missing or invalid") }
    val client = (System.getenv("HTTPS_PROXY")?.let { raw ->
        val uri = URI(raw)
        // Managed development environment only; Android uses the public-address DNS guard.
        OkHttpClient.Builder().proxy(Proxy(Proxy.Type.HTTP, InetSocketAddress(uri.host, if(uri.port > 0) uri.port else 80))).build()
    } ?: HttpBridge.productionClient())
    val engine = Engine(File("../../../plugins/anime-sama/providers/anime-sama.js").readText(), HttpBridge(client = client))
    try {
      repeat(repeats) { iteration ->
        val before = engine.stats().cache
        val result = JSONObject(engine.streams(EpisodeRequest(id, "tv", season, episode), config))
        val streams = result.getJSONArray("streams")
        if (adapter != "native") check(streams.length() > 0) { "Configured lookup returned no streams" }
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
        val after = engine.stats().cache
        report.put("iteration", iteration + 1).put("httpRequests", after.networkRequests - before.networkRequests)
            .put("freshSourceRequests", after.sourceRequests - before.sourceRequests)
            .put("metadataHits", after.metadata.hits - before.metadata.hits).put("seriesIdHits", after.identities.hits - before.identities.hits)
        if (adapter != "native" && id.startsWith("tt") && iteration > 0) {
            check(after.identities.hits > before.identities.hits) { "Warm identity was not reused" }
            check(after.sourceRequests > before.sourceRequests) { "Warm lookup did not fetch fresh source data" }
        }
        println(report.toString())
      }
    } catch (_: Exception) {
        println(JSONObject().put("failed", true).put("summary", engine.lastSummary).toString())
        throw IllegalStateException("Public live control failed; see sanitized summary")
    } finally { engine.close(); client.dispatcher.executorService.shutdownNow() }
}
