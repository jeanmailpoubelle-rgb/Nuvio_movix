/* Shared host protocols adapted from Nuvio_frembed ace5453 / CloudStream.
 * SPDX-License-Identifier: GPL-3.0-only. See THIRD_PARTY_NOTICES.md.
 * Fetch public data only: no player eval, DOM, challenge solving or timers. */
var HOST_NAMES = { vidzy: 'Vidzy', lulu: 'LuluStream', voe: 'Voe', dood: 'Dood', uqload: 'Uqload', vidmoly: 'Vidmoly', streamwish: 'StreamWish', mixdrop: 'MixDrop', vidara: 'Vidara', seek: 'SeekStreaming', dropload: 'Dropload', sharecloudy: 'ShareCloudy' };
function hostFamily(url, label) {
    if (isVidzyEmbed(url)) return 'vidzy';
    if (isLuluEmbed(url)) return 'lulu';
    var found = '';
    Object.keys(ENDPOINTS.hosts).some(function (family) {
        if (!matchesHost(url, ENDPOINTS.hosts[family])) return false;
        found = family; return true;
    });
    if (found) return found;
    // Frembed's stable redirects identify some rotating mirrors by host label.
    var hint = String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return Object.keys(HOST_NAMES).filter(function (key) { return hint === key || hint === HOST_NAMES[key].toLowerCase(); })[0] || '';
}
function supportsHost(url, label) { return !!(formatOf(url) || hostFamily(url, label)); }
function mediaFormat(url, hint) {
    hint = String(hint || '').toLowerCase();
    var format = /mpegurl|m3u8|^hls$/.test(hint) ? 'm3u8' : /dash|mpd/.test(hint) ? 'mpd' : /mp4/.test(hint) ? 'mp4' : '';
    if (/\/master\.txt(?:[?#]|$)/i.test(url)) format = 'm3u8';
    return formatOf(url, format);
}
function playerArrays(text, key) {
    var pattern = new RegExp('["\x27]?' + key + '["\x27]?\\s*[:=]\\s*\\[', 'gi'), result = [], match;
    while ((match = pattern.exec(text)) && result.length < 16) {
        var start = pattern.lastIndex, quote = '', escaped = false, depth = 1, end = start;
        for (; end < text.length && end - start < 200000 && depth; end++) {
            var c = text.charAt(end);
            if (escaped) { escaped = false; continue; }
            if (c === '\\') { escaped = true; continue; }
            if (quote) { if (c === quote) quote = ''; }
            else if (c === '"' || c === "'") quote = c;
            else if (c === '[') depth++;
            else if (c === ']') depth--;
        }
        if (!depth) result.push(text.slice(start, end - 1));
    }
    return result;
}
function playerRecords(array) {
    var objects = array.match(/\{[^{}]{0,8000}\}/g);
    if (!objects) {
        var quoted = array.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g) || [];
        return quoted.map(function (text) { return { file: unpackString(text.slice(1, -1)) }; });
    }
    return objects.map(function (object) {
        var fields = {}, pattern = /["']?([a-zA-Z_]+)["']?\s*:\s*(["'])((?:\\.|(?!\2)[\s\S])*?)\2/g, match;
        while ((match = pattern.exec(object))) fields[match[1]] = unpackString(match[3]);
        return fields;
    });
}
function jwSources(page, headers) {
    var text = page.body + '\n' + unpackPlayer(page.body), tracks = [], result = [];
    playerArrays(text, 'tracks').forEach(function (array) { tracks = tracks.concat(playerRecords(array)); });
    playerArrays(text, 'sources').forEach(function (array) {
        playerRecords(array).forEach(function (item) {
            var url = asUrl(item.file || item.src, page.url, false);
            if (url) result.push({ url: url, format: mediaFormat(url, item.type), quality: item.label, headers: headers, subtitles: tracks });
        });
    });
    if (!result.length) {
        var url = staticSource(text, page.url);
        if (url) result.push({ url: url, headers: headers, subtitles: tracks });
    }
    return result;
}
function voeSources(page, ctx, referer) {
    var redirect = page.body.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
    var next = redirect && asUrl(redirect[1], page.url, false);
    return (next ? request(next, referer, 'Voe redirect', ctx) : Promise.resolve(page)).then(function (response) {
        var block = response.body.match(/<script\b[^>]*type\s*=\s*["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
        if (!block) return [];
        var payload = JSON.parse(block[1]);
        if (!Array.isArray(payload) || typeof payload[0] !== 'string') return [];
        var rotated = payload[0].replace(/[a-zA-Z]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() <= 'm' ? 13 : -13)); });
        var binary = decodeBase64(rotated.replace(/@\$|\^\^|~@|%\?|\*~|!!|#&|_/g, '')), shifted = '';
        for (var i = binary.length - 1; i >= 0; i--) shifted += String.fromCharCode(binary.charCodeAt(i) - 3);
        var data = JSON.parse(decodeBase64(shifted)), root = origin(response.url);
        return [
            { url: data.source, format: 'm3u8', headers: { Referer: root + '/', Origin: root } },
            { url: data.direct_access_url, format: 'mp4', headers: { Referer: page.url } },
        ];
    });
}
function doodSources(page, ctx) {
    var normalized = /\/d\//.test(page.url) ? request(page.url.replace('/d/', '/e/'), page.url, 'Dood player', ctx) : Promise.resolve(page);
    return normalized.then(function (response) {
        var match = response.body.match(/\/pass_md5\/[^'"\s<>]+/);
        if (!match) {
            if (/turnstile|captcha/i.test(response.body)) event('host-unavailable', { family: 'Dood', reason: 'challenge-required' });
            return [];
        }
        var endpoint = asUrl(match[0], response.url, false);
        return request(endpoint, response.url, 'Dood source', ctx).then(function (resolved) {
            var prefix = resolved.body.trim();
            if (!asUrl(prefix, '') || !/^https?:\/\/\S+$/.test(prefix)) return [];
            var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', suffix = '';
            for (var i = 0; i < 10; i++) suffix += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            return [{ url: prefix + suffix + '?token=' + endpoint.slice(endpoint.lastIndexOf('/') + 1), format: 'mp4', headers: { Referer: origin(response.url) + '/' } }];
        });
    });
}
function mixdropSources(page) {
    var match = (page.body + '\n' + unpackPlayer(page.body)).match(/\bwurl\s*=\s*(["'])((?:\\.|(?!\1)[\s\S])*?)\1/);
    return match ? [{ url: asUrl(unpackString(match[2]), page.url, false), format: 'mp4', headers: { Referer: page.url } }] : [];
}
function hostSources(page, family, ctx, referer) {
    if (family === 'voe') return voeSources(page, ctx, referer);
    if (family === 'dood') return doodSources(page, ctx);
    if (family === 'vidara') {
        var code = page.url.match(/\/e\/([a-z0-9_-]+)(?:[?#]|$)/i);
        if (!code) return Promise.resolve([]);
        var root = origin(page.url);
        // Empty optional codecs selects the site's AVC fallback. Do not claim
        // AV1/HEVC support that the JS host cannot query from the device.
        return requestJson(root + '/api/stream', page.url, 'Vidara source', ctx,
            { Origin: root, 'Content-Type': 'application/json' }, { method: 'POST', body: JSON.stringify({ filecode: code[1], device: 'web', codecs: [] }) }).then(function (data) {
            if (data.error) return [];
            return [{ url: data.streaming_url, format: 'm3u8', headers: { Referer: root + '/', Origin: root },
                subtitles: (Array.isArray(data.subtitles) ? data.subtitles : []).filter(function (track) { return track && track.type === 0; }) }];
        });
    }
    if (family === 'vidmoly' && /\/w\//.test(page.url)) {
        var target = page.url.replace(/\/w\/([^/?#]+)/, '/embed-$1.html');
        return request(target, referer, 'Vidmoly player', ctx, { 'Sec-Fetch-Dest': 'iframe' }).then(function (response) { return jwSources(response, { Referer: origin(response.url) + '/' }); });
    }
    if (family === 'mixdrop') {
        if (/\/f\//.test(page.url)) return request(page.url.replace('/f/', '/e/'), referer, 'MixDrop player', ctx).then(mixdropSources);
        return Promise.resolve(mixdropSources(page));
    }
    if (family === 'vidzy') {
        var media = vidzySource(page.body, page.url) || staticSource(page.body, page.url);
        return Promise.resolve(media ? [{ url: media }] : []);
    }
    var headers = /^(?:uqload|vidmoly|streamwish|sharecloudy)$/.test(family) ? { Referer: origin(page.url) + '/' } : {};
    if (family === 'streamwish' || family === 'sharecloudy') headers.Origin = origin(page.url);
    return Promise.resolve(jwSources(page, headers));
}
function resolveHost(link, referer, ctx, owner) {
    var url = asUrl(link.url, referer, link.preserveUrl ? false : undefined);
    if (!url) return Promise.resolve([]);
    var initial = hostFamily(url, link.server), display = owner ? owner + ' / ' : '';
    var label = display + (HOST_NAMES[initial] || link.server || 'Direct');
    var direct = stream(Object.assign({}, link, { url: url, name: link.server || label, format: mediaFormat(url, link.format) }), referer, link.subtitleBase || referer, label);
    if (direct) return Promise.resolve([direct]);
    ctx.hostResults = ctx.hostResults || {};
    var key = JSON.stringify([url, referer, mergeHeaders({}, link.headers)]);
    if (!ctx.hostResults[key]) ctx.hostResults[key] = (initial === 'seek' ? seekSources(url, ctx).then(function (items) {
        return { body: '', url: url, seekItems: items };
    }) : request(url, referer, 'Embed', ctx)).then(function (page) {
        var family = hostFamily(page.url, link.server) || initial;
        var contentType = page.headers && typeof page.headers.get === 'function' ? page.headers.get('content-type') : '';
        var redirectedFormat = mediaFormat(page.url, contentType);
        var sources = page.seekItems ? Promise.resolve(page.seekItems) : redirectedFormat ? Promise.resolve([{ url: page.url, format: redirectedFormat, headers: { Referer: referer } }]) : hostSources(page, family, ctx, referer);
        return sources.then(function (items) {
            var title = page.body.match(/(?:metaTitle|title)\s*[:=]\s*"([^"\n]{1,512}\.(?:mp4|mkv))"/i) || page.body.match(/<title[^>]*>([^<]{1,512})<\/title>/i);
            var prefix = display + (HOST_NAMES[family] || link.server || 'Direct');
            var result = items.map(function (item) {
                var source = Object.assign({}, link, item, { name: title ? decodeHtml(title[1]) : prefix, uploadTitle: !!title, preserveUrl: true, headers: mergeHeaders(link.headers, item.headers) });
                source.subtitles = normalizeSubtitles(link.subtitles, link.subtitleBase || referer, source.headers, link.preserveUrl).concat(item.subtitles || []);
                var output = stream(source, page.url, page.url, prefix);
                if (output) {
                    var tracks = htmlSubtitles(page.body + '\n' + unpackPlayer(page.body), page.url, output.headers);
                    tracks = normalizeSubtitles((output.subtitles || []).concat(tracks), page.url, output.headers);
                    if (tracks.length) output.subtitles = tracks;
                    if (redirectedFormat) primeHlsMetadata(output, page, ctx);
                }
                return output;
            });
            event('host-result', { family: family || 'static', host: origin(page.url), sources: result.filter(Boolean).length });
            if (!result.filter(Boolean).length && family !== 'dood' && /captcha|challenges\.cloudflare\.com\/turnstile/i.test(page.body)) event('host-unavailable', { family: HOST_NAMES[family] || family || 'unknown', reason: 'challenge-required' });
            if (!result.filter(Boolean).length) log('Embed: no supported public media source');
            return unique(result);
        });
    }).catch(function (error) { log(message(error)); return []; });
    return ctx.hostResults[key];
}
function resolveLinks(links, referer, ctx, owner) {
    return selectLinks(links, referer, ctx, owner, { allowGeneric: true });
}
