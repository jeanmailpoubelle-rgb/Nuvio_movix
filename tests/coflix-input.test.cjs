const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness({adapter='xperience',provider,active=true,sourceChange=()=>{},inputChange=()=>{},officialChange=()=>{}}={}) {
 const f=JSON.parse(fs.readFileSync('tests/fixtures/fr-batch-input.json','utf8')),calls=[],logs=[];
 if(provider)f.input._metaProvider=provider;
 if(adapter==='aiometadata'&&!provider)f.input._metaProvider='tmdb';
 inputChange(f.input);officialChange(f.official);
 const current={season_number:1,episode_number:1,player_links:[{url:'https://cdn.example/coflix.mp4',quality:'720p',language:'VF'}]};sourceChange(current);
 const c=vm.createContext({module:{exports:{}},SCRAPER_SETTINGS:{episodeMetadataSource:active?'aiometadata':'native',inputMetadataAdapter:adapter,inputMetadataProvider:'auto',aiometadataManifestUrl:'https://input.example/manifest.json'},TMDB_API_KEY:'fixture',console:{warn:s=>logs.push(s)},fetch:async url=>{
  calls.push(url);let d;
  if(url.includes('catalog.nuvio.tv/meta/series/'))d={meta:f.reference};
  else if(url.startsWith('https://input.example/'))d={meta:f.input};
  else if(url.includes('/3/tv/279246/season/1/episode/1?'))d=f.official;
  else if(url.includes('/api/tmdb/tv/279246?season=1&episode=1'))d={tmdb_details:{id:279246},current_episode:current};
  else if(url.includes('/api/wiflix/')||url.includes('/api/fstream/'))d={success:false};
  else throw Error('Unexpected request');
  return {ok:true,status:200,url,text:async()=>JSON.stringify(d)};
 }});
 vm.runInContext(fs.readFileSync('plugins/sources-fr-plus/providers/movix-catalogues.js','utf8'),c);
 return {calls,logs,run:()=>c.module.exports.getStreams('279246','tv',1,1)};
}
for(const adapter of ['aiometadata','xperience'])test('Coflix '+adapter+' preserves standard coordinates only after same-episode proof',async()=>{
 const h=harness({adapter}),rows=await h.run();assert.equal(rows.length,1);assert.equal(rows[0].url,'https://cdn.example/coflix.mp4');
 assert.equal(h.calls.filter(u=>u.includes('/api/tmdb/')).length,1);assert.equal(h.calls.filter(u=>u.includes('/3/tv/')).length,1);
 assert.ok(h.logs.some(l=>l.includes('coflix-input-verified')));assert.ok(!h.calls.some(u=>u.includes('/api/wiflix/')||u.includes('/api/fstream/')));
});
test('Coflix known TVDB and foreign or reused official stills never query the native source',async()=>{
 for(const options of [{provider:'tvdb'},{inputChange:m=>m.videos[0]._tvdbEpisodeId=11033176},{inputChange:m=>m.videos[1].thumbnail=m.videos[0].thumbnail},{officialChange:d=>d.still_path='/DifferentEpisodeStill.jpg'},{officialChange:d=>d.show_id=999}]){
  const h=harness(options);assert.equal((await h.run()).length,0);assert.ok(!h.calls.some(u=>u.includes('/api/tmdb/')));
 }
});
test('Coflix configured lookup requires explicit matching source coordinates',async()=>{
 for(const sourceChange of [c=>c.season_number=2,c=>c.episode_number=2,c=>delete c.season_number,c=>delete c.episode_number]){
  const h=harness({sourceChange});assert.equal((await h.run()).length,0);assert.equal(h.calls.filter(u=>u.includes('/api/tmdb/')).length,1);
 }
});
test('Coflix native mode keeps original discovery with no private or official episode work',async()=>{
 const h=harness({active:false});assert.equal((await h.run()).length,1);assert.ok(h.calls.every(u=>!u.includes('/meta/')&&!u.includes('/3/tv/')));
});
