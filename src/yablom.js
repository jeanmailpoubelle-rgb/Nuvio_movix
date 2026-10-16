/* Yablom's rotating movie catalogue. Only verified search routes are cached;
 * entry folders, movie identifiers and signed media are never guessed. */
var yablomSearchCache = {};
function yablomAttrs(tag) {
    var result = {}, pattern = /\b([a-z][a-z0-9_-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi, match;
    while ((match = pattern.exec(tag))) result[match[1].toLowerCase()] = decodeHtml(match[3] !== undefined ? match[3] : match[4] !== undefined ? match[4] : match[5]);
    return result;
}
function yablomText(html) {
    return decodeHtml(html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function yablomRoot(value) {
    var root = site(value);
    if (root !== origin(root)) throw new Error('Yablom: expected an HTTPS site origin');
    return root;
}
function yablomForm(page) {
    var forms = page.body.match(/<form\b[^>]*>[\s\S]*?<\/form>/gi) || [];
    for (var i = 0; i < forms.length; i++) {
        var attrs = yablomAttrs(forms[i].match(/^<form\b[^>]*>/i)[0]);
        if (String(attrs.method).toLowerCase() !== 'post') continue;
        var inputs = forms[i].match(/<input\b[^>]*>/gi) || [], field = null;
        inputs.some(function (tag) { var a = yablomAttrs(tag); if (a.name === 'searchword') { field = a; return true; } return false; });
        if (!field) continue;
        var url = asUrl(attrs.action || page.url, page.url), root = origin(page.url);
        if (!url || origin(url) !== root || !/^https:\/\//.test(url)) continue;
        var route = url.slice(root.length).match(/^\/([a-z0-9_-]{1,64})\/home\/([a-z0-9_-]{1,64})\/?$/i);
        if (route) return { url: url, root: root, folder: route[1], brand: route[2], value: field.value || '' };
    }
    return null;
}
function yablomAnnouncement(html, base) {
    var text = yablomText(html), match = text.match(/\b(?:notre\s+)?(?:nouvelle\s+adresse|nouveau\s+(?:site|domaine))\s*[:\-]?\s*(?:https?:\/\/)?((?:www\.)?[a-z0-9-]+\.[a-z]{2,16})\b/i);
    var links = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [], candidate = match ? 'https://' + match[1] : '';
    for (var i = 0; !candidate && i < links.length; i++) {
        var attrs = yablomAttrs(links[i].match(/^<a\b[^>]*>/i)[0]);
        if (/\bnom\b/.test(attrs['class'] || '') || /^(?:notre\s+)?nouvelle adresse$/i.test(yablomText(links[i]))) candidate = attrs.href || '';
    }
    try { candidate = yablomRoot(candidate); } catch (_) { return null; }
    return candidate !== origin(base) ? candidate : null;
}
function yablomDirectory(page, parser) {
    if (parser === 'brand-address') {
        var main = page.body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
        return main ? yablomAnnouncement(main[1], page.url) : null;
    }
    // FMHY is an independent recovery directory, not an official status API.
    var section = page.body.match(/<h2\b[^>]*id=["']french-francais["'][^>]*>[\s\S]*?(?=<h2\b|$)/i);
    if (!section) return null;
    var pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi, match;
    while ((match = pattern.exec(section[0]))) {
        if (cleanTitle(yablomText(match[2])) !== 'yablom') continue;
        try { return yablomRoot(yablomAttrs(match[1]).href); } catch (_) { return null; }
    }
    return null;
}
function yablomAddressError(detail, page) {
    var error = new Error('Yablom address: ' + detail);
    error.yablomAddress = true;
    if (page) error.nextSite = yablomAnnouncement(page.body, page.url);
    return error;
}
function yablomFetch(url, referer, stage, ctx, transport) {
    return request(url, referer, stage, ctx, transport ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}, transport).catch(function (error) {
        error.yablomAddress = true; throw error;
    });
}
function yablomCards(html, endpoint) {
    var cards = [], seen = {}, pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi, match;
    while ((match = pattern.exec(html))) {
        var attrs = yablomAttrs(match[1]);
        if (!/\bfilm-card\b/.test(attrs['class'] || '')) continue;
        var url = asUrl(attrs.href, endpoint.url), path = url && url.slice(endpoint.root.length), prefix = '/' + endpoint.folder + '/b/' + endpoint.brand + '/';
        if (!url || origin(url) !== endpoint.root || seen[url] || !path || path.indexOf(prefix) !== 0 || !/^\d+\/?$/.test(path.slice(prefix.length))) continue;
        var image = match[2].match(/<img\b[^>]*>/i), img = image ? yablomAttrs(image[0]) : {};
        var title = match[2].match(/\bclass=["'][^"']*\bfilm-card-title\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
        var date = match[2].match(/\bclass=["'][^"']*\btrend-card-date\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
        var name = title ? yablomText(title[1]) : img.alt || '';
        if (!name) continue;
        seen[url] = true;
        cards.push({ url: url, type: 'movie', title: name, year: yearOf(date ? yablomText(date[1]) : yablomText(match[2])), poster: img.src || img['data-src'] || '',
            lang: /\bfilm-card-vostfr\b/.test(match[2]) ? 'VOSTFR' : '', referer: endpoint.url, root: endpoint.root });
    }
    return cards;
}
function yablomMovie(page, match, meta, ctx) {
    var heading = page.body.match(/\bclass=["'][^"']*\bfilm-detail-title\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    if (!heading || origin(page.url) !== match.root) throw yablomAddressError('movie page schema changed', page);
    var title = yablomText(heading[1]), year = title.match(/\(((?:18|19|20)\d{2})\)\s*$/);
    var posterBlock = page.body.match(/<a\b[^>]*\bclass=["'][^"']*\bfilm-detail-poster\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    var posterTag = posterBlock && posterBlock[1].match(/<img\b[^>]*>/i), poster = posterTag ? yablomAttrs(posterTag[0]) : {};
    var candidate = { title: year ? title.slice(0, year.index).trim() : title, year: year ? Number(year[1]) : null, type: 'movie', poster: poster.src || poster['data-src'] || '' };
    if (!chooseMatch([candidate], meta, 'movie')) throw new Error('Yablom: movie page does not match the requested title/year');
    var marker = page.body.search(/\bid=["']film-player["']/i);
    if (marker < 0) { event('yablom-inventory', { advertised: 0, supported: 0 }); return Promise.resolve([]); }
    var block = page.body.slice(marker, marker + 32000).split(/<div\b[^>]*\bclass=["'][^"']*\bfilm-detail-header\b/i)[0];
    var tags = block.match(/<iframe\b[^>]*>/gi) || [], links = [];
    tags.forEach(function (tag) {
        var attrs = yablomAttrs(tag), url = asUrl(attrs.src || attrs['data-src'], page.url);
        if (url && /^https:\/\//.test(url) && supportsHost(url)) links.push({ url: url, lang: match.lang });
    });
    event('yablom-inventory', { advertised: tags.length, supported: links.length });
    // Unlabelled catalogue entries cannot prove French-only audio. Actual HLS
    // tracks can supply VF/MULTI; retain an explicit VOSTFR catalogue hint.
    return resolveLinks(links, page.url, ctx, 'Yablom');
}
function yablomLookup(ctx) {
    if (ctx.type !== 'movie') return Promise.resolve([]);
    return tmdbDetails(ctx).then(function (meta) {
        var mirrors = settings().yablomMirrors || ENDPOINTS.yablom.mirrors;
        if (!Array.isArray(mirrors) || !mirrors.length || mirrors.length > 3) throw new Error('Yablom: expected one to three mirrors');
        mirrors = mirrors.map(function (item) {
            var root = yablomRoot(typeof item === 'string' ? item : item.site), search = typeof item === 'object' && item.search;
            if (search && (site(search) !== search.replace(/\/$/, '') || origin(search) !== root)) throw new Error('Yablom: search route must belong to its site');
            return { site: root, search: search };
        });
        var roots = {}, searched = {};
        function discover(root, depth) {
            root = yablomRoot(root); depth = depth || 0;
            if (roots[root] || depth > 2 || Object.keys(roots).length >= 6 || selectionBudget(ctx)) return Promise.reject(yablomAddressError('recovery exhausted'));
            roots[root] = true;
            function read(page, followEntry) {
                var form = yablomForm(page);
                if (form) return form;
                var announcement = yablomAnnouncement(page.body, page.url);
                if (announcement) return discover(announcement, depth + 1);
                if (!followEntry) throw yablomAddressError('unrecognized entry page', page);
                var entries = [], tags = page.body.match(/<a\b[^>]*>/gi) || [];
                tags.forEach(function (tag) {
                    var url = asUrl(yablomAttrs(tag).href, page.url);
                    if (url && origin(url) === origin(page.url) && /^\/[a-z0-9_-]{3,64}\/?$/i.test(url.slice(origin(url).length)) && entries.indexOf(url) < 0) entries.push(url);
                });
                if (entries.length !== 1) throw yablomAddressError('expected one catalogue entry', page);
                return yablomFetch(entries[0], page.url, 'Yablom entry', ctx).then(function (response) { return read(response, false); });
            }
            return yablomFetch(root + '/', root + '/', 'Yablom site discovery', ctx).then(function (page) { return read(page, true); });
        }
        function lookup(endpoint, cacheRoot) {
            if (searched[endpoint.url]) return Promise.reject(yablomAddressError('search route already tried'));
            searched[endpoint.url] = true;
            return searchTitles(meta, function (query) {
                return yablomFetch(endpoint.url, endpoint.url, 'Yablom title search', ctx, { method: 'POST', body: 'searchword=' + encodeURIComponent(query) }).then(function (page) {
                    var form = yablomForm(page);
                    if (!form || cleanTitle(form.value) !== cleanTitle(query)) throw yablomAddressError('unconfirmed search response', page);
                    var verified = { endpoint: { url: form.url, root: form.root, folder: form.folder, brand: form.brand }, at: Date.now() };
                    yablomSearchCache[cacheRoot] = verified;
                    yablomSearchCache[mirrors[0].site] = verified;
                    var cards = yablomCards(page.body, form), match = chooseMatch(cards, meta, 'movie');
                    event('yablom-search', { host: form.root, candidates: cards.length, matched: !!match });
                    return match;
                });
            }).then(function (match) {
                if (!match) return [];
                return yablomFetch(match.url, match.referer, 'Yablom movie page', ctx).then(function (page) { return yablomMovie(page, match, meta, ctx); });
            });
        }
        function attempt(mirror) {
            var cached = yablomSearchCache[mirror.site];
            var endpoint = cached && Date.now() - cached.at < 1800000 ? cached.endpoint : mirror.search ? { url: mirror.search } : null;
            var first = endpoint ? lookup(endpoint, mirror.site) : discover(mirror.site).then(function (form) { return lookup(form, mirror.site); });
            return first.catch(function (error) {
                delete yablomSearchCache[mirror.site];
                if (!error.yablomAddress) throw error;
                var next = error.nextSite || mirror.site;
                return discover(next).then(function (form) { return lookup(form, mirror.site); });
            });
        }
        function directory(index) {
            var entry = ENDPOINTS.yablom.directories[index];
            if (!entry || selectionBudget(ctx)) return Promise.resolve([]);
            return yablomFetch(entry.url, entry.url, 'Yablom address directory', ctx).then(function (page) {
                var root = yablomDirectory(page, entry.parser);
                if (!root || roots[root]) return directory(index + 1);
                return discover(root).then(function (form) { return lookup(form, root); });
            }).catch(function (error) { log(message(error)); return error.yablomAddress ? directory(index + 1) : []; });
        }
        function mirror(index) {
            if (selectionBudget(ctx)) return Promise.resolve([]);
            if (!mirrors[index]) return directory(0);
            return attempt(mirrors[index]).catch(function (error) { log(message(error)); return error.yablomAddress ? mirror(index + 1) : []; });
        }
        return mirror(0);
    });
}
function getStreams(tmdbId, mediaType, season, episode) { return run(tmdbId, mediaType, season, episode, yablomLookup); }
