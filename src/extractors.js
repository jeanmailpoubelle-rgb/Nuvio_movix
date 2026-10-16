/* Parse public player data without evaluating third-party JavaScript. */
function normalizeSubtitles(tracks, base, headers, preserveUrls) {
    if (!Array.isArray(tracks)) return [];
    var seen = {};
    return tracks.map(function (track) {
        if (!track || typeof track !== 'object' || (track.kind && !/^(?:subtitles|captions)$/i.test(track.kind))) return null;
        var url = asUrl(track.url || track.file || track.src || track.file_path, base, preserveUrls || (track.id && track.id === track.url) ? false : undefined);
        if (!url || seen[url] || /\.(?:html?|php)(?:[?#]|$)/i.test(url)) return null;
        // This JWPlayer menu item opens a caption-upload form, not a real track.
        if (/\/srt\/empty\.srt(?:[?#]|$)/i.test(url) && /^upload captions$/i.test(String(track.label || track.name || ''))) return null;
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
    // Vidzy loadTracks wraps each URL in a same-origin rewrite function. Parse
    // that known literal form; never execute the function or arbitrary page JS.
    var wrapped = /\{\s*kind:\s*['"](subtitles|captions)['"],\s*srclang:\s*['"]([^'"]+)['"],\s*label:\s*['"]([^'"]+)['"],\s*src:\s*\(function\(u\)\{([\s\S]{0,1200}?)\}\)\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)\s*\}/gi, w;
    while ((w = wrapped.exec(html))) {
        if (!/location\.host\s*\+\s*u\.slice\(j\)/.test(w[4])) continue;
        var url = asUrl(unpackString(w[5].slice(1, -1)), pageUrl);
        if (url) tracks.push({ kind: w[1], srclang: w[2], label: w[3], src: origin(pageUrl) + url.slice(origin(url).length) });
    }
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
function isVidzyEmbed(url) { return matchesHost(url, ENDPOINTS.hosts.vidzy) && /\/embed-[a-z0-9]+\.html(?:[?#]|$)/i.test(url); }
function isUqloadEmbed(url) { return matchesHost(url, ENDPOINTS.hosts.uqload) && /\/embed-[a-z0-9]+\.html(?:[?#]|$)/i.test(url); }
function isLuluEmbed(url) {
    return /^https:\/\/[^/?#]+\/e\/[a-z0-9]+(?:[?#]|$)/i.test(url) && ENDPOINTS.catalogue.lulu.some(function (base) { return origin(url) === site(base); });
}
function unpackString(value) {
    return value.replace(/\\(u[\da-f]{4}|x[\da-f]{2}|\r?\n|.)/gi, function (_, escape) {
        if (/^u[\da-f]{4}$/i.test(escape)) return String.fromCharCode(parseInt(escape.slice(1), 16));
        if (/^x[\da-f]{2}$/i.test(escape)) return String.fromCharCode(parseInt(escape.slice(1), 16));
        var known = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };
        return /\n/.test(escape) ? '' : Object.prototype.hasOwnProperty.call(known, escape) ? known[escape] : escape;
    });
}
function unpackPlayer(html) {
    // Bounded data-only P.A.C.K.E.R. decoding, adapted from Nuvio_frembed /
    // CloudStream JsUnpacker. Supports both quotes, base62 and nested packing.
    var pattern = /}\s*\(\s*(['"])((?:\\.|(?!\1)[\s\S])*?)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])((?:\\.|(?!\5)[\s\S])*?)\5\.split\(\s*['"]\|['"]\s*\)/g;
    var text = html, output = '', alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var depth = 0; depth < 3; depth++) {
        pattern.lastIndex = 0;
        var match, pieces = [];
        while ((match = pattern.exec(text)) && pieces.length < 3) {
            var radix = Number(match[3]), count = Number(match[4]);
            if (radix < 2 || radix > 62 || count > 8192 || match[2].length > 300000) continue;
            var table = unpackString(match[6]).split('|');
            if (table.length < count) continue;
            var decoded = unpackString(match[2]).replace(/\b[a-zA-Z0-9_]+\b/g, function (word) {
                var value = 0;
                for (var i = 0; i < word.length; i++) {
                    var digit = alphabet.indexOf(radix <= 36 ? word.charAt(i).toLowerCase() : word.charAt(i));
                    if (digit < 0 || digit >= radix) return word;
                    value = value * radix + digit;
                    if (value >= count) return word;
                }
                return table[value] || word;
            });
            if (decoded.length <= 1024 * 1024) pieces.push(decoded);
        }
        if (!pieces.length) break;
        output = pieces.join('\n'); text = output;
    }
    return output;
}
