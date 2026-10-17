const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const movie = '424242', media = n => `https://media.example/${n}/master.m3u8`;
const playlist = (resolution = '1280x720', lang = 'fr') => '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="' + lang + '"\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=' + resolution + ',AUDIO="a"\nvideo.m3u8';
function load(provider, routes, options = {}) {
    const calls = [], events = []; let time = 1000;
    class Clock extends Date { static now() { return time; } }
    const context = vm.createContext({module: {exports: {}}, TMDB_API_KEY: options.key || '', Date: Clock,
        SCRAPER_SETTINGS: {movixFailover: false, frembedRecovery: false, ...options.settings},
        console: {warn: line => { const p = line.indexOf('{'); if (p >= 0) events.push(JSON.parse(line.slice(p))); }},
        setTimeout() { throw new Error('No timers'); }, eval() { throw new Error('No player JavaScript'); },
        fetch: async (url, init) => {
            calls.push({url, init, at: time});
            const entry = routes.find(row => typeof row.match === 'function' ? row.match(url) : url.includes(row.match));
            assert.ok(entry, 'Unexpected network operation');
            if (entry.advance) time += entry.advance;
            if (entry.error) throw new Error('Network failure');
            const body = typeof entry.body === 'function' ? entry.body(url, init) : entry.body;
            return {ok: !entry.status || entry.status < 400, status: entry.status || 200, url: entry.url || url,
                headers: {get: () => entry.contentType || 'application/json'}, text: async () => typeof body === 'string' ? body : JSON.stringify(body)};
        }});
    vm.runInContext(fs.readFileSync(path.join(root, 'providers', provider + '.js'), 'utf8'), context);
    return {calls, events, run: (id = movie, type = 'movie', season, episode) => context.module.exports.getStreams(id, type, season, episode)};
}
function catalogues(vf, sub = []) {
    return [
        {match: '/api/wiflix/', body: {tmdb_id: movie, players: {vf, vostfr: sub}}},
        {match: '/api/fstream/', body: {tmdb: {id: movie}, players: {}}},
        {match: '/api/tmdb/', body: {tmdb_details: {id: movie}, player_links: []}},
    ];
}
test('low-resolution primary sources trigger a qualifying backup; the master is read once', async () => {
    const h = load('movix', [
        {match: '/api/purstream/', body: {sources: [{url: media('low'), quality: '1080p'}]}},
        {match: media('low'), body: playlist('640x360')},
        {match: '/api/cpasmal/', body: {links: {vf: [{url: media('good')}]}}},
        {match: media('good'), body: playlist()},
    ]);
    const items = await h.run();
    assert.equal(items.length, 1); assert.equal(items[0].url, media('good'));
    assert.equal(h.calls.length, 4);
    assert.equal(h.events.filter(e => e.stage === 'resolution-filter').reduce((n,e) => n+e.data.removed,0), 1);
});
test('a qualifying unknown primary keeps the fast path and never requests backups', async () => {
    const h = load('movix', [{match: '/api/purstream/', body: {sources: [{url: 'https://media.example/unknown.mp4'}]}}]);
    const items = await h.run(); assert.equal(items.length, 1); assert.equal(items[0].quality, undefined); assert.equal(h.calls.length, 1);
});
test('Vidzy falling below the minimum continues into the strict title-matched catalogue', async () => {
    const h = load('nakios', [
        {match: 'vidzy.org/movie/', body: '<iframe id="pf" src="https://vidzy.cc/embed-low.html"></iframe>'},
        {match: 'vidzy.cc/embed-low.html', body: 'sources:[{file:"' + media('low') + '"}]'},
        {match: media('low'), body: playlist('640x360')},
        {match: '/3/movie/', body: {title: 'Fixture', release_date: '2001-01-01'}},
        {match: '/search/Fixture', body: '<a href="https://nakios.live/movie/fixture"><img alt="Fixture"></a><span>2001</span><h3>Fixture</h3>'},
        {match: '/movie/fixture', body: 'const videos = [{"link":"https://media.example/good.mp4","version":"VF","server_name":"Direct"}];'},
    ], {key: 'fixture'});
    const items = await h.run(); assert.equal(items.length, 1); assert.equal(items[0].url, 'https://media.example/good.mp4');
    assert.equal(h.calls.filter(c => c.url === media('low')).length, 1);
    assert.ok(h.events.some(e => e.stage === 'fallback' && e.data.route === 'catalogue'));
});
test('catalogues continue past six failed players to collect three qualifying alternatives', async () => {
    const links = Array.from({length: 9}, (_,i) => ({url: `https://uqload.vc/embed-${i}.html`}));
    const h = load('movix-catalogues', catalogues(links).concat([
        {match: u => /uqload.*embed-[0-5]\.html/.test(u), status: 404, body: 'Deleted'},
        {match: u => /uqload.*embed-[6-8]\.html/.test(u), body: u => 'sources:[{file:"' + media(u.match(/embed-(\d+)/)[1]) + '"}]'},
        {match: 'https://media.example/', body: playlist()},
    ]));
    const items = await h.run(); assert.equal(items.length, 3);
    const result = h.events.find(e => e.stage === 'selection').data;
    assert.equal(result.attempted, 9); assert.equal(result.failed, 6); assert.equal(result.stop, 'target-reached');
});
test('results discarded below 720p do not consume the useful-results target', async () => {
    const links = Array.from({length: 9}, (_,i) => ({url: media(i)}));
    const h = load('movix-catalogues', catalogues(links).concat([{match: 'https://media.example/', body: u => playlist(Number(u.match(/example\/(\d+)/)[1]) < 6 ? '640x360' : '1280x720')}]));
    const items = await h.run(); assert.equal(items.length, 3);
    const s = h.events.find(e => e.stage === 'selection').data;
    assert.equal(s.attempted, 9); assert.equal(s.filtered, 6); assert.equal(s.returned, 3);
});
test('VOSTFR has an opportunity before a long VF list reaches its result target', async () => {
    const vf = Array.from({length: 10}, (_,i) => ({url: media('fr'+i)}));
    const h = load('movix-catalogues', catalogues(vf, [{url: media('sub')}]).concat([
        {match: media('sub'), body: playlist('1280x720','en')}, {match: 'https://media.example/', body: playlist()},
    ]));
    const items = await h.run(); assert.ok(items.some(x => x.language === 'VOSTFR')); assert.ok(items.some(x => x.language === 'VF'));
    assert.equal(h.events.find(e => e.stage === 'selection').data.attempted, 3);
});
test('actual French audio does not satisfy a misleading VOSTFR category and later VOSTFR is tried', async () => {
    const h = load('movix-catalogues', catalogues([{url: media('vf')},{url: media('vf2')},{url: media('vf3')}], [{url: media('wrong')},{url: media('sub')}]).concat([
        {match: media('sub'), body: playlist('1280x720','en')}, {match: 'https://media.example/', body: playlist()},
    ]));
    const items = await h.run(); assert.ok(items.some(x => x.url === media('sub') && x.language === 'VOSTFR'));
});
test('known direct sources are resolved before slower challenge-prone hosts', async () => {
    const h = load('movix-catalogues', catalogues([{url:'https://dood.so/e/challenge'}, ...[1,2,3].map(i => ({url:`https://media.example/${i}.mp4`}))]));
    assert.equal((await h.run()).length,3); assert.equal(h.calls.length,3);
    const s = h.events.find(e => e.stage === 'selection').data; assert.equal(s.remaining,1); assert.equal(s.stop,'target-reached');
});
test('a captcha script does not hide media already exposed publicly in the same page',async()=>{
    const h=load('movix-catalogues',catalogues([{url:'https://uqload.vc/embed-public.html'}]).concat([
        {match:'uqload.vc/',body:'<script src="https://captcha.example/widget.js"></script>sources:[{file:"https://media.example/public.mp4"}]'},
    ]));
    const items=await h.run();assert.equal(items.length,1);assert.equal(items[0].url,'https://media.example/public.mp4');
});
test('duplicate media outputs never inflate the target; duplicate player captions merge', async () => {
    const links = [1,2,3,4,5].map(i => ({url:`https://uqload.vc/embed-${i}.html`}));
    links.push({...links[0],subtitles:[{url:'https://subs.example/fr.vtt',language:'fr'}]});
    const h = load('movix-catalogues', catalogues(links).concat([
        {match:'uqload.vc/embed-',body:u=>'sources:[{file:"'+media(Number(u.match(/embed-(\d+)/)[1])<4?'same':u.match(/embed-(\d+)/)[1])+'"}]'},
        {match:'https://media.example/',body:playlist()},
    ]));
    const items=await h.run(); assert.equal(items.length,3); assert.equal(items[0].subtitles[0].name,'Français');
    const s=h.events.find(e=>e.stage==='selection').data;assert.equal(s.duplicates,1);assert.equal(s.duplicateResults,2);assert.equal(s.attempted,5);
});
test('a full outage stops at the request budget and returns an explicit stop reason', async () => {
    const h=load('movix-catalogues',catalogues(Array.from({length:40},(_,i)=>({url:`https://uqload.vc/embed-${i}.html`}))).concat([
        {match:'uqload.vc/',error:true},
    ]));
    assert.equal((await h.run()).length,0);assert.equal(h.calls.length,24);
    assert.equal(h.events.find(e=>e.stage==='selection').data.stop,'request-budget');
});
test('elapsed budget prevents further HTTP and preserves a partial result', async () => {
    const h=load('movix-catalogues',catalogues([{url:media('first'),quality:'720p'},...Array.from({length:8},(_,i)=>({url:`https://uqload.vc/embed-${i}.html`}))]).concat([
        {match:media('first'),body:playlist(),advance:45001},
        {match:'uqload.vc/',error:true},
    ]));
    const items=await h.run();assert.equal(items.length,1);assert.equal(h.calls.length,6);
    assert.ok(h.calls.every(call => call.at === 1000), 'Only already-started batch work may finish after the elapsed budget');
    assert.equal(h.events.find(e=>e.stage==='selection').data.stop,'time-budget');
});
for(const status of [401,403,404,408,410,429,500,502,503,504]) test(`confirmed HLS HTTP ${status} is replaced by another candidate`,async()=>{
    const h=load('movix-catalogues',catalogues([{url:media('denied')},{url:media('good')}]).concat([
        {match:media('denied'),status,body:'Unavailable'},{match:media('good'),body:playlist()},
    ]));
    const items=await h.run();assert.equal(items.length,1);assert.equal(items[0].url,media('good'));
    assert.equal(h.events.find(e=>e.stage==='selection').data.unavailable,1);
});
test('an HTML page returned as HTTP 200 is not counted as a qualifying HLS source',async()=>{
    const h=load('movix-catalogues',catalogues([{url:media('html')},{url:media('good')}]).concat([
        {match:media('html'),body:'<html>Temporarily unavailable</html>'},{match:media('good'),body:playlist()},
    ]));
    const items=await h.run();assert.equal(items.length,1);assert.equal(items[0].url,media('good'));
    assert.equal(h.events.find(e=>e.stage==='selection').data.unavailable,1);
});
function extraRoutes(data={success:true,type:'movie',data:{id:movie,links:[]}}){return[
    {match:'/api/links/',body:data},{match:'/api/swiftflow/',body:{success:false,tmdb_id:movie}},
    {match:'/3/',body:{title:'Fixture',imdb_id:'tt1234567',external_ids:{imdb_id:'tt1234567'}}},
    {match:'/api/imdb/',body:{player_links:[]}},
];}
function seekCipher(payload){const c=crypto.createCipheriv('aes-128-cbc',Buffer.from('kiemtienmua911ca'),Buffer.from('1234567890oiuytr'));return Buffer.concat([c.update(JSON.stringify(payload),'utf8'),c.final()]).toString('hex');}
test('SeekStreaming decrypts a native payload without WebCrypto, a webpage or timers',async()=>{
    const data={success:true,type:'movie',data:{id:movie,links:['https://neocine.embedseek.com/#abc']}};
    const h=load('movix-extra',extraRoutes(data).concat([
        {match:'/api/v1/video?',body:seekCipher({title:'Français 日本語',cfNative:media('seek'),source:'https://unneeded.example/backup.m3u8'})},
        {match:media('seek'),body:playlist()+'\n#EXT-X-MEDIA:TYPE=SUBTITLES,LANGUAGE="fr",NAME="Français",URI="fr.vtt"'},
    ]),{key:'fixture'});
    const items=await h.run();assert.equal(items.length,1);assert.equal(items[0].quality,'720p');assert.equal(items[0].subtitles[0].name,'Français');
    assert.equal(items[0].headers.Origin,'https://neocine.embedseek.com');assert.ok(!h.calls.some(x=>x.url.includes('unneeded.example')));
    assert.equal(h.calls.filter(x=>x.url.includes('/api/v1/video?')).length,1);
});
test('SeekStreaming uses the public source when cfNative is absent and rejects malformed ciphertext',async()=>{
    const links=['https://neocine.embedseek.com/#good','https://neocine.embedseek.com/#broken'];
    const h=load('movix-extra',extraRoutes({success:true,type:'movie',data:{id:movie,links}}).concat([
        {match:'id=good&',body:seekCipher({source:media('good')})},{match:'id=broken&',body:'not encrypted'},
        {match:media('good'),body:playlist()},
    ]),{key:'fixture'});
    const items=await h.run();assert.equal(items.length,1);assert.equal(items[0].url,media('good'));
});
test('custom TV rows must match the exact TMDB, season zero and episode',async()=>{
    const h=load('movix-extra',extraRoutes({success:true,type:'tv',data:[
        {series_id:movie,season_number:0,episode_number:2,links:['https://media.example/good.mp4']},
        {series_id:movie,season_number:1,episode_number:2,links:['https://media.example/wrong-season.mp4']},
        {series_id:movie,season_number:0,episode_number:1,links:['https://media.example/wrong-episode.mp4']},
        {series_id:'99',season_number:0,episode_number:2,links:['https://media.example/wrong-show.mp4']},
        {series_id:movie,season_number:null,episode_number:2,links:['https://media.example/missing-season.mp4']},
    ]}));
    const items=await h.run(movie,'tv',0,2);assert.equal(items.length,1);assert.equal(items[0].url,'https://media.example/good.mp4');
});
test('Omega TV rejects the wrong show returned by the upstream cache',async()=>{
    const routes=extraRoutes({success:false});routes[routes.length-1].body={type:'tv',series:[
        {tmdb_data:{id:99},seasons:[{number:1,episodes:[{number:'1',versions:{vf:[{link:'https://media.example/wrong.mp4'}]}}]}]},
        {tmdb_data:{id:movie},seasons:[{number:0,episodes:[{number:'2',versions:{vostfr:[{link:'https://media.example/good.mp4'}]}},{number:'1',versions:{vf:[{link:'https://media.example/wrong-episode.mp4'}]}}]}]},
    ]};
    const h=load('movix-extra',routes,{key:'fixture'});const items=await h.run(movie,'tv',0,2);
    assert.equal(items.length,1);assert.equal(items[0].url,'https://media.example/good.mp4');assert.equal(items[0].language,'VOSTFR');
    assert.ok(h.events.some(e=>e.stage==='source-rejected'&&e.data.reason==='tmdb-mismatch'));
});
test('SwiftFlux availability is diagnosed without requesting a verification-gated URL',async()=>{
    const routes=extraRoutes({success:false});routes[1].body={success:true,tmdb_id:movie,players:{vf:[{url:'https://blinkflux.lol/embed/fixture',name:'SwiftFlow'}]},mp4:{available:true,entries:[{index:0}]}};
    const h=load('movix-extra',routes);assert.equal((await h.run()).length,0);
    assert.ok(h.events.some(e=>e.stage==='source-unavailable'&&e.data.reason==='browser-verification-required'));
    assert.ok(h.calls.every(x=>!x.url.includes('/mp4/resolve')));
});
