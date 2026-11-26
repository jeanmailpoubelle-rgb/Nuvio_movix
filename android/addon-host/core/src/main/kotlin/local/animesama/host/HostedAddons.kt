package local.animesama.host

import org.json.JSONArray
import org.json.JSONObject

/** Versioned local configuration. Migration never rotates an installed capability URL. */
object HostedAddons {
    val families = linkedMapOf("anime-sama" to "Anime-Sama+", "sources-fr" to "Sources FR+", "sources-en" to "Sources EN+")
    fun migrate(saved: JSONObject): JSONObject {
        val value = JSONObject(saved.toString())
        if (!value.has("addons")) {
            val addons = JSONArray()
            if (value.has("settings") && value.optString("token").matches(Regex("[a-f0-9]{32}"))) {
                val settings = value.getJSONObject("settings")
                addons.put(JSONObject().put("id", "anime-sama").put("family", "anime-sama").put("name", "Anime-Sama+")
                    .put("token", value.getString("token")).put("enabled", true).put("legacy", true)
                    .put("access", if (value.optBoolean("remoteEnabled")) { if (value.optBoolean("lan")) "https" else "remote" } else if (value.optBoolean("lan")) "lan" else "device")
                    .put("options", JSONObject(settings.toString())))
            }
            value.put("addons", addons)
        }
        value.put("schema", 2)
        return value
    }
    fun rows(saved: JSONObject): List<JSONObject> = saved.optJSONArray("addons")?.let { a ->
        (0 until a.length()).map { a.getJSONObject(it) }
    } ?: emptyList()
    fun config(saved: JSONObject, addon: JSONObject): HostConfig {
        require(addon.getString("family") in families)
        require(addon.getString("access") in setOf("device", "lan", "https", "remote"))
        val settings = JSONObject(addon.optJSONObject("options")?.toString() ?: "{}")
        val shared = saved.optJSONObject("settings") ?: JSONObject()
        for (name in listOf("aiometadataSavedManifestUrl", "xperienceManifestUrl")) settings.put(name, shared.optString(name))
        if (addon.getString("family") == "sources-en") {
            require(settings.optString("inputMetadataProvider", "tvdb") in listOf("tvdb", "tmdb"))
            settings.put("inputMetadataProvider", settings.optString("inputMetadataProvider", "tvdb"))
        }
        if (addon.getString("family") == "sources-en" && saved.optString("tmdbKey").isBlank())
            throw ConfigurationException("tmdbKey", "MISSING_KEY")
        // Bind captions to both the capability and its effective preset. Editing settings
        // keeps the installation URL, but must not reuse an old video's numbering.
        val identity = settings.keys().asSequence().sorted().joinToString(",", "{", "}") {
            JSONObject.quote(it) + ":" + JSONObject.valueToString(settings.get(it))
        }
        val scope = EnginePackages.sha256(("captions:" + addon.getString("token") + "\n" + identity + "\n" + saved.optString("tmdbKey")).toByteArray()).take(16)
        return HostConfig(settings, saved.optString("tmdbKey"), scope)
    }
    fun validate(saved: JSONObject) {
        val rows = rows(saved)
        require(rows.size <= 12)
        require(rows.map { it.getString("id") }.distinct().size == rows.size)
        require(rows.map { it.getString("token") }.distinct().size == rows.size)
        for (row in rows) {
            require(row.getString("id").matches(Regex("[a-z0-9-]{1,48}")))
            require(row.getString("token").matches(Regex("[a-f0-9]{32}")))
            require(row.optString("name").length in 1..60)
            config(saved, row)
        }
    }
}
