package local.animesama.host

import java.util.LinkedHashMap

/** Memory only. Deliberately cannot be used as an HTTP cache for arbitrary hosts. */
class MetadataCache(private val maxBytes: Int = 4 * 1024 * 1024, private val ttlMs: Long = 30_000,
                    private val clock: () -> Long = { System.nanoTime() / 1_000_000 }) {
    private data class Entry(val value: String, val bytes: Int, val expires: Long)
    private val entries = LinkedHashMap<String, Entry>(16, 0.75f, true)
    private var bytes = 0
    @Synchronized fun get(key: String): String? {
        val e = entries[key] ?: return null
        if (clock() >= e.expires) { entries.remove(key); bytes -= e.bytes; return null }
        return e.value
    }
    @Synchronized fun put(key: String, value: String) {
        val size = value.toByteArray(Charsets.UTF_8).size
        if (size > maxBytes) return
        entries.remove(key)?.let { bytes -= it.bytes }
        entries[key] = Entry(value, size, clock() + ttlMs); bytes += size
        while (bytes > maxBytes || entries.size > 24) {
            val oldest = entries.entries.iterator(); val entry = oldest.next(); bytes -= entry.value.bytes; oldest.remove()
        }
    }
    @Synchronized fun clear() { entries.clear(); bytes = 0 }
}
