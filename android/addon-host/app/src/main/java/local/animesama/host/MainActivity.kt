package local.animesama.host

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.app.UiModeManager
import android.content.*
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.*
import android.provider.Settings
import android.text.InputType
import android.view.*
import android.view.inputmethod.InputMethodManager
import android.widget.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.NetworkInterface

private class Choice(val view: Spinner, val keys: List<String>) { val value get() = keys[view.selectedItemPosition] }

/** Four small screens, shared credentials, per-addon presets. Native touch and D-pad controls. */
class MainActivity : Activity() {
    private lateinit var store: SecretStore
    private lateinit var body: LinearLayout
    private lateinit var status: TextView
    private var versions: TextView? = null
    private val handler = Handler(Looper.getMainLooper())
    private val tasks = java.util.concurrent.ThreadPoolExecutor(1, 1, 30, java.util.concurrent.TimeUnit.SECONDS,
        java.util.concurrent.LinkedBlockingQueue<Runnable>()).apply { allowCoreThreadTimeOut(true) }
    private var page = "addons"
    private var editing: JSONObject? = null
    private val controls = mutableListOf<View>()
    private val television get() = getSystemService(UiModeManager::class.java).currentModeType == Configuration.UI_MODE_TYPE_TELEVISION
    private val accent = Color.rgb(85, 219, 189)
    private fun dp(n: Int) = (n * resources.displayMetrics.density).toInt()
    private val ticker = object : Runnable {
        override fun run() {
            status.text = if (page == "updates") HostEngines.status else listOf(HostService.status, HostService.remoteStatus,
                HostService.summary).filter { it.isNotEmpty() }.joinToString("\n")
            if (page == "updates") versions?.text = HostEngines.versions()
            handler.postDelayed(this, 1500)
        }
    }
    override fun onCreate(state: Bundle?) {
        super.onCreate(state); store = SecretStore(this)
        page = state?.getString("page") ?: "addons"
        editing = state?.getString("editing")?.let { JSONObject(it) }
        try { store.load() } catch (_: Exception) {
            // Never overwrite unreadable credentials with a fresh installation.
            AlertDialog.Builder(this).setTitle("Secure storage unavailable").setMessage("Your saved settings have not been replaced. Close and reopen the app after unlocking Android.")
                .setPositiveButton("Close") { _, _ -> finish() }.setCancelable(false).show(); return
        }
        render()
    }
    override fun onSaveInstanceState(out: Bundle) {
        out.putString("page", page); editing?.let { out.putString("editing", it.toString()) }; super.onSaveInstanceState(out)
    }
    private fun text(value: String, size: Float = 16f, parent: LinearLayout = body): TextView = TextView(this).apply {
        text = value; textSize = size; setTextColor(Color.rgb(221, 229, 235))
        setPadding(0, dp(8), 0, dp(8)); parent.addView(this)
    }
    private fun section(title: String, description: String? = null): LinearLayout {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(12), dp(20), dp(18))
            background = GradientDrawable().apply { setColor(Color.rgb(25, 37, 48)); cornerRadius = dp(18).toFloat() }
        }
        body.addView(card, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(16) })
        text(title, 22f, card).apply { setTypeface(null, Typeface.BOLD) }
        description?.let { text(it, 16f, card) }
        return card
    }
    private fun control(view: View, id: Int, parent: LinearLayout) {
        view.id = id; view.minimumHeight = dp(54); view.setPadding(dp(14), dp(10), dp(14), dp(10))
        view.background = getDrawable(R.drawable.control_background)
        view.isFocusable = true; view.isFocusableInTouchMode = true
        parent.addView(view, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(8) })
        controls.add(view)
    }
    private fun button(id: Int, label: String, parent: LinearLayout = body, action: () -> Unit): Button = Button(this).apply {
        text = label; textSize = 17f; isAllCaps = false; setOnClickListener { action() }; control(this, id, parent)
    }
    private fun field(id: Int, label: String, value: String, parent: LinearLayout): EditText {
        text(label, parent = parent)
        return EditText(this).apply {
            setSingleLine(true); inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            textSize = 17f; setText(value); typeface = Typeface.create("sans", Typeface.NORMAL); control(this, id, parent)
            if (television) {
                showSoftInputOnFocus = false
                setOnKeyListener { _, code, event -> when (code) {
                    KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN -> {
                        if (event.action == KeyEvent.ACTION_DOWN) focusSearch(if (code == KeyEvent.KEYCODE_DPAD_UP) View.FOCUS_UP else View.FOCUS_DOWN)?.requestFocus()
                        true
                    }
                    KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER -> {
                        if (event.action == KeyEvent.ACTION_UP) getSystemService(InputMethodManager::class.java).showSoftInput(this, InputMethodManager.SHOW_IMPLICIT)
                        true
                    }
                    else -> false
                } }
            }
        }
    }
    private fun select(id: Int, label: String, options: Map<String, String>, value: String, parent: LinearLayout): Choice {
        text(label, parent = parent)
        val keys = options.keys.toList()
        val spinner = Spinner(this, Spinner.MODE_DIALOG).apply {
            prompt = label
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, options.values.toList())
            setSelection(keys.indexOf(value).coerceAtLeast(0)); control(this, id, parent)
        }
        return Choice(spinner, keys)
    }
    private fun navigate(next: String) { editing = null; page = next; render() }
    private fun render() {
        controls.clear(); versions = null
        body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(if (television) 40 else 18), dp(20), dp(if (television) 40 else 18), dp(32)) }
        val width = resources.configuration.screenWidthDp.coerceAtMost(980)
        val frame = FrameLayout(this).apply { addView(body, FrameLayout.LayoutParams(dp(width), -2, Gravity.CENTER_HORIZONTAL)) }
        setContentView(ScrollView(this).apply { isSmoothScrollingEnabled = !television; addView(frame) })
        text("Sources Host", if (television) 32f else 30f).apply { setTypeface(null, Typeface.BOLD); setTextColor(Color.WHITE) }
        val tabs = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        body.addView(tabs)
        for ((id, target, label) in listOf(Triple(R.id.tab_addons, "addons", "Addons"), Triple(R.id.configure, "metadata", "Metadata"),
            Triple(R.id.tab_connection, "connection", "Connection"), Triple(R.id.tab_updates, "updates", "Updates"))) {
            val tab = button(id, label, tabs) { navigate(target) }
            tab.layoutParams = LinearLayout.LayoutParams(0, -2, 1f).apply { marginEnd = dp(6) }
            tab.textSize = if (television) 17f else 13f
            tab.setPadding(dp(4), dp(10), dp(4), dp(10))
            if (page == target) tab.setTextColor(accent)
        }
        status = text(HostService.status, 15f)
        when (page) {
            "metadata" -> metadata()
            "connection" -> connection()
            "updates" -> updates()
            "edit" -> editor(requireNotNull(editing))
            else -> dashboard()
        }
        // Preserve horizontal tab navigation. Explicit vertical links apply to form/card controls.
        val vertical = controls.drop(4)
        for (i in vertical.indices) {
            vertical[i].nextFocusUpId = if (i > 0) vertical[i - 1].id else R.id.tab_addons
            vertical[i].nextFocusDownId = vertical.getOrNull(i + 1)?.id ?: vertical[i].id
        }
        (vertical.firstOrNull() ?: controls.firstOrNull())?.requestFocus()
    }
    private fun dashboard() {
        val saved = store.load()
        text("Your addons", 22f).apply { setTypeface(null, Typeface.BOLD) }
        button(R.id.add_addon, "+ Add addon") {
            val families = HostedAddons.families.entries.toList()
            AlertDialog.Builder(this).setTitle("Choose sources").setItems(families.map { it.value }.toTypedArray()) { _, index ->
                val family = families[index].key
                val adapter = if (store.load().optJSONObject("settings")?.optString("xperienceManifestUrl").isNullOrBlank()) "aiometadata" else "xperience"
                val addon = JSONObject().put("id", "addon-" + SecretStore.newToken().take(16)).put("token", SecretStore.newToken())
                    .put("family", family).put("name", families[index].value).put("enabled", true).put("access", "lan")
                    .put("options", JSONObject().put("inputMetadataAdapter", adapter).put("inputMetadataProvider", if (family == "sources-en") "tvdb" else "auto")
                        .put("episodeMetadataSource", "aiometadata").put("aiometadataIdType", "imdb").put("version", "all"))
                edit(addon)
            }.setNegativeButton("Cancel", null).show()
        }
        for ((index, addon) in HostedAddons.rows(saved).withIndex()) {
            val options = addon.getJSONObject("options")
            val mode = if (options.optString("episodeMetadataSource") == "native") "TMDB / reference" else
                if (options.optString("inputMetadataAdapter") == "xperience") "Xperience" else "AIOmetadata"
            val detail = (if (addon.optBoolean("enabled", true)) "Enabled" else "Paused") + " · $mode · " + when (addon.getString("access")) {
                "https" -> "Home network + HTTPS"; "remote" -> "This device + HTTPS"; "lan" -> "Home network"; else -> "This device"
            }
            val label = addon.getString("name") + "\n" + detail
            val styled = android.text.SpannableString(label).apply {
                setSpan(android.text.style.StyleSpan(Typeface.BOLD), 0, addon.getString("name").length, 0)
                setSpan(android.text.style.RelativeSizeSpan(1.15f), 0, addon.getString("name").length, 0)
            }
            button(if (index == 0) R.id.manage_addon else View.generateViewId(), label) { manage(addon) }.apply {
                text = styled; gravity = Gravity.START or Gravity.CENTER_VERTICAL
                setPadding(dp(20), dp(16), dp(20), dp(16))
                contentDescription = "Manage " + label
            }
        }
        if (HostedAddons.rows(saved).isEmpty()) text("Save your metadata credentials, then add your first addon.")
        val host = section("Host service", "The app can stay in the background. Stopping the service pauses all discovery; saved addon URLs stay valid.")
        button(R.id.start_saved, if (HostService.running) "Apply saved settings" else "Start host", host) { startHost() }
        button(R.id.stop_server, "Stop host", host) { store.enabled = false; stopService(Intent(this, HostService::class.java)) }
    }
    private fun edit(addon: JSONObject) { editing = JSONObject(addon.toString()); page = "edit"; render() }
    private fun manage(addon: JSONObject) {
        val actions = arrayOf("Edit configuration", if (addon.optBoolean("enabled", true)) "Pause addon" else "Resume addon", "Show / copy installation URL", "Delete addon")
        AlertDialog.Builder(this).setTitle(addon.getString("name")).setItems(actions) { _, index -> when (index) {
            0 -> edit(addon)
            1 -> { store.update { s -> HostedAddons.rows(s).first { it.getString("id") == addon.getString("id") }.put("enabled", !addon.optBoolean("enabled", true)) }; applyRunning(); render() }
            2 -> showAddonUrl(addon)
            3 -> AlertDialog.Builder(this).setTitle("Delete ${addon.getString("name")}?").setMessage("Its installation URL will stop working. Other addons and shared credentials stay saved.")
                .setPositiveButton("Delete") { _, _ ->
                    store.update { s -> s.put("addons", JSONArray(HostedAddons.rows(s).filter { it.getString("id") != addon.getString("id") })) }
                    applyRunning(); render()
                }.setNegativeButton("Cancel", null).show()
        } }.setNegativeButton("Close", null).show()
    }
    private fun editor(addon: JSONObject) {
        val family = addon.getString("family"); val options = addon.getJSONObject("options"); val en = family == "sources-en"
        val card = section("Configure ${HostedAddons.families.getValue(family)}")
        val name = field(R.id.addon_name, "Display name", addon.getString("name"), card)
        val active = select(R.id.active_manifest, "Metadata manifest", linkedMapOf("aiometadata" to "AIOmetadata", "xperience" to "Xperience"), options.optString("inputMetadataAdapter", "aiometadata"), card)
        val mode = if (!en) select(R.id.mapping_mode, "Numbering", linkedMapOf("aiometadata" to "Match selected metadata", "native" to "TMDB / reference profile"), options.optString("episodeMetadataSource", "aiometadata"), card) else null
        val orders = if (en) linkedMapOf("tvdb" to "TVDB — Aired order", "tmdb" to "TMDB") else linkedMapOf("auto" to "Automatic verification", "tvdb" to "TVDB — Aired order", "tmdb" to "TMDB")
        val order = select(R.id.episode_order, "Episode order in Nuvio", orders, options.optString("inputMetadataProvider", if (en) "tvdb" else "auto"), card)
        val edition = if (!en) select(R.id.editions, "Editions", linkedMapOf("all" to "VF and VOSTFR", "vf" to "VF", "vostfr" to "VOSTFR"), options.optString("version", "all"), card) else null
        if (en) text("Original, French and English audio; French and English subtitles. MULTI keeps all embedded tracks. Standard and Beta remain independent sources.", parent = card)
        val access = select(R.id.addon_access, "Where to use it", linkedMapOf("device" to "This device only", "lan" to "Home network", "remote" to "This device + HTTPS gateway", "https" to "Home network + HTTPS gateway"), addon.getString("access"), card)
        text("HTTPS uses the shared ngrok connection. Your private installation URL stays the same when you edit this addon.", parent = card)
        button(R.id.save_start, "Save addon", card) {
            try {
                val changed = JSONObject(addon.toString()).put("name", name.text.toString().trim()).put("access", access.value)
                val settings = JSONObject(options.toString()).put("inputMetadataAdapter", active.value).put("inputMetadataProvider", order.value)
                    .put("episodeMetadataSource", mode?.value ?: "aiometadata").put("version", edition?.value ?: "all")
                changed.put("options", settings)
                store.update { s ->
                    val rows = HostedAddons.rows(s).toMutableList(); val index = rows.indexOfFirst { it.getString("id") == changed.getString("id") }
                    if (index < 0) rows.add(changed) else rows[index] = changed
                    s.put("addons", JSONArray(rows)); HostedAddons.validate(s)
                }
                applyRunning(); navigate("addons")
            } catch (e: ConfigurationException) { if (e.field == "tmdbKey") error("TMDB key needed", "Save your TMDB API key or read token on the Metadata screen. This form has been kept.") else error("Metadata needed", "Save a valid personal ${if (e.field == "xperienceManifestUrl") "Xperience" else "AIOmetadata"} manifest on the Metadata screen, or choose your saved manifest. This form has been kept.") }
            catch (_: Exception) { error("Check addon settings", "Use a name of 1–60 characters and valid settings. Up to 12 addons can be saved. Your previous configuration is unchanged.") }
        }
        button(R.id.cancel_edit, "Cancel", card) { navigate("addons") }
    }
    private fun metadata() {
        val saved = store.load(); val settings = saved.optJSONObject("settings") ?: JSONObject()
        val card = section("Shared credentials", "Enter these once. Each addon selects which saved metadata manifest to use. These fields remain visible as requested.")
        val aio = field(R.id.aio_manifest, "AIOmetadata manifest", settings.optString("aiometadataSavedManifestUrl"), card)
        val xp = field(R.id.xperience_manifest, "Xperience manifest", settings.optString("xperienceManifestUrl"), card)
        val key = field(R.id.tmdb_key, "TMDB API key or read token", saved.optString("tmdbKey"), card)
        button(R.id.save_start, "Save credentials", card) {
            try {
                val normalized = JSONObject().put("episodeMetadataSource", "native").put("aiometadataSavedManifestUrl", aio.text.toString().trim()).put("xperienceManifestUrl", xp.text.toString().trim())
                HostConfig(normalized, key.text.toString())
                store.update { s ->
                    val shared = s.optJSONObject("settings") ?: JSONObject()
                    shared.put("aiometadataSavedManifestUrl", normalized.optString("aiometadataSavedManifestUrl"))
                        .put("xperienceManifestUrl", normalized.optString("xperienceManifestUrl"))
                    s.put("settings", shared).put("tmdbKey", key.text.toString().trim()); HostedAddons.validate(s)
                }
                applyRunning(); Toast.makeText(this, "Credentials saved", Toast.LENGTH_SHORT).show()
            } catch (e: ConfigurationException) {
                val view = if (e.field == "tmdbKey") key else if (e.field == "xperienceManifestUrl") xp else aio
                view.error = if (e.field == "tmdbKey") "A TMDB key is required by Sources EN+" else "Use your personal https:// or stremio:// metadata URL ending in /manifest.json"
                view.requestFocus(); error("Check metadata manifest", "Check the indicated field. GitHub plugin URLs cannot be used as metadata manifests. Credentials required by existing addons cannot be removed.")
            } catch (_: Exception) { error("Could not save", "Your previous credentials are unchanged.") }
        }
    }
    private fun connection() {
        val saved = store.load()
        val card = section("HTTPS gateway", "One connection serves every addon set to HTTPS access. Local-only addons are excluded from the tunnel.")
        val domain = field(R.id.ngrok_domain, "Assigned ngrok hostname", saved.optString("ngrokDomain"), card)
        val remote = CheckBox(this).apply { text = "Enable shared HTTPS connection"; isChecked = saved.optBoolean("remoteEnabled"); control(this, R.id.remote_enabled, card) }
        button(R.id.ngrok_key, "Create / show ngrok public key", card) {
            tasks.execute { try {
                val key = store.tunnelIdentity()
                runOnUiThread { if (!isDestroyed) showCopy("Register this public key at dashboard.ngrok.com/ssh-keys", key) }
            } catch (_: Exception) { runOnUiThread { error("Key unavailable", "Secure storage is unavailable. Existing keys have not been replaced.") } } }
        }
        text("Stop any Termux tunnel using this domain before connecting here. Your SSH private key stays in encrypted storage.", parent = card)
        button(R.id.save_start, "Save connection", card) {
            try {
                store.update { s ->
                    val host = domain.text.toString().trim()
                    require(host.isEmpty() || TunnelConfig.validDomain(host))
                    require(!remote.isChecked || (host.isNotBlank() && s.optString("tunnelPrivateKey").isNotBlank()))
                    s.put("ngrokDomain", host).put("remoteEnabled", remote.isChecked)
                }
                applyRunning(); Toast.makeText(this, "Connection saved", Toast.LENGTH_SHORT).show()
            } catch (_: Exception) { error("Check connection", "Enter only your assigned hostname, without https:// or a path. Create and register the app public key before enabling HTTPS. Previous settings are unchanged.") }
        }
        button(R.id.remote_reconnect, "Reconnect saved tunnel", card) { if (HostService.running) startService(Intent(this, HostService::class.java).setAction("remote-reconnect")) else startHost() }
        button(R.id.remote_stop, "Disconnect HTTPS", card) {
            store.update { it.put("remoteEnabled", false) }
            if (HostService.running) startService(Intent(this, HostService::class.java).setAction("remote-stop"))
            render()
        }
        val background = section("Background operation", "Allow background battery use on the hosting device. Android force-stop and some power-saving settings can prevent automatic recovery.")
        button(R.id.battery_settings, "Open Android battery settings", background) { try { startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) } catch (_: Exception) { error("Android settings", "Open this app’s battery settings manually.") } }
        button(R.id.measure_idle, "Measure idle load — 15 seconds", background) { HostService.measureIdleLoad() }
        text(HostService.resources, 14f, background)
    }
    private fun updates() {
        val card = section("Engine updates", "Discovery, mapping and resolver fixes can update without installing a new APK. Android service and UI changes still require an app update.")
        versions = text(HostEngines.versions(), parent = card)
        button(R.id.check_updates, "Check for engine updates", card) { HostEngines.check(this, force = true) }
        button(R.id.rollback_engine, "Use previous verified engines", card) {
            AlertDialog.Builder(this).setTitle("Roll back engine logic?").setMessage("Running lookups finish with their current version. New lookups use the previous verified release, or the APK fallback. A newer release can update it again.")
                .setPositiveButton("Roll back") { _, _ -> tasks.execute {
                    val changed = HostEngines.get(this).rollback()
                    runOnUiThread { if (!isDestroyed) { render(); Toast.makeText(this, if (changed) "Engines rolled back" else "Already using bundled engines", Toast.LENGTH_SHORT).show() } }
                } }.setNegativeButton("Cancel", null).show()
        }
        text("Only authenticated releases from this project are accepted. Checks run on startup and on demand, with a six-hour cooldown during use. No idle polling or episode preloading.", parent = card)
        text("Sources Host 0.3.0 · Android runtime API 1", 14f, card)
    }
    private fun showAddonUrl(addon: JSONObject) {
        val destinations = mutableListOf("This device" to "http://127.0.0.1:8765")
        if (addon.getString("access") in setOf("lan", "https")) {
            val address = try { NetworkInterface.getNetworkInterfaces().toList().flatMap { it.inetAddresses.toList() }
                .firstOrNull { it is java.net.Inet4Address && it.isSiteLocalAddress && !it.isLoopbackAddress }?.hostAddress } catch (_: Exception) { null }
            if (address != null) destinations.add("Home network" to "http://$address:8765")
        }
        val saved = store.load()
        if (addon.getString("access") in setOf("https", "remote") && TunnelConfig.validDomain(saved.optString("ngrokDomain")))
            destinations.add("HTTPS gateway" to "https://${saved.getString("ngrokDomain")}")
        AlertDialog.Builder(this).setTitle("Installation URL").setItems(destinations.map { it.first }.toTypedArray()) { _, index ->
            showCopy("Paste into Nuvio → Addons", destinations[index].second + "/" + addon.getString("token") + "/manifest.json")
        }.setNegativeButton("Close", null).show()
    }
    private fun showCopy(title: String, value: String) {
        val label = TextView(this).apply { text = value; textSize = 17f; setTextIsSelectable(true); setPadding(dp(24), dp(16), dp(24), dp(16)) }
        AlertDialog.Builder(this).setTitle(title).setView(label).setPositiveButton("Copy") { _, _ ->
            getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText(title, value))
            Toast.makeText(this, "Copied", Toast.LENGTH_SHORT).show()
        }.setNegativeButton("Close", null).show()
    }
    private fun error(title: String, message: String) { if (!isFinishing && !isDestroyed) AlertDialog.Builder(this).setTitle(title).setMessage(message).setPositiveButton("OK", null).show() }
    private fun applyRunning() { if (HostService.running) startService(Intent(this, HostService::class.java).setAction("reload")) }
    private fun startHost() {
        try {
            require(HostedAddons.rows(store.load()).any { it.optBoolean("enabled", true) })
            HostedAddons.validate(store.load()); store.enabled = true
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED)
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
            startForegroundService(Intent(this, HostService::class.java).setAction(if (HostService.running) "reload" else "start"))
        } catch (_: Exception) { error("Host not started", "Save and enable at least one addon with valid metadata settings first.") }
    }
    @Suppress("DEPRECATION")
    override fun onBackPressed() { if (page != "addons") navigate("addons") else super.onBackPressed() }
    override fun onResume() { super.onResume(); if (::status.isInitialized) handler.post(ticker) }
    override fun onPause() { handler.removeCallbacks(ticker); super.onPause() }
    override fun onDestroy() { tasks.shutdown(); super.onDestroy() }
}
