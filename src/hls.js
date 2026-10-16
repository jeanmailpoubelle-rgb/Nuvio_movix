/* Read master metadata only. Keep original audio playlists and never download
 * video segments or subtitle bodies during discovery. */
function hlsAttributes(text) {
    var attributes = {}, pattern = /(?:^|,)([A-Z0-9-]+)=("[^"]*"|[^,]*)/g, match;
    while ((match = pattern.exec(text))) attributes[match[1]] = match[2].replace(/^"|"$/g, '');
    return attributes;
}
function hlsTracks(body, base, headers) {
    if (!/^\s*#EXTM3U\b/.test(body)) throw new Error('HLS tracks: expected playlist');
    var subtitles = [], audioLanguages = {}, unknownAudio = 0, nativeSubtitles = 0, audioGroups = {};
    var lines = body.split(/\r?\n/).map(function (line) { return line.trim(); });
    lines.forEach(function (line) {
        if (line.indexOf('#EXT-X-STREAM-INF:') === 0) {
            var a = hlsAttributes(line.slice(18));
            if (a.AUDIO) audioGroups[a.AUDIO] = true;
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
    return { subtitles: normalizeSubtitles(subtitles, base, headers), audioLanguages: Object.keys(audioLanguages), unknownAudio: unknownAudio, nativeSubtitles: nativeSubtitles };
}
function enrichHlsStreams(values, ctx) {
    if (settings().inspectHls === false) return Promise.resolve(values);
    var unavailable = [];
    // Request-local only: never cache signed media URLs between lookups. Inspect
    // even when captions already exist; subtitle presence says nothing about audio.
    ctx.hlsMetadata = ctx.hlsMetadata || {};
    var candidates = values.filter(function (item) { return item && item.format === 'm3u8'; });
    return Promise.all(candidates.map(function (item) {
        var headers = Object.keys(item.headers || {}).map(function (key) { return [key.toLowerCase(), item.headers[key]]; }).sort();
        var key = JSON.stringify([item.url, headers]);
        if (!ctx.hlsMetadata[key]) ctx.hlsMetadata[key] = request(item.url, '', 'HLS tracks', ctx, item.headers).then(function (response) {
            var tracks = hlsTracks(response.body, response.url, item.headers);
            event('hls-tracks', { audio: tracks.audioLanguages, unknownAudio: tracks.unknownAudio, subtitles: tracks.subtitles.length, nativeSubtitles: tracks.nativeSubtitles });
            return tracks;
        });
        return ctx.hlsMetadata[key].then(function (tracks) {
            var subtitles = normalizeSubtitles((item.subtitles || []).concat(tracks.subtitles), item.url, item.headers);
            if (subtitles.length) item.subtitles = subtitles;
            var language = '';
            if (tracks.audioLanguages.length > 1) language = 'MULTI';
            else if (tracks.audioLanguages.length === 1 && !tracks.unknownAudio) {
                language = tracks.audioLanguages[0] === 'fr' ? 'VF' : item.language === 'VOSTFR' ? 'VOSTFR' : 'VO';
            }
            if (language && language !== item.language) {
                event('audio-label', { previous: item.language, language: language, evidence: 'hls' });
                item.name = item.name.replace(/ \| (?:VF|VOSTFR|MULTI|VO)$/, '');
                item.name += ' | ' + language; item.language = language;
            }
        }).catch(function (error) {
            // A missing master is a confirmed playback failure, not missing
            // metadata. Let the caller recover instead of listing a dead URL.
            if (error.status === 404 || error.status === 410) {
                unavailable.push(item);
                event('missing-playlist', { host: origin(item.url), status: error.status });
            }
            // Preserve sources for inconclusive transport/metadata failures.
            log(message(error));
        });
    })).then(function () { return values.filter(function (item) { return unavailable.indexOf(item) < 0; }); });
}
