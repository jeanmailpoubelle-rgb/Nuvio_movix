const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dead = 'https://media.example/deleted/master.m3u8';
const good = 'https://media.example/available/master.m3u8';
function load(name, routes) {
    const calls = [], logs = [];
    const context = vm.createContext({
        module: {exports: {}}, console: {warn: value => logs.push(value)},
        setTimeout() { throw new Error('Provider scheduled a native sleep'); },
        fetch: async url => {
            calls.push(url);
            const route = routes.find(route => url.includes(route.path));
            if (!route) throw new Error('Unexpected request');
            return {status: route.status || 200, ok: !route.status || route.status < 400, url,
                text: async () => typeof route.body === 'string' ? route.body : JSON.stringify(route.body)};
        },
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../providers', name + '.js'), 'utf8'), context);
    return {run: (...args) => context.module.exports.getStreams(...args), calls, logs};
}
test('Dark Knight underscore release tokens preserve MULTI and quality without inventing subtitles', async () => {
    const h = load('nakios', [
        {path: '/movie/155/', body: '<iframe id="pf" src="https://vidzy.cc/embed-darkknight.html"></iframe><script>var CFG={"version":"vf"}</script>'},
        {path: '/embed-darkknight.html', body: `metaTitle: "The_Dark_Knight_2008_Multi_1080p_BDRip_x265_AC3-fixture.mkv.mp4";file:"${good}";`},
        {path: good, body: '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="fr"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en"\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,AUDIO="audio"\nvideo.m3u8'},
    ]);
    const result = await h.run('155', 'movie');
    assert.equal(result.length, 1); assert.equal(h.calls.length, 4);
    assert.equal(result[0].language, 'MULTI'); assert.equal(result[0].quality, '1080p');
    assert.equal(result[0].subtitles, undefined, 'MULTI audio does not imply subtitle availability');
});
for (const status of [404, 410]) {
    test(`confirmed missing master HTTP ${status} triggers a working backup`, async () => {
        const h = load('movix', [
            {path: '/api/purstream/', body: {sources: [{url: dead, name: '1080p MULTI'}]}},
            {path: dead, status},
            {path: '/api/cpasmal/movie/155', body: {links: {vf: [{url: good}]}}},
            {path: good, body: '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000\nvideo.m3u8'},
        ]);
        const result = await h.run('155', 'movie');
        assert.equal(result.length, 1); assert.equal(result[0].url, good);
        assert.equal(h.calls.length, 4);
        assert.ok(h.logs.some(line => line.includes('missing-playlist')));
    });
}
test('deleted Dark Knight primary plus an empty backup returns no dead player entry', async () => {
    const h = load('movix', [
        {path: '/api/purstream/', body: {sources: [{url: dead, name: '1080p MULTI'}]}},
        {path: dead, status: 404},
        {path: '/api/cpasmal/', body: {links: {vf: [], vostfr: []}}},
    ]);
    assert.equal((await h.run('155', 'movie')).length, 0); assert.equal(h.calls.length, 3);
});
test('one deleted primary does not discard a working primary or start backup work', async () => {
    const h = load('movix', [
        {path: '/api/purstream/', body: {sources: [{url: dead}, {url: good}]}},
        {path: dead, status: 404},
        {path: good, body: '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000\nvideo.m3u8'},
    ]);
    const result = await h.run('155', 'movie');
    assert.equal(result.length, 1); assert.equal(result[0].url, good); assert.equal(h.calls.length, 3);
    assert.ok(!h.calls.some(url => url.includes('/api/cpasmal/')));
});
