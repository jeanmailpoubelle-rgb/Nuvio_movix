var purstreamMatches = {};
function purstreamItems(data) {
    var groups = data && data.data && data.data.items, result = [];
    if (!groups || typeof groups !== 'object') throw new Error('Purstream search: invalid result');
    Object.keys(groups).forEach(function (key) {
        var items = groups[key] && groups[key].items;
        if (Array.isArray(items)) result = result.concat(items);
    });
    return result;
}
function findPurstream(endpoint, ctx) {
    var cacheKey = endpoint.api + ':' + ctx.type + ':' + ctx.id;
    var cached = purstreamMatches[cacheKey];
    if (cached && Date.now() - cached.time < 600000) return Promise.resolve(cached.id);
    return tmdbDetails(ctx).then(function (meta) {
        return searchTitles(meta, function (title) {
            return requestJson(endpoint.api + '/search-bar/search/' + encodeURIComponent(title), endpoint.site, 'Purstream search', ctx)
                .then(function (data) { return chooseMatch(purstreamItems(data), meta, ctx.type); });
        });
    }).then(function (match) {
        if (!match || !/^\d+$/.test(String(match.id))) throw new Error('Purstream: no unambiguous title/year match');
        if (Object.keys(purstreamMatches).length >= 50) purstreamMatches = {};
        purstreamMatches[cacheKey] = { id: String(match.id), time: Date.now() };
        return String(match.id);
    });
}
function directPurstreamAt(endpoint, ctx) {
    return findPurstream(endpoint, ctx).then(function (catalogueId) {
        // The media sheet exposes tmdbId: validate correspondence before playback.
        return requestJson(endpoint.api + '/media/' + catalogueId + '/sheet', endpoint.site, 'Purstream media', ctx).then(function (data) {
            var item = data.data && data.data.items;
            if (!item || String(item.tmdbId) !== ctx.id || item.type !== ctx.type) {
                delete purstreamMatches[endpoint.api + ':' + ctx.type + ':' + ctx.id];
                throw new Error('Purstream: catalogue TMDB ID mismatch');
            }
            if (ctx.type === 'movie') return item.urls || [];
            return requestJson(endpoint.api + '/stream/' + catalogueId + '/episode?season=' + ctx.season + '&episode=' + ctx.episode,
                endpoint.site, 'Purstream episode', ctx).then(function (episodeData) {
                var info = episodeData.data && episodeData.data.items;
                if (!info || !Array.isArray(info.sources)) throw new Error('Purstream episode: missing sources');
                return info.sources.map(function (source) { return { url: source.stream_url, name: source.source_name, format: source.format, headers: source.headers,
                    lang: source.lang || source.language, subtitles: source.subtitles || info.subtitles }; });
            });
        });
    }).then(function (sources) {
        if (!Array.isArray(sources)) throw new Error('Purstream: invalid sources');
        return enrichHlsStreams(unique(sources.map(function (source) { return stream(source, endpoint.site); })), ctx);
    });
}
function directPurstream(ctx) {
    var s = settings(), endpoint = { api: site(s.directApiBase || ENDPOINTS.purstream.directApi), site: site(s.purstreamReferer || ENDPOINTS.purstream.playbackSite) + '/' };
    return directPurstreamAt(endpoint, ctx).catch(function (error) {
        // A missing title/episode or failed identity check is not a domain outage.
        if (s.directApiBase || s.movixFailover === false || !/^Purstream (?:search|media|episode)$/.test(error.stage || '') || !endpointFailure(error)) throw error;
        return requestJson(ENDPOINTS.purstream.status, '', 'Direct API status', ctx).then(function (data) {
            var domain = typeof data.domain === 'string' ? data.domain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') : '';
            if (!/^(?:api\.)?purstream\.[a-z0-9.-]+$/i.test(domain)) throw new Error('Direct API status: invalid domain');
            var root = domain.replace(/^api\./i, ''), api = 'https://api.' + root + '/api/v1';
            if (api === endpoint.api) throw error;
            return directPurstreamAt({ api: api, site: s.purstreamReferer ? endpoint.site : 'https://' + root + '/' }, ctx);
        });
    });
}
