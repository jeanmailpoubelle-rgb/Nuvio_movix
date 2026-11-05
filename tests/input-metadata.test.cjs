const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const Input=require('../src/input-metadata');
const {resolveSelection}=require('../src/anime-sama/native');
const {fixtures,settings,reference,input,cinemeta,find}=require('./helpers/input-metadata.cjs');
const ids=f=>({tmdbId:f.tmdbId,imdbId:f.imdbId});
function state(f=fixtures[0],n=0){const meta=input(f);return Input.select(meta,Input.identity(meta,ids(f)),...f.episodes[n].input);}
test('private manifest normalization preserves configured path/query bytes and rejects unsafe or wrong addresses',()=>{
  const conf=Input.configuration({...settings,aiometadataManifestUrl:'stremio://input.example/stremio/Case%2FValue/manifest.json?viewer=A%2Fb'});
  assert.equal(Input.requestUrl(conf,ids(fixtures[0])),'https://input.example/stremio/Case%2FValue/meta/series/tt2098220.json?viewer=A%2Fb');
  for(const url of ['', 'http://input.example/manifest.json','https://u:p@input.example/manifest.json','https://input.example/configure','https://input.example/../manifest.json','https://input.example/manifest.json#private'])
    assert.throws(()=>Input.configuration({...settings,aiometadataManifestUrl:url}),{code:'INPUT_METADATA_CONFIG_REQUIRED'});
});
test('series identity requires a known ID and rejects contradictory stamps and wrong media kinds',()=>{
  const f=fixtures[0],m=input(f);
  assert.equal(Input.identity(m,ids(f)).tvdbId,f.tvdbId);
  for(const patch of [{_tmdbId:'999'},{_imdbId:'tt9999999'},{id:'tmdb:999'},{type:'movie'}])assert.throws(()=>Input.identity({...m,...patch},ids(f)));
  assert.throws(()=>Input.identity({id:'tt9999999'},ids(f)));
});
test('native caller coordinates select displayed fields while retaining separately rewritten stream IDs',()=>{
  const f=fixtures[0],m=input(f),v=m.videos[1];v.id=f.imdbId+':1:59';
  const selected=Input.select(m,ids(f),2,1);assert.equal(selected.video,v);assert.deepEqual(selected.stream,{base:f.imdbId,season:1,episode:59});
  assert.throws(()=>Input.select({...m,videos:[v,{...v}]},ids(f),2,1));
  assert.throws(()=>Input.select({...m,videos:[{...v,id:'tt9999999:2:1'}]},ids(f),2,1));
});
test('trusted TVDB IDs are parsed without downloading artwork, including same-origin AIO blur URLs',()=>{
  const url='https://artworks.thetvdb.com/banners/v4/episode/123/screencap/a.jpg';
  assert.deepEqual(Input.tvdbEpisode({thumbnail:url}),{id:'123',basis:'artwork'});
  assert.equal(Input.tvdbEpisode({thumbnail:url.replace('artworks.thetvdb.com','artworks.thetvdb.com.evil.example')}),null);
  assert.equal(Input.tvdbEpisode({thumbnail:url.replace('https://','https://user@')}),null);
  assert.deepEqual(Input.tvdbEpisode({thumbnail:'https://input.example/api/image/blur?url='+encodeURIComponent(url)},'tvdb','https://input.example'),{id:'123',basis:'artwork'});
  assert.equal(Input.tvdbEpisode({thumbnail:'https://evil.example/api/image/blur?url='+encodeURIComponent(url)},'tvdb','https://input.example'),null);
});
test('localized TVDB episodes resolve by external IDs across unrelated series, seasons and formerly unmatched titles',async()=>{
  for(const f of fixtures)for(let n=0;n<f.episodes.length;n++){
    const mapped=await Input.resolve(state(f,n),reference(f),'nuvio-catalog',{findTvdb:async id=>find(f,id),cinemeta:async()=>cinemeta(f)});
    assert.deepEqual([mapped.season,mapped.episode],f.episodes[n].target);
    assert.match(mapped.basis,/^tvdb-/);
    const context=Input.targetContext(reference(f),reference(f).videos.find(v=>v.season===mapped.season&&v.episode===mapped.episode));
    assert.equal(context.strictNumbers,true);
  }
});
test('the same adapter is not limited to any baked series identity',async()=>{
  const f=JSON.parse(JSON.stringify(fixtures[0]));f.tmdbId='12345';f.imdbId='tt7654321';f.tvdbId='54321';
  for(const v of f.episodes){v.streamId=v.streamId.replace('tt2098220',f.imdbId);v.cinemeta.id=v.streamId;v.find.show_id=12345;}
  const mapped=await Input.resolve(state(f,1),reference(f),'nuvio-catalog',{findTvdb:async id=>find(f,id)});
  assert.deepEqual([mapped.season,mapped.episode],f.episodes[1].target);
});
test('artwork hints with conflicting dates need independent stream-ID corroboration',async()=>{
  const f=fixtures[0],s=state(f,0);
  await assert.rejects(Input.resolve(s,reference(f),'nuvio-catalog',{findTvdb:async id=>find(f,id)}),{code:'INPUT_METADATA_EPISODE_DATE_CONFLICT'});
  const mapped=await Input.resolve(s,reference(f),'nuvio-catalog',{findTvdb:async id=>find(f,id),cinemeta:async()=>cinemeta(f)});
  assert.equal(mapped.basis,'tvdb-id-with-stream-corroboration');
});
test('foreign, duplicate, missing or failed external mappings cannot select another episode',async()=>{
  const f=fixtures[0],s=state(f,1),entry=find(f,f.episodes[1].tvdbEpisodeId).tv_episode_results[0];
  for(const response of [{tv_episode_results:[]},{tv_episode_results:[{...entry,show_id:999}]},{tv_episode_results:[entry,entry]}])
    await assert.rejects(Input.resolve(s,reference(f),'nuvio-catalog',{findTvdb:async()=>response}));
  await assert.rejects(Input.resolve(s,reference(f),'nuvio-catalog',{findTvdb:async()=>{throw new Error('private transport');}}));
});
test('a TMDB-based AIO response maps rewritten stream IDs using authoritative displayed coordinates',async()=>{
  const f=fixtures[0],m=input(f),sample=f.episodes[1];m._metaProvider='tmdb';m.videos=m.videos.filter(v=>v.id===sample.streamId);
  Object.assign(m.videos[0],{season:sample.target[0],episode:sample.target[1]});
  const selected=Input.select(m,ids(f),...sample.target);
  const mapped=await Input.resolve(selected,reference(f),'nuvio-catalog');assert.deepEqual([mapped.season,mapped.episode],sample.target);
});
test('Cinemeta backends retain their own coordinates and match TVDB episode IDs without title language dependence',async()=>{
  const f=fixtures[0],s=state(f,4),mapped=await Input.resolve(s,cinemeta(f),'cinemeta');
  assert.deepEqual([mapped.season,mapped.episode],f.episodes[4].input);
});
function root(options={}) {
  const f=fixtures[0],calls=[],events=[],logs=[],config=JSON.parse(fs.readFileSync('config/endpoints.json')).episodeMapping;
  const a=reference(f),b=input(f);options.change?.(a,b);
  const context=vm.createContext({ENDPOINTS:{episodeMapping:config},InputMetadata:Input,TMDB_API_KEY:'fixture-key',Promise,Date,
    settings:()=>options.settings||settings,cleanTitle:s=>s.toLowerCase(),message:e=>e.message,event:(stage,data)=>events.push({stage,data}),
    requestJson:async(url,referer,stage,ctx,headers,transport)=>{
      calls.push({url,referer,transport});
      if(url.includes('/find/'))return find(f,/\/find\/(\d+)/.exec(url)[1]);
      if(url.startsWith('https://input.example/'))return {meta:b};
      if(url.includes('cinemeta'))return {meta:cinemeta(f)};
      return {meta:a};
    }});
  vm.runInContext(fs.readFileSync('src/episode-mapping.js','utf8'),context);
  return {f,context,calls,events,logs};
}
test('root workers map before querying, reuse metadata within a lookup, and never forward private Referer',async()=>{
  const h=root(),ctx={id:h.f.tmdbId,type:'tv',season:2,episode:27};let looked=[];
  for(const backend of ['primary','direct','custom'])await h.context.orderedEpisodeLookup(ctx,backend,async c=>{looked.push([c.season,c.episode]);return [];});
  assert.deepEqual(looked,[[2,85],[2,85],[2,85]]);assert.equal(ctx.episode,27);assert.equal(h.calls.length,3);
  assert.equal(h.calls.find(v=>v.url.startsWith('https://input.example')).referer,'');
  assert.equal(h.calls.find(v=>v.url.startsWith('https://input.example')).transport.sensitive,true);
  assert.ok(!JSON.stringify(h.events).includes('private-fixture'));
});
test('unverified backend policies skip requests; failed configured identity blocks worker fallback',async()=>{
  const h=root(),ctx={id:h.f.tmdbId,type:'tv',season:2,episode:27};let called=false;
  assert.equal((await h.context.orderedEpisodeLookup(ctx,'omega',async()=>{called=true;return ['wrong'];})).length,0);
  assert.equal(called,false);assert.equal(h.calls.length,0);
  const bad=root({change:(_a,b)=>{b._tmdbId='999';}}),c={...ctx};
  await assert.rejects(bad.context.orderedEpisodeLookup(c,'primary',async()=>{called=true;}));
  assert.equal(c.episodeOrderUnverified,true);assert.equal(called,false);assert.equal(bad.calls.length,2);
});
test('native mode, movies and specials add no AIO requests and no title-specific default exists',async()=>{
  for(const [opts,type,season] of [[{settings:{}},'tv',2],[{},'movie',2],[{},'tv',0]]){
    const h=root(opts),ctx={id:h.f.tmdbId,type,season,episode:72};
    assert.equal(await h.context.orderedEpisodeLookup(ctx,'primary',async c=>c),ctx);assert.equal(h.calls.length,0);
  }
  assert.equal(fs.existsSync('config/episode-orders.json'),false);
});
function anime(f) {
  const path='/catalogue/'+f.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'/',calls=[];
  const counts=f.name==='hunter'?[148]:f.name==='jujutsu'?[24,23,12]:[24,24,12];
  const groups=counts.map((_,i)=>({path:path+`saison${i+1}/`,name:'Season '+(i+1)}));
  const provider={config:{version:'all'},http:{request:async(url,options)=>{
    calls.push({url,options});
    if(url.includes('/find/'))return {body:JSON.stringify(find(f,/\/find\/(\d+)/.exec(url)[1]))};
    return {body:JSON.stringify({meta:url.startsWith('https://input.example/')?input(f):url.includes('cinemeta')?cinemeta(f):reference(f)})};
  }},details:async()=>({path,title:f.title,year:f.year,groups}),
  versions:async g=>['vf','vostfr'].map(language=>({path:g.path+language+'/',language,script:'fixture',episodes:Array.from({length:counts[groups.indexOf(g)]},(_,index)=>({number:index+1,index,servers:['https://player.example/'+index]}))}))};
  provider.version=async(g,l)=>(await provider.versions(g)).find(v=>v.language===l);
  return {provider,calls,path};
}
test('Anime-Sama translates all input fixtures before source selection, retaining both editions and canonical source groups',async()=>{
  for(const f of fixtures)for(const e of f.episodes){
    const h=anime(f),refs=await resolveSelection(h.provider,f.tmdbId,'tv',...e.input,settings,'fixture-key');
    const group=f.name==='hunter'?1:e.input[0],index=f.name==='hunter'?e.target[1]-1:e.input[1]-1;
    assert.deepEqual(refs.map(v=>[v.path,v.index]),['vf','vostfr'].map(l=>[h.path+`saison${group}/`+l+'/',index]));
    assert.equal(h.calls.filter(v=>v.url.startsWith('https://input.example/')).length,1);
    assert.equal(h.calls.find(v=>v.url.startsWith('https://input.example/')).options.sensitive,true);
  }
});
test('without AIOmetadata, Anime-Sama uses native canonical coordinates with no private or external-ID request',async()=>{
  const f=fixtures[0],h=anime(f);
  const refs=await resolveSelection(h.provider,f.tmdbId,'tv',2,130,{},'');
  assert.equal(refs[0].index,129);assert.equal(h.calls.length,1);
});

test('settings are exposed only on the five series entries and the dedicated Anime-Sama entries',()=>{
  const rootManifest=JSON.parse(fs.readFileSync('manifest.json'));
  for(const entry of rootManifest.scrapers.filter(v=>v.enabled)) {
    if(!entry.supportedTypes.includes('tv'))continue;
    assert.equal(entry.hasSettings,true);
    const api=require('../'+entry.filename),fields=api.onSettings();
    assert.ok(fields.some(v=>v.key==='episodeMetadataSource'));
    assert.ok(fields.some(v=>v.key==='aiometadataManifestUrl'));
  }
  const animeManifest=JSON.parse(fs.readFileSync('plugins/anime-sama/manifest.json'));
  assert.ok(animeManifest.scrapers.every(v=>v.hasSettings));
});
test('invalid source settings and missing credentials never silently select an input layout',async()=>{
  assert.throws(()=>Input.active({episodeMetadataSource:'guess'}));
  assert.throws(()=>Input.configuration({episodeMetadataSource:'aiometadata'}));
  const h=root({settings:{episodeMetadataSource:'aiometadata'}});let queried=false;
  await assert.rejects(h.context.orderedEpisodeLookup({id:h.f.tmdbId,type:'tv',season:2,episode:27},'primary',async()=>{queried=true;}));
  assert.equal(queried,false);assert.equal(h.calls.length,0);
});
