const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const media = 'https://cdn.example/master.m3u8';
function load(name, routes, settings = {}) {
    const calls = [], logs = [];
    const context = vm.createContext({
        module: { exports: {} }, SCRAPER_SETTINGS: settings, TMDB_API_KEY: 'test-only',
        console: { warn: value => logs.push(value) },
        fetch: async (url, options) => {
            calls.push({url, options});
            const route = routes.find(route => url.includes(route.path));
            if (!route) throw new Error('Unexpected request');
            if (route.error) throw new Error(route.error);
            return {status: route.status ?? 200, ok: !route.status || route.status < 400, url,
                text: async () => typeof route.body === 'string' ? route.body : JSON.stringify(route.body)};
        },
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'providers', name + '.js'), 'utf8'), context);
    return {calls, logs, run: (...args) => context.module.exports.getStreams(...args)};
}
const metadata = {title: 'Matrix', release_date: '1999-03-31'};
const direct = [
    {path: '/3/movie/603', body: metadata},
    {path: '/search-bar/', body: {data: {items: {movies: {items: [{id: 2633, type: 'movie', ...metadata}]}}}}},
    {path: '/media/2633/sheet', body: {data: {items: {tmdbId: 603, type: 'movie', urls: [{url: media}]}}}},
];
test('wrapper transport/schema failure recovers through the verified direct API', async () => {
    for (const failure of [{status: 503}, {body: '<html>Moved</html>'}, {body: {unexpected: true}}]) {
        const h = load('movix', [{path: '/api/purstream/', ...failure}, ...direct]);
        const result = await h.run('603', 'movie');
        assert.equal(result.length, 1); assert.equal(h.calls.length, 4);
        assert.equal(result[0].headers.Referer, 'https://purstream.club/');
        assert.ok(!h.calls.some(call => call.url.includes('/api/cpasmal/')));
    }
});
test('an explicit missing episode skips the duplicate direct Purstream lookup', async () => {
    const h = load('movix', [
        {path: '/api/purstream/', status: 404},
        {path: '/api/cpasmal/tv/108978/4/1', body: {links: {vostfr: [{url: media}]}}},
    ]);
    assert.equal((await h.run('108978', 'tv', 4, 1))[0].language, 'VOSTFR');
    assert.equal(h.calls.length, 2);
});
function catalogueRoutes(base) {
    return [
        {path: base + '/search/Matrix', body: `<a href="${base}/movie/matrix"><img alt="Matrix"></a><span>1999</span><h3>Matrix</h3>`},
        {path: base + '/movie/matrix', body: `const videos = [{"link":"${media}","version":"VOSTFR","embed_type":"hls"}];`},
    ];
}
test('Purstream directory discovers the current Purestream catalogue after the first mirror fails', async () => {
    const base = 'https://purestream.new-example';
    const h = load('nakios', [
        {path: '/3/', body: metadata}, {path: 'https://nakios.live/search/', status: 503},
        {path: 'https://nakios.org/', status: 503},
        {path: 'https://purstream.org/', body: `<div onclick="window.open('${base}/', '_blank')">Visiter le site</div>`},
        ...catalogueRoutes(base),
    ], {preferCatalogue: true});
    assert.equal((await h.run('603', 'movie')).length, 1);
    assert.equal(h.calls.length, 6);
    assert.ok(!h.calls.some(call => call.url.includes('purestream.cc')));
});
test('directory outage and a parked candidate still allow a known mirror to recover', async () => {
    const h = load('nakios', [
        {path: '/3/', body: metadata}, {path: 'https://nakios.live/search/', status: 503},
        {path: 'https://nakios.org/', body: '<tr><td>Catalogue <a href="https://nakios.parked-example/">Open</a></td></tr>'},
        {path: 'https://nakios.parked-example/search/', body: '<html>Buy this domain</html>'},
        {path: 'https://purstream.org/', status: 503}, ...catalogueRoutes('https://purestream.cc'),
    ], {preferCatalogue: true});
    assert.equal((await h.run('603', 'movie')).length, 1);
    assert.equal(h.calls.length, 7);
});
test('healthy catalogue lookups do not consult directories or duplicate mirrors', async () => {
    const h = load('nakios', [{path: '/3/', body: metadata}, ...catalogueRoutes('https://nakios.live')], {preferCatalogue: true});
    assert.equal((await h.run('603', 'movie')).length, 1);
    assert.equal(h.calls.length, 3);
});
test('API subtitle files keep language, absolute URL and their own playback headers', async () => {
    const h = load('movix', [{path: '/api/purstream/', body: {sources: [{url: media, subtitles: [
        {url: '/captions/fr.vtt', lang: 'French', name: 'Français', headers: {Referer: 'https://subs.example/'}},
        {url: 'javascript:bad.vtt'}, {url: '/captions/fr.vtt'}, {url: '/preview.vtt', kind: 'thumbnails'},
    ]}]}}]);
    const result = await h.run('603', 'movie');
    assert.equal(h.calls.length, 1); assert.equal(result[0].subtitles.length, 1);
    const sub = result[0].subtitles[0];
    assert.equal(sub.url, 'https://movix.cash/captions/fr.vtt');
    assert.equal(sub.language, 'fr'); assert.equal(sub.headers.Referer, 'https://subs.example/');
});
test('embed HTML subtitle tracks are passed to Nuvio without extra fetches', async () => {
    const h = load('nakios', [
        {path: '/movie/603', body: '<iframe id="pf" src="https://vidzy.cc/embed-fixture.html"></iframe>'},
        {path: '/embed-fixture.html', body: `file: "${media}"; <track kind="subtitles" src="/subs/fr.vtt?one=1&amp;two=2" srclang="fr" label="Français">`},
    ]);
    const result = await h.run('603', 'movie');
    assert.equal(result[0].subtitles[0].url, 'https://vidzy.cc/subs/fr.vtt?one=1&two=2');
    assert.equal(result[0].subtitles[0].headers.Referer, 'https://vidzy.cc/embed-fixture.html');
    assert.equal(h.calls.length, 3);
});
test('literal JWPlayer captions are preserved and thumbnails excluded without evaluating scripts', async () => {
    const h = load('nakios', [
        {path: '/movie/603', body: '<iframe id="pf" src="https://vidzy.cc/embed-fixture.html"></iframe>'},
        {path: '/embed-fixture.html', body: `file: "${media}"; tracks:[{file:'/subs/fr.vtt',label:'Français',kind:'captions'},{file:'/thumbs.vtt',kind:'thumbnails'}]`},
    ]);
    const result = await h.run('603', 'movie');
    assert.equal(result[0].subtitles.length, 1);
    assert.equal(result[0].subtitles[0].language, 'fr');
});
test('duplicate media entries retain all advertised subtitle languages', async () => {
    const h = load('movix', [{path: '/api/purstream/', body: {sources: [
        {url: media, subtitles: [{url: '/fr.vtt', language: 'fr'}]},
        {url: media, subtitles: [{url: '/en.vtt', language: 'en'}]},
    ]}}]);
    const result = await h.run('603', 'movie');
    assert.equal(result.length, 1);
    assert.deepEqual(Array.from(result[0].subtitles, track => track.language), ['fr', 'en']);
});
test('provider diagnostics never print HTTP query secrets, signed URLs or native error URLs', async () => {
    const h = load('movix', [
        {path: '/api/purstream/', error: 'failed https://example/?token=DO-NOT-LOG'},
        {path: '/3/', error: 'failed https://example/?api_key=DO-NOT-LOG'},
        {path: '/api/cpasmal/', body: {links: {}}},
    ]);
    await h.run('603', 'movie');
    assert.ok(h.logs.length); assert.ok(!h.logs.join('\n').includes('DO-NOT-LOG'));
});
test('manifest keeps two active providers and an inert migration entry for TV 1.0.0', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
    assert.equal(manifest.scrapers.filter(entry => entry.enabled).length, 2);
    const retired = manifest.scrapers.find(entry => entry.id === 'purstream-tv');
    assert.equal(retired.enabled, false); assert.deepEqual(retired.supportedTypes, []);
    assert.ok(manifest.scrapers.every(entry => entry.version === manifest.version));
});
