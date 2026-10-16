function vidzyVariant(ctx, version) {
    var base = site(settings().vidzyBase || ENDPOINTS.catalogue.vidzy);
    var path = ctx.type === 'movie' ? '/movie/' + ctx.id : '/serie/' + ctx.id + '/' + ctx.season + '/' + ctx.episode;
    // No availability preflight: the documented player route already does the mapping.
    return request(base + path + '/' + version, base + '/', 'Vidzy ' + version + ' player', ctx).then(function (response) {
        var tag = response.body.match(/<iframe\b(?=[^>]*\bid=["']pf["'])[^>]*\bsrc=["']([^"']+)["']/i);
        var embed = tag && asUrl(tag[1], response.url);
        if (!embed || !isVidzyEmbed(embed)) throw new Error('Vidzy: expected player iframe missing');
        var language = response.body.match(/"version"\s*:\s*"(vf|vostfr|multi)"/i);
        var title = response.body.match(/<title[^>]*>([^<]+)<\/title>/i);
        // A missing language route may silently select the default player. Use
        // the actual version and avoid downloading the same embed twice.
        ctx.vidzyEmbeds = ctx.vidzyEmbeds || {};
        if (!ctx.vidzyEmbeds[embed]) ctx.vidzyEmbeds[embed] = resolveHost({ url: embed, server: 'Vidzy', lang: language ? language[1] : version }, response.url, ctx);
        return ctx.vidzyEmbeds[embed].then(function (result) {
            if (title) result.forEach(function (item) { item.description = decodeHtml(title[1]); });
            return result;
        });
    });
}
function vidzyLookup(ctx) {
    return Promise.all(['vf', 'vostfr'].map(function (version) {
        return vidzyVariant(ctx, version).catch(function (error) { log(message(error)); return []; });
    })).then(function (groups) { return enrichHlsStreams(unique([].concat.apply([], groups)), ctx); });
}
function getStreams(id, type, season, episode) {
    return run(id, type, season, episode, function (ctx) {
        // Expose provenance in both manifest name and each result's name.
        var first = settings().preferCatalogue === true ? Promise.resolve([]) : vidzyLookup(ctx).catch(function (error) { log(message(error)); return []; });
        return first.then(function (result) { return result.length ? result : catalogueFallback(ctx); });
    });
}
