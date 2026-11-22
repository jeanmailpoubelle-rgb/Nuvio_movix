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

class HostService : Service() {
    private val executor = java.util.concurrent.ThreadPoolExecutor(1, 1, 30, java.util.concurrent.TimeUnit.SECONDS,
        java.util.concurrent.LinkedBlockingQueue<Runnable>()).apply { allowCoreThreadTimeOut(true) }
    private val measurements = Handler(Looper.getMainLooper())
    @Volatile private var measurement = "Idle measurement has not been run"
    private var measuring = false
    private var server: AddonServer? = null
    @Volatile private var engine: Engine? = null
    private val destroyed = java.util.concurrent.atomic.AtomicBoolean(false)
    private val generation = java.util.concurrent.atomic.AtomicInteger()
    @Volatile private var localStatus = "Stopped"
    override fun onCreate() {
        super.onCreate(); current = this
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("host", "Local addon", NotificationManager.IMPORTANCE_LOW))
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val store = SecretStore(this)
        if (intent?.action == "stop" || !store.enabled) { store.enabled = false; stopSelf(); return START_NOT_STICKY }
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(this, 1, Intent(this, HostService::class.java).setAction("stop"), PendingIntent.FLAG_IMMUTABLE)
        startForeground(1, Notification.Builder(this, "host").setContentTitle("Anime-Sama Host")
            .setContentText("Local addon running · tap to configure").setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentIntent(open).addAction(Notification.Action.Builder(null, "Stop", stop).build()).setOngoing(true).build())
        val revision = generation.incrementAndGet()
        lastFailure = ""; localStatus = "Starting…"
        executor.execute {
            if (destroyed.get() || revision != generation.get()) return@execute
            try {
                localStatus = "Starting…"; server?.close(); server = null; engine = null
                val saved = store.load()
                val config = HostConfig(saved.getJSONObject("settings"), saved.optString("tmdbKey"))
                val engine = Engine(assets.open("anime-sama.js").bufferedReader().use { it.readText() },
                    HttpBridge(cacheClock = { SystemClock.elapsedRealtime() }))
                this.engine = engine
                server = AddonServer(engine, config, saved.getString("token"), saved.optBoolean("lan")).also { it.start() }
                if (destroyed.get() || revision != generation.get() || !store.enabled) {
                    server?.close(); server = null; this.engine = null; return@execute
                }
                localStatus = "Running"
            } catch (_: Exception) {
                localStatus = "Cannot start. Check configuration or port 8765."; lastFailure = localStatus
                server?.close(); engine?.close(); server = null; engine = null
                stopSelf(startId)
            }
        }
        return START_STICKY
    }
    override fun onDestroy() {
        measurements.removeCallbacksAndMessages(null)
        destroyed.set(true); generation.incrementAndGet()
        if (current === this) current = null
        executor.execute { server?.close(); server = null; engine = null }
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
            "HTTP worker threads: ${server?.workerThreads ?: 0}\n" + measurement
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
        val summary: String get() = current?.engine?.lastSummary ?: ""
        val resources: String get() = current?.resourceText() ?: ""
        fun measureIdleLoad() { current?.measureIdle() }
        val status: String get() = current?.localStatus ?: lastFailure.ifEmpty { "Stopped" }
        val running: Boolean get() = current?.server?.running == true
    }
}
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED && SecretStore(context).enabled) {
            try { context.startForegroundService(Intent(context, HostService::class.java)) } catch (_: Exception) { }
        }
    }
}
