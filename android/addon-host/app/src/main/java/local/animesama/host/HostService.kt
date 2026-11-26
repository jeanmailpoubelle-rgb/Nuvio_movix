package local.animesama.host

import android.app.*
import android.content.*
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.os.Process
import android.os.Debug
import java.util.Locale
import android.net.ConnectivityManager
import android.net.Network
import org.json.JSONObject

class HostService : Service() {
    private val executor = java.util.concurrent.ThreadPoolExecutor(1, 1, 30, java.util.concurrent.TimeUnit.SECONDS,
        java.util.concurrent.LinkedBlockingQueue<Runnable>()).apply { allowCoreThreadTimeOut(true) }
    private val measurements = Handler(Looper.getMainLooper())
    @Volatile private var measurement = "Idle measurement has not been run"
    private var measuring = false
    private var server: AddonServer? = null
    private var remoteServer: AddonServer? = null
    @Volatile private var routes: List<AddonEndpoint> = emptyList()
    private val tunnel = TunnelController(factory = { remoteAddonConnection() })
    private var networkRegistered = false
    private val networkChanges = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) { tunnel.networkAvailable() }
        override fun onLost(network: Network) { tunnel.networkLost() }
    }
    private var remoteConfiguration: TunnelConfig? = null
    private fun startRemote(saved: JSONObject, force: Boolean = false) {
        if (!saved.optBoolean("remoteEnabled") || HostedAddons.rows(saved).none { it.optBoolean("enabled") && it.optString("access") in setOf("https", "remote") }) { tunnel.stop(); remoteConfiguration = null; return }
        try {
            val next = TunnelConfig(saved.optString("ngrokDomain"), saved.optString("tunnelPrivateKey"))
            if (!force && remoteConfiguration?.domain == next.domain && remoteConfiguration?.privateKey == next.privateKey) return
            tunnel.start(next); remoteConfiguration = next
        }
        catch (_: Exception) { tunnel.stop(); remoteConfiguration = null; remoteFailure = "Remote setup incomplete: save a valid ngrok domain and register the app public key" }
    }
    @Volatile private var engine: HostedRuntime? = null
    private val destroyed = java.util.concurrent.atomic.AtomicBoolean(false)
    private val generation = java.util.concurrent.atomic.AtomicInteger()
    @Volatile private var localStatus = "Stopped"
    override fun onCreate() {
        super.onCreate(); current = this
        try { getSystemService(ConnectivityManager::class.java).registerDefaultNetworkCallback(networkChanges); networkRegistered = true }
        catch (_: Exception) { /* Heartbeat and capped retry still recover without callbacks. */ }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("host", "Local addon", NotificationManager.IMPORTANCE_LOW))
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val store = SecretStore(this)
        if (intent?.action == "stop" || !store.enabled) { store.enabled = false; stopSelf(); return START_NOT_STICKY }
        if (intent?.action == "reload" && server?.running == true) {
            executor.execute {
                if (destroyed.get()) return@execute
                try { val saved = store.load(); reload(saved); startRemote(saved) }
                catch (_: Exception) { lastFailure = "Settings could not be applied; previous configuration kept" }
            }
            return START_STICKY
        }
        if (intent?.action in listOf("remote-stop", "remote-reconnect")) {
            executor.execute {
                if (destroyed.get()) return@execute
                try {
                    val saved = store.load()
                    remoteFailure = ""
                    if (intent?.action == "remote-stop") {
                        store.update { it.put("remoteEnabled", false) }; tunnel.stop(); remoteConfiguration = null
                    } else startRemote(saved, force = true)
                } catch (_: Exception) { remoteFailure = "Could not read remote configuration"; tunnel.stop() }
            }
            return START_STICKY
        }
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1, Intent(this, HostService::class.java).setAction("stop"), PendingIntent.FLAG_IMMUTABLE)
        startForeground(1, Notification.Builder(this, "host").setContentTitle("Sources Host")
            .setContentText("Addon server · open for local/tunnel status").setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentIntent(open).addAction(Notification.Action.Builder(null, "Stop", stop).build()).setOngoing(true).build())
        val revision = generation.incrementAndGet()
        lastFailure = ""; remoteFailure = ""; localStatus = "Starting…"
        executor.execute {
            if (destroyed.get() || revision != generation.get()) return@execute
            try {
                localStatus = "Starting…"; tunnel.stop(); remoteConfiguration = null; server?.close(); remoteServer?.close(); engine?.close(); server = null; remoteServer = null; engine = null
                val saved = store.load()
                val engine = HostedRuntime(HostEngines.get(this), HttpBridge(cacheClock = { SystemClock.elapsedRealtime() }),
                    onLookup = { HostEngines.check(this) })
                this.engine = engine
                reload(saved)
                // Separate ingress prevents a local-only capability being exposed by another addon's tunnel.
                server = AddonServer({ routes }, lan = true).also { it.start() }
                remoteServer = AddonServer({ routes }, port = 8766, remoteIngress = true).also { it.start() }
                HostEngines.check(this)
                if (destroyed.get() || revision != generation.get() || !store.enabled) {
                    server?.close(); remoteServer?.close(); engine.close(); server = null; remoteServer = null; this.engine = null; return@execute
                }
                localStatus = "Running"
                startRemote(saved)
            } catch (_: Exception) {
                localStatus = "Cannot start. Check configuration or port 8765."; lastFailure = localStatus
                server?.close(); remoteServer?.close(); engine?.close(); server = null; remoteServer = null; engine = null
                tunnel.stop(); stopSelf(startId)
            }
        }
        return START_STICKY
    }
    private fun reload(saved: JSONObject) {
        HostedAddons.validate(saved)
        val runtime = requireNotNull(engine)
        val next = HostedAddons.rows(saved).map { addon ->
            val family = addon.getString("family"); val config = HostedAddons.config(saved, addon)
            val id = if (addon.optBoolean("legacy")) "local.animesama.host" else "local.sources.host." + addon.getString("id")
            AddonEndpoint(addon.getString("token"), id, addon.getString("name"), addon.optBoolean("enabled", true),
                addon.getString("access"), lookup = { request -> runtime.streams(family, request, config) },
                captions = { request, filename -> runtime.subtitles(family, request, config, filename) })
        }
        routes = next
    }
    override fun onDestroy() {
        measurements.removeCallbacksAndMessages(null)
        destroyed.set(true); generation.incrementAndGet()
        if (networkRegistered) {
            try { getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(networkChanges) } catch (_: Exception) { }
            networkRegistered = false
        }
        tunnel.close()
        if (current === this) current = null
        executor.execute { server?.close(); remoteServer?.close(); engine?.close(); server = null; remoteServer = null; engine = null }
        executor.shutdown()
        super.onDestroy()
    }
    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        // UI_HIDDEN means the user opened Nuvio: retain useful caches then.
        if (level == ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW || level == ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL ||
            level >= ComponentCallbacks2.TRIM_MEMORY_BACKGROUND) engine?.trimMemory()
    }
    override fun onLowMemory() { super.onLowMemory(); engine?.trimMemory() }
    private fun resourceText(): String {
        val stats = engine?.stats() ?: return ""
        val cache = stats.cache
        return "Searches: ${stats.active} active · ${stats.queued} waiting\n" +
            "Metadata cache: ${cache.metadata.bytes / 1024} KiB / 4096 · Series IDs: ${cache.identities.entries} / 128\n" +
            "HTTP requests: ${cache.networkRequests} · Cache hits: ${cache.metadata.hits + cache.identities.hits}\n" +
            "HTTP worker threads: ${(server?.workerThreads ?: 0) + (remoteServer?.workerThreads ?: 0)}\n" + measurement
    }
    private fun measureIdle() {
        val selected = engine ?: return
        if (measuring) return
        val before = selected.stats()
        if (before.active != 0 || before.queued != 0) { measurement = "Wait for searches to finish before measuring idle load"; return }
        measuring = true
        val start = SystemClock.elapsedRealtime(); val cpu = Process.getElapsedCpuTime()
        measurement = "Measuring for 15 seconds. You can open another app, then return here."
        measurements.postDelayed({
            measuring = false
            if (engine !== selected) { measurement = "Server restarted; run a new idle measurement"; return@postDelayed }
            val after = selected.stats()
            if (after.requests != before.requests || after.active != 0 || after.queued != 0) {
                measurement = "Search activity occurred during the sample; run it again while idle"
            } else {
                val elapsed = (SystemClock.elapsedRealtime() - start).coerceAtLeast(1)
                val percent = 100.0 * (Process.getElapsedCpuTime() - cpu) / elapsed
                measurement = String.format(Locale.US, "Last idle sample: %.2f%% of one CPU core · %.1f MiB PSS", percent, Debug.getPss() / 1024.0)
            }
        }, 15_000)
    }
    override fun onBind(intent: Intent?): IBinder? = null
    companion object {
        @Volatile private var current: HostService? = null
        @Volatile private var lastFailure = ""
        @Volatile private var remoteFailure = ""
        val summary: String get() = current?.engine?.lastSummary ?: ""
        val remoteStatus: String get() = current?.let { remoteFailure.ifEmpty { it.tunnel.status.text() } } ?: "Remote access off"
        val resources: String get() = current?.resourceText() ?: ""
        fun measureIdleLoad() { current?.measureIdle() }
        val status: String get() = current?.localStatus ?: lastFailure.ifEmpty { "Stopped" }
        val running: Boolean get() = current?.server?.running == true
    }
}
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action in listOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED) && SecretStore(context).enabled) {
            try { context.startForegroundService(Intent(context, HostService::class.java)) } catch (_: Exception) { }
        }
    }
}
