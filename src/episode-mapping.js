/* Shared series correspondence. Backends declare their verified target layout;
 * the original context, request budget and playback data are never rewritten. */
var episodeMappings = {};
var episodeBackendNames = { custom: 'Custom', primary: 'Primary API', direct: 'Direct API', backup: 'Cpasmal',
    vidzy: 'Vidzy', catalogue: 'HTML catalogue', frembed: 'Frembed hosts', premium: 'Frembed premium',
    wiflix: 'Wiflix', fstream: 'FStream', coflix: 'Coflix', omega: 'Omega', swiftflow: 'SwiftFlow' };
function episodeTarget(backend) {
    var config = ENDPOINTS.episodeMapping;
    if (!config || config.inputCatalog === 'disabled' || settings().episodeRecovery === false || backend === 'custom' && settings().customEpisodeRecovery === false) return '';
    var target = config.targets[backend];
    return target === 'cinemeta' || target === 'nuvio-catalog' ? target : '';
}
function episodeMappingKey(ctx, backend) {
    var config = ENDPOINTS.episodeMapping;
    return [config.catalog, config.cinemeta, config.inputCatalog, episodeTarget(backend), ctx.id, ctx.season, ctx.episode].join(':');
}
function episodeSignature(video) {
    if (!video || !/^[1-9]\d*$/.test(String(video.season)) || !/^[1-9]\d*$/.test(String(video.episode))) return null;
    var title = cleanTitle(video.title || video.name || ''), released = String(video.released || '');
    if (title.length < 4 || /^(?:(?:episode|ep|chapter|part)\s*\d+|untitled|tba)$/.test(title) || !/^\d{4}-\d{2}-\d{2}T/.test(released)) return null;
    var date = Date.parse(released);
    return isFinite(date) ? { title: title, date: date } : null;
}
function sameEpisode(a, b) {
    // Overnight broadcasts can have adjacent UTC dates. Dates alone never match.
    return a && b && a.title === b.title && Math.abs(a.date - b.date) <= 86400000;
}
function episodeMetadata(ctx) {
    if (ctx.episodeMetadata) return ctx.episodeMetadata;
    var config = ENDPOINTS.episodeMapping;
    ctx.episodeMetadata = requestJson(config.catalog + '/meta/series/tmdb:' + ctx.id + '.json', config.catalog + '/', 'Episode target metadata', ctx).then(function (data) {
        var catalog = data.meta, imdb = catalog && (catalog.imdb_id || catalog.id);
        if (!catalog || !/^tt\d{5,12}$/.test(imdb || '') || catalog.id && catalog.id !== imdb ||
            catalog.moviedb_id != null && String(catalog.moviedb_id) !== ctx.id ||
            catalog.type && !/^(?:tv|series|anime)$/.test(catalog.type) ||
            !Array.isArray(catalog.genres) || !catalog.genres.some(function (g) { return /^animation$/i.test(g); }) || !Array.isArray(catalog.videos)) {
            throw new Error('Episode mapping: verified anime catalogue unavailable');
        }
        return requestJson(config.cinemeta + '/meta/series/' + imdb + '.json', config.cinemeta + '/', 'Episode input metadata', ctx).then(function (data) {
            var cinemeta = data.meta;
            if (!cinemeta || cinemeta.id !== imdb || cinemeta.imdb_id && cinemeta.imdb_id !== imdb || String(cinemeta.moviedb_id) !== ctx.id ||
                cinemeta.type && !/^(?:tv|series|anime)$/.test(cinemeta.type) ||
                !Array.isArray(cinemeta.genres) || !cinemeta.genres.some(function (g) { return /^animation$/i.test(g); }) || !Array.isArray(cinemeta.videos)) {
                throw new Error('Episode mapping: explicit series correspondence unavailable');
            }
            return { 'nuvio-catalog': catalog.videos, cinemeta: cinemeta.videos };
        });
    });
    return ctx.episodeMetadata;
}
function episodeCoordinates(ctx, backend) {
    var target = episodeTarget(backend), config = ENDPOINTS.episodeMapping;
    if (!target || ctx.type !== 'tv' || ctx.season < 1) return Promise.resolve(null);
    var key = episodeMappingKey(ctx, backend), cached = episodeMappings[key];
    function mapped(value, reused) {
        event('episode-mapping', { source: episodeBackendNames[backend], backend: backend, inputCatalog: value.input,
            targetCatalog: target, from: { season: ctx.season, episode: ctx.episode }, to: value.to,
            basis: 'unique-title-and-release', cached: reused });
        return value.to;
    }
    if (cached && Date.now() - cached.time < 600000) return Promise.resolve(mapped(cached, true));
    delete episodeMappings[key];
    return episodeMetadata(ctx).then(function (pair) {
        function selected(name) { return pair[name].filter(function (v) { return v && Number(v.season) === ctx.season && Number(v.episode) === ctx.episode; }); }
        var input = config.inputCatalog;
        if (input === 'auto') {
            var n = selected('nuvio-catalog'), c = selected('cinemeta');
            if (n.length > 1 || c.length > 1 || n.length && c.length && !sameEpisode(episodeSignature(n[0]), episodeSignature(c[0]))) {
                throw new Error('Episode mapping: input numbering is ambiguous; configure the metadata catalogue');
            }
            input = c.length ? 'cinemeta' : 'nuvio-catalog';
        }
        var rows = selected(input);
        if (rows.length !== 1) throw new Error('Episode mapping: requested episode missing or ambiguous');
        var identity = episodeSignature(rows[0]);
        var sameSource = pair[input].filter(function (v) { return sameEpisode(identity, episodeSignature(v)); });
        var candidates = pair[target].filter(function (v) { return sameEpisode(identity, episodeSignature(v)); });
        if (!identity || sameSource.length !== 1 || candidates.length !== 1) throw new Error('Episode mapping: unique episode identity unavailable');
        var to = { season: Number(candidates[0].season), episode: Number(candidates[0].episode) };
        if (to.season === ctx.season && to.episode === ctx.episode) return null;
        if (Object.keys(episodeMappings).length >= 50) episodeMappings = {};
        // Cache only successful correspondence. Inventory/media/grants/captions
        // remain fresh; concurrent backend recovery shares request-local metadata.
        episodeMappings[key] = { time: Date.now(), to: to, input: input };
        return mapped(episodeMappings[key], false);
    }).catch(function (error) {
        event('episode-mapping-unavailable', { source: episodeBackendNames[backend], backend: backend, reason: message(error) });
        return null;
    });
}
function missingEpisode(stage) {
    var error = new Error(stage + ': requested season or episode unavailable');
    error.stage = stage; error.episodeMissing = true; return error;
}
function noteMissingEpisode(ctx, backend, error) {
    var explicit = error.episodeMissing || error.status === 404 && (!error.contentType || /\bjson\b/i.test(error.contentType) || backend === 'catalogue' && error.stage === 'Nakios catalogue page');
    if (ctx.type !== 'tv' || ctx.season < 1 || !explicit) return false;
    ctx.missingEpisodes = ctx.missingEpisodes || {};
    ctx.missingEpisodes[backend] = true; return true;
}
function retryEpisode(ctx, backend, lookup) {
    if (!episodeTarget(backend) || ctx.movixStoppedError || !ctx.missingEpisodes || !ctx.missingEpisodes[backend] || selectionBudget(ctx)) return Promise.resolve([]);
    ctx.retriedEpisodes = ctx.retriedEpisodes || {};
    if (ctx.retriedEpisodes[backend]) return Promise.resolve([]);
    ctx.retriedEpisodes[backend] = true;
    return episodeCoordinates(ctx, backend).then(function (coordinates) {
        if (!coordinates) return [];
        return lookup(coordinates).catch(function (error) {
            if (error.status === 404 || error.episodeMissing) delete episodeMappings[episodeMappingKey(ctx, backend)];
            log(message(error)); return [];
        });
    });
}
function episodeLookup(ctx, backend, lookup) {
    return lookup(ctx).catch(function (error) {
        if (!noteMissingEpisode(ctx, backend, error)) throw error;
        return retryEpisode(ctx, backend, lookup);
    });
}
function episodeFallbacks(ctx, backends, lookup) {
    function next(index) {
        if (index >= backends.length || selectionBudget(ctx)) return Promise.resolve([]);
        var backend = backends[index];
        return retryEpisode(ctx, backend, function (coordinates) { return lookup(backend, coordinates); }).then(function (streams) {
            return streams.length ? streams : next(index + 1);
        });
    }
    return next(0);
}
