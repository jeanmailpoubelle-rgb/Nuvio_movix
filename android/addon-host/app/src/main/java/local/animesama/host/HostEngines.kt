package local.animesama.host

import android.content.Context
import kotlinx.coroutines.*
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

/** Process singleton: background checks never delay discovery or wake an idle device. */
object HostEngines {
    private var packages: EnginePackages? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val checking = AtomicBoolean(false)
    fun get(context: Context): EnginePackages = synchronized(this) {
        packages ?: EnginePackages(File(context.filesDir, "engine-releases"),
            context.assets.open("release-public.pem").bufferedReader().use { it.readText() },
            context.assets.open("engine-package.json").bufferedReader().use { it.readText() },
            { name -> context.assets.open(name).bufferedReader().use { it.readText() } }).also { packages = it }
    }
    fun check(context: Context, force: Boolean = false) {
        if (!checking.compareAndSet(false, true)) return
        scope.launch { try { withTimeout(90_000) { get(context.applicationContext).check(force) } } finally { checking.set(false) } }
    }
    val status: String get() = synchronized(this) { packages?.status ?: "Bundled engines · not checked yet" }
    fun versions(): String = synchronized(this) {
        packages?.snapshot()?.manifest?.getJSONObject("engines")?.let { m ->
            HostedAddons.families.entries.joinToString("\n") { "${it.value} · ${m.getJSONObject(it.key).getString("version")}" }
        } ?: "Anime-Sama+ · Sources FR+ · Sources EN+"
    }
}
