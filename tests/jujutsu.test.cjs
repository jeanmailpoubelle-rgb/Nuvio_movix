const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const media = 'https://cdn.example/movie/master.m3u8';
const master = resolution => `#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=${resolution}\nvideo.m3u8`;
function load(provider, routes, settings = {}) {
    const calls = [], logs = [];
    const context = vm.createContext({
        module: {exports: {}}, SCRAPER_SETTINGS: {catalogueMirrors: ['https://nakios.live'], movixFailover: false, frembedRecovery: false, ...settings}, TMDB_API_KEY: 'fixture',
        console: {warn: value => logs.push(value)},
        eval() { throw new Error('Must not execute player JavaScript'); },
        setTimeout() { throw new Error('Must not schedule native sleeps'); },
        fetch: async (url, options) => {
            calls.push({url, options});
            const route = routes.find(route => url.includes(route.path));
            if (!route) throw new Error('Unexpected request');
            return {status: route.status || 200, ok: !route.status || route.status < 400, url: route.finalUrl || url,
                text: async () => typeof route.body === 'string' ? route.body : JSON.stringify(route.body)};
        },
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../providers', provider + '.js'), 'utf8'), context);
    return {calls, logs, run: (...args) => context.module.exports.getStreams(...args)};
}
function catalogueRoutes(link = 'https://livavid.sbs/e/fixture') {
    return [
        {path: '/3/movie/424242', body: {title: 'Fixture', release_date: '2021-01-01'}},
        {path: '/search/Fixture', body: '<a href="https://nakios.live/movie/fixture"><img alt="Fixture"></a><span>2021</span><h3>Fixture</h3>'},
        {path: '/movie/fixture', body: `const videos = ${JSON.stringify([1, 2].map(i => ({link, version: 'VF', server_name: 'Premium ' + i})))};`},
    ];
}
function luluPlayer() {
    // Same literal packing and caption-upload menu as the live Lulu player.
    return `eval(function(p,a,c,k,e,d){}('0("vplayer").1({2:[{3:"${media}"}],4:[{3:"/srt/empty.srt",5:"Upload captions",6:"captions"}]});',10,7,'jwplayer|setup|sources|file|tracks|label|kind'.split('|')))`;
}
test('catalogue LuluStream aliases resolve once with measured quality and no fake upload-caption track', async () => {
    const h = load('nakios', [...catalogueRoutes(), {path: '/e/fixture', body: luluPlayer()}, {path: media, body: master('1920x800')}], {preferCatalogue: true});
    const [item] = await h.run('424242', 'movie');
    assert.equal(item.name, 'Catalogue / LuluStream | 1080p | VF');
    assert.equal(item.quality, '1080p'); assert.equal(item.subtitles, undefined);
    assert.equal(h.calls.length, 5); assert.equal(h.calls.filter(c => c.url.includes('/e/fixture')).length, 1);
    assert.equal(item.headers.Referer, 'https://livavid.sbs/e/fixture');
    assert.equal(h.calls.at(-1).options.headers.Referer, item.headers.Referer);
    assert.ok(h.logs.some(line => line.includes('"advertised":2,"supported":2,"distinct":1,"unsupported":0')));
});
test('published luluvid.com aliases follow the supported player redirect and retain its playback headers', async () => {
    const h = load('nakios', [...catalogueRoutes('https://luluvid.com/e/fixture'),
        {path: '/e/fixture', finalUrl: 'https://luluvdo.com/e/fixture', body: luluPlayer()},
        {path: media, body: master('1920x800')}], {preferCatalogue: true});
    const [item] = await h.run('424242', 'movie');
    assert.ok(item, 'The published LuluStream alias must be eligible before following its redirect');
    assert.equal(item.name, 'Catalogue / LuluStream | 1080p | VF');
    assert.equal(item.url, media); assert.equal(item.headers.Referer, 'https://luluvdo.com/e/fixture');
    assert.equal(item.subtitles, undefined); assert.equal(h.calls.length, 5);
    assert.equal(h.calls.filter(c => c.url.includes('/e/fixture')).length, 1);
});
test('missing Vidzy players recover through supported Lulu catalogue media', async () => {
    const h = load('nakios', [
        {path: '/movie/424242/', status: 404}, ...catalogueRoutes(),
        {path: '/e/fixture', body: luluPlayer()}, {path: media, body: master('1920x800')},
    ]);
    assert.equal((await h.run('424242', 'movie'))[0].quality, '1080p'); assert.equal(h.calls.length, 7);
});
test('unconfigured Lulu-like hosts are not fetched', async () => {
    const h = load('nakios', catalogueRoutes('https://untrusted.example/e/fixture'), {preferCatalogue: true});
    assert.equal((await h.run('424242', 'movie')).length, 0); assert.equal(h.calls.length, 3);
});
for (const [resolution, expected] of [['864x360', '480p'], ['1920x800', '1080p'], ['1280x536', '720p'], ['3840x1600', '2160p'], ['640x480', '480p']]) {
    test(`playlist resolution ${resolution} corrects stale quality hints to ${expected}`, async () => {
        const h = load('movix', [{path: '/api/purstream/', body: {sources: [{url: media, name: '720p MULTI'}]}}, {path: media, body: master(resolution)}, {path:'/api/cpasmal/',body:{links:{}}}]);
        const items = await h.run('424242', 'movie');
        if (Number(expected.slice(0, -1)) < 720) {
            assert.equal(items.length, 0);
            assert.ok(h.logs.some(line => line.includes('resolution-filter') && line.includes(expected)));
        } else {
            assert.equal(items[0].quality, expected); assert.ok(items[0].name.includes(' | ' + expected + ' | '));
            assert.equal(items[0].url, media);
        }
        assert.equal(h.calls.length, Number(expected.slice(0,-1)) < 720 ? 3 : 2);
        assert.equal(h.calls.filter(call => call.url === media).length, 1, 'reuse metadata when deciding fallback');
    });
}
test('highest available video rendition wins; iframe metadata is excluded and master audio is preserved', async () => {
    const h = load('movix', [
        {path: '/api/purstream/', body: {sources: [{url: media, name: '720p VF'}]}},
        {path: media, body: master('864x360') + '\n#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x800\nfull.m3u8\n#EXT-X-I-FRAME-STREAM-INF:RESOLUTION=3840x1600,URI="iframe.m3u8"'},
    ]);
    const [item] = await h.run('424242', 'movie');
    assert.equal(item.quality, '1080p'); assert.equal(item.url, media); assert.equal(h.calls.length, 2);
});
test('low-resolution Vidzy results trigger catalogue recovery after one metadata read per master', async () => {
    const h = load('nakios', [
        {path: '/movie/424242/', body: '<iframe id="pf" src="https://vidzy.cc/embed-fixture.html"></iframe>'},
        {path: '/embed-fixture.html', body: `metaTitle:"Opaque.1080p.mp4";file:"${media}";`},
        {path: media, body: master('864x360')},
        {path:'/3/movie/424242',body:{title:'Fixture',release_date:'2021-01-01'}},
        {path:'/search/Fixture',body:'<div class="search-component"></div>'},
    ]);
    const items = await h.run('424242', 'movie');
    assert.equal(items.length, 0); assert.equal(h.calls.length, 6);
    assert.ok(h.logs.some(line => line.includes('resolution-filter') && line.includes('480p')));
    assert.ok(h.calls.some(c => /\/search\//.test(c.url)));
    assert.equal(h.calls.filter(c => c.url === media).length,1);
});
test('caption-upload placeholders are excluded without excluding a real file named empty.srt', async () => {
    const h = load('movix', [{path: '/api/purstream/', body: {sources: [{url: media, subtitles: [
        {url: 'https://lulustream.com/srt/empty.srt', label: 'Upload captions', kind: 'captions'},
        {url: 'https://subs.example/srt/empty.srt', label: 'Français', lang: 'fr'},
    ]}]}}, {path: media, body: master('1920x800')}]);
    const [item] = await h.run('424242', 'movie');
    assert.equal(item.subtitles.length, 1); assert.equal(item.subtitles[0].name, 'Français');
});
