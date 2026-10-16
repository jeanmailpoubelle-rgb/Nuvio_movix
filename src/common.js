/* Shared source. scripts/build.cjs bundles this into each self-contained provider. */
var USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
function log(message) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[' + PROVIDER_ID + ' ' + VERSION + '] ' + message);
    }
}
function settings() { return typeof SCRAPER_SETTINGS === 'object' && SCRAPER_SETTINGS || {}; }
function message(error) { return error && error.message ? error.message : String(error); }
function origin(url) { var m = String(url).match(/^https?:\/\/[^/?#]+/i); return m ? m[0] : ''; }
function site(value) {
    var result = String(value).replace(/\/+$/, '');
    if (!/^https:\/\/[^\s/?#@]+(?:\/[^\s?#]*)?$/.test(result)) throw new Error('Expected an HTTPS endpoint');
    return result;
}
function decodeHtml(value) {
    return String(value || '').replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, function (entity) {
        var known = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
        if (known[entity.toLowerCase()]) return known[entity.toLowerCase()];
        var n = entity.charAt(2).toLowerCase() === 'x' ? parseInt(entity.slice(3), 16) : parseInt(entity.slice(2), 10);
        return n > 0 && n <= 65535 ? String.fromCharCode(n) : entity;
    });
}
function asUrl(value, base) {
    if (typeof value !== 'string' || !value.trim()) return null;
    var u = decodeHtml(value.trim()).replace(/\\\//g, '/');
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^https?:\/\//i.test(u)) return null;
    if (u.indexOf('//') === 0) u = 'https:' + u;
    else if (u.charAt(0) === '/') u = origin(base) + u;
    else if (!/^https?:\/\//i.test(u)) u = String(base).split(/[?#]/)[0].replace(/[^/]*$/, '') + u;
    var m = u.match(/^(https?:\/\/[^\s/?#@]+)(\/[^\s]*)?$/i);
    if (!m) return null;
    var rest = m[2] || '/', q = rest.search(/[?#]/), suffix = q < 0 ? '' : rest.slice(q);
    var parts = (q < 0 ? rest : rest.slice(0, q)).split('/'), path = [];
    parts.forEach(function (part) { if (part === '..') path.pop(); else if (part !== '.') path.push(part); });
    return m[1] + path.join('/') + suffix;
}
function mergeHeaders(defaults, extra) {
    var result = {};
    [defaults, extra].forEach(function (source) {
        if (!source || typeof source !== 'object') return;
        Object.keys(source).forEach(function (key) {
            if (typeof source[key] !== 'string' || /[\r\n]/.test(key + source[key])) return;
            Object.keys(result).forEach(function (old) { if (old.toLowerCase() === key.toLowerCase()) delete result[old]; });
            result[key] = source[key];
        });
    });
    return result;
}
function request(url, referer, stage, ctx) {
    if (ctx.requests >= 9 || Date.now() - ctx.started > 45000) return Promise.reject(new Error('Provider request budget reached'));
    ctx.requests++;
    // Nuvio's coroutine-backed timers can outlive clearTimeout, while its mobile
    // fetch ignores AbortSignal. Rely on the host's native timeout instead of
    // creating a pending native sleep for every otherwise fast request.
    var options = { headers: { 'User-Agent': USER_AGENT, 'Referer': referer } };
    return Promise.resolve().then(function () { return fetch(url, options); }).then(function (response) {
        if (!response || response.ok === false || response.status === 0 || response.status >= 400) {
            throw new Error(stage + ': HTTP ' + (response ? response.status : 'no response'));
        }
        return response.text().then(function (body) {
            if (typeof body !== 'string' || body.length > 1024 * 1024) throw new Error(stage + ': invalid or oversized body');
            return { body: body, url: response.url || url };
        });
    });
}
function requestJson(url, referer, stage, ctx) {
    return request(url, referer, stage, ctx).then(function (response) {
        var data;
        try { data = JSON.parse(response.body); } catch (_) { throw new Error(stage + ': response is not JSON'); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(stage + ': invalid JSON object');
        return data;
    });
}
function formatOf(url, declared) {
    if (/\/troll\//i.test(url)) return null;
    var m = url.match(/\.(m3u8|mp4)(?:[?#]|$)/i);
    if (m) return m[1].toLowerCase();
    if (/\.(?:html?|php)(?:[?#]|$)/i.test(url)) return null;
    return /^(?:m3u8|mp4)$/i.test(declared || '') ? declared.toLowerCase() : null;
}
function stream(source, referer, base, labelPrefix) {
    if (!source || typeof source !== 'object') return null;
    var url = asUrl(source.url, base || referer);
    if (!url) return null;
    var format = formatOf(url, source.format);
    if (!format) return null;
    var label = String(source.name || source.server || labelPrefix || PROVIDER_NAME);
    var info = label + ' ' + (source.lang || '') + ' ' + (source.quality || '');
    var qm = info.match(/\b(\d{3,4})p\b/i) || String(source.quality || '').match(/^(\d{3,4})$/);
    var quality = qm ? qm[1] + 'p' : /\b(?:4k|uhd)\b/i.test(info) ? '2160p' : 'HD';
    var languageInfo = source.lang || info;
    var language = /\b(?:MULTI|DUAL(?:-AUDIO)?)\b/i.test(languageInfo) ? 'MULTI' : /VOST/i.test(languageInfo) ? 'VOSTFR' : /\bVF(?:F|Q)?\b/i.test(languageInfo) ? 'VF' : '';
    var name = (labelPrefix || PROVIDER_NAME) + ' | ' + quality + (language ? ' | ' + language : '');
    return { name: name, title: label, description: label, url: url, quality: quality, language: language, format: format,
        headers: mergeHeaders({ 'User-Agent': USER_AGENT, 'Referer': referer }, source.headers) };
}
function unique(values) {
    var seen = {};
    return values.filter(function (item) {
        if (!item) return false;
        var headers = Object.keys(item.headers || {}).map(function (key) { return [key.toLowerCase(), item.headers[key]]; }).sort();
        var key = JSON.stringify([item.url, headers]);
        if (seen[key]) return false; seen[key] = true; return true;
    });
}
function validateArgs(id, type, season, episode) {
    id = String(id); type = String(type || '').toLowerCase();
    if (!/^[1-9]\d*$/.test(id)) throw new Error('Expected a positive numeric TMDB ID');
    if (/^(?:tv|series|show)$/.test(type)) type = 'tv';
    if (type !== 'movie' && type !== 'tv') throw new Error('Unsupported media type');
    if (type === 'tv' && (season == null || episode == null || !/^\d+$/.test(String(season)) || !/^[1-9]\d*$/.test(String(episode)))) {
        throw new Error('Series requires season >= 0 and episode >= 1');
    }
    return { id: id, type: type, season: Number(season), episode: Number(episode), requests: 0, started: Date.now() };
}
function run(id, type, season, episode, implementation) {
    return Promise.resolve().then(function () {
        var ctx = validateArgs(id, type, season, episode);
        log('TMDB ' + ctx.id + ' (' + ctx.type + '): starting');
        return implementation(ctx).then(function (values) {
            var result = unique(values); log('Result: ' + result.length + ' source(s), ' + ctx.requests + ' request(s)');
            if (!result.length) log('No supported direct media found'); return result;
        });
    }).catch(function (error) { log(message(error)); return []; });
}
function cleanTitle(title) {
    var text = decodeHtml(title).toLowerCase();
    if (typeof text.normalize === 'function') text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return text.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, ' ').trim();
}
function yearOf(value) { var m = String(value || '').match(/\b((?:18|19|20)\d{2})\b/); return m ? Number(m[1]) : null; }
function tmdbDetails(ctx) {
    var key = settings().tmdbApiKey || (typeof TMDB_API_KEY !== 'undefined' ? TMDB_API_KEY : '');
    if (!key) return Promise.reject(new Error('TMDB metadata key unavailable; Nuvio TV 1.0.0 normally injects TMDB_API_KEY'));
    return requestJson('https://api.themoviedb.org/3/' + ctx.type + '/' + ctx.id + '?language=fr-FR&api_key=' + encodeURIComponent(key),
        'https://www.themoviedb.org/', 'TMDB metadata', ctx).then(function (data) {
        var title = data.title || data.name, original = data.original_title || data.original_name;
        if (!title) throw new Error('TMDB metadata: title missing');
        return { title: title, original: original || title, year: yearOf(data.release_date || data.first_air_date), poster: data.poster_path || '' };
    });
}
function chooseMatch(items, meta, type) {
    var titles = [cleanTitle(meta.title), cleanTitle(meta.original)].filter(function (title) { return title.length > 0; });
    var matches = items.filter(function (item) {
        var itemType = /^(?:tv|series|show)$/.test(item.type) ? 'tv' : item.type;
        if (itemType !== type) return false;
        var y = yearOf(item.year || item.release_date || item.first_air_date);
        if (meta.year && (!y || Math.abs(y - meta.year) > 1)) return false;
        var poster = String(item.poster || item.small_poster_path || item.large_poster_path || '');
        return titles.indexOf(cleanTitle(item.title || item.name)) >= 0 || (meta.poster && poster.indexOf(meta.poster) >= 0);
    });
    if (matches.length > 1) throw new Error('Ambiguous catalogue match; refusing to choose the first result');
    return matches[0] || null;
}
function searchTitles(meta, search) {
    return search(meta.title).then(function (match) {
        if (match || cleanTitle(meta.original) === cleanTitle(meta.title)) return match;
        return search(meta.original);
    });
}
function jsonArrayAfter(text, marker) {
    var start = text.indexOf(marker);
    if (start < 0) return null;
    start = text.indexOf('[', start + marker.length);
    var quote = '', escaped = false, depth = 0;
    for (var i = start; i >= 0 && i < text.length && i - start < 200000; i++) {
        var c = text.charAt(i);
        if (quote) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === quote) quote = ''; }
        else if (c === '"') quote = c;
        else if (c === '[') depth++;
        else if (c === ']' && --depth === 0) {
            try { return JSON.parse(text.slice(start, i + 1)); } catch (_) { return null; }
        }
    }
    return null;
}
