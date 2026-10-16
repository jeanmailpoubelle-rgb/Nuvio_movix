/* Keep the old ID downloadable: TV 1.0.0 retains removed manifest entries. */
function getStreams() {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[' + PROVIDER_ID + ' ' + VERSION + '] Retired: use Purstream API / Cpasmal.');
    }
    return Promise.resolve([]);
}
