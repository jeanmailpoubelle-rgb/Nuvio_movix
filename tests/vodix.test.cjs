const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const master='https://vodix.top/hls/grant/master.m3u8?sig=x%2Fy&k=1';
const playlist='#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="French",LANGUAGE="fre",URI="fr.m3u8"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="English",LANGUAGE="eng",URI="en.m3u8"\n#EXT-X-STREAM-INF:RESOLUTION=3840x1600,VIDEO-RANGE=PQ,AUDIO="a",BANDWIDTH=22000000\nvideo.m3u8';
function harness({mapped=false,settings={},change=()=>{},routes=[]}={}){
 const calls=[],logs=[];const c=vm.createContext({module:{exports:{}},SCRAPER_SETTINGS:{episodeMetadataSource:'native',...settings},TMDB_API_KEY:'fixture',console:{warn:x=>logs.push(x)},fetch:async(url,options)=>{
  calls.push({url,options});let body,status=200;
  const route=routes.find(r=>url.includes(r.path));
  if(route){body=route.body;status=route.status??200;}
  else if(url.includes('/api/vodix/'))body={success:true,base:'https://vodix.top',sources:[{code:'fixture',quality:'720p',language:'VO'}]};
  else if(url.endsWith('/challenge'))body={challenge:'fixture-vodix',bits:8,url:'/exchange'};
  else if(url.endsWith('/exchange')){assert.equal(options.method,'POST');const p=JSON.parse(options.body);assert.equal(p.challenge,'fixture-vodix');assert.ok(crypto.createHash('sha256').update(p.challenge+':'+p.nonce).digest().readUInt32BE()<2**24);body={url:master};}
  else if(url===master)body=playlist;
  else if(url.endsWith('subtitles.json'))body=[{url:'fr.vtt',format:'text',language:'fre',label:'French',forced:true},{url:'en.vtt',format:'text',language:'eng',label:'English'},{url:'fr.sup',format:'bitmap',language:'fre'}];
  else if(url.endsWith('/external-subtitles'))body=[];
  else throw new Error('unexpected network');
  const changed=change({url,options,body,status});if(changed){body=changed.body??body;status=changed.status??status;}
  return {ok:status===200,status,url,text:async()=>typeof body==='string'?body:JSON.stringify(body)};
 }});
 vm.runInContext(fs.readFileSync((mapped?'plugins/sources-fr-plus/':'')+'providers/vodix.js','utf8'),c);
 return {calls,logs,run:(...args)=>c.module.exports.getStreams(...args)};
}
test('Vodix first-word SHA256 agrees with standard SHA across padding/block boundaries',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('src/vodix-proof.js','utf8'),c);
 for(const n of [0,1,46,55,56,63,64,127,256]){const text='a'.repeat(n);assert.equal(c.vodixShaWord(text),crypto.createHash('sha256').update(text).digest().readUInt32BE());}
});
for(const mapped of [false,true])test('Vodix '+(mapped?'+':'native')+' preserves signed master, confirmed 4K, all audio and text captions',async()=>{
 const h=harness({mapped}),rows=await h.run('12444','movie');assert.equal(rows.length,1);const row=rows[0];
 assert.equal(row.url,master);assert.equal(row.type,'hls');assert.equal(row.format,'m3u8');assert.equal(row.quality,'2160p');assert.equal(row.audioLanguage,'MULTI');
 assert.ok(row.headers['User-Agent'].startsWith('Mozilla/'));assert.ok(h.calls.filter(c=>c.url.startsWith('https://vodix.top/')).every(c=>c.options.headers['User-Agent']===row.headers['User-Agent']));assert.equal(row.headers.Origin,'https://movix.dog');assert.equal(row.headers.Referer,'https://movix.dog/');
 assert.equal(row.subtitles.length,2);assert.ok(row.subtitles.some(s=>s.url==='https://vodix.top/hls/grant/fr.vtt'));
 assert.equal(h.calls.filter(c=>c.url===master).length,1);assert.equal(h.calls.length,6);assert.ok(h.calls.every(c=>!c.url.includes('fr.sup')));
 await h.run('12444','movie');assert.equal(h.calls.filter(c=>c.url.endsWith('/exchange')).length,2,'fresh grant on each lookup');
});
test('mapped TV never sends unverified Vodix coordinates',async()=>{
 const h=harness({mapped:true,settings:{episodeMetadataSource:'aiometadata',aiometadataManifestUrl:'https://input.example/manifest.json'}});
 assert.equal((await h.run('1399','tv',2,1)).length,0);const count=h.calls.length;assert.equal((await h.run('1399','tv',0,1)).length,0);assert.equal(h.calls.length,count);assert.ok(h.calls.every(c=>!c.url.includes('/api/vodix/')));
});
test('native TV requests exact requested episode',async()=>{const h=harness();await h.run('1399','tv',1,1);assert.match(h.calls[0].url,/\/api\/vodix\/tv\/1399\/1\/1$/);});
for(const attack of ['base','exchange','grant'])test('Vodix rejects foreign '+attack+' origin',async()=>{
 const h=harness({change:({url,body})=>{
  if(attack==='base'&&url.includes('/api/vodix/'))return {body:{...body,base:'https://foreign.example'}};
  if(attack==='exchange'&&url.endsWith('/challenge'))return {body:{...body,url:'https://foreign.example/exchange'}};
  if(attack==='grant'&&url.endsWith('/exchange'))return {body:{url:'https://foreign.example/master.m3u8'}};
 }});assert.equal((await h.run('12444','movie')).length,0);assert.ok(h.calls.every(c=>!c.url.includes('foreign.example')));
});
test('denied exchange, invalid master and excessive difficulty produce no playable rows',async()=>{
 for(const mode of ['denied','html','difficulty']){
  const h=harness({change:({url,body})=>mode==='denied'&&url.endsWith('/exchange')?{status:403}:mode==='html'&&url===master?{body:'<html>Error</html>'}:mode==='difficulty'&&url.endsWith('/challenge')?{body:{...body,bits:30}}:null});
  assert.equal((await h.run('12444','movie')).length,0);if(mode==='difficulty')assert.ok(!h.calls.some(c=>c.url.endsWith('/exchange')));
 }
});
test('720p minimum still rejects confirmed 480p but allows 4K',async()=>{
 const h=harness({change:({url})=>url===master?{body:playlist.replace('3840x1600','854x480')}:null});assert.equal((await h.run('12444','movie')).length,0);
});
test('Vodix proof stops on CPU or shared request budget and rejects malformed challenges',()=>{
 const c=vm.createContext({ENDPOINTS:{vodix:{maxBits:16,maxAttempts:524288,proofMs:1}},Date:{now:(()=>{let n=0;return()=>++n;})()},selectionBudget:ctx=>ctx.requests>=24});
 vm.runInContext(fs.readFileSync('src/vodix-proof.js','utf8'),c);
 assert.throws(()=>c.vodixProof('fixture',16,{requests:0}),/budget/);
 assert.throws(()=>c.vodixProof('fixture',16,{requests:24}),/budget/);
 for(const [challenge,bits] of [['fixture',17],['fixture',-1],['é',16],[null,16],['x'.repeat(257),16]])assert.throws(()=>c.vodixProof(challenge,bits,{requests:0}),/unsupported/);
});
test('FR+ Vodix defaults to guarded mapped TV when no mode was selected',async()=>{
 const h=harness({mapped:true,settings:{episodeMetadataSource:''}});assert.equal((await h.run('1399','tv',1,1)).length,0);assert.equal(h.calls.length,0);
});

function inputRoutes(provider='tmdb') {
 const video={id:'tt0944947:2:3',season:2,episode:3,title:'Ce qui est mort ne saurait mourir',released:'2012-04-15T00:00:00Z'};
 return [
  {path:'/meta/series/tmdb:1399.json',body:{meta:{id:'tt0944947',moviedb_id:1399,videos:[]}}},
  {path:'https://input.example/meta/',body:{meta:{id:'tt0944947',_tmdbId:1399,...(provider?{_metaProvider:provider}:{}),videos:[video]}}},
  {path:'/3/tv/1399/season/2/episode/3?',body:{id:63073,show_id:1399,season_number:2,episode_number:3,name:'What Is Dead May Never Die',air_date:'2012-04-15',translations:{translations:[{data:{name:video.title}}]}}}
 ];
}
function configured(adapter='aiometadata',order='auto'){return {episodeMetadataSource:'aiometadata',inputMetadataAdapter:adapter,inputMetadataProvider:order,aiometadataManifestUrl:'https://input.example/manifest.json'};}
for(const [adapter,provider,order] of [['aiometadata','tmdb','auto'],['xperience',null,'auto'],['xperience',null,'tmdb']])test('Vodix verifies '+adapter+'/'+order+' TMDB episode without Nuvio episode inventory',async()=>{
 const h=harness({mapped:true,settings:configured(adapter,order),routes:inputRoutes(provider)});
 const rows=await h.run('1399','tv',2,3);assert.equal(rows.length,1);assert.equal(h.calls.length,9);
 assert.ok(h.calls.some(c=>c.url.endsWith('/api/vodix/tv/1399/2/3')));assert.ok(h.logs.some(l=>l.includes('vodix-input-verified')));
 assert.ok(!h.calls.some(c=>c.url.includes('/find/')||c.url.includes('cinemeta')));assert.ok(!h.logs.join('').includes('https://input.example'));
});
for(const provider of ['tvdb','imdb','mal',null])test('AIO '+provider+' input cannot use Vodix TMDB pass-through',async()=>{
 const h=harness({mapped:true,settings:configured(),routes:inputRoutes(provider)});
 assert.equal((await h.run('1399','tv',2,3)).length,0);assert.equal(h.calls.length,2);
});
test('Xperience Auto keeps the TVDB artwork guard, including same-coordinate episodes',async()=>{
 const routes=inputRoutes(null);routes[1].body.meta.videos[0].thumbnail='https://artworks.thetvdb.com/banners/v4/episode/123456/screencap/picture.jpg';
 const h=harness({mapped:true,settings:configured('xperience'),routes});assert.equal((await h.run('1399','tv',2,3)).length,0);assert.equal(h.calls.length,2);
});
for(const problem of ['foreign-series','wrong-coordinates','wrong-date','wrong-title','missing-official','duplicate-id','duplicate-title-date','duplicate-coordinate','tvdb-selector'])test('Vodix rejects '+problem+' before discovery',async()=>{
 const routes=inputRoutes(problem==='tvdb-selector'?null:'tmdb'),detail=routes[2].body,meta=routes[1].body.meta,v=meta.videos[0];
 if(problem==='foreign-series')detail.show_id=123;
 if(problem==='wrong-coordinates')detail.episode_number=4;
 if(problem==='wrong-date')detail.air_date='2013-04-15';
 if(problem==='wrong-title'){detail.name='Different episode';detail.translations={};}
 if(problem==='missing-official')routes[2].status=404;
 if(problem==='duplicate-id')meta.videos.push({...v,episode:4,title:'Another title'});
 if(problem==='duplicate-title-date')meta.videos.push({...v,id:'tt0944947:2:4',episode:4});
 if(problem==='duplicate-coordinate')meta.videos.push({...v,id:'tt0944947:2:4'});
 const h=harness({mapped:true,settings:configured(problem==='tvdb-selector'?'xperience':'aiometadata',problem==='tvdb-selector'?'tvdb':'auto'),routes});
 assert.equal((await h.run('1399','tv',2,3)).length,0);assert.ok(h.calls.every(c=>!c.url.includes('/api/vodix/')));
});
