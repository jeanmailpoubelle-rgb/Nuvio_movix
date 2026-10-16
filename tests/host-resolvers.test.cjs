const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function load(name, routes, settings = {}) {
    const calls = [], logs = [];
    let active = 0, maxActive = 0;
    const context = vm.createContext({
        module: {exports: {}}, SCRAPER_SETTINGS: {inspectHls: false, frembedRecovery: false, ...settings},
        console: {warn: value => logs.push(value)},
        eval() { throw new Error('Downloaded scripts must not execute'); },
        setTimeout() { throw new Error('Native sleep must not be scheduled'); },
        fetch: async (url, options) => {
            calls.push({url, options});
            const route = routes.find(route => typeof route.path === 'function' ? route.path(url) : url.includes(route.path));
            if (!route) throw new Error('Unexpected request');
            active++; maxActive = Math.max(active, maxActive);
            if (route.wait) await new Promise(resolve => setImmediate(resolve));
            active--;
            if (route.error) throw new Error('Transport unavailable');
            const body = typeof route.body === 'function' ? route.body(url, options) : route.body;
            return {status: route.status || 200, ok: !route.status || route.status < 400, url: route.url || url,
                headers: {get: name => name.toLowerCase() === 'content-type' ? route.contentType || 'text/html' : null},
                text: async () => typeof body === 'string' ? body : JSON.stringify(body)};
        },
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'providers', name + '.js'), 'utf8'), context);
    return {calls, logs, context, maxActive: () => maxActive, run: (...args) => context.module.exports.getStreams(...args)};
}
function backup(links, routes, settings) {
    return load('movix', [
        {path: '/api/purstream/', body: {sources: []}},
        {path: '/api/cpasmal/', body: {links: {vf: links}}}, ...routes,
    ], settings);
}
const f7 = fs.readFileSync(path.join(__dirname, 'fixtures/hosts/voe-f7.txt'), 'utf8').trim();
test('shared VOE resolver follows one literal redirect, decodes F7 data and returns HLS plus direct MP4', async () => {
    const h = backup([{url: 'https://voe.sx/e/fixture', server: 'Voe'}], [
        {path: 'https://voe.sx/', body: 'window.location.href="https://mirror.example/e/fixture";'},
        {path: 'https://mirror.example/', body: '<script type="application/json">' + JSON.stringify([f7]) + '</script>'},
        {path: 'https://cdn.example/master.m3u8', body: '#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=640x360,BANDWIDTH=800000\nvideo.m3u8'},
    ], {inspectHls: true});
    const results = await h.run('603', 'movie');
    assert.equal(results.length, 2); assert.equal(h.calls.length, 5);
    assert.equal(results[0].url, 'https://cdn.example/master.m3u8?b=%2F&a=1');
    assert.equal(results[0].headers.Origin, 'https://mirror.example');
    assert.equal(results[1].format, 'mp4');
    assert.equal(results[0].quality, '360p');
    assert.equal(results[0].name, 'Voe | 360p | VF');
    assert.equal(Object.hasOwn(results[1], 'quality'), false);
    assert.equal(results[1].name, 'Voe | VF');
    assert.ok(!h.calls.some(call => call.url.includes('.mp4')), 'do not probe MP4 files during discovery');
});
test('shared Dood resolver uses the public pass_md5 result and published token', async () => {
    const h = backup([{url: 'https://dood.li/e/fixture', server: 'Dood'}], [
        {path: 'https://dood.li/', url: 'https://playmogo.com/e/fixture', body: '<title>Fixture MULTI 1080p</title> $.get("/pass_md5/key/publictoken")'},
        {path: '/pass_md5/', body: 'https://cdn.example/video/'},
    ]);
    const [item] = await h.run('603', 'movie');
    assert.equal(item.format, 'mp4'); assert.equal(item.language, 'MULTI'); assert.equal(item.quality, '1080p');
    assert.match(item.url, /^https:\/\/cdn.example\/video\/[a-zA-Z0-9]{10}\?token=publictoken$/);
    assert.equal(item.headers.Referer, 'https://playmogo.com/');
    assert.equal(h.calls.at(-1).options.headers.Referer, 'https://playmogo.com/e/fixture');
});
test('Dood challenge pages return no fake stream and trigger no validation/challenge requests', async () => {
    const h = backup([{url: 'https://dood.li/e/fixture', server: 'Dood'}], [
        {path: 'https://dood.li/', body: '<script>turnstile.render("captcha")</script>'},
    ]);
    assert.equal((await h.run('603', 'movie')).length, 0); assert.equal(h.calls.length, 3);
    assert.ok(h.logs.some(line => line.includes('challenge-required')));
});
test('MixDrop and Vidmoly path conversion is bounded and uses the fetched player data', async () => {
    const h = backup([{url: 'https://mixdrop.co/f/fixture', server: 'MixDrop'}, {url: 'https://vidmoly.to/w/fixture', server: 'Vidmoly'}], [
        {path: '/f/fixture', body: '<html>File page</html>'},
        {path: '/e/fixture', body: 'MDCore.wurl="//cdn.example/file.mp4";throw new Error("never run")'},
        {path: '/w/fixture', body: '<html>File page</html>'},
        {path: '/embed-fixture.html', body: 'sources:[{file:"https://cdn.example/master.m3u8"}]'},
    ]);
    const items = await h.run('603', 'movie');
    assert.equal(items.length, 2); assert.equal(h.calls.length, 6);
    assert.equal(items[0].headers.Referer, 'https://mixdrop.co/e/fixture');
    assert.equal(items[1].headers.Referer, 'https://vidmoly.to/');
    assert.ok(h.calls.some(call => call.options.headers['Sec-Fetch-Dest'] === 'iframe'));
});
test('packed StreamWish data exposes multiple media and real captions without running its script', async () => {
    const h = backup([{url: 'https://streamwish.to/e/fixture', server: 'StreamWish'}], [
        {path: '/e/fixture', body: fs.readFileSync(path.join(__dirname, 'fixtures/hosts/packed.js'), 'utf8')},
    ]);
    const items = await h.run('603', 'movie');
    assert.equal(items.length, 2); assert.equal(h.context.packedExecuted, undefined);
    assert.equal(items[0].quality, '1080p'); assert.equal(items[1].quality, '720p');
    assert.equal(items[0].headers.Origin, 'https://streamwish.to');
    assert.equal(items[0].subtitles.length, 1); assert.equal(items[0].subtitles[0].language, 'fr');
});
test('Vidara uses its public POST API with baseline codecs and preserves returned captions', async () => {
    const h = backup([{url: 'https://vidara.to/e/MixedCode', server: 'Vidara'}], [
        {path: '/e/MixedCode', body: '<title>Movie MULTI 1080p</title>'},
        {path: '/api/stream', body: {streaming_url: 'https://cdn.example/master.m3u8', subtitles: [
            {type: 0, file_path: '/fr.vtt', language: 'fr', name: 'Français'}, {type: 1, file_path: '/sprite.vtt'},
        ]}},
    ]);
    const [item] = await h.run('603', 'movie');
    assert.equal(item.language, 'MULTI'); assert.equal(item.subtitles.length, 1); assert.equal(item.subtitles[0].name, 'Français');
    const call = h.calls.at(-1);
    assert.equal(call.options.method, 'POST');
    assert.deepEqual(JSON.parse(call.options.body), {filecode: 'MixedCode', device: 'web', codecs: []});
    assert.equal(call.options.headers.Origin, 'https://vidara.to');
});
test('Frembed redirect bodies are reused and HLS metadata is not fetched twice', async () => {
    const h = load('frembed-hosts', [
        {path: '/api/films?', body: {links: [{url: '/api/stream/one', lang: 'vf', host: {name: 'Uqload'}}]}},
        {path: '/api/stream/', url: 'https://cdn.example/master.m3u8', contentType: 'application/x-mpegurl', body: '#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1920x1080,BANDWIDTH=1000000\nvideo.m3u8'},
    ], {inspectHls: true});
    const [item] = await h.run('603', 'movie');
    assert.equal(item.quality, '1080p'); assert.equal(h.calls.length, 2);
    assert.equal(item.headers.Referer, 'https://frembed.bar/films?id=603');
});
test('a failed host does not discard healthy streams and host concurrency is bounded', async () => {
    const h = load('frembed-hosts', [
        {path: '/api/films?', body: {links: ['a','b','dead','c','d','e'].map(id => ({url: '/api/stream/' + id, host: {name: 'Uqload'}, lang: 'vf'}))}},
        {path: '/api/stream/dead', error: true, wait: true},
        {path: '/api/stream/', url: 'https://uqload.vc/embed-fixture.html', wait: true, body: (url) => 'sources:[{file:"https://cdn.example/' + url.split('/').at(-1) + '.mp4"}]'},
    ]);
    assert.equal((await h.run('603', 'movie')).length, 5);
    assert.equal(h.maxActive(), 3); assert.equal(h.calls.length, 7);
});
test('catalogue now shares Uqload extraction and deduplicates VF/VOSTFR aliases before fetching', async () => {
    const h = load('nakios', [
        {path: '/3/movie/603', body: {title: 'Matrix', release_date: '1999-01-01'}},
        {path: '/search/', body: '<a href="https://nakios.live/movie/matrix"><img alt="Matrix"></a><span>1999</span><h3>Matrix</h3>'},
        {path: '/movie/matrix', body: 'const videos = [{"link":"https://uqload.vc/embed-fixture.html","version":"VF"},{"link":"https://uqload.vc/embed-fixture.html","version":"VOSTFR"}];'},
        {path: '/embed-fixture.html', body: 'sources:[{file:"https://cdn.example/movie.mp4"}]'},
    ], {preferCatalogue: true});
    // The actual app injects this key; no credential is bundled in the provider.
    h.context.TMDB_API_KEY = 'fixture';
    const [item] = await h.run('603', 'movie');
    assert.equal(item.name, 'Catalogue / Uqload | VF'); assert.equal(h.calls.length, 4);
});
