/* Read master metadata only. Keep original audio playlists and never download
 * video segments or subtitle bodies during discovery. */
function hlsAttributes(text) {
    var attributes = {}, pattern = /(?:^|,)([A-Z0-9-]+)=("[^"]*"|[^,]*)/g, match;
    while ((match = pattern.exec(text))) attributes[match[1]] = match[2].replace(/^"|"$/g, '');
    return attributes;
}
function hlsTracks(body, base, headers) {
    if (!/^\s*#EXTM3U\b/.test(body)) throw new Error('HLS tracks: expected playlist');
    var subtitles = [], audioLanguages = {};
    body.split(/\r?\n/).forEach(function (line) {
        if (line.indexOf('#EXT-X-MEDIA:') !== 0) return;
        var a = hlsAttributes(line.slice(13));
        if (a.TYPE === 'AUDIO' && a.LANGUAGE) {
            var language = a.LANGUAGE.toLowerCase().split('-')[0];
            if (/^(?:fre|fra)$/.test(language)) language = 'fr';
            if (language === 'eng') language = 'en';
            if (language !== 'und') audioLanguages[language] = true;
        }
        // Raw caption files in EXT-X-MEDIA are not HLS subtitle playlists.
        // Expose them explicitly; proper .m3u8 subtitle renditions stay native.
        if (a.TYPE === 'SUBTITLES' && /\.(?:vtt|webvtt|srt|ass|ssa)(?:[?#]|$)/i.test(a.URI || '')) {
            subtitles.push({ url: a.URI, language: a.LANGUAGE || a.NAME, name: a.NAME });
        }
    });
    return { subtitles: normalizeSubtitles(subtitles, base, headers), audioLanguages: Object.keys(audioLanguages) };
}
function enrichHlsStreams(values, ctx) {
    if (settings().inspectHls === false) return Promise.resolve(values);
    var candidates = values.filter(function (item) { return item && item.format === 'm3u8' && !(item.subtitles || []).length; }).slice(0, 2);
    return Promise.all(candidates.map(function (item) {
        return request(item.url, '', 'HLS tracks', ctx, item.headers).then(function (response) {
            var tracks = hlsTracks(response.body, response.url, item.headers);
            if (tracks.subtitles.length) item.subtitles = tracks.subtitles;
            if (tracks.audioLanguages.length > 1) {
                item.name = item.name.replace(/ \| (?:VF|VOSTFR|MULTI)$/, '');
                item.name += ' | MULTI'; item.language = 'MULTI';
            }
            event('hls-tracks', { audio: tracks.audioLanguages, subtitles: tracks.subtitles.length });
        }).catch(function (error) {
            // Metadata failure must never discard a playable video or trigger
            // another provider/backend lookup.
            log(message(error));
        });
    })).then(function () { return values; });
}
