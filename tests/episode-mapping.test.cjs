const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const id = '777777', imdb = 'tt8765432', media = 'https://media.example/correct.mp4?b=%2F&a=1&a=2';
function catalog() { return {meta: {id: imdb, genres: ['Animation'], videos: [
    {season: 1, episode: 14, title: 'Second Horizon', released: '2024-07-04T00:00:00Z'},
    {season: 1, episode: 15, title: 'Another day', released: '2024-07-11T00:00:00Z'},
]}}; }
function cinemeta() { return {meta: {id: imdb, moviedb_id: Number(id), genres: ['Animation'], videos: [
    {season: 2, episode: 1, name: 'Second Horizon', released: '2024-07-03T15:30:00Z'},
    {season: 2, episode: 2, name: 'Another day', released: '2024-07-10T15:30:00Z'},
]}}; }
function route(match, body, status = 200) { return {match, body, status}; }
function load(provider, routes, options = {}) {
    const calls = [], events = [], unexpected = [];
    const context = vm.createContext({module: {exports: {}}, TMDB_API_KEY: options.key || '',
        SCRAPER_SETTINGS: {movixFailover: false, frembedRecovery: false, ...options.settings},
        console: {warn(line) { const i = line.indexOf('{'); if (i >= 0) events.push(JSON.parse(line.slice(i))); }},
        setTimeout() { throw new Error('Native timers unavailable'); },
        fetch: async (url, init) => {
            calls.push({url, init}); let r;
            if (url.includes('catalog.nuvio.tv/')) r = route('', options.catalog || catalog());
            else if (url.includes('v3-cinemeta.strem.io/')) r = route('', options.cinemeta || cinemeta());
            else r = routes.find(r => typeof r.match === 'function' ? r.match(url, init) : url.includes(r.match));
            if (!r) { unexpected.push(url); throw new Error('Unplanned request'); }
            const status = r.status || 200, body = typeof r.body === 'function' ? r.body(url, init) : r.body;
            return {ok: status < 400, status, url, headers: {get: () => 'application/json'},
                text: async () => typeof body === 'string' ? body : JSON.stringify(body)};
        }});
    const baseline = process.env.NUVIO_EPISODE_BASELINE_DIR;
    let code = fs.readFileSync(baseline ? path.join(baseline, provider + '.js') : path.join(__dirname, '../providers', provider + '.js'), 'utf8');
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/endpoints.json'), 'utf8')).episodeMapping;
    const setup = 'ENDPOINTS.episodeMapping=ENDPOINTS.episodeMapping||' + JSON.stringify(config) + ';' +
        'ENDPOINTS.catalogue.directories=[];' +
        'Object.assign(ENDPOINTS.episodeMapping.targets,' + JSON.stringify(options.targets || {}) + ');' +
        (options.input ? 'ENDPOINTS.episodeMapping.inputCatalog=' + JSON.stringify(options.input) + ';' : '') +
        (options.only ? 'ENDPOINTS.movix.' + (provider === 'movix-extra' ? 'extra' : 'catalogues') + '=' + JSON.stringify(options.only) + ';' : '');
    code = code.replace('\nif (typeof module !== "undefined" && module.exports)', '\n' + setup + '\nif (typeof module !== "undefined" && module.exports)');
    vm.runInContext(code, context);
    return {calls, events, async run(season = 2, episode = 1, type = 'tv') {
        const values = await context.module.exports.getStreams(id, type, season, episode);
        assert.deepEqual(unexpected, []); return values;
    }};
}
const query = (s, e) => u => u.includes('/api/purstream/') && u.includes('season=' + s + '&episode=' + e);
test('primary recovery runs after original backups and uses its own verified coordinates', async () => {
    const h = load('movix', [route(query(2, 1), {}, 404), route('/api/cpasmal/', {links: {}}),
        route(query(1, 14), {season: 1, episode: 14, sources: [{url: media, name: '1080p MULTI'}]})]);
    const [item] = await h.run(); assert.equal(item.url, media); assert.equal(item.language, 'MULTI');
    assert.equal(h.calls.length, 5); assert.ok(h.calls[1].url.endsWith('/2/1'));
    assert.ok(h.events.some(e => e.stage === 'episode-mapping' && e.data.backend === 'primary' && e.data.to.episode === 14));
});
test('a working original backup suppresses additional primary mapping requests', async () => {
    const h = load('movix', [route('/api/purstream/', {}, 404), route('/api/cpasmal/', {links: {vf: [{url: media}]}})]);
    assert.equal((await h.run()).length, 1); assert.equal(h.calls.length, 2);
    assert.ok(!h.calls.some(c => c.url.includes('/meta/')));
});
test('a rate-limited backup prevents remapping a previously missing primary', async () => {
    const h = load('movix', [route('/api/purstream/', {}, 404), route('/api/cpasmal/', {}, 429)]);
    assert.equal((await h.run()).length, 0); assert.equal(h.calls.length, 2);
});
test('global opt-out, disabled input and native target policies skip correspondence requests', async () => {
    for (const options of [{settings: {episodeRecovery: false}}, {input: 'disabled'}, {targets: {primary: 'native', backup: 'native'}}]) {
        const h = load('movix', [route('/api/purstream/', {}, 404), route('/api/cpasmal/', {}, 404)], options);
        assert.equal((await h.run()).length, 0); assert.equal(h.calls.length, 2);
    }
});
test('a continuous request can recover a seasonal backup without changing the primary query', async () => {
    const h = load('movix', [route('/api/purstream/', {sources: []}), route('/api/cpasmal/tv/' + id + '/1/14', {}, 404),
        route('/api/cpasmal/tv/' + id + '/2/1', {links: {vostfr: [{url: media}]}})]);
    const [item] = await h.run(1, 14); assert.equal(item.url, media); assert.equal(item.language, 'VOSTFR');
    assert.ok(h.calls[0].url.includes('season=1&episode=14')); assert.equal(h.calls.length, 5);
});
test('both missing Vidzy languages recover the correct seasonal episode', async () => {
    const h = load('nakios', [route('/serie/' + id + '/1/14/', 'Missing', 404),
        route('/serie/' + id + '/2/1/', '<iframe id="pf" src="https://vidzy.cc/embed-recovered.html"></iframe><script>{"version":"vf"}</script>'),
        route('/embed-recovered.html', 'file:"' + media + '"')]);
    const [item] = await h.run(1, 14); assert.equal(item.url, media); assert.equal(h.calls.length, 7);
    assert.equal(h.calls.filter(c => c.url.includes('embed-recovered')).length, 1);
});
test('one missing Vidzy language is not evidence that an existing episode needs remapping', async () => {
    const h = load('nakios', [route('/vf', 'Missing', 404), route('/vostfr', '<iframe id="pf" src="https://vidzy.cc/embed-ok.html"></iframe>'),
        route('/embed-ok.html', 'file:"' + media + '"')]);
    assert.equal((await h.run()).length, 1); assert.equal(h.calls.length, 3);
});
test('deleted Vidzy embeds do not trigger episode remapping', async () => {
    const h = load('nakios', [route('/serie/', '<iframe id="pf" src="https://vidzy.cc/embed-deleted.html"></iframe>'),
        route('/embed-deleted.html', 'Deleted', 404)]);
    assert.equal((await h.run()).length, 0); assert.equal(h.calls.length, 3);
    assert.ok(!h.events.some(e => e.stage === 'episode-mapping'));
});
test('Frembed host recovery preserves authoritative modern empty inventories', async () => {
    const routes = [route(u => u.includes('sa=2&epi=1'), {}, 404), route(u => u.includes('sa=1&epi=14'),
        {tmdb: id, sa: 1, epi: 14, links: [{url: media, lang: 'vf'}]})];
    const h = load('frembed-hosts', routes); assert.equal((await h.run())[0].url, media); assert.equal(h.calls.length, 4);
    const empty = load('frembed-hosts', [route('/api/series?', {links: [], link1: 'https://media.example/stale.mp4'})]);
    assert.equal((await empty.run()).length, 0); assert.equal(empty.calls.length, 1);
});
test('SwiftFlow recovers an explicitly missing season, but pending/gated data never triggers mapping', async () => {
    const routes = [route('/season/2?', {success: false, tmdb_id: id, error: 'Saison 2 non disponible'}),
        route('/season/1?', {success: true, tmdb_id: id, season: 1, episodes: {'14': {vf: [{url: media}]}}})];
    const h = load('movix-extra', routes, {only: ['swiftflow']}); assert.equal((await h.run())[0].url, media); assert.equal(h.calls.length, 4);
    for (const body of [{success: false, pending: true, tmdb_id: id, error: 'Saison 2 non disponible'},
        {success: true, tmdb_id: id, season: 2, episodes: {}, mp4: {available: true, entries: [{}]}},
        {success: false, tmdb_id: '99999', error: 'Saison 2 non disponible'}]) {
        const blocked = load('movix-extra', [route('/api/swiftflow/', body)], {only: ['swiftflow']});
        assert.equal((await blocked.run()).length, 0); assert.equal(blocked.calls.length, 1);
    }
});
test('automatic mode rejects overlapping catalogue coordinates that identify different episodes', async () => {
    const c = catalog(); c.meta.videos.push({season: 2, episode: 1, title: 'Different episode', released: '2020-01-01T00:00:00Z'});
    const routes = [route('/api/links/', {}, 404)];
    const h = load('movix-extra', routes, {only: ['custom'], catalog: c});
    assert.equal((await h.run()).length, 0); assert.equal(h.calls.length, 3);
    assert.ok(h.events.some(e => e.stage === 'episode-mapping-unavailable' && e.data.reason.includes('ambiguous')));
    const explicit = load('movix-extra', [route(u => u.includes('season=2&episode=1'), {}, 404),
        route(u => u.includes('season=1&episode=14'), {success: true, type: 'tv', data: [{series_id: id, season_number: 1, episode_number: 14, links: [{url: media}]}]})],
        {only: ['custom'], catalog: c, input: 'cinemeta'});
    assert.equal((await explicit.run())[0].url, media);
});
test('equivalent seasonal coordinates never invent an offset or repeat the same missing request', async () => {
    const c = catalog(); c.meta.videos = cinemeta().meta.videos;
    const h = load('frembed-hosts', [route('/api/series?', {}, 404)], {catalog: c});
    assert.equal((await h.run()).length, 0); assert.equal(h.calls.length, 3);
});
test('multiple recovering backends share metadata and the original request budget', async () => {
    const h = load('movix', [route('/api/purstream/', {}, 404), route('/api/cpasmal/', {}, 404)]);
    assert.equal((await h.run()).length, 0);
    assert.equal(h.calls.filter(c => c.url.includes('/meta/')).length, 2);
});
test('direct API recovery preserves series verification and follows original backups', async () => {
    const h = load('movix', [route('/api/purstream/', {}, 503),
        route('/3/', {name: 'Fixture', first_air_date: '2024-01-01'}),
        route('/search-bar/', {data: {items: {series: {items: [{id: 17, title: 'Fixture', type: 'tv', release_date: '2024-01-01'}]}}}}),
        route('/media/17/sheet', {data: {items: {tmdbId: id, type: 'tv'}}}),
        route('/stream/17/episode?season=2&episode=1', {}, 404), route('/api/cpasmal/', {links: {}}),
        route('/stream/17/episode?season=1&episode=14', {data: {items: {sources: [{stream_url: media}]}}})], {key: 'fixture-key'});
    assert.equal((await h.run())[0].url, media);
    const paths = h.calls.map(c => c.url);
    assert.ok(paths.findIndex(u => u.includes('/api/cpasmal/')) < paths.findIndex(u => u.includes('/meta/')));
    assert.equal(paths.filter(u => u.includes('/search-bar/')).length, 1);
    assert.equal(paths.filter(u => u.includes('/sheet')).length, 2, 'recheck the sheet on the fresh mapped lookup');
    assert.ok(h.events.some(e => e.stage === 'episode-mapping' && e.data.backend === 'direct'));
});
test('premium recovery uses fresh grants and coordinates only under a verified policy', async () => {
    const h = load('movix', [route('/api/purstream/', {sources: []}), route('/api/cpasmal/', {links: {}}),
        route((u, init) => u.endsWith('/api/player/resolve') && JSON.parse(init.body).season === 2, {}, 404),
        route((u, init) => u.endsWith('/api/player/resolve') && JSON.parse(init.body).season === 1 && JSON.parse(init.body).episode === 14,
            {url: 'https://player.example/watch?grant=fixture'}),
        route('/api/streaming/player?tmdb=' + id + '&type=serie&sa=1&ep=14', {sources: [{url: media}]})],
        {targets: {premium: 'nuvio-catalog'}, settings: {frembedRecovery: true}});
    const [item] = await h.run(); assert.equal(item.url, media);
    assert.equal(h.calls.filter(c => c.url.endsWith('/api/player/resolve')).length, 2);
    assert.equal(item.headers.Referer, undefined); assert.equal(item.headers.Origin, undefined);
});
test('Omega hook maps only a missing episode within an explicitly matching series inventory', async () => {
    const h = load('movix-extra', [route('/3/', {name: 'Fixture', external_ids: {imdb_id: imdb}}),
        route('/api/imdb/', {series: [{tmdb_data: {id}, seasons: [{number: 1, episodes: [{number: 14, versions: {vf: [{url: media}]}}]}]}]})],
        {key: 'fixture-key', only: ['omega'], targets: {omega: 'nuvio-catalog'}});
    assert.equal((await h.run())[0].url, media);
    assert.ok(h.events.some(e => e.stage === 'episode-mapping' && e.data.backend === 'omega'));
    const wrong = load('movix-extra', [route('/3/', {name: 'Fixture', external_ids: {imdb_id: imdb}}),
        route('/api/imdb/', {series: [{tmdb_data: {id: '9999'}, seasons: []}]})],
        {key: 'fixture-key', only: ['omega'], targets: {omega: 'nuvio-catalog'}});
    assert.equal((await wrong.run()).length, 0); assert.equal(wrong.calls.length, 2);
});
test('HTML recovery hook keeps title/year matching and changes only its episode page', async () => {
    const h = load('nakios', [route('/serie/', {}, 404),
        route('/3/', {name: 'Fixture', first_air_date: '2024-01-01'}),
        route('/search/Fixture', '<a href="https://nakios.live/tv-show/fixture"><img alt="Fixture"></a><h3>Fixture</h3><span>2024</span>'),
        route('/episode/fixture/2-1', {}, 404),
        route('/episode/fixture/1-14', 'const videos = [{"link":"' + media + '","version":"vf"}];')],
        {key: 'fixture-key', targets: {catalogue: 'nuvio-catalog'}, settings: {catalogueMirrors: ['https://nakios.live']}});
    // Disable address directories for this isolated protocol fixture.
    assert.equal((await h.run())[0].url, media);
    assert.ok(h.events.some(e => e.stage === 'episode-mapping' && e.data.backend === 'catalogue'));
});
for (const provider of ['movix', 'nakios', 'frembed-hosts', 'movix-catalogues', 'movix-extra']) {
    test(provider + ' movies never request episode metadata', async () => {
        let routes;
        if (provider === 'movix') routes = [route('/api/purstream/', {sources: [{url: media}]})];
        if (provider === 'nakios') routes = [route('/movie/', '<iframe id="pf" src="https://vidzy.cc/embed-movie.html"></iframe>'), route('/embed-movie.html', 'file:"' + media + '"')];
        if (provider === 'frembed-hosts') routes = [route('/api/films?', {links: [{url: media}]})];
        if (provider === 'movix-catalogues') routes = [route('/api/wiflix/', {tmdb_id: id, players: {vf: [{url: media}]}}),
            route('/api/fstream/', {tmdb: {id}, players: {}}), route('/api/tmdb/', {tmdb_details: {id}, player_links: []})];
        if (provider === 'movix-extra') routes = [route('/api/links/', {success: true, type: 'movie', data: {id, links: [{url: media}]}}), route('/api/swiftflow/', {success: false})];
        const h = load(provider, routes); assert.equal((await h.run(null, null, 'movie')).length, 1);
        assert.ok(!h.calls.some(c => c.url.includes('/meta/')));
    });
}
test('unverified native backend policies do not trigger metadata requests on failures', async () => {
    const h = load('movix-catalogues', [route('/api/wiflix/', {}, 404), route('/api/fstream/', {}, 404), route('/api/tmdb/', {}, 404)]);
    assert.equal((await h.run()).length, 0); assert.equal(h.calls.length, 3);
});
for (const name of ['wiflix', 'fstream', 'coflix']) test(name + ' hook accepts only matching rows under an explicitly verified target policy', async () => {
    const isMapped = u => name === 'wiflix' ? u.includes('/1?episode=14') : name === 'fstream' ? u.includes('/season/1?episode=14') : u.includes('season=1&episode=14');
    const data = {tmdb_id: id, type: 'tv', season: 1,
        ...(name === 'coflix' ? {current_episode: {season_number: 1, episode_number: 14, player_links: [{url: 'https://uqload.to/embed-ok.html'}]}} :
            {episodes: {'14': name === 'fstream' ? {number: 14, languages: {vf: [{url: 'https://uqload.to/embed-ok.html'}]}} : {vf: [{url: 'https://uqload.to/embed-ok.html'}]}}})};
    const routes = [route(isMapped, data), route(u => u.includes('/api/'), {}, 404), route('/embed-ok.html', 'file:"' + media + '"')];
    const h = load('movix-catalogues', routes, {only: [name], targets: {[name]: 'nuvio-catalog'}});
    assert.equal((await h.run())[0].url, media);
    assert.ok(h.events.some(e => e.stage === 'episode-mapping' && e.data.backend === name));
});
