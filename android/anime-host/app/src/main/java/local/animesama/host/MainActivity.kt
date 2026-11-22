package local.animesama.host

import android.Manifest
import android.app.Activity
import android.content.*
import android.os.*
import android.text.InputType
import android.widget.*
import org.json.JSONObject
import java.net.NetworkInterface

private class Choice(val view: Spinner, val keys: List<String>) { val value: String get() = keys[view.selectedItemPosition] }

/** Native controls work with touch and TV directional focus. No WebView dependency. */
class MainActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var status: TextView
    private lateinit var store: SecretStore
    private val ticker = object : Runnable { override fun run() { status.text = listOf(HostService.status, HostService.summary).filter { it.isNotEmpty() }.joinToString("\n"); handler.postDelayed(this, 1000) } }
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        store = SecretStore(this)
        val saved = try { store.load() } catch (_: Exception) { JSONObject() }
        val settings = saved.optJSONObject("settings") ?: JSONObject()
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(28, 24, 28, 24) }
        setContentView(ScrollView(this).apply { addView(layout) })
        fun text(value: String, size: Float = 16f) = TextView(this).apply { text = value; textSize = size; setPadding(0, 12, 0, 6); layout.addView(this) }
        text("Anime-Sama Host · Preview", 26f)
        text("Start here, then add the copied URL under Addons in Nuvio. This app must stay running to find links.")
        status = text(HostService.status, 20f)
        fun secret(label: String, value: String): EditText {
            text(label)
            return EditText(this).apply {
                setSingleLine(true); inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
                setText(value); layout.addView(this)
            }
        }
        fun select(label: String, options: Map<String, String>, value: String): Choice {
            text(label)
            val keys = options.keys.toList()
            val view = Spinner(this).apply {
                adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, options.values.toList())
                setSelection(keys.indexOf(value).coerceAtLeast(0)); layout.addView(this)
            }
            return Choice(view, keys)
        }
        val aio = secret("AIOmetadata manifest URL", settings.optString("aiometadataSavedManifestUrl"))
        val xp = secret("Xperience manifest URL", settings.optString("xperienceManifestUrl"))
        val active = select("Active manifest", mapOf("aiometadata" to "AIOmetadata", "xperience" to "Xperience"), settings.optString("inputMetadataAdapter", "aiometadata"))
        val mode = select("Episode mapping", mapOf("aiometadata" to "Translate using my metadata addon", "native" to "TMDB / reference numbering"), settings.optString("episodeMetadataSource", "aiometadata"))
        text("Translation follows the episode numbering of your selected addon. Use reference numbering for a TMDB-only profile.")
        val order = select("Input episode order", mapOf("auto" to "Automatic verification", "tvdb" to "TVDB — Aired order", "tmdb" to "TMDB"), settings.optString("inputMetadataProvider", "auto"))
        val edition = select("Editions", mapOf("all" to "All — VF and VOSTFR", "vf" to "VF", "vostfr" to "VOSTFR"), settings.optString("version", "all"))
        val key = secret("TMDB API key or read token (needed for some episode translations)", saved.optString("tmdbKey"))
        val lan = CheckBox(this).apply { text = "Allow devices on my home network"; isChecked = saved.optBoolean("lan"); layout.addView(this) }
        text("Default: this device only. Network access uses a private URL. For synced profiles use the host device’s LAN address; it must be reachable.")
        fun button(label: String, action: () -> Unit) = Button(this).apply { text = label; setOnClickListener { action() }; layout.addView(this) }
        button("Save and start / restart") {
            try {
                val config = JSONObject().put("aiometadataSavedManifestUrl", aio.text.toString().trim()).put("xperienceManifestUrl", xp.text.toString().trim())
                    .put("inputMetadataAdapter", active.value).put("episodeMetadataSource", mode.value)
                    .put("inputMetadataProvider", order.value).put("aiometadataIdType", "imdb").put("version", edition.value)
                HostConfig(config, key.text.toString().trim())
                store.save(JSONObject().put("settings", config).put("tmdbKey", key.text.toString().trim()).put("lan", lan.isChecked)
                    .put("token", saved.optString("token").ifEmpty { SecretStore.newToken() }.also { saved.put("token", it) }))
                store.enabled = true
                if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED)
                    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
                startForegroundService(Intent(this, HostService::class.java))
            } catch (_: Exception) { Toast.makeText(this, "Check the selected manifest and settings.", Toast.LENGTH_LONG).show() }
        }
        button("Copy addon URL for this device") { copyUrl("127.0.0.1") }
        button("Copy addon URL for home network") {
            if (!lan.isChecked) Toast.makeText(this, "Enable network access and save first.", Toast.LENGTH_LONG).show()
            else {
                val address = NetworkInterface.getNetworkInterfaces().toList().flatMap { it.inetAddresses.toList() }
                    .firstOrNull { it is java.net.Inet4Address && !it.isLoopbackAddress && it.isSiteLocalAddress }?.hostAddress
                if (address == null) Toast.makeText(this, "No home-network address found.", Toast.LENGTH_LONG).show() else copyUrl(address)
            }
        }
        button("Stop server") { store.enabled = false; stopService(Intent(this, HostService::class.java)) }
        text("No video proxy. Links are resolved from this device’s network. Signed links can stop working after an IP change. Startup after reboot is attempted while enabled; Android may require battery/autostart settings.")
    }
    private fun copyUrl(host: String) {
        try {
            val token = store.load().getString("token")
            val url = "http://$host:8765/$token/manifest.json"
            getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Private addon URL", url))
            Toast.makeText(this, "Private addon URL copied", Toast.LENGTH_SHORT).show()
        } catch (_: Exception) { Toast.makeText(this, "Save your configuration first.", Toast.LENGTH_SHORT).show() }
    }
    override fun onResume() { super.onResume(); handler.post(ticker) }
    override fun onPause() { handler.removeCallbacks(ticker); super.onPause() }
}
