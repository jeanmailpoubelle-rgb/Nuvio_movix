const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixtures,settings,reference,input,cinemeta,find}=require('./helpers/input-metadata.cjs');
const diagnostic='plugins/episode-diagnostics/providers/diagnostics.js';
function load(file=diagnostic,conf={},change={}) {
 const f=fixtures[0],calls=[],logs=[];
 const sandbox=vm.createContext({module:{exports:{}},SCRAPER_SETTINGS:conf,SCRAPER_ID:file===diagnostic?'episode-mapping-diagnostic':file.startsWith('plugins/')?'anime-sama':'movix-tv',TMDB_API_KEY:change.noKey?'':'fixture-key',
 btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),
 console:{warn:(...v)=>logs.push(v.join(' ')),log:(...v)=>logs.push(v.join(' '))},
 fetch:async(url,request)=>{
  calls.push({url,request});let body,status=200;
  if(url.startsWith('https://input.example/'))body={meta:change.foreign?{...input(f),_tmdbId:'999'}:input(f)};
  else if(url.includes('/find/'))body=find(f,/\/find\/(\d+)/.exec(url)[1]);
  else if(url.startsWith('https://catalog.nuvio.tv/'))body={meta:reference(f)};
  else if(url.startsWith('https://v3-cinemeta.strem.io/'))body={meta:cinemeta(f)};
  else if(url.includes('/api/purstream/')) {if(change.empty)body={sources:[]};else body={sources:[{url:'https://cdn.example/correct.mp4',quality:'1080p',lang:'vf'}]};}
  else if(url.includes('anime-sama.to/catalogue/hunter-x-hunter/')){
   if(url.includes('episodes.js'))body='var eps1='+JSON.stringify(Array.from({length:148},(_,i)=>'https://ansembed.net/embed-episode-'+(i+1)+'.html'))+';';
   else if(url.endsWith('/vf/')||url.endsWith('/vostfr/'))body='<script src="episodes.js"></script><script>resetListe();finirListe(1);</script>';
   else body='<h1>Hunter x Hunter</h1><script>panneauAnime("Version 2011","saison1/vf/");panneauAnime("Version 2011","saison1/vostfr/");</script>';
  } else if(url.includes('ansembed.net/'))body='sources:[{file:"https://cdn.example/correct.mp4"}]';
  else if(url.startsWith('https://cdn.example/'))body='';
  else throw new Error('Unexpected fixture request');
  if(change.error)throw new Error('https://input.example/private-fixture/?SECRET-value');
  return {ok:status===200,status,url,headers:{get:()=>''},text:async()=>typeof body==='string'?body:JSON.stringify(body)};
 }});
 vm.runInContext(fs.readFileSync(file,'utf8'),sandbox);
 return {api:sandbox.module.exports,calls,logs};
}
test('both installed previews default to AIO, fail closed with missing/unsaved URL, and advertise the actual setting',async()=>{
 for(const file of ['providers/movix.js','plugins/anime-sama/providers/anime-sama.js']){
  for(const conf of [{},{episodeMetadataSource:''},{episodeMetadataSource:'aiometadata'},{aiometadataManifestUrl:'https://github.com/example/repo'}]){
   const h=load(file,conf);assert.equal((await h.api.getStreams('46298','tv',2,72)).length,0);
   assert.equal(h.calls.length,0);assert.match(h.logs.join(' '),/INPUT_METADATA_CONFIG_REQUIRED/);
  }
  const fields=load(file).api.onSettings();assert.equal(fields.find(v=>v.key==='episodeMetadataSource').defaultValue,'aiometadata');
 }
});
test('settings-only diagnostic never participates in movies/series and cannot issue playback URLs',async()=>{
 const m=JSON.parse(fs.readFileSync('plugins/episode-diagnostics/manifest.json'));
 assert.deepEqual(m.scrapers[0].supportedTypes,[]);
 const h=load();assert.deepEqual(Array.from(await h.api.getStreams('46298','tv',2,72)),[]);assert.equal(h.calls.length,0);
 const rows=await h.api.getStreams('603','tv',1,1);assert.equal(rows.length,1);assert.match(rows[0].url,/INPUT_METADATA_CONFIG_REQUIRED/);
 assert.ok(rows.every(r=>r.type==='diagnostic'&&r.url.startsWith('diagnostic:')));
});
test('diagnostic exposes validated selected IDs, independent targets and Anime source positions, never private data',async()=>{
 const h=load(diagnostic,settings),rows=await h.api.getStreams('603','tv',1,1),text=JSON.stringify(rows);
 assert.equal(rows.length,8);assert.match(text,/S2E130/);assert.match(text,/S2E72/);assert.match(text,/épisode 130/);assert.match(text,/CORRESPONDANCE OK/);
 for(const secret of ['private-fixture','fixture-viewer','fixture-key','input.example'])assert.ok(!text.includes(secret));
 assert.ok(!h.calls.some(c=>c.url.includes('ansembed.net')),'diagnostic does not resolve hosts');
 assert.ok(h.calls.filter(c=>c.url.startsWith('https://input.example')).every(c=>!c.request.headers.Referer));
});
test('diagnostic distinguishes missing keys, identity conflicts, network failures and invalid selected episodes',async()=>{
 for(const [conf,change,code] of [[settings,{noKey:true},'INPUT_METADATA_TMDB_KEY_REQUIRED'],[settings,{foreign:true},'INPUT_METADATA_IDENTITY_CONFLICT'],[settings,{error:true},'METADATA_OR_SOURCE_UNAVAILABLE'],[{...settings,diagnosticEpisode:'999'}, {},'INPUT_METADATA_EPISODE_UNAVAILABLE']]) {
  const rows=await load(diagnostic,conf,change).api.getStreams('603','tv',1,1),text=JSON.stringify(rows);
  assert.match(text,new RegExp(code));assert.ok(!text.includes('SECRET-value'));assert.ok(!text.includes('private-fixture'));
 }
});
test('real API results show the actual native request and mapped backend coordinate without changing playback data',async()=>{
 const h=load('providers/movix.js',settings),values=await h.api.getStreams('46298','tv',2,72);
 assert.equal(values.length,1);assert.match(values[0].name,/\[AIO S2E72 → S2E130\]/);
 assert.equal(values[0].url,'https://cdn.example/correct.mp4');assert.ok(h.calls.some(c=>c.url.includes('season=2&episode=130')));
 assert.ok(!h.calls.some(c=>c.url.includes('season=2&episode=72')));
});
test('real Anime results show native input and canonical coordinate and preserve both language editions',async()=>{
 const h=load('plugins/anime-sama/providers/anime-sama.js',settings),values=await h.api.getStreams('46298','tv',2,72);
 assert.equal(values.length,2,h.logs.join('\n'));assert.ok(values.every(v=>v.name.includes('[AIO S2E72 → S2E130]')));
 assert.ok(h.calls.filter(c=>c.url.includes('ansembed.net')).every(c=>c.url.includes('episode-130.html')));
 assert.deepEqual(Array.from(values,v=>v.language).sort(),['VF','VOSTFR']);
});
test('a preview movie needs no private configuration and retains its fast discovery',async()=>{
 const h=load('providers/movix.js'),rows=await h.api.getStreams('603','movie',null,null);
 assert.equal(rows.length,1);assert.equal(h.calls.length,1);assert.ok(!rows[0].name.includes('[AIO'));
});

test('saved URL alone activates translation even when the phone never persisted the select default',async()=>{
 const conf={aiometadataManifestUrl:settings.aiometadataManifestUrl};
 const h=load('providers/movix.js',conf),values=await h.api.getStreams('46298','tv',2,72);
 assert.equal(values.length,1);assert.match(values[0].name,/AIO S2E72 → S2E130/);
});
test('actual installed workers map every requested Hunter boundary, not just the first episode',async()=>{
 for(const episode of [1,22,62,63,72,78]) {
  const sample=fixtures[0].episodes.find(v=>v.input[0]===2&&v.input[1]===episode);
  assert.ok(sample);
  for(const bundle of ['providers/movix.js','plugins/anime-sama/providers/anime-sama.js']){
   const h=load(bundle,settings),rows=await h.api.getStreams('46298','tv',2,episode);
   assert.ok(rows.length,h.logs.join('\n'));
   assert.ok(rows.every(v=>v.name.includes('S2E'+episode+' → S'+sample.target[0]+'E'+sample.target[1])),JSON.stringify({bundle,episode,names:rows.map(r=>r.name)}));
   if(bundle==='providers/movix.js')assert.ok(h.calls.some(c=>c.url.includes('season='+sample.target[0]+'&episode='+sample.target[1])));
   else assert.ok(h.calls.filter(c=>c.url.includes('ansembed.net')).every(c=>c.url.includes('episode-'+sample.target[1]+'.html')));
  }
 }
});
