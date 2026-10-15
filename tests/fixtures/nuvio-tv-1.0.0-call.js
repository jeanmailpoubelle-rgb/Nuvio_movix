/* Test fixture from NuvioMedia/NuvioTV tag 1.0.0, GPL-3.0.
 * https://github.com/NuvioMedia/NuvioTV/blob/1.0.0/app/src/full/java/com/nuvio/tv/core/plugin/PluginRuntime.kt
 * Literal JavaScript extracted from getStaticCallCode(); native bindings supplied by the test harness.
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
        console.log("Calling getStreams with tmdbId=" + args.tmdbId + " type=" + args.mediaType + " s=" + args.season + " e=" + args.episode);
        var result = await getStreams(args.tmdbId, args.mediaType, args.season, args.episode);
        console.log("getStreams returned: " + (result ? result.length : 0) + " streams");
        __capture_result(JSON.stringify(result || []));
    } catch (e) {
        console.error("getStreams error:", e.message || e, e.stack || "");
        __capture_result(JSON.stringify([]));
    }
})();
