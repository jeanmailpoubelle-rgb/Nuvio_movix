function primaryMovix(endpoint, ctx) {
    var path = '/api/purstream/' + ctx.type + '/' + ctx.id + '/stream';
    if (ctx.type === 'tv') path += '?season=' + ctx.season + '&episode=' + ctx.episode;
    return requestJson(endpoint.api + path, endpoint.site, 'Purstream', ctx).then(function (data) {
        if (!Array.isArray(data.sources)) throw new Error('Purstream: missing sources array');
        // These media URLs belong to Purstream. Its CDN expects the player's
        // Purstream Referer, while Movix's API expects the Movix Referer.
        var result = unique(data.sources.map(function (source) { return stream(source, endpoint.playbackReferer, endpoint.site); }));
        if (!result.length) log('Purstream: no direct media sources; trying backup');
        return result;
    });
}
function backupMovix(endpoint, ctx) {
    var path = '/api/cpasmal/' + ctx.type + '/' + ctx.id;
    if (ctx.type === 'tv') path += '/' + ctx.season + '/' + ctx.episode;
    return requestJson(endpoint.api + path, endpoint.site, 'Cpasmal', ctx).then(function (data) {
        var groups = ['vf', 'vostfr'].map(function (lang) {
            return data.links && Array.isArray(data.links[lang]) ? data.links[lang].filter(function (item) { return item && typeof item.url === 'string'; }).map(function (item) {
                return { url: item.url, server: item.server, lang: lang, headers: item.headers };
            }) : [];
        });
        // Interleave languages so several broken VF players cannot hide VOSTFR.
        var links = [];
        for (var i = 0; i < 3; i++) groups.forEach(function (group) { if (group[i] && links.length < 3) links.push(group[i]); });
        return Promise.all(links.map(function (link) {
            return resolveEmbed(link.url, endpoint.site, ctx, link.server || 'Movix backup', link.lang, link.headers);
        })).then(unique);
    });
}
function getStreams(id, type, season, episode) {
    return run(id, type, season, episode, function (ctx) {
        var s = settings(), endpoint = { api: site(s.apiBase || 'https://api.movix.cash'), site: site(s.siteBase || 'https://movix.cash') + '/',
            playbackReferer: site(s.purstreamReferer || 'https://purstream.club') + '/' };
        return primaryMovix(endpoint, ctx).catch(function (error) { log(message(error)); return []; }).then(function (result) {
            return result.length ? result : backupMovix(endpoint, ctx);
        });
    });
}
