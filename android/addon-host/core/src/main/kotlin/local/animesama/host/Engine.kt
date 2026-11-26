package local.animesama.host

import com.dokar.quickjs.QuickJs
import com.dokar.quickjs.binding.asyncFunction
import com.dokar.quickjs.binding.function
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import org.json.JSONArray
import org.json.JSONObject
import java.util.Base64
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

class EngineExecutionFailure(val stage: String) : IllegalStateException("Engine execution failed")

data class EngineStats(val requests: Long, val active: Int, val queued: Int, val cache: BridgeStats)

class Engine(private val source: String, private val bridge: HttpBridge = HttpBridge(), private val lookupTimeoutMs: Long = 52_000,
             private val scraperId: String = "", private val ownsBridge: Boolean = true) : AutoCloseable {
    init { require(lookupTimeoutMs in 25..52_000) }
    private val slots = Semaphore(2)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val inFlight = mutableMapOf<String, Deferred<String>>()
    private val subscribers = mutableMapOf<Deferred<String>, Int>()
    private var bytecode: ByteArray? = null
    private val requestCount = AtomicLong()
    private val activeCount = AtomicInteger()
    @Volatile var lastSummary: String = "No searches yet"
        private set

    suspend fun streams(request: EpisodeRequest, config: HostConfig, native: Boolean = false): String {
        val key = request.toString() + config.settings.toString() + config.tmdbKey + native
        val pending = synchronized(inFlight) {
            requestCount.incrementAndGet()
            val selected = inFlight[key]?.takeIf { !it.isCompleted } ?: run {
                require(inFlight.size < 8) { "Search queue full" }
                scope.async(start = CoroutineStart.LAZY) {
                    // Queue time is included in the hard deadline.
                    withTimeout(lookupTimeoutMs) { slots.withPermit { lookup(request, config, native) } }
                }.also { job ->
                    inFlight[key] = job
                    job.invokeOnCompletion { synchronized(inFlight) { if (inFlight[key] === job) inFlight.remove(key) } }
                    job.start()
                }
            }
            subscribers[selected] = (subscribers[selected] ?: 0) + 1
            selected
        }
        try { return pending.await() } finally {
            val abandoned = synchronized(inFlight) {
                val remaining = (subscribers[pending] ?: 1) - 1
                if (remaining == 0) subscribers.remove(pending) else subscribers[pending] = remaining
                remaining == 0 && !pending.isCompleted
            }
            if (abandoned) withContext(NonCancellable) { pending.cancelAndJoin() }
        }
    }
    private suspend fun lookup(request: EpisodeRequest, config: HostConfig, native: Boolean): String {
        activeCount.incrementAndGet()
        try { return executeLookup(request, config, native) } finally { activeCount.decrementAndGet() }
    }
    private suspend fun executeLookup(request: EpisodeRequest, config: HostConfig, native: Boolean): String {
        val started = System.nanoTime()
        val js = QuickJs.create(Dispatchers.IO)
        var stage = "initialize"
        try {
            js.memoryLimit = 64L * 1024 * 1024
            js.maxStackSize = 1024L * 1024
            js.evaluationTimeoutMillis = 5_000
            var failureCode = ""
            js.function<String, Unit>("__host_code") { if (it.matches(Regex("[A-Z][A-Z0-9_]{3,80}|HTTP [0-9]{3}"))) failureCode = it }
            js.asyncFunction<String, String>("__host_fetch") { raw ->
                try { bridge.fetch(raw, config) }
                catch (e: CancellationException) { throw e }
                catch (_: Exception) {
                    // Match Nuvio's transport contract: ordinary network failure is
                    // a status-zero response, allowing resolver fallback in JS.
                    """{"ok":false,"status":0,"headers":{},"body":"","bodyBase64":""}"""
                }
            }
            js.function<String, String>("__host_atob") { Base64.getDecoder().decode(it).toString(Charsets.ISO_8859_1) }
            js.function<String, String>("__host_btoa") { Base64.getEncoder().encodeToString(it.toByteArray(Charsets.ISO_8859_1)) }
            js.evaluate<Any?>(BOOTSTRAP + "\nvar SCRAPER_ID=" + JSONObject.quote(scraperId) + ";var SCRAPER_SETTINGS=" + config.settings.toString() + ";var TMDB_API_KEY=" + JSONObject.quote(config.tmdbKey) + ";")
            stage = "compile"
            val compiled = synchronized(this) { bytecode ?: js.compile(source, "host-engine.js").also { bytecode = it } }
            js.evaluate<Any?>(compiled)
            stage = "series identity"
            val mappedRequest = SeriesIdentity.resolve(request, config, bridge)
            stage = "lookup"
            // QuickJS-KT's interrupt clock includes time awaiting native jobs.
            // Do not apply a short CPU-only assumption to a network evaluation.
            js.evaluationTimeoutMillis = lookupTimeoutMs
            val args = listOf(JSONObject.quote(mappedRequest.id), JSONObject.quote(mappedRequest.type), mappedRequest.season, mappedRequest.episode).joinToString(",")
            val raw = js.evaluate<String>("JSON.stringify(await getStreams($args))")
            stage = "presentation"
            val result = if (native) JSONArray(raw) else addonStreams(JSONArray(raw))
            lastSummary = "${result.length()} links · ${(System.nanoTime() - started) / 1_000_000} ms" + if (failureCode.isNotEmpty()) " · $failureCode" else ""
            return JSONObject().put("streams", result).toString()
        } catch (e: IdentityFailure) {
            lastSummary = "0 links · ${e.code}"
            return """{"streams":[]}"""
        } catch (e: CancellationException) {
            lastSummary = "Search cancelled or timed out"; throw e
        } catch (e: Exception) {
            val location = if (e is com.dokar.quickjs.QuickJsException) " JS line ${e.lineNumber ?: 0}" else ""
            lastSummary = "Search failed at $stage (${e.javaClass.simpleName})$location"
            throw EngineExecutionFailure(stage)
        } finally { js.close() }
    }
    fun stats(): EngineStats = synchronized(inFlight) {
        val active = activeCount.get()
        EngineStats(requestCount.get(), active, (inFlight.values.count { !it.isCompleted } - active).coerceAtLeast(0), bridge.stats())
    }
    fun trimMemory() {
        bridge.clear()
        synchronized(this) { if (activeCount.get() == 0) bytecode = null }
    }
    override fun close() { scope.cancel(); if (ownsBridge) bridge.close(); synchronized(this) { bytecode = null } }
    companion object {
        val BOOTSTRAP = """
            var console={log:function(){},warn:function(){for(var i=0;i<arguments.length;i++){var s=String(arguments[i]);if(/^(?:[A-Z][A-Z0-9_]{3,80}|HTTP [0-9]{3})$/.test(s))__host_code(s);}},error:function(){}};
            var atob=__host_atob,btoa=__host_btoa;
            async function __native_fetch(url,method,headers){return await __host_fetch(JSON.stringify({url:url,method:method||'GET',headers:JSON.parse(headers||'{}')}));}
            async function fetch(url,options){
                options=options||{};var r=JSON.parse(await __native_fetch(url,options.method,JSON.stringify(options.headers||{})));
                return {ok:r.ok,status:r.status,url:r.url,headers:{get:function(k){return r.headers[k.toLowerCase()]||null;}},
                    text:function(){return Promise.resolve(r.body);},json:function(){return Promise.resolve(JSON.parse(r.body));},
                    arrayBuffer:function(){var b=atob(r.bodyBase64),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return Promise.resolve(a.buffer);}};
            }
        """.trimIndent()
    }
}
