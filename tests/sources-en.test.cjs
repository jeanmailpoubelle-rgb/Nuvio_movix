const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {response,signed,config,fixtures}=require('./helpers/sources-en.cjs');
const MapEpisodes=require('../src/sources-en/mapping');
const Playlist=require('../src/sources-en/playlist');
function load(options={}) {
  const calls=[],logs=[];
  const ctx=vm.createContext({module:{exports:{}},URL,TMDB_API_KEY:'fixture-key',SCRAPER_ID:options.scraperId||'https://repo.example/manifest.json:sources-en-anipm',SCRAPER_SETTINGS:options.settings===null?{}:{...fixtures.settings,diagnostics:true,...options.settings},
    console:{log:(...x)=>logs.push(x.join(' '))},fetch:async(url,opts)=>{
      calls.push({url,opts});let value=options.respond?options.respond(url,opts):response(url,options),status=200;
      const headers=value.__fixture_response?.headers||{};
      const finalUrl=value.__fixture_response?.url||url;
      if(value.__fixture_response){status=value.__fixture_response.status;value=value.__fixture_response.body;}
      return {ok:status===200,status,url:finalUrl,headers:{get:name=>headers[name.toLowerCase()]||null},text:async()=>typeof value==='string'?value:JSON.stringify(value)};
    }});
  vm.runInContext(fs.readFileSync('plugins/sources-en/providers/sources-en.js','utf8'),ctx);
  return {calls,logs,run:()=>ctx.module.exports.getStreams((options.series||fixtures.fixtures[0]).tmdbId,'tv',...(options.at||[2,72])),ctx};
}
test('EN preserves signed masters, low quality, relevant captions and actual audio',async()=>{
  const t=load(),r=await t.run();assert.equal(r.length,2);assert.equal(r[0].quality,'360p');
  assert.ok(r.every(x=>x.url.startsWith(signed)&&x.format==='m3u8'));
  assert.ok(r.every(x=>x.type==='hls'));
  assert.deepEqual(Array.from(r[0].subtitleLanguages),['en','fr']);
  assert.equal(r[0].subtitles[0].url,'https://media.settlar.io/sub.vtt?sig=keep%2F&x=1+2');
  assert.ok(r[0].size.includes('TVDB S2E72 → Ani.pm E130'));
  assert.ok(!JSON.stringify(r).includes('private-grant'));
  assert.ok(!JSON.stringify(t.logs).includes('private-fixture'));
  assert.ok(!t.calls.some(x=>x.opts.headers?.Referer?.includes('input.example')));
});
test('EN explicitly hands extensionless signed HLS masters to the Mobile player as HLS',async()=>{
  const t=load(),streams=await t.run();
  for(const stream of streams) {
    assert.ok(!/\.m3u8(?:\?|$)/.test(stream.url));
    // The app imports PluginRuntimeResult.type into StreamItem.streamType;
    // `format` is ignored. Exercise that public boundary independently of HTTP.
    const imported=JSON.parse(JSON.stringify({url:stream.url,type:stream.type,headers:stream.headers}));
    assert.equal(imported.type,'hls');assert.ok(imported.url.startsWith(signed));
    assert.equal(imported.headers['User-Agent'],config.userAgent);
  }
  assert.ok(!t.calls.some(c=>c.url.startsWith('https://pengu.uk/')));
});
test('EN keeps one consolidated multi-audio master without stripping tracks',async()=>{
  const r=await load({multi:true}).run();assert.equal(r.length,1);assert.equal(r[0].url,signed);
  assert.deepEqual(Array.from(r[0].audioLanguages),['ja','en','fr']);assert.equal(r[0].audioLanguage,'MULTI');
  assert.match(r[0].size,/Audio : Japonais \(original\) · Français · Anglais/);assert.ok(!r[0].size.includes('Espagnol'));
});
test('EN hides original audio without usable preferred subtitles, while English dub survives',async()=>{
  assert.equal((await load({subOnly:true,noSubs:true}).run()).length,0);
  assert.equal((await load({subOnly:true,signsOnly:true}).run()).length,0);
  const r=await load({noSubs:true}).run();assert.equal(r.length,1);assert.deepEqual(Array.from(r[0].audioLanguages),['en']);
  assert.match(r[0].size,/aucun FR\/EN/);
});
test('EN recognizes non-Japanese original audio and rejects unrelated-only/unknown tracks',async()=>{
  assert.equal((await load({subOnly:true,original:'zh'}).run()).length,1);
  assert.equal((await load({foreignAudio:true}).run()).length,0);
  assert.equal((await load({unknownAudio:true}).run()).length,0);
});
test('EN unconfigured and foreign entry calls stop before network; mapping conflict prevents sessions',async()=>{
  for(const options of [{settings:null},{scraperId:'repo:other'}]){const t=load(options);assert.equal((await t.run()).length,0);assert.equal(t.calls.length,0);}
  for(const options of [{wrongEpisode:true},{wrongBootstrap:true},{foreignMedia:true},{deadPlaylist:true}]){
    const t=load(options);assert.equal((await t.run()).length,0);
    if(options.wrongEpisode)assert.ok(!t.calls.some(x=>x.url.includes('playback-bootstrap')));
    if(options.foreignMedia)assert.ok(!t.calls.some(x=>x.url.startsWith('https://foreign.example')));
  }
  const wrongProvider=load({meta:{_metaProvider:'tmdb'}});assert.equal((await wrongProvider.run()).length,0);
  assert.ok(wrongProvider.logs.some(s=>s.includes('EN_INPUT_PROVIDER_MISMATCH')));
  assert.ok(!wrongProvider.calls.some(c=>c.url.includes('playback-bootstrap')));
});
test('EN unknown quality stays unlabeled and every lookup gets fresh grants',async()=>{
  const t=load({unknownQuality:true}),r=await t.run();assert.equal(r.length,2);assert.ok(!r[0].quality);assert.ok(!r[0].name.includes('HD'));
  await t.run();assert.equal(t.calls.filter(x=>x.url.includes('/settlar/session?')).length,4);
});
test('EN missing explicit episode IDs require corroborated aired coordinates and a unique release',async()=>{
  const t=load({series:fixtures.fixtures.find(f=>f.name==='aot'),at:[4,1]});
  const r=await t.run();assert.equal(r.length,2);
  assert.ok(t.logs.some(s=>s.includes('"anilistId":110277')));
});
test('EN explicit TMDB order maps a combined Jujutsu season without applying TVDB numbering',async()=>{
  const f=fixtures.fixtures.find(f=>f.name==='jujutsu'),v=f.episodes.find(v=>v.input[0]===2&&v.input[1]===1);
  const t=load({series:f,settings:{inputMetadataProvider:'tmdb'},respond:url=>{
    if(url.startsWith('https://input.example/'))return {meta:{...fixtures.input(f),_metaProvider:'tmdb',videos:[{id:f.imdbId+':2:1',season:1,episode:25,released:v.released,_tvdbEpisodeId:v.tvdbEpisodeId}]}};
    return response(url,{series:f,at:[2,1]});
  }});
  const r=await t.ctx.module.exports.getStreams(f.tmdbId,'tv',1,25);assert.equal(r.length,2);
  assert.ok(t.logs.some(s=>s.includes('"anilistId":145064')));
  assert.ok(r[0].size.includes('TMDB S1E25 → Ani.pm E1'));
});
test('published ranges uniquely cover all forty existing TVDB fixtures, including split cour seasons',()=>{
  for(const f of require('./fixtures/sources-en-mapping.json').cases){
    const shard=require('../plugins/sources-en/data/'+config.mappingRevision+'/tvdb_show/'+String(Number(f.tvdbId)%64).padStart(2,'0')+'.json');
    const m=MapEpisodes.target(shard.rows['tvdb_show:'+f.tvdbId+':s'+f.input[0]],f.input[1]);assert.deepEqual(m,{anilistId:f.anilistId,episode:f.episode});
  }
  for(const rules of [{},{'anilist:1':{}},{'anilist:1':{'1-2':'1-4|2'}},{'anilist:1':{'1-2':'1-2'},'anilist:2':{'1-2':'1-2'}}])assert.throws(()=>MapEpisodes.target(rules,1));
});
test('EN range and HLS parsing fail closed for non-contiguous mappings and unavailable masters',()=>{
  assert.throws(()=>MapEpisodes.target({'anilist:1':{'1-12':'1-6,8-13'}},7));
  assert.throws(()=>Playlist.parse('<html>challenge</html>',signed));
  assert.throws(()=>Playlist.parse('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\n#gone',signed));
  const p=Playlist.parse('#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1920x1080,AUDIO="a"\nv.m3u8\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="unused",LANGUAGE="en"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="japanese"',signed);
  assert.deepEqual(p.audioLanguages,['ja']);assert.equal(p.height,1080);
});
test('EN anime films use typed movie mapping without a private metadata request',async()=>{
  const t=load({settings:null,respond:url=>{
    if(url.startsWith(config.tmdbApi+'/movie/372058'))return {id:372058,original_language:'ja',external_ids:{imdb_id:'tt5311514'}};
    if(url.startsWith(config.mappingBaseUrl+'/'))return JSON.parse(fs.readFileSync('plugins/sources-en/data/'+url.split(config.mappingBaseUrl+'/')[1]));
    if(url.includes('/playback-bootstrap/anilist/21519?'))return {core:{anilistId:21519},episode:1,settlarSelection:'film-grant',anipmPackages:{episodes:{1:{sub:true,dub:false}}}};
    if(url.includes('/settlar/session?'))return {embedUrl:config.embedOrigin+'/embed/v1?t=film'};
    if(url.startsWith(config.embedOrigin))return {source:signed,kind:'hls',audioLang:'ja',subtitles:[{url:'https://media.settlar.io/en.vtt',srclang:'en',label:'English'}]};
    if(url===signed)return '#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1920x1080,BANDWIDTH=1\nvideo.m3u8';
    throw Error('Unexpected film endpoint');
  }});
  const r=await t.ctx.module.exports.getStreams('372058','movie');assert.equal(r.length,1);assert.equal(r[0].quality,'1080p');
  assert.ok(!t.calls.some(c=>c.url.startsWith('https://input.example')||c.url.includes('/tv/')));
});
test('EN rejects known identity/date conflicts instead of reusing same coordinates',()=>{
  const state={ids:{tvdbId:'252322'},provider:'tvdb',video:{_tvdbEpisodeId:'4884760',released:'2014-05-21'},meta:{videos:[]}};
  const mapped={anilistId:11061,episode:130};
  for(const data of [{mappings:{anilist_id:1}},{mappings:{anilist_id:11061},episodes:{130:{tvdbShowId:252322,tvdbId:1}}}])assert.throws(()=>MapEpisodes.corroborate(state,mapped,data));
  const noID={...state,video:{season:2,episode:72,released:'2014-05-21'},meta:{videos:[{released:'2014-05-21'}]}};
  assert.throws(()=>MapEpisodes.corroborate(noID,mapped,{mappings:{anilist_id:11061},episodes:{130:{tvdbShowId:252322,seasonNumber:2,episodeNumber:72,airDate:'2014-06-21'}}}));
});
test('EN pinned shard bytes match their revision index and contain no title-specific overrides',()=>{
  const crypto=require('node:crypto'),base='plugins/sources-en/data/'+config.mappingRevision+'/',index=JSON.parse(fs.readFileSync(base+'index.json'));
  assert.equal(index.source_sha256.slice(0,16),config.mappingRevision);assert.equal(Object.keys(index.files).length,192);
  for(const [file,hash] of Object.entries(index.files)){
    const bytes=fs.readFileSync(base+file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash);
    const shard=JSON.parse(bytes);assert.equal(shard.revision,config.mappingRevision);assert.equal(shard.schema,1);
  }
});
test('EN diagnostic reports exact blocked stage without playable or private URLs',async()=>{
  const t=load({scraperId:'repo:sources-en-diagnostic',respond:url=>url.includes('/playback-bootstrap/')?{__fixture_response:{status:403,body:'private-error-body'}}:response(url)});
  assert.equal((await t.run()).length,0);assert.equal(t.calls.length,0);
  const r=await t.ctx.module.exports.getStreams('603','movie');
  assert.ok(r.length<=8);assert.equal(r[0].name,'Bilan');assert.equal(r[1].name,'Cause');
  assert.equal(r[1].url,'diagnostic:EN_HTTP_UNAVAILABLE');assert.equal(r[2].name,'Ani.pm bootstrap');
  assert.ok(r.some(row=>row.name==='Ani.pm bootstrap'&&row.url==='diagnostic:HTTP 403'));
  assert.ok(r.some(row=>row.name==='Épisode confirmé'&&row.url.includes('AniList 11061 / E130')));
  assert.ok(r.every(row=>row.type==='diagnostic'&&row.url.startsWith('diagnostic:')));
  for(const secret of ['private-fixture','private-grant','private-error-body','api_key=','sig='])assert.ok(!JSON.stringify(r).includes(secret));
});
test('EN successful diagnostic fits Mobile eight-row limit with final playback stage visible',async()=>{
  const t=load({scraperId:'repo:sources-en-diagnostic'}),r=await t.ctx.module.exports.getStreams('603','movie');
  assert.ok(r.length<=8);assert.match(r[0].url,/2 lien/);assert.equal(r[1].url,'diagnostic:Aucune erreur détectée');
  assert.equal(r[2].name,'Playlist vidéo');assert.ok(r.some(x=>x.name==='Épisode confirmé'));
});
test('EN uses no-referrer JSON requests and adds no healthy session preflight',async()=>{
  const t=load();assert.equal((await t.run()).length,2);
  const requests=t.calls.filter(c=>c.url.startsWith(config.embedOrigin));assert.equal(requests.length,2);
  for(const c of requests){assert.match(c.opts.headers['User-Agent'],/Chrome\/\d+\.0\.0\.0 Safari\/537\.36/);assert.equal(c.opts.headers.Accept,'application/json');assert.equal(c.opts.headers.Origin,undefined);assert.equal(c.opts.headers.Referer,undefined);assert.equal(c.opts.headers.Cookie,undefined);}
});
test('EN retries denied sessions once with document cookies scoped to the same channel and lookup',async()=>{
  const attempts={};
  const t=load({respond:(url,opts)=>{
    if(url.startsWith(config.embedOrigin+'/embed/v1?'))return {__fixture_response:{status:200,headers:{'set-cookie':'binding='+url.split('t=')[1]+'; Path=/; Secure; HttpOnly, parent=valid; Domain=.settlar.io; Path=/api, foreign=bad; Domain=evil.example; Path=/, wrongpath=bad; Path=/embed, defaultpath=bad, deleted=bad; Max-Age=0; Path=/, dated=valid; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/'},body:'<html>discarded-private-document</html>'}};
    if(url.startsWith(config.embedOrigin+'/api/embed/session?')) {
      attempts[url]=(attempts[url]||0)+1;
      if(attempts[url]%2===1){assert.equal(opts.headers.Cookie,undefined);return {__fixture_response:{status:403,body:'private-denial'}};}
      assert.equal(opts.headers.Cookie,'binding='+url.split('t=')[1]+'; parent=valid; dated=valid');
    }else assert.equal(opts.headers.Cookie,undefined);
    return response(url);
  }});
  for(let n=0;n<2;n++)assert.equal((await t.run()).length,2);
  assert.equal(t.calls.filter(c=>c.url.includes('/embed/v1?')).length,4);
  for(const secret of ['binding=','private-denial','discarded-private-document'])assert.ok(!JSON.stringify(t.logs).includes(secret));
});
test('EN persistent session denial stays bounded and diagnostic shows access denial without media',async()=>{
  const t=load({scraperId:'repo:sources-en-diagnostic',respond:url=>{
    if(url.startsWith(config.embedOrigin+'/embed/v1?'))return '<html>no scripts executed</html>';
    if(url.startsWith(config.embedOrigin+'/api/embed/session?'))return {__fixture_response:{status:403,body:'private-denial'}};
    return response(url);
  }});
  const r=await t.ctx.module.exports.getStreams('603','movie');
  assert.match(r[0].url,/0 lien/);assert.match(r[1].url,/EN_SETTLAR_ACCESS_DENIED/);assert.equal(r[2].name,'Lecteur Settlar');
  assert.equal(t.calls.filter(c=>c.url.includes('/api/embed/session?')).length,4);assert.equal(t.calls.filter(c=>c.url.includes('/embed/v1?')).length,2);
  assert.ok(!t.calls.some(c=>c.url.startsWith('https://media.settlar.io')));assert.ok(r.length<=8);
});
test('EN does not retry rate limits, other errors or untrusted document redirects',async()=>{
  for(const status of [401,404,429,503]){
    const t=load({respond:url=>url.startsWith(config.embedOrigin+'/api/embed/session?')?{__fixture_response:{status,body:''}}:response(url)});
    assert.equal((await t.run()).length,0);assert.equal(t.calls.filter(c=>c.url.startsWith(config.embedOrigin)).length,2);
  }
  const redirected=load({respond:url=>{
    if(url.startsWith(config.embedOrigin+'/api/embed/session?'))return {__fixture_response:{status:403,body:''}};
    if(url.startsWith(config.embedOrigin+'/embed/v1?'))return {__fixture_response:{status:200,url:'https://foreign.example/',headers:{'set-cookie':'bad=foreign; Path=/'},body:''}};
    return response(url);
  }});
  assert.equal((await redirected.run()).length,0);assert.equal(redirected.calls.filter(c=>c.url.includes('/api/embed/session?')).length,2);
  assert.ok(redirected.logs.some(s=>s.includes('EN_ORIGIN_CHANGED')));
});
test('EN classifies denied Settlar responses without exposing response content or headers',async()=>{
  for(const [body,headers,expected] of [
    ['<html>private-error-body /cdn-cgi/challenge-platform/private-token</html>',{},'challenge navigateur'],
    ['private-error-body',{'cf-mitigated':'challenge','set-cookie':'private-cookie'},'challenge navigateur'],
    ['{"error":"private-error-body","ip":"private-ip"}',{},'JSON'],
    ['<html>private-error-body</html>',{},'HTML'],
    ['private-error-body',{},'TEXT']
  ]) {
    const t=load({scraperId:'repo:sources-en-diagnostic',respond:url=>url.startsWith(config.embedOrigin)?{__fixture_response:{status:403,headers,body}}:response(url)});
    const r=await t.ctx.module.exports.getStreams('603','movie');
    assert.match(r[1].url,/EN_SETTLAR_ACCESS_DENIED/);assert.ok(r[2].url.includes('['+expected+']'));assert.equal(r[3].name,'Initialisation Settlar');
    assert.equal(t.calls.filter(c=>c.url.startsWith(config.embedOrigin)).length,4);assert.ok(r.length<=8);
    for(const secret of ['private-error-body','private-token','private-cookie','private-ip','cdn-cgi'])assert.ok(!JSON.stringify([r,t.logs]).includes(secret));
  }
});
