const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');

function load(name, routes) {
    const calls = [], logs = [];
    const context = vm.createContext({
        module: { exports: {} }, TMDB_API_KEY: 'fixture',
        console: { warn: value => logs.push(value) },
        AbortController: class { constructor() { this.signal = {}; } abort() {} },
        // Nuvio Mobile exposes coroutine-backed timers. A cleared callback does
        // not cancel its underlying native sleep: never schedule one in a provider.
        setTimeout() { throw new Error('Provider scheduled a native timer'); },
        clearTimeout() { throw new Error('Provider scheduled a native timer'); },
        fetch: async (url, options) => {
            calls.push(url);
            assert.equal(options.signal, undefined, 'Nuvio fetch ignores AbortSignal');
            const route = routes.find(route => route.path === url || (route.match && route.match(url)));
            assert.ok(route, `Unexpected URL ${url}`);
            return { status: route.status ?? 200, ok: (route.status ?? 200) < 400, url: route.finalUrl || url,
                text: async () => typeof route.body === 'string' ? route.body : JSON.stringify(route.body) };
        },
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'providers', name + '.js'), 'utf8'), context);
    return { run: (...args) => context.module.exports.getStreams(...args), calls, logs };
}
function wrapper(embed, language) {
    return `<title>Reacher S4E1</title><iframe id="pf" src="https://vidzy.cc/embed-${embed}.html"></iframe><script>var CFG={"version":"${language}"}</script>`;
}
function routesForLanguages(vostStatus = 200, sameEmbed = false) {
    return [
        { path: 'https://vidzy.org/serie/108978/4/1/vf', body: wrapper('vffixture', 'vf') },
        { path: 'https://vidzy.org/serie/108978/4/1/vostfr', status: vostStatus, body: wrapper(sameEmbed ? 'vffixture' : 'vofixture', sameEmbed ? 'vf' : 'vostfr') },
        { path: 'https://vidzy.cc/embed-vffixture.html', body: 'metaTitle: "Reacher.2026.1080p.VF.mp4";sources:[{src:"https://media.example/reacher/vf/master.m3u8"}]' },
        { path: 'https://vidzy.cc/embed-vofixture.html', body: 'metaTitle: "Reacher.2026.1080p.VOSTFR.mp4";sources:[{src:"https://media.example/reacher/vostfr/master.m3u8"}]' },
        { match: url => url.startsWith('https://media.example/reacher/'), body: '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000\nvideo.m3u8' },
    ];
}

test('Reacher S4E1 returns separate VF and VOSTFR sources, with no timer sleeps', async () => {
    const h = load('nakios', routesForLanguages());
    const streams = await h.run('108978', 'tv', 4, 1);
    assert.equal(streams.length, 2);
    assert.deepEqual(Array.from(streams, stream => stream.language), ['VF', 'VOSTFR']);
    assert.equal(h.calls.length, 6);
    assert.ok(h.calls.every(url => !url.includes('nakios.live') && !url.includes('themoviedb')));
});

test('a missing VOSTFR route preserves VF and does not start a slow catalogue search', async () => {
    const h = load('nakios', routesForLanguages(404));
    const streams = await h.run('108978', 'series', 4, 1);
    assert.equal(streams.length, 1); assert.equal(streams[0].language, 'VF');
    assert.equal(h.calls.length, 4);
});

test('when a language URL falls back to VF, the embed is fetched once and no fake VOSTFR is emitted', async () => {
    const h = load('nakios', routesForLanguages(200, true));
    const streams = await h.run('108978', 'tv', 4, 1);
    assert.equal(streams.length, 1); assert.equal(streams[0].language, 'VF');
    assert.equal(h.calls.length, 4);
});

function packedPlayer(url) {
    const payload = `0("vplayer").1({2:[{3:"${url}"}]});`;
    return `eval(function(p,a,c,k,e,d){}('${payload}',4,4,'jwplayer|setup|sources|file'.split('|')))`;
}

test('Movix recovers both Reacher backup languages and skips known unsupported players', async () => {
    const links = lang => [
        { server: 'voe', url: `https://unsupported.example/e/voe-${lang}` },
        { server: 'uqload', url: `https://uqload.vc/embed-${lang}.html` },
        { server: 'filemoon', url: `https://unsupported.example/e/filemoon-${lang}` },
    ];
    const h = load('movix', [
        { path: 'https://api.movix.cash/api/purstream/tv/108978/stream?season=4&episode=1', status: 404, body: { error: 'Episode not found' } },
        { path: 'https://api.movix.cash/api/cpasmal/tv/108978/4/1', body: { links: { vf: links('vf'), vostfr: links('vostfr') } } },
        { path: 'https://uqload.vc/embed-vf.html', body: packedPlayer('https://cdn.example/reacher/vf/master.m3u8') },
        { path: 'https://uqload.vc/embed-vostfr.html', body: packedPlayer('https://cdn.example/reacher/vostfr/master.m3u8') },
        { match: url => url.startsWith('https://cdn.example/reacher/'), body: '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000\nvideo.m3u8' },
    ]);
    const streams = await h.run('108978', 'tv', 4, 1);
    assert.equal(streams.length, 2);
    assert.deepEqual(Array.from(streams, stream => stream.language), ['VF', 'VOSTFR']);
    assert.equal(h.calls.length, 6);
    assert.ok(h.calls.every(url => !url.includes('unsupported.example')));
});

test('retired Purstream ID returns no streams or network work even when called directly', async () => {
    const h = load('purstream', []);
    assert.equal((await h.run('108978', 'tv', 4, 1)).length, 0);
    assert.equal(h.calls.length, 0);
    assert.ok(h.logs.some(message => message.includes('Retired')));
});
