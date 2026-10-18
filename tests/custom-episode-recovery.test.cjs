const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..'), id = '777777', imdb = 'tt8765432';
const media = 'https://cdn.example/correct.mp4?order=%2F&a=1&a=2';
const target = () => ({meta: {id: imdb, name: 'Unrelated anime', genres: ['Animation'], videos: [
    {season: 1, episode: 13, title: 'First finale', released: '2020-03-01T00:00:00.000Z'},
    {season: 1, episode: 14, title: 'Second Horizon', released: '2024-07-04T00:00:00.000Z'},
    {season: 1, episode: 15, title: 'Another day', released: '2024-07-11T00:00:00.000Z'},
]}});
const source = () => ({meta: {id: imdb, imdb_id: imdb, moviedb_id: Number(id), genres: ['Animation'], videos: [
    {season: 2, episode: 1, name: 'Second Horizon', released: '2024-07-03T15:30:00.000Z'},
    {season: 2, episode: 2, name: 'Another day', released: '2024-07-10T15:30:00.000Z'},
]}});
const inventory = (season = 1, episode = 14, series = id) => ({success: true, type: 'tv', data: [
    {series_id: series, season_number: season, episode_number: episode, links: [{url: media}]},
]});
function load(options = {}) {
    const calls = [], events = [];
    const context = vm.createContext({module: {exports: {}}, TMDB_API_KEY: options.full ? 'fixture' : '',
        SCRAPER_SETTINGS: {movixFailover: false, ...options.settings},
        console: {warn(line) { const i = line.indexOf('{'); if (i >= 0) events.push(JSON.parse(line.slice(i))); }},
        setTimeout() { throw new Error('No native timers'); },
        fetch: async (url, init) => {
            calls.push({url, init}); let body, status = 200;
            if (url.includes('/api/links/')) {
                if (url.includes('season=1&episode=14')) { body = options.mapped || inventory(); status = options.mappedStatus || 200; }
                else { status = options.status ?? 404; body = options.initial || {success: false, type: 'tv'}; }
            } else if (url.includes('catalog.nuvio.tv/')) { body = options.target || target(); status = options.targetStatus || 200; }
            else if (url.includes('v3-cinemeta.strem.io/')) body = options.source || source();
            else if (url.includes('/api/swiftflow/')) body = options.swiftflow || {success: false};
            else if (url.includes('/3/')) body = {name: 'Unrelated anime', external_ids: {imdb_id: imdb}};
            else if (url.includes('/api/imdb/')) body = {series: []};
            else throw new Error('Unexpected request');
            return {status, ok: status < 400, url, headers: {get: () => 'application/json'},
                text: async () => typeof body === 'string' ? body : JSON.stringify(body)};
        }});
    let code = fs.readFileSync(path.join(root, 'providers/movix-extra.js'), 'utf8');
    if (!options.full) code = code.replace('\nif (typeof module !== "undefined" && module.exports)', '\nENDPOINTS.movix.extra=["custom"];\nif (typeof module !== "undefined" && module.exports)');
    if (options.requestLimit) code = code.replace('\nif (typeof module !== "undefined" && module.exports)', '\nENDPOINTS.limits.requests=' + options.requestLimit + ';\nif (typeof module !== "undefined" && module.exports)');
    vm.runInContext(code, context);
    return {calls, events, run: (season = 2, episode = 1, type = 'tv') => context.module.exports.getStreams(id, type, season, episode)};
}
test('missing Custom episode recovers by unique episode title/date, without fixed season lengths', async () => {
    const h = load(), [item] = await h.run();
    assert.ok(item, 'An explicit seasonal-to-continuous episode correspondence must recover this missing Custom row');
    assert.equal(item.url, media); assert.match(item.name, /Movix \/ Custom/);
    assert.equal(h.calls.length, 4);
    assert.ok(h.calls[3].url.endsWith('/api/links/tv/' + id + '?season=1&episode=14'));
    assert.ok(h.events.some(e => e.stage === 'episode-mapping' && e.data.to.episode === 14 && e.data.from.season === 2));
});
test('healthy Custom episodes retain their single request and skip metadata', async () => {
    const h = load({status: 200, initial: inventory(2, 1)});
    assert.equal((await h.run()).length, 1); assert.equal(h.calls.length, 1);
});
test('mapping metadata can be reused but stream discovery is always fresh', async () => {
    const h = load(); assert.equal((await h.run()).length, 1); assert.equal((await h.run()).length, 1);
    assert.equal(h.calls.filter(c => /\/meta\//.test(c.url)).length, 2);
    assert.equal(h.calls.filter(c => c.url.includes('season=1&episode=14')).length, 2);
});
test('other extra adapters retain the original requested episode after Custom recovery', async () => {
    const h = load({full: true}); assert.equal((await h.run()).length, 1);
    assert.ok(h.calls.some(c => c.url.includes('/api/swiftflow/tv/' + id + '/season/2?episode=1')));
    assert.ok(!h.calls.some(c => c.url.includes('/api/swiftflow/') && c.url.includes('/season/1')));
});
for (const status of [200, 202, 401, 403, 429, 503]) test('Custom HTTP ' + status + ' does not trigger episode guessing', async () => {
    const h = load({status}); assert.equal((await h.run()).length, 0); assert.equal(h.calls.length, 1);
});
test('specials, movies and explicit opt-out do not request mapping metadata', async () => {
    for (const [options, args] of [[{}, [0, 1]], [{}, [1, 1, 'movie']], [{settings: {customEpisodeRecovery: false}}, [2, 1]]]) {
        const h = load(options); assert.equal((await h.run(...args)).length, 0); assert.equal(h.calls.length, 1);
    }
});
const cases = {
    'wrong IMDb series': (t, s) => { s.meta.id = 'tt9999999'; },
    'wrong TMDB series': (t, s) => { s.meta.moviedb_id = 999999; },
    'missing explicit TMDB correspondence': (t, s) => { delete s.meta.moviedb_id; },
    'non-anime series': t => { t.meta.genres = ['Drama']; },
    'missing requested source episode': (t, s) => { s.meta.videos.shift(); },
    'duplicate requested source episode': (t, s) => { s.meta.videos.push({...s.meta.videos[0]}); },
    'duplicate target candidate': t => { t.meta.videos.push({...t.meta.videos[1], episode: 99}); },
    'repeated source identity': (t, s) => { s.meta.videos.push({...s.meta.videos[0], episode: 99}); },
    'title disagreement': t => { t.meta.videos[1].title = 'Different episode'; },
    'airdate disagreement': t => { t.meta.videos[1].released = '2022-07-04T00:00:00.000Z'; },
    'missing airdate': t => { delete t.meta.videos[1].released; },
    'generic episode names': (t, s) => { t.meta.videos[1].title = s.meta.videos[0].name = 'Episode 1'; },
};
for (const [name, change] of Object.entries(cases)) test('recovery rejects ' + name, async () => {
    const t = target(), s = source(); change(t, s);
    const h = load({target: t, source: s}); assert.equal((await h.run()).length, 0);
    assert.ok(!h.calls.some(c => c.url.includes('season=1&episode=14')));
});
test('matched-coordinate API rows still require exact series, season and episode', async () => {
    for (const mapped of [inventory(1, 13), inventory(2, 14), inventory(1, 14, '999999')]) {
        const h = load({mapped}); assert.equal((await h.run()).length, 0);
    }
});
test('metadata failure preserves an independent SwiftFlow source at the original coordinates', async () => {
    const h = load({full: true, targetStatus: 503, swiftflow: {success: true, tmdb_id: Number(id), season: 2,
        episodes: {'1': {vf: [{url: 'https://cdn.example/backup.mp4', quality: '720p'}]}}}});
    const [item] = await h.run(); assert.equal(item.url, 'https://cdn.example/backup.mp4');
    assert.ok(!h.calls.some(c => c.url.includes('season=1&episode=14')));
});
test('a missing mapped row invalidates correspondence cache and retries metadata next lookup', async () => {
    const h = load({mappedStatus: 404}); assert.equal((await h.run()).length, 0); assert.equal((await h.run()).length, 0);
    assert.equal(h.calls.filter(c => /\/meta\//.test(c.url)).length, 4);
});
test('recovery shares the original request budget instead of starting another allowance', async () => {
    const h = load({requestLimit: 2}); assert.equal((await h.run()).length, 0); assert.equal(h.calls.length, 2);
    assert.ok(h.events.some(e => e.stage === 'episode-mapping-unavailable'));
});
