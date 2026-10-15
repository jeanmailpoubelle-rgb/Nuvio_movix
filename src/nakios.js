var nakiosDiscoveredSite = null;
function discoverNakios(ctx) {
    if (nakiosDiscoveredSite) return Promise.resolve(nakiosDiscoveredSite);
    return request('https://nakios.org/', 'https://nakios.org/', 'Nakios address directory', ctx).then(function (response) {
        var rows = response.body.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
        for (var i = 0; i < rows.length; i++) {
            if (!/catalogue|streaming/i.test(rows[i])) continue;
            var link = rows[i].match(/href=["'](https:\/\/nakios\.[a-z0-9.-]+\/?)["']/i);
            if (link && !/^https:\/\/nakios\.(?:org|info)\/?$/i.test(link[1])) {
                nakiosDiscoveredSite = site(link[1]); return nakiosDiscoveredSite;
            }
        }
        throw new Error('Nakios directory: no labelled catalogue address');
    });
}
function vidzyLookup(ctx) {
    var base = site(settings().vidzyBase || 'https://vidzy.org');
    var path = ctx.type === 'movie' ? '/movie/' + ctx.id : '/serie/' + ctx.id + '/' + ctx.season + '/' + ctx.episode;
    // No availability preflight: the documented player route already does the mapping.
    return request(base + path, base + '/', 'Vidzy TMDB player', ctx).then(function (response) {
        var tag = response.body.match(/<iframe\b(?=[^>]*\bid=["']pf["'])[^>]*\bsrc=["']([^"']+)["']/i);
        var embed = tag && asUrl(tag[1], response.url);
        if (!embed || !isVidzyEmbed(embed)) throw new Error('Vidzy: expected player iframe missing');
        var language = response.body.match(/"version"\s*:\s*"(vf|vostfr|multi)"/i);
        var title = response.body.match(/<title[^>]*>([^<]+)<\/title>/i);
        return resolveEmbed(embed, response.url, ctx, 'Vidzy', language ? language[1] : '').then(function (result) {
            if (result && title) result.description = decodeHtml(title[1]);
            return result ? [result] : [];
        });
    });
}
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
            return chooseMatch(nakiosCards(response.body, response.url), meta, ctx.type);
        });
    }).then(function (match) {
        if (!match) throw new Error('Nakios: no unambiguous title/year match');
        var page = match.url;
        if (ctx.type === 'tv') page = base + '/episode/' + match.url.split('/').pop() + '/' + ctx.season + '-' + ctx.episode;
        return request(page, base + '/', 'Nakios catalogue page', ctx);
    }).then(function (response) {
        var videos = jsonArrayAfter(response.body, 'const videos =');
        if (!videos) throw new Error('Nakios catalogue: video data missing');
        // Prefer supported Vidzy embeds and direct media. Unsupported hosts are
        // reported instead of sending an HTML page to Android's native player.
        var supported = videos.filter(function (video) {
            var u = asUrl(video.link, response.url);
            return u && (isVidzyEmbed(u) || formatOf(u, video.embed_type === 'hls' ? 'm3u8' : video.embed_type));
        }).slice(0, 3);
        if (!supported.length) log('Nakios catalogue: only unsupported embedded players are available');
        return Promise.all(supported.map(function (video) {
            return resolveEmbed(video.link, response.url, ctx, 'Nakios', video.version);
        })).then(unique);
    });
}
function catalogueFallback(ctx) {
    return tmdbDetails(ctx).then(function (meta) {
        var initial = site(settings().siteBase || nakiosDiscoveredSite || 'https://nakios.live');
        return nakiosCatalogue(ctx, initial, meta).catch(function (error) {
            log(message(error));
            return discoverNakios(ctx).then(function (current) {
                if (current === initial) { log('Nakios directory confirms the same catalogue address'); return []; }
                log('Retrying catalogue at the address listed by nakios.org');
                return nakiosCatalogue(ctx, current, meta);
            });
        });
    });
}
function getStreams(id, type, season, episode) {
    return run(id, type, season, episode, function (ctx) {
        // Expose provenance in both manifest name and each result's name.
        var first = settings().preferCatalogue === true ? Promise.resolve([]) : vidzyLookup(ctx).catch(function (error) { log(message(error)); return []; });
        return first.then(function (result) { return result.length ? result : catalogueFallback(ctx); });
    });
}
