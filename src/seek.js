/* Independent public SeekStreaming protocol client. AES framing is public
 * player data, not an account credential. MIT aes-js supplies the cipher. */
function seekSources(url, ctx) {
    var match = String(url).match(/^(https:\/\/[^/?#@]+)\/#([a-z0-9_-]{1,128})$/i);
    if (!match || !matchesHost(url, ENDPOINTS.hosts.seek)) return Promise.resolve([]);
    var root = match[1], headers = { Referer: root + '/', Origin: root };
    return request(root + '/api/v1/video?id=' + encodeURIComponent(match[2]) + '&w=1920&h=1080&r=', root + '/', 'Seek video', ctx, headers).then(function (response) {
        var encoded = response.body.trim().replace(/^"|"$/g, '');
        if (!/^(?:[a-f0-9]{32}){1,8192}$/i.test(encoded)) throw new Error('Seek video: invalid encrypted payload');
        var cipher = new NativeAES.ModeOfOperation.cbc(NativeAES.utils.utf8.toBytes('kiemtienmua911ca'), NativeAES.utils.utf8.toBytes('1234567890oiuytr'));
        var bytes = cipher.decrypt(NativeAES.utils.hex.toBytes(encoded));
        var data = JSON.parse(NativeAES.utils.utf8.fromBytes(NativeAES.padding.pkcs7.strip(bytes)));
        var seen = {}, result = [];
        // cfNative is the host's native-player transport of the same video.
        // Prefer it over the parallel IP transport, not two copies of one file.
        var keys = asUrl(data.cfNative, '', false) ? ['cfNative'] : ['source', 'master', 'masterUrl'];
        keys.forEach(function (key) {
            var media = asUrl(data[key], '', false);
            if (!media || seen[media] || /\/#/.test(media)) return;
            seen[media] = true; result.push({ url: media, format: 'm3u8', headers: headers, subtitles: data.subtitles });
        });
        return result;
    });
}
