const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const media = 'https://media.example/opaque/master.m3u8?token=fixture';
function load(provider, routes, settings = {}) {
    const calls = [], logs = [];
    const context = vm.createContext({
        module: {exports: {}}, SCRAPER_SETTINGS: settings, TMDB_API_KEY: 'fixture',
        console: {warn: value => logs.push(value)},
        setTimeout() { throw new Error('Provider must not schedule native sleeps'); },
        fetch: async (url, options) => {
            calls.push({url, options});
            const route = routes.find(route => url.includes(route.path) && (!route.referer || route.referer === options.headers.Referer));
            if (!route) throw new Error('Unexpected request');
            return {status: route.status || 200, ok: !route.status || route.status < 400, url: route.finalUrl || url,
                text: async () => typeof route.body === 'string' ? route.body : JSON.stringify(route.body)};
        },
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../providers', provider + '.js'), 'utf8'), context);
    return {calls, logs, run: (...args) => context.module.exports.getStreams(...args)};
}
function master(languages, extra = '') {
    return '#EXTM3U\n' + languages.map((language, i) =>
        `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Track ${i}",LANGUAGE="${language}",URI="${i}/audio.m3u8"`).join('\n') +
        '\n' + extra + '\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,AUDIO="audio"\nvideo.m3u8';
}
function vidzyRoutes(html = '') {
    return [
        {path: '/movie/424242/', body: '<iframe id="pf" src="https://vidzy.cc/embed-opaque.html"></iframe><script>var CFG={"version":"vf"}</script>'},
        {path: '/embed-opaque.html', body: `metaTitle: "6qgg2uyibz7y_n.mp4";file:"${media}";${html}`},
    ];
}
test('opaque Vidzy filenames use actual French/Japanese audio, independently of title ID or VF bucket', async () => {
    const h = load('nakios', [...vidzyRoutes(), {path: media, body: master(['fr', 'ja'])}]);
    const [result] = await h.run('424242', 'movie');
    assert.equal(result.language, 'MULTI'); assert.match(result.name, /MULTI$/);
    assert.equal(result.subtitles, undefined, 'multiple audio languages do not imply captions');
    assert.equal(result.url, media, 'preserve all native audio tracks');
    assert.equal(h.calls.length, 4, 'two wrapper requests, one shared embed and one shared master');
    assert.equal(h.calls[3].options.headers.Referer, 'https://vidzy.cc/embed-opaque.html');
    assert.ok(h.logs.some(line => line.includes('"audio":["fr","ja"]')));
    assert.ok(h.logs.some(line => line.includes('"evidence":"hls"')));
});
test('existing HTML captions are preserved while playlist audio and further captions are inspected', async () => {
    const h = load('nakios', [...vidzyRoutes('<track kind="subtitles" src="https://subs.example/fr.vtt" srclang="fr" label="Français">'),
        {path: media, body: master(['fre', 'jpn'], '#EXT-X-MEDIA:TYPE=SUBTITLES,LANGUAGE="eng",NAME="English",URI="en.vtt"')}]);
    const [result] = await h.run('424242', 'movie');
    assert.equal(result.language, 'MULTI'); assert.equal(h.calls.length, 4);
    assert.deepEqual(Array.from(result.subtitles, item => [item.language, item.name]), [['fr', 'Français'], ['en', 'English']]);
    assert.ok(!h.calls.some(call => /\.(?:vtt|ts)(?:\?|$)/.test(call.url)), 'discovery fetches metadata only');
});
test('API captions no longer bypass audio inspection; repeated inspections reuse only request-local metadata', async () => {
    const h = load('movix', [
        {path: '/api/purstream/', body: {sources: [{url: media, name: 'VF', subtitles: [{url: 'https://subs.example/fr.vtt', lang: 'fr', name: 'Français'}]}]}},
        {path: media, body: master(['ja', 'fr'])},
    ]);
    for (let i = 0; i < 2; i++) {
        const [result] = await h.run('424242', 'movie');
        assert.equal(result.language, 'MULTI'); assert.equal(result.subtitles[0].name, 'Français');
        assert.equal(h.calls.length, (i + 1) * 2, 'one fresh master per lookup, not per inspection stage');
    }
});
test('all returned HLS sources are inspected, including a third source', async () => {
    const h = load('movix', [
        {path: '/api/purstream/', body: {sources: [1, 2, 3].map(i => ({url: `https://media.example/${i}/master.m3u8`, name: 'VF'}))}},
        ...[1, 2, 3].map(i => ({path: `/${i}/master.m3u8`, body: master(i === 3 ? ['fr', 'ja'] : ['fr'])})),
    ]);
    assert.deepEqual(Array.from(await h.run('424242', 'movie'), item => item.language), ['MULTI', 'VF', 'VF']);
    assert.equal(h.calls.length, 4);
});
test('same media URL with different playback headers keeps separate metadata requests', async () => {
    const h = load('movix', [
        {path: '/api/purstream/', body: {sources: ['a', 'b'].map(name => ({url: media, headers: {Referer: `https://${name}.example/`}, name: 'VF'}))}},
        {path: media, referer: 'https://a.example/', body: master(['fr'])},
        {path: media, referer: 'https://b.example/', body: master(['fr', 'ja'])},
    ]);
    assert.deepEqual(Array.from(await h.run('424242', 'movie'), item => item.language), ['MULTI', 'VF']);
    assert.equal(h.calls.length, 3);
});
test('duplicate codec groups, regional aliases and unused audio groups cannot create false MULTI', async () => {
    const body = master(['fr-FR', 'fra', 'fre']) + '\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="unused",NAME="English",LANGUAGE="en",URI="unused.m3u8"';
    const h = load('movix', [{path: '/api/purstream/', body: {sources: [{url: media, name: 'MULTI'}]}}, {path: media, body}]);
    const [result] = await h.run('424242', 'movie');
    assert.equal(result.language, 'VF'); assert.match(result.name, /VF$/);
});
test('one confirmed foreign audio track corrects a VF hint without inventing subtitles', async () => {
    const h = load('nakios', [...vidzyRoutes(), {path: media, body: master(['ja'])}]);
    const [result] = await h.run('424242', 'movie');
    assert.equal(result.language, 'VO'); assert.equal(result.subtitles, undefined);
});
for (const languages of [[], ['und', 'und'], ['fr', 'und']]) {
    test(`inconclusive audio languages ${JSON.stringify(languages)} retain the upstream hint`, async () => {
        const h = load('nakios', [...vidzyRoutes(), {path: media, body: master(languages)}]);
        assert.equal((await h.run('424242', 'movie'))[0].language, 'VF');
        assert.ok(h.logs.some(line => line.includes('hls-tracks')));
    });
}
test('the catalogue recovery path also inspects opaque direct media', async () => {
    const h = load('nakios', [
        {path: '/3/movie/424242', body: {title: 'Fixture', release_date: '2001-01-01'}},
        {path: '/search/Fixture', body: '<a href="https://nakios.live/movie/fixture"><img alt="Fixture"></a><span>2001</span><h3>Fixture</h3>'},
        {path: '/movie/fixture', body: `const videos = [{"link":"${media}","version":"VF"}];`},
        {path: media, body: master(['fr', 'ja'])},
    ], {preferCatalogue: true});
    assert.equal((await h.run('424242', 'movie'))[0].language, 'MULTI'); assert.equal(h.calls.length, 4);
});
test('backup players also inspect tracks after an empty primary', async () => {
    const h = load('movix', [
        {path: '/api/purstream/', body: {sources: []}},
        {path: '/api/cpasmal/', body: {links: {vf: [{url: media}]}}},
        {path: media, body: master(['fr', 'ja'])},
    ]);
    assert.equal((await h.run('424242', 'movie'))[0].language, 'MULTI'); assert.equal(h.calls.length, 3);
});
test('inspection opt-out explicitly retains upstream hints with no master request', async () => {
    const h = load('nakios', vidzyRoutes(), {inspectHls: false});
    assert.equal((await h.run('424242', 'movie'))[0].language, 'VF'); assert.equal(h.calls.length, 3);
});
