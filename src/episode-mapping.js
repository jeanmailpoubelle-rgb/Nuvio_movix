/* Shared series correspondence. Backends declare their verified target layout;
 * the original context, request budget and playback data are never rewritten. */
var episodeMappings = {};
function inputTranslationEnabled(ctx) { return ctx.type === 'tv' && ctx.season > 0 && InputMetadata.active(settings()); }
var episodeBackendNames = { custom: 'Custom', primary: 'Primary API', direct: 'Direct API', backup: 'Cpasmal',
    vidzy: 'Vidzy', catalogue: 'HTML catalogue', frembed: 'Frembed hosts', premium: 'Frembed premium',
    wiflix: 'Wiflix', fstream: 'FStream', coflix: 'Coflix', omega: 'Omega', swiftflow: 'SwiftFlow' };
function episodeTarget(backend) {
    var config = ENDPOINTS.episodeMapping;
    if (!config || !InputMetadata.active(settings()) && (config.inputCatalog === 'disabled' || settings().episodeRecovery === false || backend === 'custom' && settings().customEpisodeRecovery === false)) return '';
    var target = config.targets[backend];
    return target === 'cinemeta' || target === 'nuvio-catalog' ? target : '';
}
function episodeMappingKey(ctx, backend) {
    var config = ENDPOINTS.episodeMapping;
    return [config.catalog, config.cinemeta, config.inputCatalog, episodeTarget(backend), ctx.id, ctx.season, ctx.episode].join(':');
}
function episodeSignature(video) {
    return InputMetadata.signature(video);
}
function sameEpisode(a, b) {
    // Overnight broadcasts can have adjacent UTC dates. Dates alone never match.
    return InputMetadata.sameSignature(a,b);
}
function inputReference(ctx, name) {
    ctx.inputReferences = ctx.inputReferences || {};
    if (ctx.inputReferences[name]) return ctx.inputReferences[name];
    var config = ENDPOINTS.episodeMapping;
    if (name === 'nuvio-catalog') {
        ctx.inputReferences[name] = requestJson(config.catalog + '/meta/series/tmdb:' + ctx.id + '.json', '', 'Episode target metadata', ctx).then(function (data) {
            return { meta: data.meta, ids: InputMetadata.identity(data.meta, { tmdbId: ctx.id }, true) };
        });
    } else if (name === 'nuvio-catalog-imdb') {
        ctx.inputReferences[name] = inputReference(ctx, 'nuvio-catalog').then(function (base) {
            if (!base.ids.imdbId) throw InputMetadata.fail('INPUT_METADATA_QUERY_ID_UNAVAILABLE');
            return requestJson(config.catalog + '/meta/series/' + base.ids.imdbId + '.json', '', 'Episode reference recovery', ctx).then(function (data) {
                return { meta: data.meta, ids: InputMetadata.identity(data.meta, base.ids) };
            });
        });
    } else {
        ctx.inputReferences[name] = inputReference(ctx, 'nuvio-catalog').then(function (base) {
            if (!base.ids.imdbId) throw InputMetadata.fail('INPUT_METADATA_QUERY_ID_UNAVAILABLE');
            return requestJson(config.cinemeta + '/meta/series/' + base.ids.imdbId + '.json', '', 'Episode backend metadata', ctx).then(function (data) {
                return { meta: data.meta, ids: InputMetadata.identity(data.meta, base.ids) };
            });
        });
    }
    return ctx.inputReferences[name];
}
function inputEpisodeState(ctx) {
    if (ctx.inputEpisodeState) return ctx.inputEpisodeState;
    var config = InputMetadata.configuration(settings());
    ctx.inputEpisodeState = inputReference(ctx, 'nuvio-catalog').then(function (reference) {
        var url = InputMetadata.requestUrl(config, reference.ids);
        return requestJson(url, '', 'Input episode metadata', ctx, undefined, { sensitive: true }).then(function (data) {
            var ids = InputMetadata.identity(data.meta, reference.ids);
            return InputMetadata.select(data.meta, ids, ctx.season, ctx.episode, config.origin);
        });
    });
    return ctx.inputEpisodeState;
}
function inputFindTvdb(ctx, id) {
    ctx.inputExternalIds = ctx.inputExternalIds || {};
    if (ctx.inputExternalIds[id]) return ctx.inputExternalIds[id];
    var key = settings().tmdbApiKey || (typeof TMDB_API_KEY === 'string' ? TMDB_API_KEY : '');
    if (!key) return Promise.reject(InputMetadata.fail('INPUT_METADATA_TMDB_KEY_REQUIRED'));
    var bearer = key.indexOf('.') >= 0, url = ENDPOINTS.episodeMapping.tmdbApi + '/find/' + id + '?external_source=tvdb_id' + (bearer ? '' : '&api_key=' + encodeURIComponent(key));
    ctx.inputExternalIds[id] = requestJson(url, '', 'Episode external ID', ctx, bearer ? { Authorization: 'Bearer ' + key } : undefined);
    return ctx.inputExternalIds[id];
}
function inputEpisodeCoordinates(ctx, backend, target) {
    ctx.inputCoordinates = ctx.inputCoordinates || {};
    if (!ctx.inputCoordinates[target]) ctx.inputCoordinates[target] = Promise.all([inputEpisodeState(ctx), inputReference(ctx, target)]).then(function (pair) {
        return InputMetadata.resolve(pair[0], pair[1].meta, target, {
            findTvdb: function (id) { return inputFindTvdb(ctx, id); },
            referenceByImdb: function () { return inputReference(ctx, 'nuvio-catalog-imdb').then(function (data) { return data.meta; }); },
            cinemeta: function () { return inputReference(ctx, 'cinemeta').then(function (data) { return data.meta; }); },
            reference: function () { return inputReference(ctx, 'nuvio-catalog').then(function (data) { return data.meta; }); }
        });
    });
    return ctx.inputCoordinates[target].then(function (mapped) {
        var to = { season: mapped.season, episode: mapped.episode };
        event('episode-mapping', { source: episodeBackendNames[backend], backend: backend, inputCatalog: 'aiometadata', targetCatalog: target,
            from: { season: ctx.season, episode: ctx.episode }, to: to, basis: mapped.basis, cached: false });
        return to;
    });
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
            return { 'nuvio-catalog': catalog.videos, cinemeta: cinemeta.videos, imdbId: imdb };
        });
    });
    return ctx.episodeMetadata;
}
function episodeCoordinates(ctx, backend, required) {
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
        if (to.season === ctx.season && to.episode === ctx.episode) return required ? to : null;
        if (Object.keys(episodeMappings).length >= 50) episodeMappings = {};
        // Cache only successful correspondence. Inventory/media/grants/captions
        // remain fresh; concurrent backend recovery shares request-local metadata.
        episodeMappings[key] = { time: Date.now(), to: to, input: input };
        return mapped(episodeMappings[key], false);
    }).catch(function (error) {
        event('episode-mapping-unavailable', { source: episodeBackendNames[backend], backend: backend, reason: message(error) });
        if (required) throw error;
        return null;
    });
}
function orderedEpisodeLookup(ctx, backend, lookup) {
    if (!inputTranslationEnabled(ctx)) return lookup(ctx);
    var target = episodeTarget(backend);
    if (!target) {
        event('input-metadata-backend-unverified', { backend: backend });
        return Promise.resolve([]);
    }
    // An unavailable/ambiguous identity must never fall back to a potentially
    // wrong original episode. Other backend families retain their own policy.
    return Promise.resolve().then(function () { return inputEpisodeCoordinates(ctx, backend, target); }).catch(function (error) {
        // Do not let another route in this worker disguise a failed explicit
        // correspondence as a playable result at the original coordinates.
        ctx.episodeOrderUnverified = true;
        event('episode-mapping-unavailable', { source: episodeBackendNames[backend], backend: backend, reason: error.code || 'INPUT_METADATA_UNAVAILABLE' });
        throw error;
    }).then(function (coordinates) {
        ctx.retriedEpisodes = ctx.retriedEpisodes || {};
        ctx.retriedEpisodes[backend] = true;
        return lookup(coordinates).then(function (streams) {
            return InputMetadata.tagStreams(streams,ctx,coordinates,settings());
        }).catch(function (error) {
            if (error.status === 404 || error.episodeMissing) delete episodeMappings[episodeMappingKey(ctx, backend)];
            throw error;
        });
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
    if (inputTranslationEnabled(ctx)) return Promise.resolve([]);
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
    if (inputTranslationEnabled(ctx)) return orderedEpisodeLookup(ctx, backend, lookup);
    return lookup(ctx).catch(function (error) {
        if (!noteMissingEpisode(ctx, backend, error)) throw error;
        return retryEpisode(ctx, backend, lookup);
    });
}
function episodeFallbacks(ctx, backends, lookup) {
    if (ctx.episodeOrderUnverified || inputTranslationEnabled(ctx)) return Promise.resolve([]);
    function next(index) {
        if (index >= backends.length || selectionBudget(ctx)) return Promise.resolve([]);
        var backend = backends[index];
        return retryEpisode(ctx, backend, function (coordinates) { return lookup(backend, coordinates); }).then(function (streams) {
            return streams.length ? streams : next(index + 1);
        });
    }
    return next(0);
}
