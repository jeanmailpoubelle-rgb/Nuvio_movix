const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const media = 'https://media.example/office/master.m3u8?token=fixture';
function load(name, routes, settings = {}) {
    const calls = [], logs = [];
    const context = vm.createContext({
        module: {exports: {}}, SCRAPER_SETTINGS: settings,
        console: {warn: value => logs.push(value)},
        setTimeout() { throw new Error('Provider must not create native sleeps'); },
        fetch: async (url, options) => {
            calls.push({url, options});
            const route = routes.find(route => url.includes(route.path));
            if (!route) throw new Error('Unexpected request');
            return {ok: !route.status || route.status < 400, status: route.status || 200, url: route.finalUrl || url,
                text: async () => typeof route.body === 'string' ? route.body : JSON.stringify(route.body)};
        },
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../providers', name + '.js'), 'utf8'), context);
    return {run: (...args) => context.module.exports.getStreams(...args), calls, logs};
}
function wrappedTrack(language, label) {
    // Structure observed in Vidzy's Office player; no live URLs or tokens.
    return `{kind: 'subtitles', srclang: '${language}', label: '${label}', src: (function(u){try{var i=u.indexOf('://');if(i<0)return u;var j=u.indexOf('/',i+3);if(j<0)return u;return location.protocol+'//'+location.host+u.slice(j);}catch(e){return u;}})('https://vidzy.org/srtproxy/fixture_${language}.vtt?dx=1&srv=u14&disk=08')}`;
}
test('Office VF bucket exposes its MULTI audio and both wrapped Vidzy subtitle files', async () => {
    const h = load('nakios', [
        {path: '/serie/2316/1/1/', body: '<iframe id="pf" src="https://vidzy.org/embed-office.html"></iframe><script>var CFG={"version":"vf"}</script>'},
        {path: '/embed-office.html', finalUrl: 'https://vidzy.cc/embed-office.html', body: `metaTitle: "The.Office.S01E01.MULTI.1080p.mkv";file:"${media}";player.loadTracks([${wrappedTrack('eng','English')},${wrappedTrack('fre','French')}]);`},
        {path: media, body: '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="fr"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en"\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,AUDIO="audio"\nvideo.m3u8'},
    ]);
    const result = await h.run('2316', 'tv', 1, 1);
    assert.equal(h.calls.length, 4); assert.equal(result.length, 1);
    assert.equal(result[0].language, 'MULTI'); assert.match(result[0].name, /MULTI$/);
    assert.deepEqual(Array.from(result[0].subtitles, track => track.language), ['en', 'fr']);
    assert.equal(result[0].subtitles[0].url, 'https://vidzy.cc/srtproxy/fixture_eng.vtt?dx=1&srv=u14&disk=08');
    assert.equal(result[0].subtitles[0].headers.Referer, 'https://vidzy.cc/embed-office.html');
});
const master = '#EXTM3U\n' +
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Français",LANGUAGE="fr",URI="fr/audio.m3u8"\n' +
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",URI="en/audio.m3u8"\n' +
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="French, full",LANGUAGE="fre",URI="../subs/fr.vtt?one=1&two=2"\n' +
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",LANGUAGE="eng",URI="//subs.example/en.vtt"\n' +
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="French HLS",LANGUAGE="fr",URI="subs/fr.m3u8"\n' +
    '#EXT-X-STREAM-INF:BANDWIDTH=3000000,AUDIO="audio",SUBTITLES="subs"\nvideo.m3u8';
test('API exposes raw HLS caption files explicitly, retaining audio master and source headers', async () => {
    const h = load('movix', [
        {path: '/api/purstream/', body: {sources: [{url: media, name: '1080p VF', headers: {referer: 'https://play.example/', Authorization: 'fixture-only'}}]}},
        {path: media, body: master, finalUrl: 'https://cdn.example/title/master.m3u8'},
    ]);
    const result = await h.run('2316', 'tv', 1, 1);
    assert.equal(result.length, 1); assert.equal(h.calls.length, 2);
    assert.equal(result[0].url, media, 'do not flatten the master to French-only audio');
    assert.equal(result[0].language, 'MULTI'); assert.match(result[0].name, /MULTI$/);
    assert.deepEqual(Array.from(result[0].subtitles, track => track.language), ['fr', 'en']);
    assert.equal(result[0].subtitles[0].url, 'https://cdn.example/subs/fr.vtt?one=1&two=2');
    assert.equal(result[0].subtitles[0].name, 'French, full');
    assert.equal(h.calls[1].options.headers.referer, 'https://play.example/');
    assert.equal(result[0].subtitles[0].headers.Authorization, 'fixture-only');
    assert.ok(!h.calls.some(call => /\/subs\//.test(call.url)), 'lookup must not download subtitles or segments');
});
for (const route of [{status: 503, body: ''}]) {
    test('playlist inspection failure preserves the playable source without backend fallback', async () => {
        const h = load('movix', [{path: '/api/purstream/', body: {sources: [{url: media}]}}, {path: media, ...route}]);
        const result = await h.run('2316', 'tv', 1, 1);
        assert.equal(result.length, 1); assert.equal(result[0].url, media); assert.equal(h.calls.length, 2);
    });
}
test('opt-out keeps the one-request API path with or without explicit subtitles', async () => {
    for (const subtitles of [[], [{url: 'https://subs.example/fr.vtt', language: 'fr'}]]) {
        const h = load('movix', [{path: '/api/purstream/', body: {sources: [{url: media, subtitles}]}}], {inspectHls: false});
        assert.equal(((await h.run('2316', 'tv', 1, 1))[0].subtitles || []).length, subtitles.length);
        assert.equal(h.calls.length, 1);
    }
});
