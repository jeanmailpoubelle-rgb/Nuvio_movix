/* Test fixture: NuvioMedia/NuvioMobile, GPL-3.0.
 * Commit 808272dcec4be02397282600b70a07111576e0c7 (2026-10-15).
 * composeApp/src/fullCommonMain/kotlin/com/nuvio/app/features/plugins/runtime/js/JsBindings.kt
 * JS strings composed as in the source; native bindings supplied by the harness.
 */
(async function() {
    try {
        var getStreams = module.exports.getStreams || globalThis.getStreams;
        if (!getStreams) {
            console.error("getStreams function not found on module.exports or globalThis");
            __capture_result(JSON.stringify([]));
            return;
        }
        var args = JSON.parse(__get_call_args());
        var season = args.season == null ? undefined : args.season;
        var episode = args.episode == null ? undefined : args.episode;
        var result = await getStreams(args.tmdbId, args.mediaType, season, episode);
        __capture_result(JSON.stringify(result || []));
    } catch (e) {
        console.error("getStreams error:", e && e.message ? e.message : e, e && e.stack ? e.stack : "");
        __capture_result(JSON.stringify([]));
    }
})();
