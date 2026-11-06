const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolveSelection}=require('../src/anime-sama/native');
function setup(options={}){
  const calls=[],versions=[],primaryName=options.exact?'Fixture Diamond':'Fixture of the Diamond';
  const primary={id:options.noIdentity?'tmdb:123456':'tt123456789',name:primaryName,genres:['Animation'],released:'2013-01-01',
    videos:[{season:1,episode:1},{season:1,episode:2}]};
  const secondary={id:'tt123456789',name:'Fixture Diamond',genres:['Animation'],released:'2013-01-01',
    // Deliberately conflicting layout: this recovery must only borrow names.
    videos:[{season:1,episode:101}],...options.secondary};
  const path='/catalogue/fixture-diamond/',group={path:path+'saison1/',name:'Saison 1',languages:['vostfr']};
  const provider={config:{version:'vostfr'},http:{request:async url=>{
    calls.push(url);
    if(url.startsWith('https://catalog.nuvio.tv/'))return {body:JSON.stringify({meta:primary})};
    if(url==='https://v3-cinemeta.strem.io/meta/series/tt123456789.json'){
      if(options.secondaryFails)throw Object.assign(new Error('Unavailable'),{status:503});
      return {body:JSON.stringify({meta:secondary})};
    }
    throw new Error('Unexpected metadata request');
  }},details:async requested=>{
    if(requested!==path)throw Object.assign(new Error('Missing'),{status:404});
    return {path,title:'Fixture Diamond',year:options.wrongYear?2019:2013,groups:[group]};
  },search:async()=>({items:[{path,title:'Fixture Diamond'}]}),versions:async selected=>{
    versions.push(selected.path);
    return [{path:group.path+'vostfr/',language:'vostfr',script:group.path+'vostfr/episodes.js',episodes:[
      {number:1,index:0,servers:['https://player.example/first']},{number:2,index:1,servers:['https://player.example/second']}]}];
  }};
  return {provider,calls,versions};
}
test('verified alternate spelling restores matching for numeric and IMDb input without replacing episode layout',async()=>{
  for(const id of ['123456','tt123456789']){
    const {provider,calls}=setup(),refs=await resolveSelection(provider,id,'tv',1,2,{},'');
    assert.equal(refs.length,1);assert.equal(refs[0].index,1);
    assert.equal(refs[0].path,'/catalogue/fixture-diamond/saison1/vostfr/');
    assert.equal(calls.length,2);assert.ok(calls[1].endsWith('/tt123456789.json'));
  }
});
test('an already matching primary title keeps the one-metadata-request fast path',async()=>{
  const {provider,calls}=setup({exact:true});
  assert.equal((await resolveSelection(provider,'123456','tv',1,1,{},'')).length,1);
  assert.equal(calls.length,1);
});
test('unverified, contradictory or failed alternate identity cannot supply a source title',async()=>{
  for(const options of [{noIdentity:true},{secondary:{id:'tt999999999'}},
    {secondary:{id:'tt999999999',imdb_id:'tt123456789'}},{secondary:{id:undefined}}, {secondaryFails:true}]){
    const {provider,calls,versions}=setup(options);
    await assert.rejects(resolveSelection(provider,'123456','tv',1,1,{},''));
    assert.equal(versions.length,0);
    if(options.noIdentity)assert.equal(calls.length,1,'Never guess IMDb correspondence');
  }
});
test('verified aliases retain the primary year guard and cannot rescue ambiguous source matches',async()=>{
  const {provider,versions}=setup({wrongYear:true});
  await assert.rejects(resolveSelection(provider,'123456','tv',1,1,{},''));assert.equal(versions.length,0);
  const ambiguous=setup();
  ambiguous.provider.details=async()=>({path:'/catalogue/other/',title:'Fixture of the Diamond',year:2013,groups:[]});
  ambiguous.provider.search=async()=>({items:[{path:'/catalogue/one/',title:'One'},{path:'/catalogue/two/',title:'Two'}]});
  await assert.rejects(resolveSelection(ambiguous.provider,'123456','tv',1,1,{},''),e=>e.code==='AMBIGUOUS_SOURCE_TITLE');
  assert.equal(ambiguous.calls.length,1,'Do not turn ambiguity into a guessed alternate match');
});

test('official aliases require matching typed TMDB and IMDb identities and only fill an unhelpful alias response',async()=>{
 const {sourceTitleAliases}=require('../src/anime-sama/catalog-context');
 const metadata={name:'Existing title',title:'Existing title',catalogSource:'nuvio-catalog',imdb_id:'tt12345',tmdb_id:'456'};
 for(const variant of ['valid','tmdb-conflict','imdb-conflict','useful-cinemeta']){
  const calls=[],provider={http:{request:async url=>{calls.push(url);return {body:JSON.stringify(url.includes('cinemeta')?{meta:{id:'tt12345',moviedb_id:456,name:variant==='useful-cinemeta'?'Useful alias':'Existing title'}}:{id:variant==='tmdb-conflict'?999:456,external_ids:{imdb_id:variant==='imdb-conflict'?'tt99999':'tt12345'},alternative_titles:{results:[{title:'Source alias'}]}})};}}};
  if(variant.endsWith('conflict'))await assert.rejects(sourceTitleAliases(provider,'tv',1,metadata,'fixture-key'),{code:'ALIAS_IDENTITY_UNAVAILABLE'});
  else {const result=await sourceTitleAliases(provider,'tv',1,metadata,'fixture-key');assert.equal(result.aliases[0],variant==='useful-cinemeta'?'Useful alias':'Source alias');}
  assert.equal(calls.length,variant==='useful-cinemeta'?1:2);
 }
});
