/* Missing Custom episodes only. The incoming catalogue is explicitly configured;
 * an IMDb/TMDB series ID cannot reveal which episode numbering the app used. */
var customEpisodeMappings = {};
function customEpisodeKey(ctx) {
    var config = ENDPOINTS.movix.customEpisodeRecovery;
    return config.catalog + ':' + config.cinemeta + ':' + ctx.id + ':' + ctx.season + ':' + ctx.episode;
}
function customEpisodeSignature(video) {
    if (!video || !/^[1-9]\d*$/.test(String(video.season)) || !/^[1-9]\d*$/.test(String(video.episode))) return null;
    var title = cleanTitle(video.title || video.name || ''), released = String(video.released || '');
    if (title.length < 4 || /^(?:(?:episode|ep|chapter|part)\s*\d+|untitled|tba)$/.test(title) || !/^\d{4}-\d{2}-\d{2}T/.test(released)) return null;
    var date = Date.parse(released);
    return isFinite(date) ? { title: title, date: date } : null;
}
function customEpisodeSame(a, b) {
    // Catalogue releases can describe the same overnight Japanese broadcast on
    // adjacent UTC dates. A unique exact title is also required, never dates alone.
    return a && b && a.title === b.title && Math.abs(a.date - b.date) <= 86400000;
}
function customEpisodeCoordinates(ctx) {
    var config = ENDPOINTS.movix.customEpisodeRecovery;
    if (!config || config.inputCatalog !== 'cinemeta' || settings().customEpisodeRecovery === false || ctx.type !== 'tv' || ctx.season < 1) return Promise.resolve(null);
    var key = customEpisodeKey(ctx), cached = customEpisodeMappings[key];
    function mapped(to, reused) {
        event('episode-mapping', { source: 'Custom', inputCatalog: 'cinemeta', targetCatalog: 'nuvio-catalog',
            from: { season: ctx.season, episode: ctx.episode }, to: to, basis: 'unique-title-and-release', cached: reused });
        return to;
    }
    if (cached && Date.now() - cached.time < 600000) return Promise.resolve(mapped(cached.to, true));
    delete customEpisodeMappings[key];
    return requestJson(config.catalog + '/meta/series/tmdb:' + ctx.id + '.json', config.catalog + '/', 'Custom target metadata', ctx).then(function (data) {
        var target = data.meta, imdb = target && (target.imdb_id || target.id);
        if (!target || !/^tt\d{5,12}$/.test(imdb || '') || target.id && target.id !== imdb ||
            target.moviedb_id != null && String(target.moviedb_id) !== ctx.id ||
            target.type && !/^(?:tv|series|anime)$/.test(target.type) ||
            !Array.isArray(target.genres) || !target.genres.some(function (g) { return /^animation$/i.test(g); }) || !Array.isArray(target.videos)) {
            throw new Error('Custom mapping: verified anime target metadata unavailable');
        }
        return requestJson(config.cinemeta + '/meta/series/' + imdb + '.json', config.cinemeta + '/', 'Custom input metadata', ctx).then(function (data) {
            var source = data.meta;
            if (!source || source.id !== imdb || source.imdb_id && source.imdb_id !== imdb || String(source.moviedb_id) !== ctx.id ||
                source.type && !/^(?:tv|series|anime)$/.test(source.type) ||
                !Array.isArray(source.genres) || !source.genres.some(function (g) { return /^animation$/i.test(g); }) || !Array.isArray(source.videos)) {
                throw new Error('Custom mapping: explicit series correspondence unavailable');
            }
            var selected = source.videos.filter(function (v) { return v && Number(v.season) === ctx.season && Number(v.episode) === ctx.episode; });
            if (selected.length !== 1) throw new Error('Custom mapping: requested episode missing or ambiguous');
            var identity = customEpisodeSignature(selected[0]);
            var sameSource = source.videos.filter(function (v) { return customEpisodeSame(identity, customEpisodeSignature(v)); });
            var candidates = target.videos.filter(function (v) { return customEpisodeSame(identity, customEpisodeSignature(v)); });
            if (!identity || sameSource.length !== 1 || candidates.length !== 1) throw new Error('Custom mapping: unique episode identity unavailable');
            var to = { season: Number(candidates[0].season), episode: Number(candidates[0].episode) };
            if (to.season === ctx.season && to.episode === ctx.episode) return null;
            if (Object.keys(customEpisodeMappings).length >= 50) customEpisodeMappings = {};
            // Only correspondence is cached. Every Custom inventory, player,
            // signed media URL, grant and caption remains freshly requested.
            customEpisodeMappings[key] = { time: Date.now(), to: to };
            return mapped(to, false);
        });
    }).catch(function (error) {
        event('episode-mapping-unavailable', { source: 'Custom', reason: message(error) });
        return null;
    });
}
