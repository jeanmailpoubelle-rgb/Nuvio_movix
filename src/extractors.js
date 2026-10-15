/* Parse public player data without evaluating third-party JavaScript. */
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
function resolveEmbed(url, referer, ctx, label, lang, extraHeaders) {
    url = asUrl(url, referer);
    if (!url) return Promise.resolve(null);
    var direct = stream({ url: url, name: label, lang: lang, headers: extraHeaders }, referer);
    if (direct) return Promise.resolve(direct);
    return request(url, referer, 'Embed', ctx).then(function (response) {
        var media = isVidzyEmbed(response.url) ? vidzySource(response.body, response.url) : null;
        if (!media) media = staticSource(response.body, response.url);
        if (!media) { log('Embed: no supported public media source'); return null; }
        var title = response.body.match(/(?:metaTitle|title)\s*:\s*"([^"\n]+\.(?:mp4|mkv))"/i);
        return stream({ url: media, name: title ? decodeHtml(title[1]) : label, lang: lang, headers: extraHeaders }, response.url, response.url, label);
    }).catch(function (error) { log(message(error)); return null; });
}
