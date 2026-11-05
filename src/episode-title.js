// Equivalent standalone episode-title separators. Do not drop words, reorder
// tokens or rewrite embedded operators (2×2); identity still requires a date
// and a unique match in both explicitly corresponding series inventories.
function canonicalEpisodeSeparators(value) {
    return String(value || '').replace(/(^|\s)×(?=\s|$)/g, '$1x');
}
module.exports = { canonicalEpisodeSeparators };
