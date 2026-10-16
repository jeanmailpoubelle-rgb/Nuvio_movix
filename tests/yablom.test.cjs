const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const primary = 'https://xatobam.com', secondary = 'https://pirvab.com';
const search = primary + '/1564e60/home/xatobam';
const movie = primary + '/1564e60/b/xatobam/12';
const player = 'https://sharecloudy.com/iframe/fixture';
const media = 'https://share123.sharecloudy.com/master.m3u8?b=%2F&a=1&a=2';
const metadata = {title:'Matrix', original_title:'Matrix', release_date:'1999-03-31'};
const form = (url=search, value='Matrix') => `<form method="post" action="${url}"><input name="searchword" value="${value}"></form>`;
const card = (url=movie, title='Matrix', year=1999, extra='') => `<a class="film-card" href="${url}"><img alt="${title}"><div class="film-card-title">${title}</div><span class="trend-card-date">${year}</span>${extra}</a>`;
const page = (title='Matrix (1999)', embed=player) => `<div id="film-player"><iframe src="${embed}"></iframe></div><div class="film-detail-header"><div class="film-detail-title">${title}</div></div>`;
const playlist = '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="fr"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="en"\n#EXT-X-STREAM-INF:RESOLUTION=1280x720,BANDWIDTH=2000000,AUDIO="a"\nvideo.m3u8';
function routes(options={}) {
    return [{url:/api\.themoviedb\.org/,body:options.metadata || metadata},
        {url:search,body:options.results ?? form()+card()},
        {url:movie,body:options.page ?? page()},
        {url:player,body:options.player ?? `globalThis.executed = true; jwplayer('v').setup({playlist:[{sources:[{file:'${media}',label:'HD'}]}]});`},
        {url:media,body:options.playlist ?? playlist}];
}
function load(entries, settings={}) {
    const calls=[], logs=[];
    const context=vm.createContext({module:{exports:{}},TMDB_API_KEY:'fixture',SCRAPER_SETTINGS:settings,
        console:{warn:value=>logs.push(value)}, setTimeout(){throw Error('No timers');},
        fetch:async(url,options)=>{
            calls.push({url,options});
            const route=entries.find(r=>r.url instanceof RegExp ? r.url.test(url) : r.url===url);
            if(!route)throw Error('Unexpected request');
            if(route.error)throw Error(route.error);
            const body=typeof route.body==='function'?route.body(url,options):route.body;
            return {url:route.final || url,status:route.status || 200,ok:!route.status || route.status<400,
                text:async()=>typeof body==='string'?body:JSON.stringify(body)};
        }});
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../providers/yablom.js'),'utf8'),context);
    return {calls,logs,context,run:(...args)=>context.module.exports.getStreams(...args)};
}
test('Yablom healthy path is five requests with POST search, verified audio and signed bytes intact',async()=>{
    const h=load(routes()); const [item]=await h.run('603','movie');
    assert.equal(h.calls.length,5); assert.equal(h.calls[1].url,search);
    assert.equal(h.calls[1].options.method,'POST'); assert.equal(h.calls[1].options.body,'searchword=Matrix');
    assert.equal(item.url,media); assert.equal(item.quality,'720p'); assert.equal(item.language,'MULTI');
    assert.equal(item.headers.Referer,'https://sharecloudy.com/'); assert.equal(item.headers.Origin,'https://sharecloudy.com');
    assert.equal(h.context.executed,undefined); assert.ok(!h.logs.join('').includes('b=%2F'));
});
test('Yablom uses its configured VF hint while keeping unknown resolution unlabelled',async()=>{
    const h=load(routes({playlist:'#EXTM3U\n#EXTINF:10,\nsegment.ts'}));
    const [item]=await h.run('603','movie');
    assert.equal(item.name,'Yablom / ShareCloudy | VF'); assert.ok(!('quality' in item)); assert.equal(item.language,'VF');
    assert.equal(h.calls.length,5);
});
test('Yablom actual foreign audio overrides the catalogue VF default',async()=>{
    const h=load(routes({playlist:'#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="en"\n#EXT-X-STREAM-INF:RESOLUTION=1280x720,BANDWIDTH=1000000,AUDIO="a"\nvideo.m3u8'}));
    const [item]=await h.run('603','movie');assert.equal(item.language,'VO'); assert.equal(item.quality,'720p');
    assert.equal(h.calls.length,5);
});
test('Yablom explicit release languages override the default even without HLS audio groups',async()=>{
    for (const language of ['MULTI','VOSTFR']) {
        const h=load(routes({player:`<title>Fixture.${language}.mkv.mp4</title>sources:[{file:'${media}'}]`,playlist:'#EXTM3U\n#EXTINF:10,\nsegment.ts'}));
        const [item]=await h.run('603','movie');assert.equal(item.language,language);assert.ok(!('quality' in item));assert.equal(h.calls.length,5);
    }
});
test('Yablom filters measured low resolution and does not refetch the same film through mirrors',async()=>{
    const h=load(routes({playlist:playlist.replace('1280x720','640x360')}));
    assert.equal((await h.run('603','movie')).length,0); assert.equal(h.calls.length,5);
});
test('Yablom unlabelled unsupported player returns empty without domain fanout',async()=>{
    const h=load(routes({page:page('Matrix (1999)','https://unsupported.example/iframe/fixture')}));
    assert.equal((await h.run('603','movie')).length,0); assert.equal(h.calls.length,3);
});
test('Yablom rejects TV and invalid arguments before any metadata request',async()=>{
    const h=load([]);
    for(const args of [['108978','tv',4,1],['1399','series',0,3],['tt123','movie'],['1','anime']]) assert.equal((await h.run(...args)).length,0);
    assert.equal(h.calls.length,0);
});
test('Yablom valid search with no film is authoritative and avoids directories',async()=>{
    const h=load(routes({results:form()}));
    assert.equal((await h.run('603','movie')).length,0); assert.equal(h.calls.length,2);
});
test('Yablom uses the original title only after the French query has no match',async()=>{
    const h=load(routes({metadata:{...metadata,title:'Matrice'},results:(_url,options)=>options.body==='searchword=Matrice'?form(search,'Matrice'):form()+card()}));
    const [item]=await h.run('603','movie');assert.equal(item.quality,'720p');assert.equal(h.calls.length,6);
    assert.deepEqual(h.calls.filter(c=>c.url===search).map(c=>c.options.body),['searchword=Matrice','searchword=Matrix']);
});
test('Yablom matches the correct release and rejects a remake',async()=>{
    const h=load(routes({results:form()+card(primary+'/1564e60/b/xatobam/44','Matrix',2021)+card()}));
    assert.equal((await h.run('603','movie')).length,1);assert.equal(h.calls[2].url,movie);
});
test('Yablom rejects ambiguous exact matches without using the first result',async()=>{
    const h=load(routes({results:form()+card()+card(primary+'/1564e60/b/xatobam/45')}));
    assert.equal((await h.run('603','movie')).length,0);assert.equal(h.calls.length,2);
});
test('Yablom revalidates the film page before contacting a player',async()=>{
    const h=load(routes({page:page('Wrong movie (1999)')}));
    assert.equal((await h.run('603','movie')).length,0);assert.equal(h.calls.length,3);
});
test('Yablom alternate titles require poster and year correspondence on both search and film pages',async()=>{
    const poster='/exact-poster.jpg';
    for(const filmPoster of [poster,'/wrong-poster.jpg']) {
        const results=form()+card(movie,'Alternate title').replace('<img alt=',`<img src="https://image.tmdb.org/t/p/w500${poster}" alt=`);
        const detail=page('Alternate title (1999)').replace('<div class="film-detail-title">',`<a class="film-detail-poster"><img src="https://image.tmdb.org/t/p/w500${filmPoster}"></a><div class="film-detail-title">`);
        const h=load(routes({metadata:{...metadata,poster_path:poster},results,page:detail}));
        assert.equal((await h.run('603','movie')).length,filmPoster===poster?1:0);
        assert.equal(h.calls.length,filmPoster===poster?5:3);
    }
});
test('Yablom excludes foreign, nested and recommended movie links',async()=>{
    const h=load(routes({results:form()+card('https://foreign.example/1564e60/b/xatobam/12')+card(primary+'/1564e60/b/xatobam/nested/12')+card(movie,'Other film'),
        page:page()+'<iframe src="https://sharecloudy.com/iframe/recommended"></iframe>'}));
    assert.equal((await h.run('603','movie')).length,0);assert.equal(h.calls.length,2);
    const working=load(routes({page:page()+'<iframe src="https://sharecloudy.com/iframe/recommended"></iframe>'}));
    assert.equal((await working.run('603','movie')).length,1);assert.equal(working.calls.length,5);
});
test('Yablom passes actual player captions as Français with playback headers',async()=>{
    const h=load(routes({player:`playlist:[{sources:[{file:'${media}'}],tracks:[{file:'/subs/fr.vtt',kind:'captions',label:'Français'},{file:'/thumbs.vtt',kind:'thumbnails'}]}]`}));
    const [item]=await h.run('603','movie'); assert.equal(item.subtitles.length,1);
    assert.equal(item.subtitles[0].name,'Français'); assert.equal(item.subtitles[0].language,'fr');
    assert.equal(item.subtitles[0].url,'https://sharecloudy.com/subs/fr.vtt'); assert.equal(item.subtitles[0].headers.Origin,'https://sharecloudy.com');
    assert.equal(h.calls.length,5);
});
test('Yablom preserves explicit VOSTFR badges without reading recommendation or script labels',async()=>{
    const h=load(routes({results:form()+card(movie,'Matrix',1999,'<span class="film-card-vostfr">VOSTFR</span>'),playlist:'#EXTM3U\n#EXTINF:10,\nsegment.ts'}));
    assert.equal((await h.run('603','movie'))[0].language,'VOSTFR');
});
test('Yablom recovers a changed internal entry path then caches only the verified address',async()=>{
    const fresh=primary+'/newpath/home/xatobam';const freshMovie=primary+'/newpath/b/xatobam/12';let serial=0;
    const h=load([{url:search,status:404}, {url:primary+'/',body:'<a href="/newpath">Enter</a>'},
        {url:primary+'/newpath',final:fresh,body:form(fresh,'')},
        {url:fresh,body:form(fresh)+card(freshMovie)}, {url:freshMovie,body:page()},
        ...routes({player:()=>`sources:[{file:'https://cdn.example/fresh${++serial}.mp4'}]`})]);
    const [a]=await h.run('603','movie');const count=h.calls.length;const [b]=await h.run('603','movie');
    assert.equal(count,7);assert.equal(h.calls.length-count,4);assert.notEqual(a.url,b.url);
    assert.equal(h.calls.filter(c=>c.url===primary+'/').length,1);
});
test('Yablom follows an explicit domain announcement and validates the new search form',async()=>{
    const root='https://newcatalogue.example',route=root+'/entry/home/newbrand',detail=root+'/entry/b/newbrand/12';
    const h=load([{url:search,body:'<h1>NOTRE NOUVELLE ADRESSE</h1><p>newcatalogue.example</p>'},
        {url:root+'/',body:form(route,'')},{url:route,body:form(route)+card(detail)}, {url:detail,body:page()}, ...routes()]);
    assert.equal((await h.run('603','movie')).length,1);assert.equal(h.calls.length,7);
    assert.ok(!h.calls.some(c=>c.url.startsWith(secondary)));
});
test('Yablom branded address and scoped FMHY directory recover only after mirror failures',async()=>{
    for(const directory of ['brand','fmhy']) {
        const root='https://recovered.example',route=root+'/live/home/current',detail=root+'/live/b/current/12';
        const h=load([{url:search,status:503},{url:primary+'/',status:503},
            {url:secondary+'/f91ba98/home/pirvab',status:503},{url:secondary+'/',status:503},
            {url:'https://yablom.com/',body:directory==='brand'?`<main><a class="nom" href="${root}/">Current site</a></main>`:'<main>Unavailable</main>'},
            {url:'https://fmhy.net/non-english',body:`<h2 id="other"><a href="https://wrong.example/">yablom</a></h2><h2 id="french-francais">French<a href="${root}/">yablom</a><h2 id="next">`},
            {url:root+'/',body:form(route,'')},{url:route,body:form(route)+card(detail)}, {url:detail,body:page()},...routes()]);
        assert.equal((await h.run('603','movie')).length,1); assert.equal(h.calls.length,directory==='brand'?11:12);
        assert.ok(!h.calls.some(c=>c.url.startsWith('https://wrong.example/')));
    }
});
test('Yablom remembers a healthy secondary search address after the primary fails',async()=>{
    const route=secondary+'/f91ba98/home/pirvab',detail=secondary+'/f91ba98/b/pirvab/12';
    const h=load([{url:search,status:503},{url:primary+'/',status:503},
        {url:route,body:form(route)+card(detail)},{url:detail,body:page()},...routes()]);
    assert.equal((await h.run('603','movie')).length,1);const count=h.calls.length;
    assert.equal((await h.run('603','movie')).length,1);assert.equal(h.calls.length-count,5);
    assert.equal(h.calls.filter(c=>c.url===search).length,1);
});
test('Yablom loops, parked pages and cross-origin forms cannot produce media',async()=>{
    const h=load([{url:search,body:form('https://ads.example/x/home/ads')}, {url:primary+'/',body:'<p>Buy this domain</p>'},
        {url:secondary+'/f91ba98/home/pirvab',status:404},{url:secondary+'/',body:'Nouvelle adresse: xatobam.com'},
        {url:'https://yablom.com/',body:'<main><a class="nom" href="https://pirvab.com/">pirvab</a></main>'},
        {url:'https://fmhy.net/non-english',body:'<h2 id="french-francais"><a href="https://xatobam.com/">yablom</a>'},...routes()]);
    assert.equal((await h.run('603','movie')).length,0);assert.ok(h.calls.length<12);
    assert.ok(!h.calls.some(c=>c.url.startsWith('https://ads.example/')));
});
