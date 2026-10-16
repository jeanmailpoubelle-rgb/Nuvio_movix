const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const media = 'https://media.example/master.m3u8?token=fixture';

function load(name, routes, settings = {}, globals = {}) {
    const calls = [], logs = [];
    const context = vm.createContext({
        module: { exports: {} }, SCRAPER_SETTINGS: settings, TMDB_API_KEY: 'test-key', ...globals,
        console: { warn: value => logs.push(value) },
        fetch: async (url, options) => {
            calls.push({ url, options });
            const route = routes.find(route => typeof route.path === 'function' ? route.path(url) : url.includes(route.path));
            if (!route) throw new Error(`Unexpected request: ${url}`);
            if (route.error) throw new Error(route.error);
            return { status: route.status ?? 200, ok: (route.status ?? 200) >= 200 && (route.status ?? 200) < 300,
                url: route.finalUrl || url,
                text: async () => typeof route.body === 'string' ? route.body : JSON.stringify(route.body) };
        },
    });
    const code = name === 'purstream' ?
        'var PROVIDER_ID="purstream-engine-test",PROVIDER_NAME="Purstream",VERSION="test";var ENDPOINTS=' + fs.readFileSync(path.join(root, 'config/endpoints.json'), 'utf8') + ';\n' +
        ['common.js', 'extractors.js', 'purstream-api.js'].map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8')).join('\n') +
        '\nmodule.exports.getStreams=function(id,type,season,episode){return run(id,type,season,episode,directPurstream);};' :
        fs.readFileSync(path.join(root, 'providers', name + '.js'), 'utf8');
    vm.runInContext(`(function(){${code}\n})();`, context, { timeout: 1000 });
    return { calls, logs, run: (...args) => context.module.exports.getStreams(...args) };
}
const meta = { title: 'Matrix', original_title: 'The Matrix', release_date: '1999-03-31', poster_path: '/matrix.jpg' };
function search(items) { return { data: { items: { movies: { items } } } }; }
function sheet(id = 603, type = 'movie') { return { data: { items: { id: 2633, tmdbId: id, type, urls: [{ url: media, name: 'pulse | 1440p | MULTI' }] } } }; }
const matrix = { id: 2633, title: 'Matrix', type: 'movie', release_date: '1999-03-31' };

test('Purstream uses one metadata request, strict title search and TMDB verification (3 requests)', async () => {
    const h = load('purstream', [
        { path: '/3/movie/603?', body: meta },
        { path: '/search-bar/search/Matrix', body: search([{ ...matrix, id: 9, release_date: '2021-01-01' }, matrix]) },
        { path: '/media/2633/sheet', body: sheet() },
    ]);
    const result = await h.run('603', 'movie');
    assert.equal(result.length, 1); assert.equal(h.calls.length, 3);
    assert.equal(result[0].quality, '1440p');
    assert.ok(h.calls.every(call => !/domains.json|language=en-US/.test(call.url)));
    await h.run('603', 'movie');
    assert.equal(h.calls.length, 4, 'only a verified catalogue ID is cached, never the signed stream URL');
});

test('Purstream validates series identity before requesting the explicit episode', async () => {
    const h = load('purstream', [
        { path: '/3/tv/1399?', body: { name: 'Game of Thrones', original_name: 'Game of Thrones', first_air_date: '2011-04-17' } },
        { path: '/search-bar/search/', body: search([{ id: 3450, title: 'Game of Thrones', type: 'tv', release_date: '2011-04-17' }]) },
        { path: '/media/3450/sheet', body: sheet(1399, 'tv') },
        { path: '/stream/3450/episode?season=0&episode=2', body: { data: { items: { sources: [{ stream_url: media, source_name: '1080p VF', format: 'm3u8' }] } } } },
    ]);
    const result = await h.run('1399', 'series', 0, 2);
    assert.equal(result.length, 1); assert.equal(h.calls.length, 4);
    assert.equal(result[0].language, 'VF');
});

test('direct Purstream recovery never substitutes sheet URLs for a missing Reacher episode', async () => {
    const h = load('purstream', [
        { path: '/3/tv/108978?', body: { name: 'Reacher', first_air_date: '2022-02-03' } },
        { path: '/search-bar/search/Reacher', body: search([{ id: 3864, type: 'tv', title: 'Reacher', release_date: '2022-02-03' }]) },
        { path: '/media/3864/sheet', body: { data: { items: { tmdbId: 108978, type: 'tv', urls: [{ url: 'https://media.example/S03/E01/master.m3u8' }] } } } },
        { path: '/stream/3864/episode?season=4&episode=1', status: 404, body: { type: 'error', message: 'Aucune source valide disponible.' } },
    ]);
    assert.equal((await h.run('108978', 'tv', 4, 1)).length, 0);
    assert.equal(h.calls.length, 4);
    assert.ok(h.logs.some(message => message.includes('Purstream episode: HTTP 404')));
});

for (const items of [
    [{ ...matrix, release_date: '2021-01-01' }],
    [{ ...matrix, title: 'Matrix Revolutions' }],
    [{ ...matrix, type: 'tv' }],
    [matrix, { ...matrix, id: 2 }],
]) {
    test(`Purstream refuses wrong/ambiguous matches: ${JSON.stringify(items)}`, async () => {
        const h = load('purstream', [{ path: '/3/', body: meta }, { path: '/search-bar/search/', body: search(items) }]);
        assert.equal((await h.run('603', 'movie')).length, 0);
        assert.ok(h.calls.every(call => !call.url.includes('/media/')));
    });
}

test('Purstream tries original title if the French title has no match', async () => {
    const h = load('purstream', [
        { path: '/3/', body: meta },
        { path: '/search-bar/search/Matrix', body: search([]) },
        { path: '/search-bar/search/The%20Matrix', body: search([{ ...matrix, title: 'The Matrix' }]) },
        { path: '/media/', body: sheet() },
    ]);
    assert.equal((await h.run('603', 'movie')).length, 1); assert.equal(h.calls.length, 4);
});

test('titles that normalize to empty strings cannot match an unrelated catalogue item', async () => {
    const h = load('purstream', [
        { path: '/3/', body: { title: '東京', original_title: '東京', release_date: '1999-01-01' } },
        { path: '/search-bar/', body: search([{ ...matrix, title: '大阪' }]) },
    ]);
    assert.equal((await h.run('603', 'movie')).length, 0);
    assert.ok(h.calls.every(call => !call.url.includes('/media/')));
});

for (const data of [sheet(999), sheet(603, 'tv')]) {
    test('Purstream refuses a media sheet whose ID or type differs from the request', async () => {
        const h = load('purstream', [{ path: '/3/', body: meta }, { path: '/search-bar/', body: search([matrix]) }, { path: '/media/', body: data }]);
        assert.equal((await h.run('603', 'movie')).length, 0);
        assert.ok(h.logs.some(value => value.includes('TMDB ID mismatch')));
    });
}

// Synthetic source encoded with the public player's algorithm; no live tokens.
function encodedPlayer(host = 'vidzy.cc', width = 198, source = media) {
    const sum = [...host].reduce((sum, ch) => (sum + ch.charCodeAt(0)) & 255, 0);
    const bytes = Buffer.from([...source].map((ch, i) => ch.charCodeAt(0) ^ ((0x3d + i * 89 + sum + width) & 255))).reverse().toString('base64');
    return `var _fsvHls="https://bad.example/troll/master.m3u8"; sources: [{src: (function(s){var h=(location&&location.hostname)||"",H=0;var _p='width:calc(1in + ${width + 43 - 96}px)';var _ch='width:calc(100% - 43px)';var kk=(0x3d+i*89+H+BC)&255;return s;})("${bytes}"), type:"application/x-mpegURL"}];metaTitle: "Example.2026.720p.VF.mp4";`;
}
function wrapper(embed = 'https://vidzy.cc/embed-fixture.html') { return `<iframe id="pf" src="${embed}"></iframe><script>var CFG={"version":"vf"};</script>`; }

test('Nakios / Vidzy maps TMDB directly and decodes the public player without DOM, timers, atob or eval', async () => {
    const h = load('nakios', [
        { path: 'https://vidzy.org/movie/603', body: wrapper() },
        { path: 'https://vidzy.cc/embed-fixture.html', body: encodedPlayer() },
    ]);
    const result = await h.run('603', 'movie');
    assert.equal(h.calls.length, 3); assert.equal(result.length, 1);
    assert.equal(result[0].url, media); assert.match(result[0].name, /^Vidzy/);
    assert.equal(result[0].quality, '720p');
    assert.equal(result[0].headers.Referer, 'https://vidzy.cc/embed-fixture.html');
    assert.ok(h.calls.every(call => !/\/api\/603|nakios.org|themoviedb|master.m3u8/.test(call.url)));
});

test('Vidzy decoding uses the final response hostname and the page-specific layout constants', async () => {
    const h = load('nakios', [
        { path: '/movie/603', body: wrapper('https://vidzy.live/embed-fixture.html') },
        { path: '/embed-fixture.html', body: encodedPlayer('vidzy.cc', 156), finalUrl: 'https://vidzy.cc/embed-fixture.html' },
    ]);
    const result = await h.run('603', 'movie');
    assert.equal(result[0].url, media);
});

test('Vidzy sends series alias, season zero and requested episode through the documented route', async () => {
    const h = load('nakios', [{ path: '/serie/1399/0/2', body: wrapper() }, { path: '/embed-fixture.html', body: `sources:[{file:"${media}"}]` }]);
    assert.equal((await h.run('1399', 'series', 0, 2)).length, 1);
});

function card(base, slug = 'matrix', title = 'Matrix', year = 1999) {
    return `<div><a href="${base}/movie/${slug}"><img data-src="https://image.tmdb.org/matrix.jpg" alt="${title}"></a><div><span>${year}</span><h3>${title}</h3></div></div>`;
}
function page(videos) { return `const videos = ${JSON.stringify(videos)};`; }
function fallbackRoutes(base = 'https://nakios.live') {
    return [
        { path: 'https://vidzy.org/movie/603', status: 404, body: '' },
        { path: '/3/', body: meta },
        { path: base + '/search/Matrix', body: card(base) },
        { path: base + '/movie/matrix', body: page([{ link: 'https://vidzy.live/embed-catalogue.html', version: 'VOSTFR', embed_type: 'iframe' }]) },
        { path: '/embed-catalogue.html', body: `file: "${media}"` },
    ];
}

test('Nakios catalogue fallback searches by metadata and extracts the advertised video data', async () => {
    const h = load('nakios', fallbackRoutes());
    const result = await h.run('603', 'movie');
    assert.equal(result.length, 1); assert.match(result[0].name, /^Catalogue/); assert.equal(result[0].language, 'VOSTFR');
    assert.equal(h.calls.length, 6);
});

test('Nakios address fallback consults nakios.org only after a catalogue failure', async () => {
    const current = 'https://nakios.new-example';
    const routes = fallbackRoutes(current);
    routes.push({ path: 'https://nakios.live/search/', status: 404, body: '' });
    routes.push({ path: 'https://nakios.org/', body: `<table><tr><td><a href="https://nakios.info/">Info</a></td><td>Guide</td></tr><tr><td><a href="${current}/">Service</a></td><td>Catalogue / streaming</td></tr></table>` });
    const h = load('nakios', routes);
    assert.equal((await h.run('603', 'movie')).length, 1);
    assert.ok(h.calls.findIndex(call => call.url === 'https://nakios.org/') > h.calls.findIndex(call => call.url.startsWith('https://nakios.live/search/')));
    assert.equal(h.calls.length, 8);
});

test('Nakios series fallback builds the exact episode URL without fetching the series landing page', async () => {
    const h = load('nakios', [
        { path: '/3/tv/1399?', body: { name: 'Game of Thrones', first_air_date: '2011-04-17' } },
        { path: '/search/Game%20of%20Thrones', body: card('https://nakios.live', 'game-of-thrones', 'Game of Thrones', 2011).replace('/movie/', '/tv-show/') },
        { path: '/episode/game-of-thrones/0-2', body: page([{ link: media, embed_type: 'hls', version: 'VF' }]) },
    ], { preferCatalogue: true });
    assert.equal((await h.run('1399', 'tv', 0, 2)).length, 1);
    assert.equal(h.calls.length, 3);
});

test('Nakios does not return unsupported iframe pages or placeholder media as streams', async () => {
    const routes = fallbackRoutes();
    routes.find(route => route.path.endsWith('/movie/matrix')).body = page([{ link: 'https://unsupported.example/embed.html', embed_type: 'iframe' }]);
    const h = load('nakios', routes);
    assert.equal((await h.run('603', 'movie')).length, 0);
    assert.ok(h.calls.every(call => !call.url.includes('unsupported.example')));
    assert.ok(h.logs.some(value => value.includes('unsupported embedded')));
});

test('encoded /troll/ placeholder is never returned as real media', async () => {
    const h = load('nakios', [
        { path: '/movie/603', body: wrapper() },
        { path: '/embed-fixture.html', body: encodedPlayer('vidzy.cc', 198, 'https://bad.example/troll/master.m3u8') },
    ], {}, { TMDB_API_KEY: '' });
    assert.equal((await h.run('603', 'movie')).length, 0);
    assert.ok(h.logs.some(value => value.includes('no supported public media')));
});

test('the directory cannot redirect the provider to an unrelated advertised website', async () => {
    const h = load('nakios', [
        { path: '/3/', body: meta }, { path: 'https://nakios.live/search/', status: 404, body: '' },
        { path: 'https://nakios.org/', body: '<tr><td>Catalogue <a href="https://advert.example/">Open</a></td></tr>' },
    ], { preferCatalogue: true });
    assert.equal((await h.run('603', 'movie')).length, 0);
    assert.ok(h.calls.every(call => !call.url.includes('advert.example')));
});

test('source filenames containing a release year do not invent a resolution', async () => {
    const h = load('nakios', [{ path: '/movie/603', body: wrapper() }, { path: '/embed-fixture.html', body: 'metaTitle: "Example.2026.VF.mp4"; file: "https://media.example/master.m3u8";' }]);
    assert.equal((await h.run('603', 'movie'))[0].quality, 'HD');
});

for (const name of ['movix', 'purstream', 'nakios']) {
    test(`${name} rejects invalid IDs/episodes without network access and logs failures`, async () => {
        const h = load(name, []);
        for (const args of [['tt0133093', 'movie'], ['0', 'movie'], ['1399', 'tv'], ['1399', 'tv', -1, 1]]) {
            assert.equal((await h.run(...args)).length, 0);
        }
        assert.equal(h.calls.length, 0); assert.ok(h.logs.length >= 4);
    });
}
