const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {fixture,metadata}=require('./helpers/episode-orders.cjs');
const {resolveSelection}=require('../src/anime-sama/native');
function anime(options={}) {
  const calls=[],path='/catalogue/hunter-x-hunter/';
  const primary=metadata(true),secondary=metadata(false);
  options.change?.(primary,secondary);
  const provider={config:{version:'all'},http:{request:async url=>{
    calls.push(url);
    if(options.fail&&url.includes('cinemeta'))throw new Error('Unavailable');
    return {body:JSON.stringify({meta:url.includes('cinemeta')?secondary:primary})};
  }},details:async()=>({path,title:fixture.name,year:2011,groups:[{path:path+'saison1/',name:'Version 2011'}]}),
  versions:async g=>['vf','vostfr'].map(language=>({path:g.path+language+'/',language,script:'fixture',episodes:Array.from({length:148},(_,index)=>({number:index+1,index,servers:['https://player.example/'+index]}))}))};
  return {provider,calls};
}
test('scoped input order selects the same correct source in every edition across both boundaries and both ID forms',async()=>{
  for(const id of [fixture.tmdbId,fixture.imdbId])for(const c of fixture.cases){
    const {provider,calls}=anime();
    const refs=await resolveSelection(provider,id,'tv',...c.input,{},'');
    assert.deepEqual(refs.map(r=>[r.path,r.index]),['vf','vostfr'].map(l=>['/catalogue/hunter-x-hunter/saison1/'+l+'/',c.absolute-1]));
    assert.equal(calls.length,c.input[0]===2?2:1,'only scoped seasons add an input-order request');
  }
});
test('scoped Anime-Sama order rejects missing/duplicate episodes, wrong identities and unavailable metadata',async()=>{
  for(const change of [(_a,b)=>{b.id='tt9999999';},(_a,b)=>{b.moviedb_id=999;},
    (_a,b)=>{b.videos=b.videos.filter(v=>v.season!==2||v.episode!==63);},
    (_a,b)=>{const i=b.videos.findIndex(v=>v.season===2&&v.episode===63);b.videos.splice(i,0,{...b.videos[i]});}]){
    const {provider}=anime({change});
    await assert.rejects(resolveSelection(provider,fixture.tmdbId,'tv',2,63,{},''));
  }
  await assert.rejects(resolveSelection(anime({fail:true}).provider,fixture.tmdbId,'tv',2,63,{},''));
  await assert.rejects(resolveSelection(anime().provider,fixture.tmdbId,'tv',2,79,{},''));
});
test('Anime-Sama rollback setting restores legacy selection without the added request',async()=>{
  const {provider,calls}=anime();
  const refs=await resolveSelection(provider,fixture.tmdbId,'tv',2,63,{episodeOrderOverride:false},'');
  assert.equal(refs[0].index,62);assert.equal(calls.length,1);
});
test('Anime-Sama matches episode identity rather than adding the incoming catalogue season lengths',async()=>{
  const {provider}=anime({change:(_a,b)=>{b.videos=b.videos.filter(v=>v.season!==1||v.episode!==1);}});
  const refs=await resolveSelection(provider,fixture.tmdbId,'tv',2,63,{},'');
  assert.equal(refs[0].index,120,'a changed input prefix must not shift the matched target episode');
  const mismatch=anime({change:(a)=>{a.videos.find(v=>v.season===2&&v.episode===121).released='2020-01-01T00:00:00Z';}});
  await assert.rejects(resolveSelection(mismatch.provider,fixture.tmdbId,'tv',2,63,{},''));
});
function root(options={}) {
  const calls=[],events=[],config=JSON.parse(fs.readFileSync('config/endpoints.json')).episodeMapping;
  config.orders=JSON.parse(fs.readFileSync('config/episode-orders.json'));
  if(options.disabled)config.orders.enabled=false;
  const a=metadata(true),b=metadata(false);options.change?.(a,b);
  const context=vm.createContext({ENDPOINTS:{episodeMapping:config},settings:()=>options.settings||{},Promise,Date,
    cleanTitle:s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),message:e=>e.message,
    event:(stage,data)=>events.push({stage,data}),requestJson:async url=>{calls.push(url);if(options.fail)throw new Error('Unavailable');return {meta:url.includes('cinemeta')?b:a};}});
  vm.runInContext(fs.readFileSync('src/episode-mapping.js','utf8'),context);
  const ctx=(season,episode,id=fixture.tmdbId,type='tv')=>({id,type,season,episode});
  return {context,calls,events,ctx};
}
test('both verified Sources FR backends translate before an inventory can accept incorrect original coordinates',async()=>{
  for(const backend of ['primary','custom'])for(const sample of fixture.cases.filter(c=>c.input[0]===2)){
    const h=root(),ctx=h.ctx(...sample.input);let inventories=[];
    const to=await h.context.orderedEpisodeLookup(ctx,backend,async c=>{inventories.push([c.season,c.episode]);return c;});
    assert.deepEqual([to.season,to.episode],sample.target);assert.deepEqual(inventories,[sample.target]);
    assert.deepEqual([ctx.season,ctx.episode],sample.input,'original request is immutable');assert.equal(h.calls.length,2);
    await h.context.orderedEpisodeLookup(ctx,backend,async c=>c);
    assert.equal(h.calls.length,2,'metadata is reused and inventories remain fresh');
  }
});
test('scoped mapping failures never issue an original-coordinate inventory request',async()=>{
  for(const options of [{fail:true},{change:(a,b)=>{b.moviedb_id=999;}},{change:a=>{a.id='tt9999999';}},
    {change:(a,b)=>{b.videos=b.videos.filter(v=>v.season!==2||v.episode!==63);}},
    {change:a=>{a.videos.push({...a.videos.find(v=>v.season===2&&v.episode===121)});}}]){
    const h=root(options);let invoked=false;
    await assert.rejects(h.context.orderedEpisodeLookup(h.ctx(2,63),'custom',async()=>{invoked=true;}));
    assert.equal(invoked,false);
  }
});
test('other series, movies, specials, unverified backends and rollback add zero metadata reads',async()=>{
  for(const [options,id,type,season,backend] of [[{},'95479','tv',2,'custom'],[{},fixture.tmdbId,'movie',2,'custom'],
    [{},fixture.tmdbId,'tv',0,'custom'],[{},fixture.tmdbId,'tv',1,'custom'],[{},fixture.tmdbId,'tv',3,'custom'],[{},fixture.tmdbId,'tv',2,'frembed'],[{},fixture.tmdbId,'tv',2,'backup'],
    [{disabled:true},fixture.tmdbId,'tv',2,'custom'],[{settings:{episodeOrderOverride:false}},fixture.tmdbId,'tv',2,'primary']]){
    const h=root(options),ctx=h.ctx(season,63,id,type);
    assert.equal(await h.context.orderedEpisodeLookup(ctx,backend,async c=>c),ctx);assert.equal(h.calls.length,0);
  }
});
test('known unmatched catalogue names fail closed on the scoped path, never selecting by date alone',async()=>{
  for(const sample of fixture.unmatched){
    await assert.rejects(resolveSelection(anime().provider,fixture.tmdbId,'tv',...sample.input,{},''));
    const h=root();let called=false;
    await assert.rejects(h.context.orderedEpisodeLookup(h.ctx(...sample.input),'custom',async()=>{called=true;}));
    assert.equal(called,false);
  }
});
