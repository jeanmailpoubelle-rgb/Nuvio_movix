/* Shared source. scripts/build.cjs bundles this into each self-contained provider. */
var USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
function log(message) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[' + PROVIDER_ID + ' ' + VERSION + '] ' + message);
    }
}
function event(stage, data) { log(JSON.stringify({ stage: stage, data: data })); }
function failure(stage, detail, status) {
    var error = new Error(stage + ': ' + detail);
    error.stage = stage; error.status = status; return error;
}
function endpointFailure(error) {
    var json = /\bjson\b/i.test(error.contentType || '');
    return !error.status || error.status >= 500 && !json || (error.status === 404 || error.status === 403) && !!error.contentType && !json;
}
function settings() { return typeof SCRAPER_SETTINGS === 'object' && SCRAPER_SETTINGS || {}; }
function message(error) { return error && error.message ? error.message : String(error); }
function origin(url) { var m = String(url).match(/^https?:\/\/[^/?#]+/i); return m ? m[0] : ''; }
function matchesHost(url, patterns) {
    var host = origin(url).replace(/^https?:\/\//, '').toLowerCase();
    return patterns.some(function (pattern) {
        var regex = new RegExp('^(?:[a-z0-9-]+\\.)*' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[a-z0-9.-]+') + '$', 'i');
        return regex.test(host);
    });
}
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
function asUrl(value, base, decodeEntities) {
    if (typeof value !== 'string' || !value.trim()) return null;
    var u = (decodeEntities === false ? value.trim() : decodeHtml(value.trim())).replace(/\\\//g, '/');
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^https?:\/\//i.test(u)) return null;
    if (u.charAt(0) === '?' && origin(base)) return String(base).split(/[?#]/)[0] + u;
    if (u.charAt(0) === '#' && origin(base)) return String(base).split('#')[0] + u;
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
function request(url, referer, stage, ctx, extraHeaders, transport) {
    var limits = ctx.limits || ENDPOINTS.limits;
    if (ctx.requests >= limits.requests || Date.now() - ctx.started > limits.elapsedMs) return Promise.reject(new Error('Provider request budget reached'));
    ctx.requests++;
    var started = Date.now();
    // Nuvio's coroutine-backed timers can outlive clearTimeout, while its mobile
    // fetch ignores AbortSignal. Rely on the host's native timeout instead of
    // creating a pending native sleep for every otherwise fast request.
    var defaults = { 'User-Agent': ctx.userAgent || USER_AGENT };
    if (referer) defaults.Referer = referer;
    var options = { headers: mergeHeaders(defaults, extraHeaders) };
    if (transport && transport.method) options.method = transport.method;
    if (transport && typeof transport.body === 'string') options.body = transport.body;
    return Promise.resolve().then(function () { return (ctx.fetch || fetch)(url, options); }).then(function (response) {
        if (!response || response.ok === false || response.status === 0 || response.status >= 400) {
            var error = failure(stage, 'HTTP ' + (response ? response.status : 'no response'), response ? response.status : 0);
            if (response && response.headers && typeof response.headers.get === 'function') error.contentType = response.headers.get('content-type') || '';
            throw error;
        }
        var binary = transport && transport.binary;
        if (binary && typeof response.arrayBuffer !== 'function') throw failure(stage, 'binary bridge unavailable', 0);
        var reading = binary ? Promise.resolve(response.arrayBuffer(transport.maxBytes)).then(function (body) { return new Uint8Array(body).subarray(0, transport.maxBytes); }) : response.text();
        return reading.then(function (body) {
            if ((!binary && typeof body !== 'string') || body.length > (binary ? transport.maxBytes : 1024 * 1024)) throw new Error(stage + ': invalid or oversized body');
            event(stage, { host: origin(url), status: response.status, ms: Date.now() - started });
            return { body: body, url: response.url || url, headers: response.headers };
        });
    }).catch(function (error) {
        // Native errors may contain full signed URLs or a metadata key.
        event(stage, { host: origin(url), status: error.status || 0, ms: Date.now() - started, failed: true });
        throw error.stage ? error : failure(stage, 'Network or response failure', 0);
    });
}
function requestJson(url, referer, stage, ctx, headers, transport) {
    return request(url, referer, stage, ctx, headers, transport).then(function (response) {
        var data;
        try { data = JSON.parse(response.body); } catch (_) { throw failure(stage, 'response is not JSON', 0); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw failure(stage, 'invalid JSON object', 0);
        return data;
    });
}
function formatOf(url, declared) {
    if (/\/troll\//i.test(url)) return null;
    var m = url.match(/\.(m3u8|mp4|mpd)(?:[?#]|$)/i);
    if (m) return m[1].toLowerCase();
    if (/\.(?:html?|php)(?:[?#]|$)/i.test(url)) return null;
    return /^(?:m3u8|mp4|mpd)$/i.test(declared || '') ? declared.toLowerCase() : null;
}
function streamName(prefix, quality, language) {
    return prefix + (quality ? ' | ' + quality : '') + (language ? ' | ' + language : '');
}
function stream(source, referer, base, labelPrefix) {
    if (!source || typeof source !== 'object') return null;
    var url = asUrl(source.url, base || referer, source.preserveUrl ? false : undefined);
    if (!url) return null;
    var format = formatOf(url, source.format);
    if (!format) return null;
    var label = String(source.name || source.server || labelPrefix || PROVIDER_NAME);
    // Release names commonly use underscores. JS word boundaries consider '_'
    // part of a word, hiding tokens such as _Multi_ and _1080p_.
    var labelTokens = label.replace(/_/g, ' ');
    var languageHint = String(source.lang || '').replace(/_/g, ' ');
    var info = labelTokens + ' ' + languageHint + ' ' + String(source.quality || '').replace(/_/g, ' ');
    var qm = info.match(/\b(\d{3,4})p\b/i) || String(source.quality || '').match(/^(\d{3,4})$/);
    // Missing resolution is not evidence of HD, especially for direct MP4s
    // that have no playlist metadata to inspect during source discovery.
    var quality = qm ? qm[1] + 'p' : /\b(?:4k|uhd)\b/i.test(info) ? '2160p' : '';
    // Initial upstream hint, also used for MP4 and inconclusive HLS metadata.
    // The shared HLS inspector replaces it when actual audio languages are known.
    var releaseMulti = /\b(?:MULTI|DUAL(?:-AUDIO)?)\b/i.test(labelTokens);
    // Hosts commonly transcode an upload down to one audio track while keeping
    // its original MULTI filename. That title is not an inventory of the served
    // file. Keep the catalogue hint; real HLS languages can still establish MULTI.
    var languageInfo = source.uploadTitle && releaseMulti ? languageHint : releaseMulti ? 'MULTI' : languageHint || info;
    if (source.uploadTitle && releaseMulti && !/\b(?:MULTI|DUAL(?:-AUDIO)?)\b/i.test(languageHint)) {
        event('audio-hint', { host: origin(referer), ignored: 'MULTI', evidence: 'upload-title', retained: languageHint || '' });
    }
    var language = /\b(?:MULTI|DUAL(?:-AUDIO)?)\b/i.test(languageInfo) ? 'MULTI' : /VOST/i.test(languageInfo) ? 'VOSTFR' : /\bVF(?:F|Q)?\b/i.test(languageInfo) ? 'VF' : /\bVO\b/i.test(languageInfo) ? 'VO' : '';
    var name = streamName(labelPrefix || PROVIDER_NAME, quality, language);
    var result = { name: name, title: label, description: label, url: url, language: language, format: format,
        headers: mergeHeaders(source.bareHeaders ? {} : { 'User-Agent': USER_AGENT, 'Referer': referer }, source.headers) };
    if (quality) result.quality = quality;
    var subtitles = normalizeSubtitles(source.subtitles || source.tracks, base || referer, result.headers, source.preserveUrl);
    if (subtitles.length) result.subtitles = subtitles;
    return result;
}
function unique(values) {
    var seen = {};
    return values.filter(function (item) {
        if (!item) return false;
        var headers = Object.keys(item.headers || {}).map(function (key) { return [key.toLowerCase(), item.headers[key]]; }).sort();
        var key = JSON.stringify([item.url, headers]);
        if (seen[key]) {
            var tracks = normalizeSubtitles((seen[key].subtitles || []).concat(item.subtitles || []), item.url, item.headers);
            if (tracks.length) seen[key].subtitles = tracks;
            return false;
        }
        seen[key] = item; return true;
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
function filterResolution(values, ctx) {
    var minimum = ctx && ctx.minimumResolution != null ? ctx.minimumResolution : ENDPOINTS.streams.minimumResolution, removed = [];
    if (ctx) ctx.filteredSources = ctx.filteredSources || {};
    var result = values.filter(function (item) {
        var resolution = String(item.quality || '').match(/^([1-9]\d*)p$/);
        if (!resolution || Number(resolution[1]) >= minimum) return true;
        var key = hlsKey(item);
        if (!ctx || !ctx.filteredSources[key]) removed.push(item.quality);
        if (ctx) ctx.filteredSources[key] = true;
        return false;
    });
    if (removed.length) event('resolution-filter', { minimum: minimum, removed: removed.length, qualities: removed });
    return result;
}
function presentStreams(values) {
    function audioRank(item) {
        var language = String(item.language || '').trim().toUpperCase();
        return language === 'MULTI' ? 0 : language === 'VF' ? 1 : language === 'VOSTFR' ? 2 : 3;
    }
    function resolution(item) {
        var match = String(item.quality || '').match(/^([1-9]\d*)p$/);
        return match ? Number(match[1]) : 0;
    }
    var ordered = values.map(function (item, index) { return { item: item, index: index }; }).sort(function (a, b) {
        return resolution(b.item) - resolution(a.item) || audioRank(a.item) - audioRank(b.item) || a.index - b.index;
    });
    var width = Math.max(2, String(ordered.length).length);
    return ordered.map(function (entry, index) {
        if (ordered.length < 2) return entry.item;
        var position = String(index + 1);
        while (position.length < width) position = '0' + position;
        // Nuvio Mobile sorts plugin labels alphabetically after receiving them.
        // A visible rank preserves this order without altering track/quality data.
        return Object.assign({}, entry.item, { name: position + '. ' + entry.item.name });
    });
}
function run(id, type, season, episode, implementation) {
    return Promise.resolve().then(function () {
        var ctx = validateArgs(id, type, season, episode);
        log('TMDB ' + ctx.id + ' (' + ctx.type + '): starting');
        // Every result path (including catalogue and backup embeds) uses the
        // same inspector. Earlier primary inspections are reused within this call.
        return implementation(ctx).then(function (values) { return enrichHlsStreams(unique(values), ctx); }).then(function (values) {
            // Filter the completed result list after HLS can correct stale hints.
            // This display policy adds no probes or fallback requests. Unknown
            // resolutions remain available, with no fabricated quality label.
            var result = presentStreams(filterResolution(unique(values), ctx)); event('result', { sources: result.length, requests: ctx.requests, ms: Date.now() - ctx.started,
                languages: result.map(function (item) { return item.language; }), subtitles: result.reduce(function (n, item) { return n + (item.subtitles || []).length; }, 0) });
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
function hasMetadataKey() { return !!(settings().tmdbApiKey || (typeof TMDB_API_KEY !== 'undefined' && TMDB_API_KEY)); }
function tmdbDetails(ctx) {
    if (ctx.metadata) return ctx.metadata;
    var key = settings().tmdbApiKey || (typeof TMDB_API_KEY !== 'undefined' ? TMDB_API_KEY : '');
    if (!key) return Promise.reject(new Error('TMDB metadata key unavailable; Nuvio TV 1.0.0 normally injects TMDB_API_KEY'));
    ctx.metadata = requestJson('https://api.themoviedb.org/3/' + ctx.type + '/' + ctx.id + '?language=fr-FR&append_to_response=external_ids&api_key=' + encodeURIComponent(key),
        'https://www.themoviedb.org/', 'TMDB metadata', ctx).then(function (data) {
        var title = data.title || data.name, original = data.original_title || data.original_name;
        if (!title) throw new Error('TMDB metadata: title missing');
        return { title: title, original: original || title, year: yearOf(data.release_date || data.first_air_date), poster: data.poster_path || '', imdbId: data.imdb_id || data.external_ids && data.external_ids.imdb_id || '' };
    });
    return ctx.metadata;
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
