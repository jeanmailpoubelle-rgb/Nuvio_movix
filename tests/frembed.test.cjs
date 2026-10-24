const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function load(name, routes, settings = {}) {
    const calls = [], logs = [];
    const context = vm.createContext({module: {exports: {}}, SCRAPER_SETTINGS: settings,
        console: {warn: value => logs.push(value)},
        setTimeout() { throw new Error('No native timers'); },
        fetch: async (url, options) => {
            calls.push({url, options});
            const route = routes.find(route => url.includes(route.path));
            if (!route) throw new Error('Unexpected request');
            const body = typeof route.body === 'function' ? route.body(url, options) : route.body;
            return {status: route.status || 200, ok: !route.status || route.status < 400, url: route.url || url,
                text: async () => typeof body === 'string' ? body : JSON.stringify(body)};
        }});
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../providers', name + '.js'), 'utf8'), context);
    return {calls, logs, run: (...args) => context.module.exports.getStreams(...args)};
}
const empty = [{path: '/api/purstream/', body: {sources: []}}, {path: '/api/cpasmal/', body: {links: {}}}];
for (const [type, id, season, episode] of [['movie', '603', null, null], ['tv', '2316', 1, 1]]) {
    test(`Frembed current domain avoids a redirected stale Referer for ${type}`, async () => {
        const base = 'https://frembed.uno';
        const query = `id=${id}` + (type === 'tv' ? `&sa=${season}&epi=${episode}` : '');
        const page = `${base}/${type === 'tv' ? 'series' : 'films'}?${query}`;
        const media = 'https://cdn.example/current.mp4?b=%2F&a=1&a=2';
        const h = load('frembed-hosts', [{path: '/api/', url: `${base}/api/`, body: (url, options) => {
            // The retired origin redirects, but the current API rejects its
            // old Referer. A new HTTP 200 page alone does not prove recovery.
            if (!url.startsWith(base + '/') || options.headers.Referer !== page) return {error: 'Access denied - Invalid Referer'};
            return {tmdb: id, ...(type === 'tv' ? {sa: season, epi: episode} : {}), links: [{url: media, lang: 'vf'}]};
        }}]);
        const result = await h.run(id, type, season, episode);
        assert.equal(result.length, 1, 'Use the published current origin and matching API Referer');
        assert.equal(result[0].url, media);
        assert.equal(h.calls.length, 1, 'Domain maintenance must not add a discovery preflight');
        assert.equal(h.calls[0].url, `${base}/api/${type === 'tv' ? 'series' : 'films'}?${query}&idType=tmdb`);
    });
}
test('Frembed host discovery uses exact TMDB episode coordinates including season zero without metadata preflight', async () => {
    const h = load('frembed-hosts', [{path: '/api/series?', body: {links: []}}]);
    assert.equal((await h.run('108978', 'series', 0, 3)).length, 0);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].url, 'https://frembed.uno/api/series?id=108978&sa=0&epi=3&idType=tmdb');
    assert.equal(h.calls[0].options.headers.Referer, 'https://frembed.uno/series?id=108978&sa=0&epi=3');
});
test('modern empty host lists are authoritative and never resurrect numbered legacy links', async () => {
    const h = load('frembed-hosts', [{path: '/api/films?', body: {links: [], link1: 'https://cdn.example/wrong.mp4'}}]);
    assert.equal((await h.run('603', 'movie')).length, 0); assert.equal(h.calls.length, 1);
});
test('legacy numbered VF, VOSTFR and VO links preserve their categories', async () => {
    const h = load('frembed-hosts', [{path: '/api/films?', body: {link1: 'https://cdn.example/vf.mp4', link1vostfr: 'https://cdn.example/sub.mp4', link1vo: 'https://cdn.example/vo.mp4'}}]);
    assert.deepEqual(Array.from(await h.run('603', 'movie'), item => item.language), ['VF', 'VOSTFR', 'VO']);
    assert.equal(h.calls.length, 1);
});
test('result target interleaves language groups and stops after three useful alternatives', async () => {
    const links = ['vf','vostfr','vo'].flatMap(lang => Array.from({length:9}, (_,i) => ({url:`https://cdn.example/${lang}${i}.mp4`,lang})));
    const h = load('frembed-hosts', [{path: '/api/films?', body: {links}}]);
    const items = await h.run('603', 'movie');
    assert.equal(items.length, 3);
    assert.deepEqual(Array.from(items, item => item.language), ['VF','VOSTFR','VO']);
    assert.equal(h.calls.length, 1);
});
test('premium recovery follows an ordinary fresh grant, keeps signed bytes and omits site playback headers', async () => {
    const media = 'https://cdn.example/master.m3u8?b=%2F&a=1&a=2&literal=&amp;';
    const h = load('movix', [...empty,
        {path: '/api/player/resolve', body: {url: 'https://player.example/watch?grant=private'}},
        {path: '/api/streaming/player?', body: {sources: [{url:media,mime:'application/x-mpegurl'}]}},
        {path: media, body: '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="fr"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="ja"\n#EXT-X-MEDIA:TYPE=SUBTITLES,LANGUAGE="fr",NAME="Français",URI="fr.vtt?literal=&amp;"\n#EXT-X-STREAM-INF:RESOLUTION=1920x800,BANDWIDTH=1000000,AUDIO="a"\nvideo.m3u8'},
    ]);
    const [item] = await h.run('129', 'tv', 2, 5);
    assert.equal(item.url, media); assert.equal(item.name, 'Frembed / Premium | 1080p | MULTI');
    assert.equal(item.headers.Referer, undefined); assert.equal(item.headers.Origin, undefined); assert.ok(item.headers['User-Agent']);
    assert.equal(item.subtitles[0].name, 'Français'); assert.match(item.subtitles[0].url, /literal=&amp;$/);
    const grant = h.calls.find(c => c.url.endsWith('/api/player/resolve'));
    assert.equal(grant.url, 'https://frembed.uno/api/player/resolve');
    assert.equal(grant.options.headers.Origin, 'https://frembed.uno');
    assert.equal(grant.options.headers.Referer, 'https://frembed.uno/tv-show/129');
    assert.deepEqual(JSON.parse(grant.options.body), {tmdbId:'129',kind:'series',playerType:'vip',locale:'fr',turnstileToken:'',season:2,episode:5});
    assert.equal(grant.options.method, 'POST');
    assert.equal(h.calls[3].url, 'https://player.example/api/streaming/player?tmdb=129&type=serie&sa=2&ep=5');
    assert.equal(h.calls.length, 5); assert.ok(!h.logs.join('\n').includes('grant=private'));
});
test('premium recovery is not called while a primary or backup is working', async () => {
    for (const primary of [true,false]) {
        const h = load('movix', [
            {path: '/api/purstream/', body: {sources: primary ? [{url:'https://cdn.example/primary.mp4'}] : []}},
            {path: '/api/cpasmal/', body: {links:{vf:[{url:'https://cdn.example/backup.mp4'}]}}},
        ]);
        assert.equal((await h.run('603', 'movie')).length,1); assert.equal(h.calls.length,primary?1:2);
    }
});
test('premium recovery resolves relative caption files against the granted player without adding playback headers',async()=>{
    const h=load('movix',[...empty,
        {path:'/api/player/resolve',body:{url:'https://player.example/watch?grant=fixture'}},
        {path:'/api/streaming/player?',body:{sources:[{url:'https://cdn.example/video.mp4',mime:'video/mp4',tracks:[{url:'/captions/fr.vtt',language:'fr'}]}]}},
    ]);
    const [item]=await h.run('603','movie');assert.equal(item.subtitles[0].url,'https://player.example/captions/fr.vtt');
    assert.equal(item.subtitles[0].name,'Français');assert.equal(item.headers.Referer,undefined);assert.equal(item.subtitles[0].headers.Referer,undefined);
    assert.equal(h.calls.length,4);
});
test('missing backup playlists can recover through Frembed instead of listing dead entries', async () => {
    const h = load('movix', [empty[0],
        {path:'/api/cpasmal/',body:{links:{vf:[{url:'https://cdn.example/deleted.m3u8'}]}}},
        {path:'/deleted.m3u8',status:404},
        {path:'/api/player/resolve',body:{url:'/player?granted=1'}},
        {path:'/api/streaming/player?',body:{sources:[{url:'https://cdn.example/working.mp4',mime:'video/mp4'}]}},
    ]);
    const [item]=await h.run('603','movie');assert.equal(item.url,'https://cdn.example/working.mp4');assert.equal(h.calls.length,5);
});
for (const grant of [{status:403,body:{}},{body:{error:'denied'}},{body:{url:'javascript:run()'}}]) {
    test('grant failure returns no fabricated player/source request', async () => {
        const h=load('movix',[...empty,{path:'/api/player/resolve',...grant}]);
        assert.equal((await h.run('603','movie')).length,0);assert.equal(h.calls.length,3);
    });
}
test('Frembed domain override updates API requests and Origin/Referer together', async () => {
    const h=load('movix',[...empty,{path:'/api/player/resolve',body:{url:'/player'}},{path:'/api/streaming/player?',body:{sources:[]}}],{frembedBaseUrl:'https://frembed.new-example'});
    await h.run('603','movie');
    assert.equal(h.calls[2].options.headers.Origin,'https://frembed.new-example');
    assert.equal(h.calls[2].options.headers.Referer,'https://frembed.new-example/movies/603');
    assert.ok(h.calls.slice(2).every(c=>c.url.startsWith('https://frembed.new-example/')));
});
test('fresh grants and media are never cached across calls', async () => {
    let count=0;
    const h=load('movix',[...empty,{path:'/api/player/resolve',body:()=>({url:'/player?grant='+ ++count})},{path:'/api/streaming/player?',body:()=>({sources:[{url:'https://cdn.example/file.mp4?fresh='+count,mime:'video/mp4'}]})}]);
    const a=await h.run('603','movie'),b=await h.run('603','movie');
    assert.notEqual(a[0].url,b[0].url);assert.equal(h.calls.length,8);
});
test('direct DASH format is preserved and invalid IDs fail before networking', async () => {
    const h=load('frembed-hosts',[{path:'/api/films?',body:{links:[{url:'https://cdn.example/master.mpd',lang:'vo'}]}}]);
    const [item]=await h.run('603','movie');assert.equal(item.format,'mpd');assert.equal(item.language,'VO');
    const before=h.calls.length;
    for (const args of [['tt123','movie'],['1','tv'],['1','tv',1,0],['1','anime']]) assert.equal((await h.run(...args)).length,0);
    assert.equal(h.calls.length,before);
});
