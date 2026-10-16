function nakiosCards(html, base) {
    var result = [], pattern = /<a\b[^>]*href=["']([^"']+\/(movie|tv-show)\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?=<a\b|$)/gi, m;
    while ((m = pattern.exec(html))) {
        var title = m[3].match(/\balt=["']([^"']+)["']/i), tail = m[4].slice(0, 3000), heading = tail.match(/<h3[^>]*>([^<]+)<\/h3>/i);
        if (!title && !heading) continue;
        var url = asUrl(m[1], base), poster = m[3].match(/data-src=["']([^"']+)["']/i);
        if (url && origin(url) === origin(base)) result.push({ url: url, type: m[2] === 'movie' ? 'movie' : 'tv', title: decodeHtml(heading ? heading[1] : title[1]), year: yearOf(tail), poster: poster ? poster[1] : '' });
    }
    return result;
}
function nakiosCatalogue(ctx, base, meta) {
    return searchTitles(meta, function (title) {
        return request(base + '/search/' + encodeURIComponent(title), base + '/', 'Nakios title search', ctx).then(function (response) {
            var cards = nakiosCards(response.body, response.url);
            if (!cards.length && !/search-component|search-modal|csrf-token/i.test(response.body)) throw new Error('Catalogue: unexpected search page');
            return chooseMatch(cards, meta, ctx.type);
        });
    }).then(function (match) {
        if (!match) { event('catalogue', { match: 'none', host: base }); return null; }
        var page = match.url;
        if (ctx.type === 'tv') page = base + '/episode/' + match.url.split('/').pop() + '/' + ctx.season + '-' + ctx.episode;
        return request(page, base + '/', 'Nakios catalogue page', ctx);
    }).then(function (response) {
        if (!response) return [];
        var videos = jsonArrayAfter(response.body, 'const videos =');
        if (!videos) throw new Error('Nakios catalogue: video data missing');
        // Prefer supported player embeds and direct media. Unsupported hosts are
        // reported instead of sending an HTML page to Android's native player.
        var supported = videos.filter(function (video) {
            var u = asUrl(video.link, response.url);
            return u && (isVidzyEmbed(u) || isLuluEmbed(u) || formatOf(u, video.embed_type === 'hls' ? 'm3u8' : video.embed_type));
        });
        // Catalogue buttons can be identical aliases. Fetch each player once.
        var seen = {}, candidates = supported.filter(function (video) {
            var url = asUrl(video.link, response.url);
            if (seen[url]) return false;
            seen[url] = true; return true;
        });
        event('catalogue-inventory', { host: base, advertised: videos.length, supported: supported.length,
            distinct: candidates.length,
            unsupported: videos.length - supported.length, languages: videos.map(function (video) { return video.version; }) });
        if (!supported.length) log('Nakios catalogue: only unsupported embedded players are available');
        return Promise.all(candidates.map(function (video) {
            var label = isLuluEmbed(asUrl(video.link, response.url)) ? 'Catalogue / LuluStream' : 'Catalogue / Vidzy';
            return resolveEmbed(video.link, response.url, ctx, label, video.version);
        })).then(unique);
    });
}
var discoveredCatalogues = {};
function directoryCandidate(html, directory) {
    var candidates = [], m;
    if (directory.parser === 'labelled-table') {
        (html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || []).forEach(function (row) {
            if (!/catalogue|streaming/i.test(row)) return;
            var links = /href=["'](https:\/\/[^"']+)["']/gi;
            while ((m = links.exec(row))) candidates.push(m[1]);
        });
    } else {
        var buttons = /window\.open\(\s*['"](https:\/\/[^'"\s]+)['"]\s*,\s*['"]_blank['"]\s*\)/gi;
        while ((m = buttons.exec(html))) candidates.push(m[1]);
    }
    var brand = new RegExp('^https://(?:www\\.)?' + directory.brand + '\\.[a-z0-9.-]+/?$', 'i');
    return candidates.filter(function (url) {
        return brand.test(url) && origin(url) !== origin(directory.url) && !/\.(?:info|org)\/?$/i.test(url);
    }).map(function (url) { return site(url); })[0] || null;
}
function catalogueFallback(ctx) {
    return tmdbDetails(ctx).then(function (meta) {
        var mirrors = settings().catalogueMirrors || ENDPOINTS.catalogue.mirrors;
        if (!Array.isArray(mirrors) || !mirrors.length) throw new Error('Catalogue: expected mirror list');
        mirrors = mirrors.map(site);
        if (settings().siteBase) mirrors.unshift(site(settings().siteBase));
        var attempted = {};
        function attempt(base) {
            if (attempted[base]) return Promise.reject(new Error('Catalogue: already attempted'));
            attempted[base] = true;
            event('catalogue-attempt', { host: base });
            return nakiosCatalogue(ctx, base, meta);
        }
        function nextMirror(index) {
            if (index >= mirrors.length) return Promise.resolve([]);
            return attempt(mirrors[index]).catch(function (error) { log(message(error)); return nextMirror(index + 1); });
        }
        function directory(index) {
            var entry = ENDPOINTS.catalogue.directories[index];
            if (!entry) return nextMirror(1);
            var cached = discoveredCatalogues[entry.url];
            var candidate = cached ? Promise.resolve(cached) : request(entry.url, entry.url, 'Catalogue address directory', ctx).then(function (response) {
                return directoryCandidate(response.body, entry);
            });
            return candidate.then(function (base) {
                if (!base || attempted[base]) return directory(index + 1);
                // Candidate content is validated by the normal search/page parser.
                return attempt(base).then(function (result) { discoveredCatalogues[entry.url] = base; return result; });
            }).catch(function (error) {
                delete discoveredCatalogues[entry.url]; log(message(error)); return directory(index + 1);
            });
        }
        // Directories are recovery work, never a preflight for healthy sites.
        return attempt(mirrors[0]).catch(function (error) { log(message(error)); return directory(0); });
    });
}
