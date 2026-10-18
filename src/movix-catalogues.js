/* Public TMDB catalogue protocols, implemented independently from the website.
 * A separate scraper keeps host extraction independent of the fast API path. */
function movixCataloguePath(name, ctx, coordinates) {
    coordinates = coordinates || ctx;
    var id = ctx.id, tv = ctx.type === 'tv';
    if (name === 'wiflix') return '/api/wiflix/' + ctx.type + '/' + id + (tv ? '/' + coordinates.season + '?episode=' + coordinates.episode : '');
    if (name === 'fstream') return '/api/fstream/' + ctx.type + '/' + id + (tv ? '/season/' + coordinates.season + '?episode=' + coordinates.episode : '');
    return '/api/tmdb/' + ctx.type + '/' + id + (tv ? '?season=' + coordinates.season + '&episode=' + coordinates.episode : '');
}
function catalogueId(data) { return data.tmdb_id || data.tmdb && data.tmdb.id || data.tmdb_details && data.tmdb_details.id; }
function catalogueLinks(name, data, ctx, coordinates) {
    coordinates = coordinates || ctx;
    if (String(catalogueId(data)) !== ctx.id) throw new Error('Movix ' + name + ': TMDB ID mismatch');
    if (data.type && data.type !== ctx.type) throw new Error('Movix ' + name + ': media type mismatch');
    var groups = data.players, links = [], advertised = 0, unsupported = {};
    if (ctx.type === 'tv') {
        var season = data.season != null ? data.season : data.metadata && data.metadata.season;
        if (season != null && Number(season) !== coordinates.season) throw new Error('Movix ' + name + ': season mismatch');
        if (name === 'coflix') {
            var current = data.current_episode;
            if (!current) return [];
            var currentSeason = current.season_number != null ? current.season_number : current.season;
            var currentEpisode = current.episode_number != null ? current.episode_number : current.episode;
            if (currentSeason != null && Number(currentSeason) !== coordinates.season) throw new Error('Movix Coflix: season mismatch');
            if (currentEpisode != null && Number(currentEpisode) !== coordinates.episode) throw new Error('Movix Coflix: episode mismatch');
            groups = { Default: current.player_links };
        } else {
            var episode = data.episodes && data.episodes[String(coordinates.episode)];
            if (!episode) return [];
            if (episode.number != null && Number(episode.number) !== coordinates.episode) throw new Error('Movix ' + name + ': episode mismatch');
            groups = name === 'fstream' ? episode.languages : episode;
        }
    } else if (name === 'coflix') groups = { Default: data.player_links };
    if (!groups || typeof groups !== 'object') return [];
    Object.keys(groups).forEach(function (group) {
        if (!Array.isArray(groups[group])) return;
        groups[group].forEach(function (item) {
            if (!item || typeof item !== 'object') return;
            advertised++;
            var url = asUrl(item.url || item.decoded_url || item.link, movixEndpoint(ctx).site + '/', false);
            var server = item.player || item.server || item.name || '';
            if (!url || !supportsHost(url, server)) {
                var host = origin(url || '').replace(/^https?:\/\//, '') || 'invalid'; unsupported[host] = (unsupported[host] || 0) + 1; return;
            }
            var hint = /^(?:VF|VO)/i.test(group) ? group : /^(?:VF|VO)/i.test(item.type || '') ? item.type : '';
            var rawLang = String(item.language || item.lang || hint).toUpperCase();
            var lang = /^(?:MULTI|DUAL)/.test(rawLang) ? 'MULTI' : /VOST/.test(rawLang) ? 'VOSTFR' : /^(?:VF|VFF|VFQ|FR|FRENCH)/.test(rawLang) ? 'VF' : /^(?:VO|ENG|ENGLISH)/.test(rawLang) ? 'VO' : '';
            links.push({ url: url, server: server, lang: lang, quality: item.quality, preserveUrl: true,
                subtitles: item.subtitles, subtitleBase: movixEndpoint(ctx).site + '/', headers: item.headers, catalogue: name });
        });
    });
    event('movix-catalogue', { source: name, advertised: advertised, supported: links.length, unsupported: unsupported });
    // Keep languages represented before a long group consumes the host budget.
    var languages = {}, ordered = [];
    links.forEach(function (link) { (languages[link.lang] = languages[link.lang] || []).push(link); });
    for (var i = 0; i < links.length; i++) Object.keys(languages).forEach(function (key) { if (languages[key][i]) ordered.push(languages[key][i]); });
    return ordered;
}
function movixCatalogues(ctx) {
    var names = ENDPOINTS.movix.catalogues, groups = [];
    function raw(name, coordinates) {
        return movixJson(movixCataloguePath(name, ctx, coordinates), 'Movix ' + name, ctx, function (data) {
            return !!catalogueId(data) || data.success === false || typeof data.error === 'string' || typeof data.message === 'string';
        }).then(function (data) {
            if (data.pending || data.success === false) return [];
            return catalogueLinks(name, data, ctx, coordinates);
        });
    }
    function load(name) {
        return raw(name).catch(function (error) { noteMissingEpisode(ctx, name, error); log(message(error)); return []; });
    }
    // The first real lookup establishes a working origin. It doubles as useful
    // work, rather than a preflight; remaining catalogues can then overlap.
    return load(names[0]).then(function (first) {
        groups.push(first);
        return Promise.all(names.slice(1).map(load));
    }).then(function (rest) {
        groups = groups.concat(rest);
        var links = [], width = Math.max.apply(null, groups.map(function (group) { return group.length; }));
        for (var i = 0; i < width; i++) groups.forEach(function (group) {
            var link = group[i];
            if (!link) return;
            links.push(link);
        });
        return selectLinks(links, movixEndpoint(ctx).site + '/', ctx, 'Movix catalogues', { owner: function (link) {
            return 'Movix / ' + { wiflix: 'Wiflix', fstream: 'FStream', coflix: 'Coflix' }[link.catalogue];
        } });
    }).then(function (streams) {
        if (streams.length) return streams;
        return episodeFallbacks(ctx, names, function (name, coordinates) {
            return raw(name, coordinates).then(function (links) {
                return selectLinks(links, movixEndpoint(ctx).site + '/', ctx, 'Movix catalogues', { owner: function (link) {
                    return 'Movix / ' + { wiflix: 'Wiflix', fstream: 'FStream', coflix: 'Coflix' }[link.catalogue];
                } });
            });
        });
    });
}
function getStreams(id, type, season, episode) { return run(id, type, season, episode, movixCatalogues); }
