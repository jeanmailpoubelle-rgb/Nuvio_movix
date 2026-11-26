package local.animesama.host

import org.json.JSONArray
import org.json.JSONObject
import java.net.URI

class ConfigurationException(val field: String, val problem: String) : IllegalArgumentException("$field:$problem")

/** Immutable configuration: never include this object in logs or diagnostics. */
class HostConfig(val settings: JSONObject, tmdbKey: String = "", val captionScope: String = "") {
    val tmdbKey: String = tmdbKey.trim().replace(Regex("^Bearer\\s+", RegexOption.IGNORE_CASE), "")
    init {
        require(captionScope.isEmpty() || captionScope.matches(Regex("[a-f0-9]{16}")))
        require(settings.optString("inputMetadataAdapter", "aiometadata") in listOf("aiometadata", "xperience"))
        require(settings.optString("inputMetadataProvider", "auto") in listOf("auto", "tvdb", "tmdb"))
        require(settings.optString("episodeMetadataSource", "aiometadata") in listOf("native", "aiometadata"))
        require(settings.optString("version", "all") in listOf("all", "vf", "vostfr"))
        for (key in listOf("aiometadataSavedManifestUrl", "xperienceManifestUrl")) {
            val raw = settings.optString(key).trim()
            if (raw.isNotEmpty()) {
                // Match the native input adapter: Stremio installation links
                // use the same HTTPS resource. Preserve every path/query byte.
                val normalized = raw.replace(Regex("^(?i:stremio|https)://"), "https://")
                val u = try { URI(normalized) } catch (_: Exception) { throw ConfigurationException(key, "INVALID_URL") }
                if (u.scheme != "https" || u.host == null || u.userInfo != null || u.fragment != null || u.path?.endsWith("/manifest.json") != true)
                    throw ConfigurationException(key, "INVALID_URL")
                if (u.host.lowercase() in setOf("github.com", "raw.githubusercontent.com"))
                    throw ConfigurationException(key, "PLUGIN_MANIFEST")
                settings.put(key, normalized)
            }
        }
        if (settings.optString("episodeMetadataSource", "aiometadata") != "native") {
            val key = if (settings.optString("inputMetadataAdapter") == "xperience") "xperienceManifestUrl" else "aiometadataSavedManifestUrl"
            if (settings.optString(key).isBlank()) throw ConfigurationException(key, "MISSING_SELECTED")
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
fun captionKey(row: JSONObject): String {
    val identity = listOf("name", "server", "provider", "source", "audioLanguage", "quality").joinToString("\n") {
        row.optString(it).replace(Regex("^[\\uFE00-\\uFE0F]+"), "")
    }
    return EnginePackages.sha256(identity.toByteArray()).take(20)
}

fun addonStreams(native: JSONArray, family: String = "", captionScope: String = ""): JSONArray {
    val out = JSONArray()
    for (i in 0 until native.length()) {
        val row = native.optJSONObject(i) ?: continue
        val url = row.optString("url")
        if (row.optBoolean("warning") && row.optString("warningCode").matches(Regex("[A-Z0-9_]{3,100}"))) {
            out.put(JSONObject().put("name", "Mapping warning").put("title", row.optString("size"))
                .put("externalUrl", "https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/blob/main/docs/sources-en.md"))
            continue
        }
        if (!Regex("^https?://[^\\s]+$").matches(url)) continue
        val hints = JSONObject().put("notWebReady", true)
        val format = row.optString("format")
        if (format in listOf("m3u8", "mp4", "mpd")) hints.put("filename", "source.$format")
        else if (row.optString("type") == "hls") hints.put("filename", "source.m3u8")
        if (family in HostedAddons.families && (row.optJSONArray("subtitles")?.length() ?: 0) > 0) {
            val extension = if (format in listOf("m3u8", "mp4", "mpd")) format else "m3u8"
            hints.put("filename", "source-$family${if (captionScope.isNotEmpty()) "-$captionScope" else ""}-${row.optInt("_hostEntry", 0)}-${captionKey(row)}.$extension")
        }
        row.optJSONObject("headers")?.let { hints.put("proxyHeaders", JSONObject().put("request", it)) }
        val stream = JSONObject().put("url", url)
            .put("name", row.optString("name").replace(Regex("^[\\uFE00-\\uFE0F]+"), ""))
            .put("title", row.optString("size", "Anime-Sama"))
            .put("behaviorHints", hints)
        val mediaType = row.optString("type").takeIf { it in setOf("hls", "dash", "mp4") }
            ?: when (format) { "m3u8" -> "hls"; "mpd" -> "dash"; "mp4" -> "mp4"; else -> null }
        mediaType?.let { stream.put("type", it) }
        row.optJSONArray("subtitles")?.let { subtitles ->
            val converted = JSONArray()
            for (n in 0 until subtitles.length()) subtitles.optJSONObject(n)?.let { subtitle ->
                val copy = JSONObject(subtitle.toString())
                if (copy.optString("id").isBlank()) copy.put("id", "caption-$n")
                converted.put(copy)
            }
            stream.put("subtitles", converted)
        }
        out.put(stream)
    }
    return out
}
