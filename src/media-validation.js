/* Shared validation for host protocols that need more than a master metadata
 * read. Anime-Sama opts in; Sendvid always requires placeholder validation.
 * No timer, segment download or text-to-binary reconstruction is used. */
function validateHostMedia(values, ctx) {
    var groups = {}, outputs = [];
    values.forEach(function (item) { (groups[item.format] = groups[item.format] || []).push(item); });
    ctx.mediaValidation = ctx.mediaValidation || {};
    function inspect(item) {
        var key = hlsKey(item);
        if (!ctx.mediaValidation[key]) ctx.mediaValidation[key] = Promise.resolve().then(function () {
            if (item.format === 'm3u8') return request(item.url, '', 'HLS validation', ctx, item.headers).then(function (master) {
                var tracks = hlsTracks(master.body, master.url, item.headers), variants = [], lines = master.body.split(/\r?\n/);
                lines.forEach(function (line, index) {
                    if (line.indexOf('#EXT-X-STREAM-INF:') !== 0) return;
                    var a = hlsAttributes(line.slice(18)), raw = lines.slice(index + 1).filter(function (s) { return s.trim() && s.trim().charAt(0) !== '#'; })[0];
                    var size = String(a.RESOLUTION || '').match(/^(\d+)x(\d+)$/);
                    var url = raw && asUrl(raw.trim(), master.url, false);
                    if (url) variants.push({ url: url, quality: size ? hlsQuality(Number(size[1]), Number(size[2])) : 0, audio: a.AUDIO, subtitles: a.SUBTITLES });
                });
                function hasEntries(body) { return /^\s*#EXTM3U\b/.test(body) && body.split(/\r?\n/).some(function (s) { return s.trim() && s.trim().charAt(0) !== '#'; }); }
                if (!hasEntries(master.body)) throw new Error('Empty HLS playlist');
                variants.sort(function (a, b) { return b.quality - a.quality; });
                function next(index) {
                    if (!variants.length) return Promise.resolve({ url: master.url, tracks: tracks });
                    if (index >= Math.min(2, variants.length)) throw new Error('HLS variants unavailable');
                    var variant = variants[index];
                    return request(variant.url, '', 'HLS variant', ctx, item.headers).then(function (response) {
                        if (!hasEntries(response.body)) throw new Error('Invalid HLS variant');
                        if (variant.quality) tracks.quality = variant.quality + 'p';
                        // A denied top variant may fall back directly only when
                        // no external audio/subtitle groups would be discarded.
                        var direct = index > 0 && !/#EXT-X-MEDIA:/.test(master.body) && !variant.audio && !variant.subtitles;
                        return { url: direct ? variant.url : master.url, tracks: tracks };
                    }).catch(function () { return next(index + 1); });
                }
                return next(0);
            });
            if (item.format === 'mpd') return request(item.url, '', 'DASH validation', ctx, item.headers).then(function (response) {
                if (!/<MPD(?:\s|>)/.test(response.body.slice(0, 100000))) throw new Error('Invalid DASH manifest');
                return { url: item.url };
            });
            if (item._hostFamily === 'sendvid') {
                if (ctx.transport && ctx.transport.textOnly) {
                    event('host-unavailable', { family: 'Sendvid', reason: 'binary-bridge-unavailable' });
                    throw new Error('Binary bridge unavailable');
                }
                return request(item.url, '', 'Sendvid validation', ctx, mergeHeaders(item.headers, { Range: 'bytes=0-65535' }), { binary: true, maxBytes: 65536 }).then(function (response) {
                    var seconds = mp4Duration(response.body), type = response.headers && response.headers.get('content-type') || '';
                    if (!response.body.length || /text\/html/i.test(type) || seconds != null && seconds <= 10) throw new Error('Sendvid unavailable-video placeholder');
                    return { url: item.url };
                });
            }
            return request(item.url, '', 'Video headers', ctx, mergeHeaders(item.headers, { Range: 'bytes=0-0' }), { method: 'HEAD' }).then(function (response) {
                if (response.headers && /text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('HTML instead of video');
                return { url: item.url };
            }).catch(function (error) { if (error.status === 405) return { url: item.url }; throw error; });
        });
        return ctx.mediaValidation[key].then(function (info) {
            var output = Object.assign({}, item, { url: info.url });
            if (info.tracks) {
                ctx.hlsMetadata = ctx.hlsMetadata || {};
                ctx.hlsMetadata[hlsKey(output)] = Promise.resolve(reportHlsTracks(info.tracks));
            }
            return enrichHlsStreams([output], ctx).then(function (result) { return result[0] || null; });
        });
    }
    return Promise.all(Object.keys(groups).map(function (format) {
        var queue = groups[format];
        function next() {
            if (!queue.length || selectionBudget(ctx)) return Promise.resolve();
            return inspect(queue.shift()).then(function (item) { if (item) outputs.push(item); else return next(); }).catch(function (error) {
                event('source-unavailable', { source: 'media-validation', reason: error.status ? 'http-' + error.status : 'validation-failed' }); return next();
            });
        }
        return next();
    })).then(function () { return outputs; });
}
