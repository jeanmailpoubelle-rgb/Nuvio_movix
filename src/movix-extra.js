/* Independently implemented public Movix protocols. This worker keeps extra
 * catalogue/IMDb/host work outside both the fast API and core catalogue worker. */
function extraLanguage(value) {
    value = String(value || '').toUpperCase();
    return /MULTI|DUAL/.test(value) ? 'MULTI' : /VOST/.test(value) ? 'VOSTFR' : /^(?:VF|FR)/.test(value) ? 'VF' : /^(?:VO|EN|JA)/.test(value) ? 'VO' : '';
}
function extraLinks(source, items, ctx, language) {
    var links = [], skipped = {}, unsupported = {};
    items.forEach(function (item) {
        if (typeof item === 'string') item = { url: item };
        if (!item || typeof item !== 'object') { skipped.invalid = (skipped.invalid || 0) + 1; return; }
        if (item.isVip || item.requiresAuth) { skipped['access-required'] = (skipped['access-required'] || 0) + 1; return; }
        var url = asUrl(item.url || item.link || item.decoded_url, movixEndpoint(ctx).site + '/', false), server = item.player || item.server || item.host && item.host.name || item.label || '';
        if (!url || !supportsHost(url, server) && !mediaFormat(url, item.format || item.mime)) {
            var host = origin(url || '').replace(/^https?:\/\//, '') || 'invalid'; unsupported[host] = (unsupported[host] || 0) + 1; return;
        }
        links.push({ url: url, server: server, format: mediaFormat(url, item.format || item.mime), quality: item.quality,
            lang: extraLanguage(item.language || item.lang || language), headers: item.headers, subtitles: item.subtitles || item.tracks,
            preserveUrl: true, subtitleBase: movixEndpoint(ctx).site + '/', catalogue: source });
    });
    event('extra-inventory', { source: source, advertised: items.length, supported: links.length, unsupported: unsupported, skipped: skipped });
    return links;
}
function movixCustomAt(ctx, coordinates) {
    var path = '/api/links/' + ctx.type + '/' + ctx.id + (ctx.type === 'tv' ? '?season=' + coordinates.season + '&episode=' + coordinates.episode : '');
    return movixJson(path, 'Movix custom', ctx, function (data) { return typeof data.success === 'boolean'; }).then(function (data) {
        if (!data.success || data.pending) return [];
        if (data.type !== ctx.type) throw new Error('Movix custom: type mismatch');
        var rows = ctx.type === 'tv' ? data.data : [data.data], items = [];
        if (!Array.isArray(rows)) throw new Error('Movix custom: invalid media rows');
        rows.forEach(function (row) {
            if (!row || String(ctx.type === 'tv' ? row.series_id : row.id) !== ctx.id) return;
            if (ctx.type === 'tv' && (row.season_number == null || row.episode_number == null || Number(row.season_number) !== coordinates.season || Number(row.episode_number) !== coordinates.episode)) return;
            if (Array.isArray(row.links)) items = items.concat(row.links);
        });
        return extraLinks('Custom', items, ctx);
    });
}
function movixCustom(ctx) {
    return episodeLookup(ctx, 'custom', function (coordinates) { return movixCustomAt(ctx, coordinates); });
}
function movixOmega(ctx, coordinates) {
    coordinates = coordinates || ctx;
    return tmdbDetails(ctx).then(function (meta) {
        if (!/^tt[0-9]{5,12}$/.test(meta.imdbId)) throw new Error('Movix Omega: verified IMDb correspondence unavailable');
        return movixJson('/api/imdb/' + ctx.type + '/' + meta.imdbId, 'Movix Omega', ctx, function (data) {
            return Array.isArray(data.player_links) || Array.isArray(data.series) || typeof data.message === 'string' || typeof data.error === 'string';
        }).then(function (data) {
            if (data.pending || data.error || data.message) return [];
            if (data.type && data.type !== ctx.type) throw new Error('Movix Omega: type mismatch');
            if (data.french_stream_id && data.french_stream_id !== meta.imdbId) throw new Error('Movix Omega: IMDb mismatch');
            if (ctx.type === 'movie') return extraLinks('Omega', data.player_links || [], ctx, data.version);
            var links = [], matchedSeries = false, foundEpisode = false;
            (data.series || []).forEach(function (series) {
                // The live API can return another show's cached entry. Require
                // its explicit TMDB identity before using any TV coordinates.
                if (!series.tmdb_data || String(series.tmdb_data.id) !== ctx.id) {
                    event('source-rejected', { source: 'Omega', reason: 'tmdb-mismatch' }); return;
                }
                matchedSeries = true;
                (series.seasons || []).forEach(function (season) {
                    if (season.number == null || Number(season.number) !== coordinates.season) return;
                    (season.episodes || []).forEach(function (episode) {
                        if (Number(episode.number) !== coordinates.episode) return;
                        foundEpisode = true;
                        if (!episode.versions) return;
                        Object.keys(episode.versions).forEach(function (version) {
                            if (Array.isArray(episode.versions[version])) links = links.concat(extraLinks('Omega', episode.versions[version], ctx, version));
                        });
                    });
                });
            });
            if (matchedSeries && !foundEpisode) throw missingEpisode('Movix Omega');
            return links;
        });
    });
}
function movixSwiftflow(ctx, coordinates) {
    coordinates = coordinates || ctx;
    var path = '/api/swiftflow/' + ctx.type + '/' + ctx.id + (ctx.type === 'tv' ? '/season/' + coordinates.season + '?episode=' + coordinates.episode : '');
    return movixJson(path, 'Movix SwiftFlow', ctx, function (data) { return typeof data.success === 'boolean'; }).then(function (data) {
        if (!data.success && !data.pending && ctx.type === 'tv' && String(data.tmdb_id) === ctx.id &&
            String(data.error || '') === 'Saison ' + coordinates.season + ' non disponible') throw missingEpisode('Movix SwiftFlow');
        if (!data.success || data.pending) return [];
        if (String(data.tmdb_id) !== ctx.id) throw new Error('Movix SwiftFlow: TMDB mismatch');
        var groups = data.players, links = [];
        if (ctx.type === 'tv') {
            if (data.season == null || Number(data.season) !== coordinates.season) throw new Error('Movix SwiftFlow: season mismatch');
            groups = data.episodes && data.episodes[String(coordinates.episode)];
        }
        if (groups) Object.keys(groups).forEach(function (language) {
            if (Array.isArray(groups[language])) links = links.concat(extraLinks('SwiftFlow', groups[language], ctx, language));
        });
        if (data.mp4 && data.mp4.available) event('source-unavailable', { source: 'SwiftFlux', advertised: Array.isArray(data.mp4.entries) ? data.mp4.entries.length : 0, reason: 'browser-verification-required' });
        return links;
    });
}
function movixExtra(ctx) {
    var loaders = { custom: movixCustom, omega: movixOmega, swiftflow: movixSwiftflow }, names = ENDPOINTS.movix.extra;
    function load(name) {
        if (ctx.movixStoppedError) return Promise.resolve([]);
        return loaders[name](ctx).catch(function (error) {
            noteMissingEpisode(ctx, name, error);
            event('source-unavailable', { source: name, reason: error.status ? 'http-' + error.status : 'metadata-or-response-unavailable' });
            log(message(error)); return [];
        });
    }
    return load(names[0]).then(function (first) {
        return Promise.all(names.slice(1).map(load)).then(function (rest) { return [first].concat(rest); });
    }).then(function (groups) {
        var links = [], width = Math.max.apply(null, groups.map(function (group) { return group.length; }));
        for (var i = 0; i < width; i++) groups.forEach(function (group) { if (group[i]) links.push(group[i]); });
        return selectLinks(links, movixEndpoint(ctx).site + '/', ctx, 'Movix extra', { owner: function (link) { return 'Movix / ' + link.catalogue; } });
    }).then(function (streams) {
        if (streams.length) return streams;
        // Existing useful sources win before any additional backend recovery.
        return episodeFallbacks(ctx, names, function (name, coordinates) {
            var load = name === 'custom' ? movixCustomAt : loaders[name];
            return load(ctx, coordinates).then(function (links) {
                return selectLinks(links, movixEndpoint(ctx).site + '/', ctx, 'Movix extra', { owner: function (link) { return 'Movix / ' + link.catalogue; } });
            });
        });
    });
}
function getStreams(id, type, season, episode) { return run(id, type, season, episode, movixExtra); }
