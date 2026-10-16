/* TMDB discovery adapted from Nuvio_frembed ace5453. GPL-3.0-only;
 * see THIRD_PARTY_NOTICES.md. Each branch has its own TV worker/budget. */
function frembedBase() {
    var base = site(settings().frembedBaseUrl || ENDPOINTS.frembed.base);
    if (origin(base) !== base) throw new Error('Frembed: expected an HTTPS origin');
    return base;
}
function frembedQuery(ctx) { return 'id=' + ctx.id + (ctx.type === 'tv' ? '&sa=' + ctx.season + '&epi=' + ctx.episode : ''); }
function frembedHosts(ctx) {
    var base = frembedBase(), page = base + '/' + (ctx.type === 'tv' ? 'series' : 'films') + '?' + frembedQuery(ctx);
    return requestJson(base + '/api/' + (ctx.type === 'tv' ? 'series' : 'films') + '?' + frembedQuery(ctx) + '&idType=tmdb', page, 'Frembed hosts', ctx).then(function (data) {
        if (data.error) throw new Error('Frembed: host discovery unavailable');
        var links = [];
        function add(url, lang, name, quality) {
            url = asUrl(url, base + '/', false);
            if (url) links.push({ url: url, lang: lang, server: name, quality: quality, preserveUrl: true });
        }
        if (Object.prototype.hasOwnProperty.call(data, 'links')) {
            if (!Array.isArray(data.links)) throw new Error('Frembed: invalid links array');
            data.links.forEach(function (item) {
                if (item && typeof item === 'object') add(item.url, item.lang, item.host && item.host.name || item.label, item.quality);
            });
        } else {
            for (var n = 1; n <= 7; n++) ['vf', 'vostfr', 'vo'].forEach(function (lang) {
                add(data['link' + n + (lang === 'vf' ? '' : lang)], lang, 'Lecteur ' + n, data[lang === 'vf' ? 'quality' : lang === 'vo' ? 'qualityVo' : 'qualityVostfr']);
            });
        }
        // A populated modern list is authoritative. Interleave its language
        // groups so a long VF list cannot consume every bounded attempt.
        var groups = {}, ordered = [];
        links.forEach(function (link) { var lang = String(link.lang || '').toUpperCase(); (groups[lang] = groups[lang] || []).push(link); });
        for (var i = 0; i < links.length; i++) Object.keys(groups).forEach(function (lang) { if (groups[lang][i]) ordered.push(groups[lang][i]); });
        event('frembed-inventory', { advertised: links.length, languages: Object.keys(groups) });
        return resolveLinks(ordered, page, ctx, 'Frembed');
    });
}
function frembedPremium(ctx) {
    var base = frembedBase(), payload = { tmdbId: ctx.id, kind: ctx.type === 'tv' ? 'series' : 'movie', playerType: 'vip', locale: 'fr', turnstileToken: '' };
    if (ctx.type === 'tv') { payload.season = ctx.season; payload.episode = ctx.episode; }
    return requestJson(base + '/api/player/resolve', base + '/' + (ctx.type === 'tv' ? 'tv-show/' : 'movies/') + ctx.id,
        'Frembed grant', ctx, { Origin: base, 'Content-Type': 'application/json' }, { method: 'POST', body: JSON.stringify(payload) }).then(function (grant) {
        var player = !grant.error && asUrl(grant.url, base + '/', false);
        if (!player) throw new Error('Frembed: ordinary player grant unavailable');
        var query = 'tmdb=' + ctx.id + '&type=' + (ctx.type === 'tv' ? 'serie' : 'movie') + (ctx.type === 'tv' ? '&sa=' + ctx.season + '&ep=' + ctx.episode : '');
        return requestJson(origin(player) + '/api/streaming/player?' + query, player, 'Frembed premium', ctx).then(function (data) {
            if (data.error || !Array.isArray(data.sources)) throw new Error('Frembed: premium sources unavailable');
            return unique(data.sources.slice(0, ENDPOINTS.limits.hostSources).map(function (source) {
                if (!source || typeof source !== 'object') return null;
                var url = asUrl(source.url, player, false);
                if (!url) return null;
                // Match the original URL-only handoff: never inject a site
                // Referer/Origin into a normally granted premium media request.
                return stream({ url: url, name: 'Premium', quality: source.quality || source.label, lang: source.version || source.lang,
                    format: mediaFormat(url, source.mime || source.format), subtitles: source.tracks || source.subtitles || data.subtitles,
                    headers: mergeHeaders({ 'User-Agent': USER_AGENT }, source.headers), bareHeaders: true, preserveUrl: true }, '', player, 'Frembed / Premium');
            }));
        });
    });
}
