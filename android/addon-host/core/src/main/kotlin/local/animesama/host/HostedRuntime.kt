package local.animesama.host

import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import org.json.JSONArray
import org.json.JSONObject

internal object HostExecutionBudget { val contexts = Semaphore(3) }

/** One pool/cache/admission budget for every family. Playback grants remain lookup-local in JS. */
class HostedRuntime(private val packages: EnginePackages, private val bridge: HttpBridge = HttpBridge(),
                    private val onLookup: () -> Unit = {}, private val lookupTimeoutMs: Long = 51_000) : AutoCloseable {
    init { require(lookupTimeoutMs in 25..51_000) }
    private val lookups = Semaphore(2)
    private val contexts = HostExecutionBudget.contexts
    private class Lease(val engine: Engine, var users: Int = 0)
    private val engines = linkedMapOf<String, Lease>()
    private val active = java.util.concurrent.atomic.AtomicInteger()
    private val waiting = java.util.concurrent.atomic.AtomicInteger()
    private val requests = java.util.concurrent.atomic.AtomicLong()
    @Volatile var lastSummary = "No searches yet"
        private set
    suspend fun streams(family: String, request: EpisodeRequest, config: HostConfig, onlyEntry: Int? = null): String {
        require(family in HostedAddons.families)
        require(waiting.incrementAndGet() <= 8) { waiting.decrementAndGet(); "Search queue full" }
        requests.incrementAndGet()
        var admitted = false
        try {
            return withTimeout(lookupTimeoutMs + 3_000) { lookups.withPermit {
                waiting.decrementAndGet(); admitted = true; active.incrementAndGet()
                try { execute(family, request, config, onlyEntry) } finally { active.decrementAndGet() }
            } }
        } finally {
            if (!admitted) waiting.decrementAndGet()
        }
    }
    suspend fun subtitles(family: String, request: EpisodeRequest, config: HostConfig, filename: String): String {
        require(family in HostedAddons.families)
        val scope = if (config.captionScope.isNotEmpty()) "-" + config.captionScope else ""
        val match = Regex("^source-$family$scope-([0-7])-[a-f0-9]{20}\\.(?:m3u8|mp4|mpd)$").matchEntire(filename)
            ?: return "{\"subtitles\":[]}"
        val result = JSONObject(streams(family, request, config, match.groupValues[1].toInt())).getJSONArray("streams")
        val candidates = (0 until result.length()).mapNotNull { result.optJSONObject(it) }.filter {
            it.optJSONObject("behaviorHints")?.optString("filename") == filename
        }.mapNotNull { it.optJSONArray("subtitles")?.toString() }.distinct()
        // Fresh semantics must select one caption inventory. Never borrow another edition's tracks.
        return JSONObject().put("subtitles", if (candidates.size == 1) JSONArray(candidates.single()) else JSONArray()).toString()
    }
    private suspend fun execute(family: String, request: EpisodeRequest, config: HostConfig, onlyEntry: Int?): String = coroutineScope {
        onLookup()
        val started = System.nanoTime()
        // Captured once: an update or rollback never changes half a running request.
        val version = packages.snapshot()
        val definitions = version.manifest.getJSONObject("engines").getJSONObject(family).getJSONArray("entries")
        val results = arrayOfNulls<JSONArray>(definitions.length())
        val summaries = arrayOfNulls<String>(definitions.length())
        val jobs = (0 until definitions.length()).map { index -> launch {
            if (onlyEntry != null && onlyEntry != index) return@launch
            val definition = definitions.getJSONObject(index)
            val types = definition.getJSONArray("types")
            if ((0 until types.length()).none { types.getString(it) == request.type }) return@launch
            try {
                contexts.withPermit {
                    val file = definition.getString("file"); val id = definition.getString("id")
                    val key = version.sequence.toString() + ":" + file + ":" + id
                    val lease = synchronized(engines) {
                        engines.getOrPut(key) { Lease(Engine(version.sources.getValue(file), bridge, lookupTimeoutMs = lookupTimeoutMs, scraperId = id, ownsBridge = false)) }.also { it.users++ }
                    }
                    val engine = lease.engine
                    try {
                        val response = JSONObject(engine.streams(request, config, native = true)).getJSONArray("streams")
                        for (n in 0 until response.length()) response.optJSONObject(n)?.put("_hostEntry", index)
                        results[index] = response
                    } finally {
                        summaries[index] = engine.lastSummary
                        synchronized(engines) {
                            lease.users--
                            val prefix = packages.snapshot().sequence.toString() + ":"
                            engines.keys.filter { !it.startsWith(prefix) && engines.getValue(it).users == 0 }.forEach {
                                engines.remove(it)?.engine?.close()
                            }
                        }
                    }
                }
            } catch (e: CancellationException) { throw e }
            catch (_: Exception) { summaries[index] = "Entry unavailable" }
        } }
        // Keep completed entries if one upstream stalls. No extra addon per host.
        withTimeoutOrNull(lookupTimeoutMs) { jobs.joinAll() }
        jobs.forEach { if (it.isActive) it.cancel() }; jobs.joinAll()
        val rows = results.filterNotNull().flatMap { a -> (0 until a.length()).mapNotNull { a.optJSONObject(it) } }
        // Existing invisible sort keys encode quality/audio and entry order. Keep stable ties.
        val ordered = rows.withIndex().sortedWith(compareBy<IndexedValue<JSONObject>> { it.value.optString("name").lowercase(java.util.Locale.ROOT) }.thenBy { it.index })
        val native = JSONArray(); val seen = mutableSetOf<String>()
        for ((_, row) in ordered) {
            // Only exact URLs+headers+captions duplicate; never strip auth/query arguments.
            val identity = row.optString("url") + "\n" + row.optJSONObject("headers") + "\n" + row.optJSONArray("subtitles")
            if (seen.add(identity)) native.put(row)
        }
        val streams = addonStreams(native, family, config.captionScope)
        lastSummary = "${HostedAddons.families[family]} · ${streams.length()} links · ${(System.nanoTime() - started) / 1_000_000} ms" +
            (if (streams.length() == 0) summaries.filterNotNull().firstOrNull { it.contains(" · INPUT_") || it.contains(" · EN_") }?.substringAfterLast(" · ")?.let { " · $it" } ?: "" else "")
        JSONObject().put("streams", streams).toString()
    }
    fun stats() = EngineStats(requests.get(), active.get(), waiting.get().coerceAtLeast(0), bridge.stats())
    fun trimMemory() { bridge.clear(); synchronized(engines) { engines.values.forEach { it.engine.trimMemory() } } }
    override fun close() { synchronized(engines) { engines.values.forEach { it.engine.close() }; engines.clear() }; bridge.close() }
}
