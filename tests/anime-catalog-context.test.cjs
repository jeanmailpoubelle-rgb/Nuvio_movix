const {test}=require('node:test');
const assert=require('node:assert/strict');
const Catalog=require('../src/anime-sama/catalog-context');
const {resolveSelection}=require('../src/anime-sama/native');
const layout=require('./fixtures/anime-sama/season-layouts.json');
function metadata(counts,example=layout) {
  return {id:example.imdbId,name:example.name,genres:['Animation'],released:example.year+'-01-01',
    videos:counts.flatMap((count,s)=>Array.from({length:count},(_,i)=>({season:s+1,episode:i+1})))};
}
function setup(options={}) {
  const example=options.example||layout,calls=[];
  const primary=metadata(options.primary||example.nuvioCatalogSeasons,example);
  const secondary=metadata(example.cinemetaSeasons,example);
  const path='/catalogue/'+example.name.toLowerCase().replace(/ /g,'-')+'/';
  const groups=example.sourceSeasons.map((_,i)=>({path:path+`saison${i+1}/`,name:`Saison ${i+1}`,languages:['vostfr','vf']}));
  const provider={config:{version:'all'},http:{request:async url=>{
    calls.push(url);
    if(url.startsWith('https://catalog.nuvio.tv/'))return {body:JSON.stringify({meta:primary})};
    if(url===`https://v3-cinemeta.strem.io/meta/series/${example.imdbId}.json`){
      if(options.secondaryFails)throw Object.assign(new Error('Service unavailable'),{status:503});
      return {body:JSON.stringify({meta:{...secondary,...options.secondaryOverride}})};
    }
    throw new Error('Unexpected metadata request');
  }},details:async requested=>{
    assert.equal(requested,path);return {path,title:example.name,year:example.year,groups};
  },versions:async group=>['vostfr','vf'].map(language=>({path:group.path+language+'/',language,script:group.path+language+'/episodes.js',
    episodes:Array.from({length:example.sourceSeasons[groups.indexOf(group)]},(_,index)=>({number:index+1,index,servers:['https://player.example/fixture']}))})),
  version:async(group,language)=>(await provider.versions(group)).find(v=>v.language===language)};
  return {provider,calls,example,primary,secondary};
}
test('a flattened TMDB catalogue supplies its explicit IMDb correspondence when the requested season is absent',async()=>{
  const {provider,calls}=setup();
  const title=await Catalog.titleContext(provider,layout.tmdbId,'tv','',2);
  const season=await Catalog.seasonContext(provider,layout.tmdbId,2,'',title);
  assert.equal(season.singleSeason,false);assert.equal(season.absoluteOffset,24);assert.equal(season.episodes.length,23);
  assert.deepEqual(calls,[`https://catalog.nuvio.tv/meta/series/tmdb:${layout.tmdbId}.json`,`https://v3-cinemeta.strem.io/meta/series/${layout.imdbId}.json`]);
});
test('continuous and seasonal requests select identical source coordinates at every published season boundary',async()=>{
  for(const [absolute,season,episode] of [[1,1,1],[24,1,24],[25,2,1],[47,2,23],[48,3,1],[59,3,12]]){
    const a=setup(),b=setup();
    const flat=await resolveSelection(a.provider,layout.tmdbId,'tv',1,absolute,{},'');
    const split=await resolveSelection(b.provider,layout.tmdbId,'tv',season,episode,{},'');
    assert.deepEqual(split,flat,`S${season}E${episode} must match continuous E${absolute}`);
    assert.ok(split.every(r=>r.path.includes(`/saison${season}/`)&&r.index===episode-1));
    assert.equal(a.calls.length,1,'continuous metadata remains one request');
    assert.equal(b.calls.length,season===1?1:2,'alternate metadata is fetched only on a missing season');
  }
});
test('the same layout recovery applies to unrelated identities and different season lengths',async()=>{
  const example={tmdbId:'987654',imdbId:'tt987654321',name:'Fixture Animation',year:2001,nuvioCatalogSeasons:[21],cinemetaSeasons:[13,8],sourceSeasons:[13,8]};
  const a=setup({example}),b=setup({example});
  assert.deepEqual(await resolveSelection(a.provider,example.tmdbId,'tv',1,14,{},''),await resolveSelection(b.provider,example.tmdbId,'tv',2,1,{},''));
});
test('a primary seasonal catalogue keeps its one-request path, and IMDb requests use their actual requested season',async()=>{
  const seasonal=setup({primary:[24,23,12]}),imdb=setup();
  const a=await resolveSelection(seasonal.provider,layout.tmdbId,'tv',2,1,{},'');
  const b=await resolveSelection(imdb.provider,layout.imdbId,'tv',2,1,{},'');
  assert.deepEqual(a,b);assert.equal(seasonal.calls.length,1);assert.equal(imdb.calls.length,2);
});
test('missing seasons, missing episodes and failed alternate metadata cannot become another episode',async()=>{
  for(const [season,episode] of [[4,1],[2,24],[3,13]]){
    const {provider}=setup();
    await assert.rejects(resolveSelection(provider,layout.tmdbId,'tv',season,episode,{},''));
  }
  const {provider}=setup({secondaryFails:true});
  await assert.rejects(resolveSelection(provider,layout.tmdbId,'tv',2,1,{},''));
});
test('a contradictory alternate catalogue identity is rejected instead of supplying an unrelated season',async()=>{
  const {provider}=setup({secondaryOverride:{id:'tt999999999'}});
  await assert.rejects(resolveSelection(provider,layout.tmdbId,'tv',2,1,{},''));
});
test('alternate catalogue failure preserves the public TMDB season fallback',async()=>{
  const {provider,calls}=setup({secondaryFails:true});
  const original=provider.http.request;
  provider.http.request=async url=>{
    if(!url.startsWith('https://www.themoviedb.org/'))return original(url);
    calls.push(url);
    if(url.endsWith('/season/2'))return {body:'<section class="episode_list">'+Array.from({length:23},(_,i)=>`<article class="episode"><span class="episode_number">${i+1}</span></article>`).join('')+'</section>'};
    return {body:'<script type="application/ld+json">'+JSON.stringify({'@type':'TVSeries',name:layout.name,genre:['Animation'],startDate:'2020-01-01'})+'</script>'};
  };
  const refs=await resolveSelection(provider,layout.tmdbId,'tv',2,1,{},'');
  assert.ok(refs.length===2&&refs.every(r=>r.path.includes('/saison2/')&&r.index===0));
  assert.equal(calls.length,4);
});
test('a missing IMDb correspondence is never replaced with a guessed ID',async()=>{
  const {provider,calls,primary}=setup();delete primary.id;
  await assert.rejects(resolveSelection(provider,layout.tmdbId,'tv',2,1,{},''));
  assert.ok(!calls.some(url=>url.includes('cinemeta')));
});
test('only a complete single-season response establishes continuous numbering',()=>{
  const raw=counts=>JSON.stringify({meta:metadata(counts)});
  assert.equal(Catalog.cinemetaMeta(raw([59]),1).singleSeason,true);
  assert.equal(Catalog.cinemetaMeta(raw([24,23]),1).singleSeason,false);
  assert.equal(Catalog.cinemetaMeta(raw([59]).slice(0,-3),1).singleSeason,false);
  const truncated=raw([24,23]).slice(0,-3)+',{"season":3,"episode":';
  assert.equal(Catalog.cinemetaMeta(truncated,2).catalogEpisodes.length,23);
});
