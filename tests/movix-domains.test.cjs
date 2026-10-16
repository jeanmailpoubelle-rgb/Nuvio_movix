const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const dog = 'https://api.movix.dog', cash = 'https://api.movix.cash';
const primary = '/api/purstream/movie/603/stream', backup = '/api/cpasmal/movie/603';
const media = 'https://media.example/video.mp4';
function load(provider, routes, settings = {}, key = '') {
    const calls = [], logs = [];
    const context = vm.createContext({module: {exports: {}}, TMDB_API_KEY: key,
        SCRAPER_SETTINGS: {frembedRecovery: false, ...settings},
        console: {warn: value => logs.push(value)},
        setTimeout() { throw new Error('No native timers'); },
        eval() { throw new Error('Never execute downloaded JavaScript'); },
        fetch: async (url, options) => {
            calls.push({url, options});
            const route = routes.find(route => url.includes(route.path));
            assert.ok(route, 'Unexpected fetch');
            if (route.error) throw new Error(route.error);
            const body = typeof route.body === 'function' ? route.body(url, options) : route.body;
            return {status: route.status || 200, ok: !route.status || route.status < 400, url: route.url || url,
                headers: {get: () => route.contentType || 'application/json'},
                text: async () => typeof body === 'string' ? body : JSON.stringify(body)};
        }});
    vm.runInContext(fs.readFileSync(path.join(root, 'providers', provider + '.js'), 'utf8'), context);
    return {calls, logs, context, run: (...args) => context.module.exports.getStreams(...args)};
}
const playable = {sources: [{url: media, quality: '720p'}]};
test('healthy current API requires only its useful lookup and no directory request', async () => {
    const h = load('movix', [{path: dog + primary, body: playable}]);
    assert.equal((await h.run('603', 'movie'))[0].url, media);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].options.headers.Referer, 'https://movix.dog/');
});
test('network failover uses a known mirror and reuses only its origin, never a signed media URL', async () => {
    let count = 0;
    const h = load('movix', [{path: dog, error: 'Unavailable'},
        {path: cash + primary, body: () => ({sources: [{url: media + '?fresh=' + ++count}]})}]);
    const first = await h.run('603', 'movie'), second = await h.run('603', 'movie');
    assert.notEqual(first[0].url, second[0].url);
    assert.equal(h.calls.length, 3);
    assert.equal(h.calls[1].options.headers.Referer, 'https://movix.cash/');
});
for (const status of [404, 503]) {
    test(`structured JSON HTTP ${status} preserves normal source recovery without mirror/directory retries`, async () => {
        const h = load('movix', [{path: dog + primary, status, body: {error: 'Source unavailable'}},
            {path: dog + backup, body: {links: {vf: [{url: media}]}}}]);
        assert.equal((await h.run('603', 'movie'))[0].url, media);
        assert.equal(h.calls.length, 2);
    });
}
test('an HTML 404 is an endpoint failure and can recover through a known mirror', async () => {
    const h = load('movix', [{path: dog + primary, status: 404, contentType: 'text/html', body: '<html>Domain moved</html>'},
        {path: cash + primary, body: playable}]);
    assert.equal((await h.run('603', 'movie')).length, 1); assert.equal(h.calls.length, 2);
});
test('official-directory recovery reads one first-party bundle, shares discovery across routes and executes no script', async () => {
    const next = 'https://api.movix.next-example';
    const h = load('movix', [{path: dog, error: 'Unavailable'}, {path: cash, error: 'Unavailable'},
        {path: 'https://movix.online/', body: '<a href="https://ads.example/">Ad</a><a href="https://movix.next-example/">Site</a>'},
        {path: 'https://movix.next-example/assets/index-demo.js', body: 'globalThis.executed=true;const API="' + next + '";'},
        {path: 'https://movix.next-example/', body: '<script src="https://ads.example/main.js"></script><script src="/assets/index-demo.js"></script>'},
        {path: next + primary, body: {sources: []}}, {path: next + backup, body: {links: {vf: [{url: media}]}}},
    ]);
    assert.equal((await h.run('603', 'movie'))[0].url, media);
    assert.equal(h.calls.length, 7);
    assert.equal(h.context.executed, undefined);
    assert.equal(h.calls.filter(call => call.url === 'https://movix.online/').length, 1);
    assert.ok(!h.calls.some(call => call.url.startsWith('https://ads.example')));
});
test('the bookmarked College frontend can recover an API origin when the directory and main website fail', async () => {
    const h = load('movix', [{path: dog, error: 'Unavailable'}, {path: cash, error: 'Unavailable'},
        {path: 'https://movix.online/', status: 503}, {path: 'https://movix.dog/', status: 503},
        {path: 'https://movix.college/assets/main-demo.js', body: 'var api="https://api.movix.new-example";'},
        {path: 'https://movix.college/', body: '<script src="/assets/main-demo.js"></script>'},
        {path: 'https://api.movix.new-example' + primary, body: playable},
    ]);
    assert.equal((await h.run('603', 'movie')).length, 1); assert.equal(h.calls.length, 7);
});
test('custom API overrides do not roam to other domains', async () => {
    const h = load('movix', [{path: 'https://api.custom.example' + primary, body: playable}],
        {apiBase: 'https://api.custom.example', siteBase: 'https://custom.example'});
    assert.equal((await h.run('603', 'movie')).length, 1); assert.equal(h.calls.length, 1);
});
test('a pending Cpasmal retrieval returns diagnostics without polling or fabricating a player', async () => {
    const h = load('movix', [{path: primary, body: {sources: []}},
        {path: backup, status: 202, body: {pending: true, code: 'retrieval_in_progress'}}]);
    assert.equal((await h.run('603', 'movie')).length, 0); assert.equal(h.calls.length, 2);
    assert.ok(h.logs.some(line => line.includes('upstream-pending')));
});
test('HTTP 429 stops further calls to the same API, without alias or directory requests', async () => {
    const h = load('movix-catalogues', [{path: '/api/wiflix/', status: 429, body: {error: 'Rate limited'}}]);
    assert.equal((await h.run('603', 'movie')).length, 0); assert.equal(h.calls.length, 1);
});
test('catalogues deduplicate public player URLs across lists and keep declared languages and captions', async () => {
    const h = load('movix-catalogues', [
        {path: '/api/wiflix/', body: {tmdb_id: 603, players: {vf: [{url: media, quality: '720p', subtitles: [{url: '/fr.vtt', language: 'fr'}]}]}}},
        {path: '/api/fstream/', body: {tmdb: {id: 603}, type: 'movie', players: {VFQ: [{url: media, subtitles: [{url: '/en.vtt', language: 'en'}]}], VOSTFR: [{url: 'https://media.example/sub.mp4'}]}}},
        {path: '/api/tmdb/', body: {tmdb_details: {id: 603}, player_links: [{decoded_url: media}, {decoded_url: 'https://media.example/vo.mp4', language: 'English'}]}},
    ]);
    const items = await h.run('603', 'movie');
    assert.equal(items.length, 3); assert.equal(h.calls.length, 3);
    assert.equal(items[0].subtitles[0].name, 'Français');
    assert.deepEqual(Array.from(items[0].subtitles, track => track.language), ['fr', 'en']);
    assert.deepEqual(Array.from(items, item => item.language), ['VF', 'VOSTFR', 'VO']);
});
test('exact series coordinates retain season zero and never substitute another episode', async () => {
    const h = load('movix-catalogues', [
        {path: '/api/wiflix/tv/108978/0?episode=3', body: {tmdb_id: 108978, season: 0, episodes: {1: {vf: [{url: 'https://media.example/wrong.mp4'}]}, 3: {vostfr: [{url: media}]}}}},
        {path: '/api/fstream/', body: {tmdb: {id: 108978}, metadata: {season: 0}, episodes: {1: {number: 1, languages: {VF: [{url: 'https://media.example/wrong.mp4'}]}}}}},
        {path: '/api/tmdb/', body: {tmdb_details: {id: 108978}, current_episode: {season_number: 0, episode_number: 2, player_links: [{decoded_url: 'https://media.example/wrong.mp4'}]}}},
    ]);
    const items = await h.run('108978', 'tv', 0, 3);
    assert.equal(items.length, 1); assert.equal(items[0].url, media); assert.equal(items[0].language, 'VOSTFR');
    assert.equal(h.calls.length, 3);
});
test('Coflix rejects a different season even when the requested episode number matches', async () => {
    const h = load('movix-catalogues', [
        {path: '/api/wiflix/', body: {success: false}},
        {path: '/api/fstream/', body: {success: false}},
        {path: '/api/tmdb/', body: {tmdb_details: {id: 108978}, current_episode: {season_number: 2, episode_number: 1, player_links: [{decoded_url: media}]}}},
    ]);
    assert.equal((await h.run('108978', 'tv', 1, 1)).length, 0);
    assert.equal(h.calls.length, 3);
});
test('wrong TMDB IDs and wrong seasons are rejected independently of a healthy catalogue', async () => {
    const h = load('movix-catalogues', [
        {path: '/api/wiflix/', body: {tmdb_id: 99, season: 1, episodes: {1: {vf: [{url: 'https://media.example/wrong.mp4'}]}}}},
        {path: '/api/fstream/', body: {tmdb: {id: 108978}, metadata: {season: 2}, episodes: {1: {number: 1, languages: {VF: [{url: 'https://media.example/wrong.mp4'}]}}}}},
        {path: '/api/tmdb/', body: {tmdb_details: {id: 108978}, current_episode: {episode: 1, player_links: [{decoded_url: media}]}}},
    ]);
    const items = await h.run('108978', 'tv', 1, 1);
    assert.equal(items.length, 1); assert.equal(items[0].url, media);
});
test('direct API domain status recovery reuses metadata and verifies the newly found title', async () => {
    const h = load('movix', [{path: primary, status: 503, body: {error: 'Temporary source failure'}},
        {path: '/3/movie/603', body: {title: 'Matrix', release_date: '1999-01-01'}},
        {path: 'https://api.purstream.id/', error: 'Network unavailable'},
        {path: 'https://purstream.wiki/api/status', body: {domain: 'purstream.next-example'}},
        {path: 'https://api.purstream.next-example/api/v1/search-bar/', body: {data: {items: {movies: {items: [{id: 42, type: 'movie', title: 'Matrix', release_date: '1999-01-01'}]}}}}},
        {path: 'https://api.purstream.next-example/api/v1/media/42/sheet', body: {data: {items: {tmdbId: 603, type: 'movie', urls: [{url: media}]}}}},
    ], {}, 'fixture');
    const [item] = await h.run('603', 'movie');
    assert.equal(item.url, media); assert.equal(h.calls.length, 6);
    assert.equal(item.headers.Referer, 'https://purstream.next-example/');
    assert.equal(h.calls.filter(call => call.url.includes('/3/movie/603')).length, 1);
});
