const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const url = name => 'https://media.example/' + name + '/master.m3u8';
const master = resolution => '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=' + resolution + '\nvideo.m3u8';
function load(provider, sources, playlists = {}) {
    const calls = [], logs = [];
    const routes = {
        '/api/purstream/movie/424242/stream': {sources},
        '/api/films?': {links: sources.map(source => ({url: source.url, lang: 'vf', quality: source.quality}))},
        '/3/movie/424242': {title: 'Fixture', release_date: '2001-01-01'},
        '/search/Fixture': '<a href="https://nakios.live/movie/fixture"><img alt="Fixture"></a><span>2001</span><h3>Fixture</h3>',
        '/movie/fixture': 'const videos = ' + JSON.stringify(sources.map(source => ({link: source.url, version: 'VF', server_name: source.quality || 'Fixture', embed_type: source.format || 'hls'}))) + ';',
        ...playlists,
    };
    const context = vm.createContext({module: {exports: {}}, TMDB_API_KEY: 'fixture',
        SCRAPER_SETTINGS: {preferCatalogue: provider === 'nakios'},
        console: {warn: value => logs.push(value)},
        setTimeout() { throw new Error('No native sleeps'); },
        fetch: async target => {
            calls.push(target);
            const key = Object.keys(routes).find(key => target.includes(key));
            assert.ok(key, 'No fallback or media probing expected');
            const body = routes[key];
            return {status: 200, ok: true, url: target,
                text: async () => typeof body === 'string' ? body : JSON.stringify(body)};
        }});
    vm.runInContext(fs.readFileSync(path.join(root, 'providers', provider + '.js'), 'utf8'), context);
    return {calls, logs, run: () => context.module.exports.getStreams('424242', 'movie')};
}
for (const provider of ['movix', 'nakios', 'frembed-hosts']) {
    test(`${provider} filters after measured HLS metadata, keeps 720p and unknown, and preserves audio/captions`, async () => {
        const h = load(provider, [
            {url: url('low'), quality: '1080p'},
            {url: url('hd'), quality: '480p'},
            {url: url('fullhd'), quality: '1080p'},
            {url: url('unknown')},
        ], {
            [url('low')]: master('640x360'),
            [url('hd')]: '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="fr"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="en"\n#EXT-X-MEDIA:TYPE=SUBTITLES,LANGUAGE="fr",NAME="Français",URI="fr.vtt"\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720,AUDIO="a"\nvideo.m3u8',
            [url('fullhd')]: master('1920x1080'),
            [url('unknown')]: '#EXTM3U\n#EXTINF:10,\nsegment.ts',
        });
        const items = await h.run();
        assert.deepEqual(Array.from(items, item => item.url), [url('hd'), url('fullhd'), url('unknown')]);
        assert.deepEqual(Array.from(items, item => item.quality), ['720p', '1080p', undefined]);
        assert.equal(items[0].language, 'MULTI');
        assert.ok(items[0].name.includes(' | 720p | MULTI'));
        assert.equal(items[0].subtitles[0].name, 'Français');
        assert.equal(items[2].name.includes('Unknown'), false);
        assert.equal(Object.hasOwn(items[2], 'quality'), false);
        assert.equal(h.calls.length, provider === 'nakios' ? 7 : 5);
        assert.equal(h.calls.filter(target => target === url('hd')).length, 1);
        assert.ok(h.logs.some(line => line.includes('resolution-filter') && line.includes('360p')));
    });
}
test('the minimum is inclusive, lower MP4 hints are discarded and unknown MP4s stay unlabelled without probes', async () => {
    const qualities = ['144p', '360p', '480p', '576p', '720p', '1080p', '2160p', ''];
    const h = load('movix', qualities.map((quality, i) => ({url: 'https://media.example/' + i + '.mp4', quality, lang: 'vf'})));
    const items = await h.run();
    assert.deepEqual(Array.from(items, item => item.quality), ['720p', '1080p', '2160p', undefined]);
    assert.equal(h.calls.length, 1);
    assert.equal(items.at(-1).name.includes('Unknown'), false);
});
test('an adaptive master keeps all renditions when a 720p rendition is available', async () => {
    const body = master('640x360') + '\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720\nhd.m3u8';
    const h = load('movix', [{url: url('adaptive')}], {[url('adaptive')]: body});
    const [item] = await h.run();
    assert.equal(item.quality, '720p');
    assert.equal(item.url, url('adaptive'));
    assert.equal(h.calls.length, 2);
});
