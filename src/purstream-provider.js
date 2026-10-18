function primaryMovix(endpoint, ctx, coordinates) {
    coordinates = coordinates || ctx;
    var path = '/api/purstream/' + ctx.type + '/' + ctx.id + '/stream';
    if (ctx.type === 'tv') path += '?season=' + coordinates.season + '&episode=' + coordinates.episode;
    return movixJson(path, 'Purstream', ctx, function (data) { return Array.isArray(data.sources); }).then(function (data) {
        endpoint.site = movixEndpoint(ctx).site + '/';
        if (!Array.isArray(data.sources)) throw new Error('Purstream: missing sources array');
        if (data.tmdb_id != null && String(data.tmdb_id) !== ctx.id || ctx.type === 'tv' &&
            (data.season != null && Number(data.season) !== coordinates.season || data.episode != null && Number(data.episode) !== coordinates.episode)) throw new Error('Purstream: episode identity mismatch');
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
function backupMovix(endpoint, ctx, coordinates) {
    coordinates = coordinates || ctx;
    var path = '/api/cpasmal/' + ctx.type + '/' + ctx.id;
    if (ctx.type === 'tv') path += '/' + coordinates.season + '/' + coordinates.episode;
    return movixJson(path, 'Cpasmal', ctx, function (data) { return data.links && typeof data.links === 'object' && !Array.isArray(data.links); }).then(function (data) {
        endpoint.site = movixEndpoint(ctx).site + '/';
        if (data.tmdb_id != null && String(data.tmdb_id) !== ctx.id || ctx.type === 'tv' &&
            (data.season != null && Number(data.season) !== coordinates.season || data.episode != null && Number(data.episode) !== coordinates.episode)) throw new Error('Cpasmal: episode identity mismatch');
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
            noteMissingEpisode(ctx, 'primary', error);
            log(message(error));
            // An explicit missing episode/title is authoritative for this backend.
            // Transport errors and an obsolete wrapper schema may still be served
            // by the direct API. Do not repeat a known missing-episode lookup.
            if (error.status === 404 || !hasMetadataKey()) return [];
            event('fallback', { route: 'direct-purstream' });
            return directPurstream(ctx).then(function (result) { return qualifyStreams(result, ctx); }).catch(function (directError) { noteMissingEpisode(ctx, 'direct', directError); log(message(directError)); return []; });
        }).then(function (result) {
            if (result.length) return result;
            return backupMovix(endpoint, ctx).then(function (backup) { return enrichHlsStreams(backup, ctx); }).catch(function (error) { noteMissingEpisode(ctx, 'backup', error); log(message(error)); return []; });
        }).then(function (result) {
            // Frembed's premium branch overlaps this media family. Use its
            // ordinary grant only when existing routes have no working source.
            if (result.length || settings().frembedRecovery === false) return result;
            event('fallback', { route: 'frembed-premium' });
            return frembedPremium(ctx).catch(function (error) { noteMissingEpisode(ctx, 'premium', error); log(message(error)); return []; });
        }).then(function (result) {
            if (result.length) return result;
            // Preserve all existing working recovery before spending requests on
            // alternate numbering. Each retry changes only its backend's query.
            var loaders = { primary: function (coordinates) { return primaryMovix(endpoint, ctx, coordinates); },
                backup: function (coordinates) { return backupMovix(endpoint, ctx, coordinates); },
                direct: function (coordinates) { return directPurstream(ctx, coordinates); },
                premium: function (coordinates) { return frembedPremium(ctx, coordinates); } };
            return episodeFallbacks(ctx, ['primary', 'backup', 'direct', 'premium'], function (backend, coordinates) {
                return loaders[backend](coordinates).then(function (streams) { return qualifyStreams(streams, ctx); });
            });
        });
    });
}
