/* Read master metadata only. Keep original audio playlists and never download
 * video segments or subtitle bodies during discovery. */
function hlsAttributes(text) {
    var attributes = {}, pattern = /(?:^|,)([A-Z0-9-]+)=("[^"]*"|[^,]*)/g, match;
    while ((match = pattern.exec(text))) attributes[match[1]] = match[2].replace(/^"|"$/g, '');
    return attributes;
}
function hlsQuality(width, height) {
    // Width preserves familiar tiers for cropped cinema (1920x800 is 1080p).
    // Height also handles 4:3 encodes. Exact dimensions remain in diagnostics.
    var tiers = [[3840, 2160], [2560, 1440], [1920, 1080], [1280, 720], [1024, 576], [854, 480], [640, 360], [426, 240], [256, 144]];
    for (var i = 0; i < tiers.length; i++) if (width >= tiers[i][0] || height >= tiers[i][1]) return tiers[i][1];
    return height;
}
function hlsTracks(body, base, headers) {
    if (!/^\s*#EXTM3U\b/.test(body)) { var error = new Error('HLS tracks: expected playlist'); error.invalidPlaylist = true; throw error; }
    var subtitles = [], audioLanguages = {}, unknownAudio = 0, nativeSubtitles = 0, audioGroups = {}, resolutions = [], quality = 0;
    var lines = body.split(/\r?\n/).map(function (line) { return line.trim(); });
    lines.forEach(function (line) {
        if (line.indexOf('#EXT-X-STREAM-INF:') === 0) {
            var a = hlsAttributes(line.slice(18));
            if (a.AUDIO) audioGroups[a.AUDIO] = true;
            var size = String(a.RESOLUTION || '').match(/^([1-9]\d{1,4})x([1-9]\d{1,4})$/);
            if (size && Number(size[1]) <= 16384 && Number(size[2]) <= 16384) {
                if (resolutions.indexOf(a.RESOLUTION) < 0) resolutions.push(a.RESOLUTION);
                quality = Math.max(quality, hlsQuality(Number(size[1]), Number(size[2])));
            }
        }
    });
    lines.forEach(function (line) {
        if (line.indexOf('#EXT-X-MEDIA:') !== 0) return;
        var a = hlsAttributes(line.slice(13));
        if (a.TYPE === 'AUDIO' && (!Object.keys(audioGroups).length || audioGroups[a['GROUP-ID']])) {
            var language = String(a.LANGUAGE || '').toLowerCase().split(/[-_]/)[0];
            var aliases = { fre: 'fr', fra: 'fr', eng: 'en', jpn: 'ja', deu: 'de', ger: 'de', spa: 'es', ita: 'it', por: 'pt', zho: 'zh', chi: 'zh', kor: 'ko', ara: 'ar', rus: 'ru', hin: 'hi', nld: 'nl', dut: 'nl' };
            language = aliases[language] || language;
            // Repeated languages in different codec groups are not MULTI.
            // Unknown tracks cannot prove either a single or multiple languages.
            if (/^[a-z]{2,3}$/.test(language) && !/^(?:und|mul|zxx)$/.test(language)) audioLanguages[language] = true;
            else unknownAudio++;
        }
        // Raw caption files in EXT-X-MEDIA are not HLS subtitle playlists.
        // Expose them explicitly; proper .m3u8 subtitle renditions stay native.
        if (a.TYPE === 'SUBTITLES' && /\.(?:vtt|webvtt|srt|ass|ssa)(?:[?#]|$)/i.test(a.URI || '')) {
            subtitles.push({ url: a.URI, language: a.LANGUAGE || a.NAME, name: a.NAME });
        } else if (a.TYPE === 'SUBTITLES') nativeSubtitles++;
    });
    return { subtitles: normalizeSubtitles(subtitles, base, headers, true), audioLanguages: Object.keys(audioLanguages), unknownAudio: unknownAudio, nativeSubtitles: nativeSubtitles, resolutions: resolutions, quality: quality ? quality + 'p' : '' };
}
function hlsKey(item) {
    var headers = Object.keys(item.headers || {}).map(function (key) { return [key.toLowerCase(), item.headers[key]]; }).sort();
    return JSON.stringify([item.url, headers]);
}
function reportHlsTracks(tracks) {
    event('hls-tracks', { audio: tracks.audioLanguages, unknownAudio: tracks.unknownAudio, subtitles: tracks.subtitles.length, nativeSubtitles: tracks.nativeSubtitles, resolutions: tracks.resolutions, quality: tracks.quality });
    return tracks;
}
function primeHlsMetadata(item, response, ctx) {
    if (item.format !== 'm3u8' || settings().inspectHls === false || !/^\s*#EXTM3U\b/.test(response.body)) return;
    ctx.hlsMetadata = ctx.hlsMetadata || {};
    var key = hlsKey(item);
    if (!ctx.hlsMetadata[key]) ctx.hlsMetadata[key] = Promise.resolve(reportHlsTracks(hlsTracks(response.body, response.url, item.headers)));
}
function enrichHlsStreams(values, ctx) {
    if (settings().inspectHls === false) return Promise.resolve(values);
    var unavailable = [];
    // Request-local only: never cache signed media URLs between lookups. Inspect
    // even when captions already exist; subtitle presence says nothing about audio.
    ctx.hlsMetadata = ctx.hlsMetadata || {};
    var candidates = values.filter(function (item) { return item && item.format === 'm3u8'; });
    return Promise.all(candidates.map(function (item) {
        var key = hlsKey(item);
        if (!ctx.hlsMetadata[key]) ctx.hlsMetadata[key] = request(item.url, '', 'HLS tracks', ctx, item.headers).then(function (response) {
            return reportHlsTracks(hlsTracks(response.body, response.url, item.headers));
        });
        return ctx.hlsMetadata[key].then(function (tracks) {
            var suffix = (item.quality ? ' | ' + item.quality : '') + (item.language ? ' | ' + item.language : '');
            var prefix = suffix ? item.name.slice(0, -suffix.length) : item.name;
            var subtitles = normalizeSubtitles((item.subtitles || []).concat(tracks.subtitles), item.url, item.headers);
            if (subtitles.length) item.subtitles = subtitles;
            if (tracks.quality && tracks.quality !== item.quality) {
                event('quality-label', { previous: item.quality, quality: tracks.quality, evidence: 'hls', resolutions: tracks.resolutions });
                item.quality = tracks.quality;
            }
            var language = '';
            if (tracks.audioLanguages.length > 1) language = 'MULTI';
            else if (tracks.audioLanguages.length === 1 && !tracks.unknownAudio) {
                language = tracks.audioLanguages[0] === 'fr' ? 'VF' : item.language === 'VOSTFR' ? 'VOSTFR' : 'VO';
            }
            if (language && language !== item.language) {
                event('audio-label', { previous: item.language, language: language, evidence: 'hls' });
                item.language = language;
            }
            item.name = streamName(prefix, item.quality, item.language);
        }).catch(function (error) {
            // Playback needs this playlist. Network errors and server failures
            // must not let a cached API hint satisfy selection or block backups.
            // A readable playlist with unknown optional metadata still qualifies.
            unavailable.push(item);
            event('missing-playlist', { host: origin(item.url), status: error.invalidPlaylist ? 200 : error.status || 0,
                reason: error.invalidPlaylist ? 'not-an-hls-playlist' : error.status ? 'unavailable' : 'request-failed' });
            log(message(error));
        });
    })).then(function () { return values.filter(function (item) { return unavailable.indexOf(item) < 0; }); });
}
