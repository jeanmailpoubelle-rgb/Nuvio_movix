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
    }).catch(function(error) {
        if (error.status === 404 || error.status === 410) return seekRedirectSources(root, match[2], ctx);
        throw error;
    });
}
// Current first-party migration: old Seek file -> explicitly bound TurboEmbed
// slug -> public AES-CBC response header. No downloaded code is executed.
function seekRedirectSources(root, file, ctx) {
    return request(root + '/api/public/resolve?file1=' + encodeURIComponent(file), root + '/', 'Seek migration', ctx, {Origin:root}).then(function(response) {
        var mapping=JSON.parse(response.body), target=asUrl(mapping.url,'',false);
        var parsed=target && target.match(/^(https:\/\/[^/?#@]+)\/([a-z0-9_-]{1,128})$/i);
        if(mapping.ok!==true || mapping.host1!=='seek' || mapping.file1!==file || mapping.host2!=='turbovio' || !parsed || mapping.file2!==parsed[2] || !matchesHost(target,ENDPOINTS.seek.redirectHosts)) throw new Error('Seek migration: unverified target');
        var base=parsed[1], slug=parsed[2], headers={Referer:target,Origin:base};
        var keyHex=['𝕊','𝔼','𝕮','𝚁','𝔼','𝚃','𝓚','𝓔','𝓨','𝟙','𝟚','𝟛'].map(function(v){return v.codePointAt(0).toString(16);}).join('').slice(0,32);
        var salt=['🔐','🗝️','🔑','🚪','🛡️','⚡'].map(function(v){return v.codePointAt(0).toString(16);}).join('');
        var ivHex=(salt+NativeAES.utils.hex.fromBytes(NativeAES.utils.utf8.toBytes(base.slice(8)))).slice(0,32);
        function cipher(){return new NativeAES.ModeOfOperation.cbc(NativeAES.utils.hex.toBytes(keyHex),NativeAES.utils.hex.toBytes(ivHex));}
        var token=NativeAES.utils.hex.fromBytes(cipher().encrypt(NativeAES.padding.pkcs7.pad(NativeAES.utils.utf8.toBytes(slug))));
        return request(base+'/api/stream?s='+encodeURIComponent(slug),target,'Turbo metadata',ctx,headers).then(function(meta) {
            var info=JSON.parse(meta.body);
            if(!info.data || typeof info.data!=='object' || Array.isArray(info.data))throw new Error('Turbo metadata: invalid schema');
            return request(base+'/api/stream/tracking?c='+token,target,'Turbo stream',ctx,headers).then(function(stream) {
                var encoded=stream.headers && stream.headers.get && stream.headers.get('x-tracking');
                if(!/^(?:[a-f0-9]{32}){1,8192}$/i.test(encoded||''))throw new Error('Turbo stream: missing public frame');
                var decoded=JSON.parse(NativeAES.utils.utf8.fromBytes(NativeAES.padding.pkcs7.strip(cipher().decrypt(NativeAES.utils.hex.toBytes(encoded)))));
                if(!decoded.stream || typeof decoded.stream!=='object' || Array.isArray(decoded.stream))throw new Error('Turbo stream: invalid schema');
                var keys=['tiktok','hls','direct'];
                for(var i=0;i<keys.length;i++) {
                    var url=asUrl(decoded.stream[keys[i]],'',false);
                    if(url) {event('seek-migration',{from:root,to:base,protocol:'public-header-cbc'});return [{url:url,format:'m3u8',headers:headers,subtitles:normalizeSubtitles(info.data.subtitles,target,headers,true)}];}
                }
                return [];
            });
        });
    });
}
