package local.animesama.host

import org.json.JSONArray
import org.json.JSONObject
import java.net.URI

/** Immutable configuration: never include this object in logs or diagnostics. */
class HostConfig(val settings: JSONObject, val tmdbKey: String = "") {
    init {
        require(settings.optString("inputMetadataAdapter", "aiometadata") in listOf("aiometadata", "xperience"))
        require(settings.optString("inputMetadataProvider", "auto") in listOf("auto", "tvdb", "tmdb"))
        require(settings.optString("episodeMetadataSource", "aiometadata") in listOf("native", "aiometadata"))
        require(settings.optString("version", "all") in listOf("all", "vf", "vostfr"))
        for (key in listOf("aiometadataSavedManifestUrl", "xperienceManifestUrl")) {
            val raw = settings.optString(key).trim()
            if (raw.isNotEmpty()) {
                val u = URI(raw)
                require(u.scheme == "https" && u.host != null && u.userInfo == null && u.fragment == null && u.path.endsWith("/manifest.json")) { "Invalid metadata manifest" }
            }
        }
        if (settings.optString("episodeMetadataSource", "aiometadata") != "native") {
            val key = if (settings.optString("inputMetadataAdapter") == "xperience") "xperienceManifestUrl" else "aiometadataSavedManifestUrl"
            require(settings.optString(key).isNotBlank()) { "Selected metadata manifest is missing" }
        }
    }
    fun metadataUrls(): Set<String> = listOf("aiometadataSavedManifestUrl", "xperienceManifestUrl")
        .map { settings.optString(it).trim() }.filter { it.isNotEmpty() }.toSet()
}

data class EpisodeRequest(val id: String, val type: String, val season: Int = 1, val episode: Int = 1) {
    companion object {
        fun parse(type: String, videoId: String): EpisodeRequest? {
            if (videoId.length > 100) return null
            val id = "(?:tt[0-9]+|tmdb:[1-9][0-9]*|[1-9][0-9]*)"
            if (type == "movie" && Regex("^$id$").matches(videoId)) return EpisodeRequest(videoId, "movie")
            if (type != "series") return null
            val match = Regex("^($id):([1-9][0-9]{0,3}):([1-9][0-9]{0,4})$").matchEntire(videoId) ?: return null
            return EpisodeRequest(match.groupValues[1], "tv", match.groupValues[2].toInt(), match.groupValues[3].toInt())
        }
    }
}

/** Preserve original master URL bytes and headers; no proxy, re-signing or remux. */
fun addonStreams(native: JSONArray): JSONArray {
    val out = JSONArray()
    for (i in 0 until native.length()) {
        val row = native.optJSONObject(i) ?: continue
        val url = row.optString("url")
        if (!Regex("^https?://[^\\s]+$").matches(url)) continue
        val hints = JSONObject().put("notWebReady", true)
        val format = row.optString("format")
        if (format in listOf("m3u8", "mp4")) hints.put("filename", "anime-sama.$format")
        row.optJSONObject("headers")?.let { hints.put("proxyHeaders", JSONObject().put("request", it)) }
        val stream = JSONObject().put("url", url)
            .put("name", row.optString("name").replace(Regex("^[\\uFE00-\\uFE0F]+"), ""))
            .put("title", row.optString("size", "Anime-Sama"))
            .put("behaviorHints", hints)
        row.optJSONArray("subtitles")?.let { stream.put("subtitles", it) }
        out.put(stream)
    }
    return out
}
