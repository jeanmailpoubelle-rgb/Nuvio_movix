const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../providers/movix.js'), 'utf8');
const media = 'https://cdn.example/movie/master.m3u8';

function load(routes, settings, globalExport = false) {
    const calls = [], logs = [];
    const context = vm.createContext({
        ...(globalExport ? {} : { module: { exports: {} } }),
        SCRAPER_SETTINGS: settings,
        console: { warn: message => logs.push(message) },
        fetch: async (url, options) => {
            calls.push({ url, options });
            const route = routes.find(r => url.includes(r.path));
            assert.ok(route, `Unexpected request: ${url}`);
            if (route.error) throw new Error(route.error);
            return {
                status: route.status ?? 200, ok: (route.status ?? 200) >= 200 && (route.status ?? 200) < 300,
                text: async () => typeof route.body === 'string' ? route.body : JSON.stringify(route.body),
                // Mirrors TV 1.0.0: json() returns null for a malformed body.
                json: async () => { try { return JSON.parse(route.body); } catch (_) { return null; } },
            };
        },
    });
    vm.runInContext(`(function(){${code}\n})();`, context, { timeout: 1000 });
    return {
        run: (...args) => (globalExport ? context.getStreams : context.module.exports.getStreams)(...args),
        calls, logs,
    };
}

function direct(source = {}) {
    return [{ path: '/api/purstream/', body: { sources: [{ url: media, name: 'pulse | 1440p | MULTI', ...source }] } }];
}

test('Matrix needs one API request and no metadata/domain/CDN request', async () => {
    const h = load(direct());
    const streams = await h.run('603', 'movie', null, null);
    assert.equal(streams.length, 1);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].url, 'https://api.movix.cash/api/purstream/movie/603/stream');
    assert.equal(streams[0].quality, '1440p');
    assert.equal(streams[0].language, 'MULTI');
    assert.equal(streams[0].format, 'm3u8');
    assert.equal(h.calls[0].options.headers.Referer, 'https://movix.cash/');
    assert.equal(streams[0].headers.Referer, 'https://purstream.club/');
    assert.equal(streams[0].headers['User-Agent'], h.calls[0].options.headers['User-Agent']);
});

for (const type of ['tv', 'series', 'show']) {
    test(`${type} passes the requested season and episode, including season zero`, async () => {
        const h = load(direct());
        await h.run(1399, type, 0, 2);
        assert.equal(h.calls[0].url, 'https://api.movix.cash/api/purstream/tv/1399/stream?season=0&episode=2');
    });
}

for (const failure of [
    { body: { sources: [] } },
    { body: { sources: [{ url: 'https://cdn.example/watch.html' }] } },
    { body: {} },
    { body: null },
    { body: '<html>Cloudflare</html>' },
    { status: 403, body: 'Blocked' },
    { status: 0, body: '' },
    { error: 'Network unavailable' },
]) {
    test(`backup is used for ${JSON.stringify(failure)}`, async () => {
        const h = load([
            { path: '/api/purstream/', ...failure },
            { path: '/api/cpasmal/', body: { links: { vf: [{ url: media }], vostfr: [] } } },
        ]);
        const streams = await h.run('603', 'movie');
        assert.equal(streams.length, 1);
        assert.equal(streams[0].language, 'VF');
        assert.equal(h.calls.length, 2);
        assert.ok(h.logs.some(message => /trying backup|HTTP|JSON|sources|Network/.test(message)));
    });
}

test('backup series path and static relative embed URL preserve the episode and referer', async () => {
    const h = load([
        { path: '/api/purstream/', body: { sources: [] } },
        { path: '/api/cpasmal/tv/1399/2/3', body: { links: { vostfr: [{ url: 'https://embed.example/player/123', server: 'Example' }] } } },
        { path: 'https://embed.example/player/123', body: 'player({file:"../video.mp4?one=1&amp;two=2"})' },
    ]);
    const streams = await h.run('1399', 'series', 2, 3);
    assert.equal(streams.length, 1);
    assert.equal(streams[0].language, 'VOSTFR');
    assert.equal(streams[0].format, 'mp4');
    assert.equal(streams[0].headers.Referer, 'https://embed.example/player/123');
    assert.equal(streams[0].url, 'https://embed.example/video.mp4?one=1&two=2');
});

test('one failed embed does not discard a working backup; extra embeds are bounded', async () => {
    const h = load([
        { path: '/api/purstream/', body: { sources: [] } },
        { path: '/api/cpasmal/', body: { links: { vf: [
            { url: 'https://embed.example/broken' },
            { url: 'https://embed.example/static' },
            { url: 'https://embed.example/unsupported' },
            { url: 'https://embed.example/never-requested' },
        ] } } },
        { path: '/broken', status: 403, body: '' },
        { path: '/static', body: 'file: "https:\\/\\/cdn.example\\/master.m3u8?token=x"' },
        { path: '/unsupported', body: '<script src="requires-browser.js"></script>' },
    ]);
    const streams = await h.run('603', 'movie');
    assert.equal(streams.length, 1);
    assert.equal(streams[0].url, 'https://cdn.example/master.m3u8?token=x');
    assert.equal(h.calls.length, 5);
});

test('preserves provider headers, removes exact duplicates and rejects invalid media', async () => {
    const source = { url: '//cdn.example/master.m3u8', headers: { referer: 'https://player.example/', Authorization: 'test-fixture' } };
    const h = load([{ path: '/api/purstream/', body: { sources: [
        source, source, { url: 'javascript:bad.mp4' }, { url: 'file:///tmp/a.mp4' }, {},
    ] } }]);
    const streams = await h.run('603', 'movie');
    assert.equal(streams.length, 1);
    assert.equal(streams[0].url, 'https://cdn.example/master.m3u8');
    assert.equal(streams[0].headers.referer, 'https://player.example/');
    assert.equal(streams[0].headers.Referer, undefined);
    assert.equal(streams[0].headers.Authorization, 'test-fixture');
});

test('supports global export and optional domain overrides', async () => {
    const h = load(direct({ url: '/video.mp4', name: 'VF | 4K' }), {
        apiBase: 'https://api.example/', siteBase: 'https://site.example',
    }, true);
    const streams = await h.run('603', 'movie');
    assert.equal(h.calls[0].url, 'https://api.example/api/purstream/movie/603/stream');
    assert.equal(streams[0].url, 'https://site.example/video.mp4');
    assert.equal(streams[0].quality, '2160p');
});

test('invalid input and incomplete episodes return diagnostics without network requests', async () => {
    for (const args of [['tt0133093', 'movie'], ['603', 'unknown'], ['1399', 'tv'], ['1399', 'tv', -1, 1], ['1399', 'tv', 1, 0]]) {
        const h = load([]);
        assert.equal((await h.run(...args)).length, 0);
        assert.equal(h.calls.length, 0);
        assert.ok(h.logs.length > 0);
    }
});

test('total outage returns zero with a specific status in logs', async () => {
    const h = load([
        { path: '/api/purstream/', status: 403, body: '' },
        { path: '/api/cpasmal/', status: 503, body: '' },
    ]);
    assert.equal((await h.run('603', 'movie')).length, 0);
    assert.ok(h.logs.some(message => message.includes('Purstream: HTTP 403')));
    assert.ok(h.logs.some(message => message.includes('Cpasmal: HTTP 503')));
});

test('manifest uses a separate scraper id and points to the tested code', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json')));
    assert.equal(manifest.scrapers.length, 3);
    assert.equal(manifest.scrapers[0].id, 'movix-tv');
    assert.equal(manifest.scrapers[0].version, manifest.version);
    assert.equal(fs.readFileSync(path.join(__dirname, '..', manifest.scrapers[0].filename), 'utf8'), code);
});
