package local.animesama.host

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.app.UiModeManager
import android.content.res.Configuration
import android.content.pm.PackageManager
import android.view.*
import android.view.inputmethod.InputMethodManager
import android.content.*
import android.os.*
import android.text.InputType
import android.provider.Settings
import android.widget.*
import org.json.JSONObject
import java.net.NetworkInterface

private class RemoteSetupException : IllegalArgumentException()

private class Choice(val view: Spinner, val keys: List<String>) { val value: String get() = keys[view.selectedItemPosition] }

/** Native controls work with touch and TV directional focus. No WebView dependency. */
class MainActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var status: TextView
    private lateinit var resources: TextView
    private lateinit var store: SecretStore
    private val tasks = java.util.concurrent.ThreadPoolExecutor(1, 1, 30, java.util.concurrent.TimeUnit.SECONDS,
        java.util.concurrent.LinkedBlockingQueue<Runnable>()).apply { allowCoreThreadTimeOut(true) }
    private val television: Boolean get() = getSystemService(UiModeManager::class.java).currentModeType == Configuration.UI_MODE_TYPE_TELEVISION
    private fun dp(value: Int) = (value * getResources().displayMetrics.density).toInt()
    private val ticker = object : Runnable { override fun run() { status.text = listOf(HostService.status, HostService.remoteStatus, HostService.summary).filter { it.isNotEmpty() }.joinToString("\n"); resources.text = HostService.resources; handler.postDelayed(this, 1000) } }
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        store = SecretStore(this)
        val saved = try { store.load() } catch (_: Exception) { JSONObject() }
        val settings = saved.optJSONObject("settings") ?: JSONObject()
        val padding = if (television) 48 else 20
        val width = (getResources().configuration.screenWidthDp - padding * 2).coerceIn(1, 900)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(24), 0, dp(32)) }
        val frame = FrameLayout(this).apply {
            setPadding(dp(padding), 0, dp(padding), 0)
            addView(layout, FrameLayout.LayoutParams(dp(width), ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER_HORIZONTAL))
        }
        setContentView(ScrollView(this).apply {
            isSmoothScrollingEnabled = !television
            descendantFocusability = ViewGroup.FOCUS_AFTER_DESCENDANTS
            addView(frame)
        })
        val controls = mutableListOf<View>()
        fun control(view: View, id: Int) {
            view.id = id
            view.minimumHeight = dp(56)
            view.setPadding(dp(16), dp(10), dp(16), dp(10))
            view.background = getDrawable(R.drawable.control_background)
            view.isFocusable = true
            view.isFocusableInTouchMode = true
            layout.addView(view, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(8) })
            controls.add(view)
        }
        fun text(value: String, size: Float = if (television) 18f else 16f) = TextView(this).apply {
            text = value; textSize = size; setPadding(0, dp(12), 0, dp(8)); layout.addView(this)
        }
        fun button(id: Int, label: String, action: () -> Unit) = Button(this).apply {
            text = label; textSize = 18f; isAllCaps = false; setOnClickListener { action() }; control(this, id)
        }
        text("Anime-Sama Host", if (television) 30f else 26f)
        text("Start here, then add the addon URL under Addons in Nuvio. The server must stay running to find links.")
        if (television) text("Remote: use ↑ / ↓ to move, OK to select or edit, and Back to close the keyboard. Home leaves the server running.")
        status = text(HostService.status, 20f)
        resources = text(HostService.resources)
        if (!television) resources.setTextIsSelectable(true)
        lateinit var firstInput: EditText
        val configure = button(R.id.configure, "Configure metadata") { firstInput.requestFocus() }
        button(R.id.start_saved, "Start saved server") { startHost() }.isEnabled = saved.has("settings")
        button(R.id.measure_idle, "Measure idle load — 15 seconds") { HostService.measureIdleLoad() }
        text("This samples the host app only. Open another app during the sample to exclude activity on this setup screen.")
        fun secret(id: Int, label: String, value: String): EditText {
            text(label)
            return EditText(this).apply {
                setSingleLine(true); inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
                textSize = 18f; setText(value); control(this, id)
                if (television) {
                    showSoftInputOnFocus = false
                    setOnKeyListener { _, code, event ->
                        when (code) {
                            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN -> {
                                if (event.action == KeyEvent.ACTION_DOWN)
                                    focusSearch(if (code == KeyEvent.KEYCODE_DPAD_UP) View.FOCUS_UP else View.FOCUS_DOWN)?.requestFocus()
                                true
                            }
                            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER -> {
                                if (event.action == KeyEvent.ACTION_UP) getSystemService(InputMethodManager::class.java).showSoftInput(this, InputMethodManager.SHOW_IMPLICIT)
                                true
                            }
                            else -> false
                        }
                    }
                }
            }
        }
        fun select(id: Int, label: String, options: Map<String, String>, value: String): Choice {
            text(label)
            val keys = options.keys.toList()
            val view = Spinner(this, if (television) Spinner.MODE_DIALOG else Spinner.MODE_DROPDOWN).apply {
                prompt = label
                adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, options.values.toList())
                setSelection(keys.indexOf(value).coerceAtLeast(0)); control(this, id)
            }
            return Choice(view, keys)
        }
        val aio = secret(R.id.aio_manifest, "AIOmetadata manifest URL", settings.optString("aiometadataSavedManifestUrl"))
        firstInput = aio
        val xp = secret(R.id.xperience_manifest, "Xperience manifest URL", settings.optString("xperienceManifestUrl"))
        val active = select(R.id.active_manifest, "Active manifest", mapOf("aiometadata" to "AIOmetadata", "xperience" to "Xperience"), settings.optString("inputMetadataAdapter", "aiometadata"))
        val mode = select(R.id.mapping_mode, "Episode mapping", mapOf("aiometadata" to "Translate using my metadata addon", "native" to "TMDB / reference numbering"), settings.optString("episodeMetadataSource", "aiometadata"))
        text("Translation follows the episode numbering of your selected addon. Use reference numbering for a TMDB-only profile.")
        val order = select(R.id.episode_order, "Input episode order", mapOf("auto" to "Automatic verification", "tvdb" to "TVDB — Aired order", "tmdb" to "TMDB"), settings.optString("inputMetadataProvider", "auto"))
        val edition = select(R.id.editions, "Editions", mapOf("all" to "All — VF and VOSTFR", "vf" to "VF", "vostfr" to "VOSTFR"), settings.optString("version", "all"))
        val key = secret(R.id.tmdb_key, "TMDB API key or read token (needed for some episode translations)", saved.optString("tmdbKey"))
        val lan = CheckBox(this).apply { text = "Allow devices on my home network"; isChecked = saved.optBoolean("lan"); textSize = 18f; control(this, R.id.lan_access) }
        text("Default: this device only. Network access uses a private URL. For synced profiles use the host device’s LAN address; it must be reachable.")
        text("Remote access — ngrok")
        val remote = CheckBox(this).apply { text = "Enable HTTPS remote access"; isChecked = saved.optBoolean("remoteEnabled"); textSize = 18f; control(this, R.id.remote_enabled) }
        val domain = secret(R.id.ngrok_domain, "Assigned ngrok hostname (without https://)", saved.optString("ngrokDomain"))
        text("Register this app’s public SSH key once in your ngrok dashboard. Stop the Termux tunnel before enabling the same domain here. Your addon token and HTTPS URL stay the same.")
        button(R.id.ngrok_key, "Create / copy ngrok public key") {
            findViewById<Button>(R.id.ngrok_key).isEnabled = false
            tasks.execute {
                    try {
                        val publicKey = store.tunnelIdentity()
                        runOnUiThread { if (!isFinishing && !isDestroyed) {
                            findViewById<Button>(R.id.ngrok_key).isEnabled = true
                            getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Public ngrok SSH key", publicKey))
                            val value = TextView(this).apply { text = publicKey; textSize = 16f; setTextIsSelectable(true); setPadding(dp(24), dp(16), dp(24), dp(16)) }
                            AlertDialog.Builder(this).setTitle("Register this public key with ngrok").setView(value)
                                .setPositiveButton("Copy") { _, _ -> getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Public ngrok SSH key", publicKey)) }
                                .setNeutralButton("Open ngrok") { _, _ ->
                                    try { startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("https://dashboard.ngrok.com/ssh-keys"))) }
                                    catch (_: Exception) { showError("ngrok public key", "Open dashboard.ngrok.com/ssh-keys on your phone and register the copied public key.") }
                                }.setNegativeButton("Close", null).show()
                        } }
                    } catch (_: Exception) { runOnUiThread { if (!isFinishing && !isDestroyed) { findViewById<Button>(R.id.ngrok_key).isEnabled = true; showError("Could not prepare SSH key", "Secure storage or key generation failed. Your existing settings and key have not been replaced.") } } }
            }
        }
        button(R.id.save_start, "Save and start / restart") save@ {
            val config = JSONObject().put("aiometadataSavedManifestUrl", aio.text.toString().trim()).put("xperienceManifestUrl", xp.text.toString().trim())
                .put("inputMetadataAdapter", active.value).put("episodeMetadataSource", mode.value)
                .put("inputMetadataProvider", order.value).put("aiometadataIdType", "imdb").put("version", edition.value)
            try { HostConfig(config, key.text.toString().trim()) }
            catch (error: ConfigurationException) {
                val xperience = error.field == "xperienceManifestUrl"
                val name = if (xperience) "Xperience" else "AIOmetadata"
                val field = if (xperience) xp else aio
                val explanation = when (error.problem) {
                    "MISSING_SELECTED" -> "$name is selected under Active manifest, but its URL field is empty. Paste your personal manifest into the $name field, or change Active manifest."
                    "PLUGIN_MANIFEST" -> "Use your personal $name metadata manifest, not a GitHub plugin installation URL."
                    else -> "Check the $name field: use a complete https:// or stremio:// URL ending in /manifest.json (a query after it is allowed). Remove spaces inside the URL."
                }
                field.error = explanation
                field.requestFocus()
                showError("Check $name manifest", explanation)
                return@save
            } catch (_: Exception) {
                showError("Check episode settings", "Select the metadata adapter, episode order and editions again, then save.")
                return@save
            }
            try {
                store.update { current ->
                    if (remote.isChecked && (!TunnelConfig.validDomain(domain.text.toString().trim()) || current.optString("tunnelPrivateKey").isBlank()))
                        throw RemoteSetupException()
                    current.put("settings", config).put("tmdbKey", key.text.toString().trim()).put("lan", lan.isChecked)
                        .put("token", current.optString("token").ifEmpty { SecretStore.newToken() })
                        .put("remoteEnabled", remote.isChecked).put("ngrokDomain", domain.text.toString().trim())
                }
            } catch (_: RemoteSetupException) {
                showError("Check remote setup", "Enter the assigned ngrok hostname without https://, then create/copy the app public key and register it with ngrok. Your Termux key is separate.")
                return@save
            } catch (error: Exception) {
                showError("Could not save configuration", "Android secure storage could not save these settings. Your typed values are still on this screen. Try saving again; this is not an API-key verification error.\n\nCode: STORAGE_SAVE_FAILED / ${error.javaClass.simpleName}")
                return@save
            }
            findViewById<Button>(R.id.start_saved).isEnabled = true
            startHost()
        }
        button(R.id.local_url, if (television) "Show / copy addon URL for this TV" else "Copy addon URL for this device") { copyUrl("127.0.0.1") }
        button(R.id.lan_url, if (television) "Show / copy home-network addon URL" else "Copy addon URL for home network") {
            if (!store.load().optBoolean("lan")) Toast.makeText(this, "Enable network access and save first.", Toast.LENGTH_LONG).show()
            else {
                val address = NetworkInterface.getNetworkInterfaces().toList().flatMap { it.inetAddresses.toList() }
                    .firstOrNull { it is java.net.Inet4Address && !it.isLoopbackAddress && it.isSiteLocalAddress }?.hostAddress
                if (address == null) Toast.makeText(this, "No home-network address found.", Toast.LENGTH_LONG).show() else copyUrl(address)
            }
        }
        button(R.id.remote_url, "Copy HTTPS addon URL") {
            try {
                val current = store.load()
                val url = TunnelConfig.addonUrl(current.optString("ngrokDomain"), current.optString("token"))
                val value = TextView(this).apply { text = url; textSize = 18f; setTextIsSelectable(true); setPadding(dp(24), dp(16), dp(24), dp(16)) }
                AlertDialog.Builder(this).setTitle("Private HTTPS addon URL").setView(value)
                    .setPositiveButton("Copy") { _, _ -> getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Private addon URL", url)) }
                    .setNegativeButton("Close", null).show()
            } catch (_: Exception) { showError("Save remote setup first", "Save a valid ngrok hostname and your metadata settings first. The copied URL works while server and tunnel are running.") }
        }
        button(R.id.remote_reconnect, "Reconnect saved tunnel") {
            try {
                if (!store.load().optBoolean("remoteEnabled") || !HostService.running) showError("Save and start first", "Enable HTTPS remote access and save/start the host first.")
                else startService(Intent(this, HostService::class.java).setAction("remote-reconnect"))
            } catch (_: Exception) { showError("Could not reconnect", "Use Save and start / restart to retry.") }
        }
        button(R.id.remote_stop, "Stop tunnel — keep local server") {
            try {
                if (HostService.running) startService(Intent(this, HostService::class.java).setAction("remote-stop"))
                else store.update { it.put("remoteEnabled", false) }
                remote.isChecked = false
            } catch (_: Exception) { showError("Could not stop tunnel", "Use Stop server to stop both components.") }
        }
        button(R.id.battery_settings, "Background battery settings") {
            try { startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) }
            catch (_: Exception) { showError("Background usage", "In Android settings, allow unrestricted battery usage for Anime-Sama Host. Android may still require an unlock or reopening after force-stop.") }
        }
        button(R.id.stop_server, "Stop server") { store.enabled = false; stopService(Intent(this, HostService::class.java)) }
        text("No video proxy. Links are resolved from this device’s network. Signed links can stop working after an IP change. Startup after reboot is attempted while enabled; Android may require battery/autostart settings.")
        // Stable resource IDs also let Android restore unsaved fields/focus after
        // activity recreation. Disabled controls are skipped by normal focus search.
        for ((index, view) in controls.withIndex()) {
            view.nextFocusUpId = controls.getOrNull(index - 1)?.id ?: view.id
            view.nextFocusDownId = controls.getOrNull(index + 1)?.id ?: view.id
            view.nextFocusForwardId = view.nextFocusDownId
        }
        if (television && state == null) configure.requestFocus()

    }
    private fun showError(title: String, explanation: String) {
        // Never display exception text: URI/Keystore errors can contain secrets.
        AlertDialog.Builder(this).setTitle(title).setMessage(explanation).setPositiveButton("OK", null).show()
    }
    private fun startHost() {
        try {
            store.enabled = true
            if (!television && Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
            startForegroundService(Intent(this, HostService::class.java))
        } catch (error: Exception) {
            showError("Settings saved — server could not start", "Android refused to start the service. Reopen this app and try Start saved server. The manifest and API key were saved; check the device’s app permissions or background restrictions.\n\nCode: SERVICE_START_FAILED / ${error.javaClass.simpleName}")
        }
    }
    private fun copyUrl(host: String) {
        try {
            val token = store.load().getString("token")
            val url = "http://$host:8765/$token/manifest.json"
            fun copy() {
                getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Private addon URL", url))
                Toast.makeText(this, "Private addon URL copied", Toast.LENGTH_SHORT).show()
            }
            if (television) {
                val value = TextView(this).apply { text = url; textSize = 18f; setPadding(dp(24), dp(16), dp(24), dp(16)) }
                AlertDialog.Builder(this).setTitle("Private addon URL").setView(value)
                    .setPositiveButton("Copy") { _, _ -> copy() }.setNegativeButton("Close", null).show()
            } else copy()
        } catch (_: Exception) { Toast.makeText(this, "Save your configuration first.", Toast.LENGTH_SHORT).show() }
    }
    override fun onResume() { super.onResume(); handler.post(ticker) }
    override fun onPause() { handler.removeCallbacks(ticker); super.onPause() }
    override fun onDestroy() { tasks.shutdown(); super.onDestroy() }
}
