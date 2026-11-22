package local.animesama.host

import java.util.LinkedHashMap

data class CacheStats(val entries: Int, val bytes: Int, val hits: Long, val misses: Long)

/** Memory only, bounded including keys. Expiry is lazy: no polling/timer tasks. */
class MetadataCache(private val maxBytes: Int = 4 * 1024 * 1024, private val ttlMs: Long = 30_000,
                    private val clock: () -> Long = { System.nanoTime() / 1_000_000 }, private val maxEntries: Int = 24) {
    private data class Entry(val value: String, val bytes: Int, val expires: Long)
    private val entries = LinkedHashMap<String, Entry>(16, 0.75f, true)
    private var bytes = 0
    private var hits = 0L
    private var misses = 0L
    init { require(maxBytes > 0 && ttlMs > 0 && maxEntries > 0) }
    private fun expire() {
        val now = clock(); val iterator = entries.entries.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next().value
            if (now >= entry.expires) { bytes -= entry.bytes; iterator.remove() }
        }
    }
    @Synchronized fun get(key: String): String? {
        expire()
        val e = entries[key]
        if (e == null) misses++ else hits++
        return e?.value
    }
    @Synchronized fun put(key: String, value: String, lifetimeMs: Long = ttlMs) {
        require(lifetimeMs > 0)
        expire()
        val size = key.toByteArray(Charsets.UTF_8).size + value.toByteArray(Charsets.UTF_8).size
        entries.remove(key)?.let { bytes -= it.bytes }
        if (size > maxBytes) return
        entries[key] = Entry(value, size, clock() + lifetimeMs); bytes += size
        while (bytes > maxBytes || entries.size > maxEntries) {
            val oldest = entries.entries.iterator(); val entry = oldest.next(); bytes -= entry.value.bytes; oldest.remove()
        }
    }
    @Synchronized fun stats(): CacheStats { expire(); return CacheStats(entries.size, bytes, hits, misses) }
    @Synchronized fun clear() { entries.clear(); bytes = 0 }
}
