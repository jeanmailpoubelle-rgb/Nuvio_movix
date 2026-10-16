function primaryMovix(endpoint, ctx) {
    var path = '/api/purstream/' + ctx.type + '/' + ctx.id + '/stream';
    if (ctx.type === 'tv') path += '?season=' + ctx.season + '&episode=' + ctx.episode;
    return requestJson(endpoint.api + path, endpoint.site, 'Purstream', ctx).then(function (data) {
        if (!Array.isArray(data.sources)) throw new Error('Purstream: missing sources array');
        // These media URLs belong to Purstream. Its CDN expects the player's
        // Purstream Referer, while Movix's API expects the Movix Referer.
        var result = unique(data.sources.map(function (source) {
            // Some API responses provide tracks at the response level.
            return stream(Object.assign({}, source, { subtitles: source.subtitles || data.subtitles }), endpoint.playbackReferer, endpoint.site);
        }));
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
        // Unsupported VOE/Filemoon/Dood pages used to consume time without a
        // possible result. Prefer players we can actually parse, in both languages.
        groups = groups.map(function (group) {
            return group.filter(function (link) {
                var u = asUrl(link.url, endpoint.site);
                if (!u) return false;
                if (formatOf(u) || isVidzyEmbed(u) || isUqloadEmbed(u)) return true;
                return !/^(?:voe|filemoon|doodstream|dood)$/i.test(link.server || '');
            }).sort(function (a, b) {
                function rank(link) { var u = asUrl(link.url, endpoint.site); return formatOf(u || '') ? 0 : isVidzyEmbed(u) || isUqloadEmbed(u) ? 1 : 2; }
                return rank(a) - rank(b);
            });
        });
        // Interleave languages so several broken VF players cannot hide VOSTFR.
        var links = [];
        for (var i = 0; i < ENDPOINTS.limits.backupEmbeds; i++) groups.forEach(function (group) {
            if (group[i] && links.length < ENDPOINTS.limits.backupEmbeds) links.push(group[i]);
        });
        return Promise.all(links.map(function (link) {
            return resolveEmbed(link.url, endpoint.site, ctx, link.server || 'Movix backup', link.lang, link.headers);
        })).then(unique);
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
            return directPurstream(ctx).catch(function (directError) { log(message(directError)); return []; });
        }).then(function (result) {
            return result.length ? result : backupMovix(endpoint, ctx);
        });
    });
}
