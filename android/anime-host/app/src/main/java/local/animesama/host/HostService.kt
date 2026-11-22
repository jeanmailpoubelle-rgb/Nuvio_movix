package local.animesama.host

import android.app.*
import android.content.*
import android.os.IBinder
import java.util.concurrent.Executors

class HostService : Service() {
    private val executor = Executors.newSingleThreadExecutor()
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
                val engine = Engine(assets.open("anime-sama.js").bufferedReader().use { it.readText() })
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
        destroyed.set(true); generation.incrementAndGet()
        if (current === this) current = null
        executor.execute { server?.close(); server = null; engine = null }
        executor.shutdown()
        super.onDestroy()
    }
    override fun onBind(intent: Intent?): IBinder? = null
    companion object {
        @Volatile private var current: HostService? = null
        @Volatile private var lastFailure = ""
        val summary: String get() = current?.engine?.lastSummary ?: ""
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
