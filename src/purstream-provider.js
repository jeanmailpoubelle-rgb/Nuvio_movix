function primaryMovix(endpoint, ctx) {
    var path = '/api/purstream/' + ctx.type + '/' + ctx.id + '/stream';
    if (ctx.type === 'tv') path += '?season=' + ctx.season + '&episode=' + ctx.episode;
    return movixJson(path, 'Purstream', ctx, function (data) { return Array.isArray(data.sources); }).then(function (data) {
        endpoint.site = movixEndpoint(ctx).site + '/';
        if (!Array.isArray(data.sources)) throw new Error('Purstream: missing sources array');
        // These media URLs belong to Purstream. Its CDN expects the player's
        // Purstream Referer, while Movix's API expects the Movix Referer.
        var result = unique(data.sources.map(function (source) {
            // Some API responses provide tracks at the response level.
            return stream(Object.assign({}, source, { subtitles: source.subtitles || data.subtitles }), endpoint.playbackReferer, endpoint.site);
        }));
        if (!result.length) log('Purstream: no direct media sources; trying backup');
        return qualifyStreams(result, ctx);
    });
}
function backupMovix(endpoint, ctx) {
    var path = '/api/cpasmal/' + ctx.type + '/' + ctx.id;
    if (ctx.type === 'tv') path += '/' + ctx.season + '/' + ctx.episode;
    return movixJson(path, 'Cpasmal', ctx, function (data) { return data.links && typeof data.links === 'object' && !Array.isArray(data.links); }).then(function (data) {
        endpoint.site = movixEndpoint(ctx).site + '/';
        var groups = ['vf', 'vostfr'].map(function (lang) {
            return data.links && Array.isArray(data.links[lang]) ? data.links[lang].filter(function (item) { return item && typeof item.url === 'string'; }).map(function (item) {
                return { url: item.url, server: item.server, lang: lang, headers: item.headers };
            }) : [];
        });
        // Shared host coverage is identical across catalogue, API and Frembed.
        groups = groups.map(function (group) {
            return group.filter(function (link) {
                var u = asUrl(link.url, endpoint.site);
                if (!u) return false;
                if (supportsHost(u, link.server)) return true;
                return !/^(?:voe|filemoon|doodstream|dood)$/i.test(link.server || '');
            }).sort(function (a, b) {
                function rank(link) {
                    var u = asUrl(link.url, endpoint.site), family = hostFamily(u, link.server);
                    return formatOf(u || '') ? 0 : /^(?:vidzy|uqload|lulu)$/.test(family) ? 1 : family ? 2 : 3;
                }
                return rank(a) - rank(b);
            });
        });
        // Interleave languages so several broken VF players cannot hide VOSTFR.
        var links = [];
        for (var i = 0; i < Math.max(groups[0].length, groups[1].length); i++) groups.forEach(function (group) {
            if (group[i]) links.push(group[i]);
        });
        return resolveLinks(links, endpoint.site, ctx, '');
    });
}
function getStreams(id, type, season, episode) {
    return run(id, type, season, episode, function (ctx) {
        var s = settings(), endpoint = { api: site(s.apiBase || ENDPOINTS.purstream.wrapperApi), site: site(s.siteBase || ENDPOINTS.purstream.wrapperSite) + '/',
            playbackReferer: site(s.purstreamReferer || ENDPOINTS.purstream.playbackSite) + '/' };
        return primaryMovix(endpoint, ctx).catch(function (error) {
            log(message(error));
            // An explicit missing episode/title is authoritative for this backend.
            // Transport errors and an obsolete wrapper schema may still be served
            // by the direct API. Do not repeat a known missing-episode lookup.
            if (error.status === 404 || !hasMetadataKey()) return [];
            event('fallback', { route: 'direct-purstream' });
            return directPurstream(ctx).then(function (result) { return qualifyStreams(result, ctx); }).catch(function (directError) { log(message(directError)); return []; });
        }).then(function (result) {
            if (result.length) return result;
            return backupMovix(endpoint, ctx).then(function (backup) { return enrichHlsStreams(backup, ctx); }).catch(function (error) { log(message(error)); return []; });
        }).then(function (result) {
            // Frembed's premium branch overlaps this media family. Use its
            // ordinary grant only when existing routes have no working source.
            if (result.length || settings().frembedRecovery === false) return result;
            event('fallback', { route: 'frembed-premium' });
            return frembedPremium(ctx).catch(function (error) { log(message(error)); return []; });
        });
    });
}
