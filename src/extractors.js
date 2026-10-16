/* Parse public player data without evaluating third-party JavaScript. */
function normalizeSubtitles(tracks, base, headers) {
    if (!Array.isArray(tracks)) return [];
    var seen = {};
    return tracks.map(function (track) {
        if (!track || typeof track !== 'object' || (track.kind && !/^(?:subtitles|captions)$/i.test(track.kind))) return null;
        var url = asUrl(track.url || track.file || track.src || track.file_path, base);
        if (!url || seen[url] || /\.(?:html?|php)(?:[?#]|$)/i.test(url)) return null;
        seen[url] = true;
        var lang = String(track.language || track.lang || track.srclang || track.label || 'Unknown');
        if (/^(?:fr|fra|fre|français|francais|french)$/i.test(lang)) lang = 'fr';
        else if (/^(?:en|eng|english|anglais)$/i.test(lang)) lang = 'en';
        return { id: url, url: url, language: lang, lang: lang, name: String(track.label || track.name || lang), headers: mergeHeaders(headers, track.headers) };
    }).filter(function (track) { return !!track; });
}
function htmlSubtitles(html, pageUrl, headers) {
    var tracks = [], tags = html.match(/<track\b[^>]*>/gi) || [];
    tags.forEach(function (tag) {
        var track = {}, attributes = /\b(src|srclang|label|kind)\s*=\s*["']([^"']*)["']/gi, m;
        while ((m = attributes.exec(tag))) track[m[1].toLowerCase()] = decodeHtml(m[2]);
        tracks.push(track);
    });
    // Only literal JSON arrays are parsed; arbitrary player JavaScript is never run.
    var listed = jsonArrayAfter(html, 'tracks:') || jsonArrayAfter(html, '"tracks":');
    if (!listed) {
        // Common JWPlayer notation uses literal JS objects rather than JSON.
        // Read only quoted track fields in a bounded array, with no evaluation.
        var block = html.match(/\btracks\s*:\s*\[([\s\S]{0,16000}?)\]/i);
        if (block) (block[1].match(/\{[^{}]{0,4000}\}/g) || []).forEach(function (object) {
            var track = {}, fields = /\b(file|src|url|label|srclang|language|lang|kind)\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/gi, m;
            while ((m = fields.exec(object))) track[m[1].toLowerCase()] = unpackString(m[2].slice(1, -1));
            tracks.push(track);
        });
    }
    return normalizeSubtitles(tracks.concat(listed || []), pageUrl, headers);
}
function decodeBase64(value) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', out = '', bits = 0, count = 0;
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length > 16384) return '';
    for (var i = 0; i < value.length && value.charAt(i) !== '='; i++) {
        bits = (bits << 6) | chars.indexOf(value.charAt(i)); count += 6;
        if (count >= 8) { count -= 8; out += String.fromCharCode((bits >> count) & 255); }
    }
    return out;
}
function vidzySource(html, pageUrl) {
    // Known public VideoJS source encoding: hostname + CSS layout width + XOR.
    // Parse its constants; never eval the page or return the /troll/ placeholder.
    var encoded = html.match(/sources\s*:\s*\[\s*\{\s*src\s*:\s*\(function\(s\)([\s\S]{0,4000}?)\}\)\("([A-Za-z0-9+/=]+)"\)/);
    if (!encoded) return null;
    var body = encoded[1];
    if (!/0x3d\s*\+\s*i\s*\*\s*89\s*\+\s*H\s*\+\s*BC/.test(body)) return null;
    var parent = body.match(/width:calc\(1in \+ (\d+)px\)/), child = body.match(/width:calc\(100% - (\d+)px\)/);
    if (!parent || !child) return null;
    var width = 96 + Number(parent[1]) - Number(child[1]);
    var host = origin(pageUrl).replace(/^https?:\/\//, '').split(':')[0], sum = 0;
    for (var i = 0; i < host.length; i++) sum = (sum + host.charCodeAt(i)) & 255;
    var binary = decodeBase64(encoded[2]), decoded = '';
    for (var j = 0; j < binary.length; j++) decoded += String.fromCharCode(binary.charCodeAt(binary.length - j - 1) ^ ((0x3d + j * 89 + sum + width) & 255));
    var url = asUrl(decoded, pageUrl);
    return url && formatOf(url) ? url : null;
}
function staticSource(html, pageUrl) {
    var normalized = html.replace(/\\\//g, '/');
    var patterns = [/(?:file|src)\s*:\s*["']([^"'<>\s]+\.(?:m3u8|mp4)(?:\?[^"'<>\s]*)?)["']/ig,
        /<source\b[^>]*\bsrc\s*=\s*["']([^"'<>\s]+)["']/ig];
    for (var i = 0; i < patterns.length; i++) {
        var m;
        while ((m = patterns[i].exec(normalized))) {
            var url = asUrl(m[1], pageUrl);
            if (url && formatOf(url)) return url;
        }
    }
    return null;
}
function isVidzyEmbed(url) { return /^https:\/\/(?:[a-z0-9-]+\.)?vidzy\.(?:org|cc|live|lol)\/embed-[a-z0-9]+\.html(?:[?#]|$)/i.test(url); }
function isUqloadEmbed(url) { return /^https:\/\/(?:www\.)?uqload\.[a-z]+\/embed-[a-z0-9]+\.html(?:[?#]|$)/i.test(url); }
function unpackString(value) {
    return value.replace(/\\(u[\da-f]{4}|x[\da-f]{2}|\r?\n|.)/gi, function (_, escape) {
        if (/^u[\da-f]{4}$/i.test(escape)) return String.fromCharCode(parseInt(escape.slice(1), 16));
        if (/^x[\da-f]{2}$/i.test(escape)) return String.fromCharCode(parseInt(escape.slice(1), 16));
        var known = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };
        return /\n/.test(escape) ? '' : Object.prototype.hasOwnProperty.call(known, escape) ? known[escape] : escape;
    });
}
function unpackPlayer(html) {
    // Decode a bounded Dean Edwards Packer string table, never eval its code.
    var pattern = /\}\s*\(\s*'((?:\\.|[^'\\])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\.|[^'\\])*)'\.split\('\|'\)/g;
    var match, pieces = [];
    while ((match = pattern.exec(html)) && pieces.length < 3) {
        var radix = Number(match[2]), count = Number(match[3]);
        if (radix < 2 || radix > 36 || count > 4096 || match[1].length > 300000) continue;
        var table = unpackString(match[4]).split('|');
        var decoded = unpackString(match[1]).replace(/\b[0-9a-z]+\b/g, function (word) {
            var index = parseInt(word, radix);
            return index < count && index.toString(radix) === word && table[index] ? table[index] : word;
        });
        if (decoded.length <= 1024 * 1024) pieces.push(decoded);
    }
    return pieces.join('\n');
}
function resolveEmbed(url, referer, ctx, label, lang, extraHeaders) {
    url = asUrl(url, referer);
    if (!url) return Promise.resolve(null);
    var direct = stream({ url: url, name: label, lang: lang, headers: extraHeaders }, referer);
    if (direct) return Promise.resolve(direct);
    return request(url, referer, 'Embed', ctx).then(function (response) {
        var media = isVidzyEmbed(response.url) ? vidzySource(response.body, response.url) : null;
        if (!media) media = staticSource(response.body, response.url);
        var unpacked = isUqloadEmbed(response.url) ? unpackPlayer(response.body) : '';
        if (!media && unpacked) media = staticSource(unpacked, response.url);
        if (!media) { log('Embed: no supported public media source'); return null; }
        var title = response.body.match(/(?:metaTitle|title)\s*:\s*"([^"\n]+\.(?:mp4|mkv))"/i);
        var result = stream({ url: media, name: title ? decodeHtml(title[1]) : label, lang: lang, headers: extraHeaders }, response.url, response.url, label);
        if (result) {
            var tracks = htmlSubtitles(response.body + '\n' + unpacked, response.url, result.headers);
            if (tracks.length) result.subtitles = tracks;
        }
        return result;
    }).catch(function (error) { log(message(error)); return null; });
}
