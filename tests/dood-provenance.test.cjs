const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {visibleName}=require('./helpers/display.cjs');
function harness(file,options={}){
 const calls=[];
 const row=(n)=>({url:`https://wrapper.example/${n}`,player:'Dood',quality:'1080p',headers:options.differentHeaders?{'X-Playback':String(n)}:{},subtitles:options.captionMerge?[{url:`https://captions.example/${n}.vtt`,language:n===1?'fr':'en'}]:[]});
 const context={module:{exports:{}},console:{warn(){}},SCRAPER_SETTINGS:{episodeMetadataSource:'native',movixFailover:false,inspectHls:false},
 fetch:async(url)=>{
  calls.push(url);let body,final=url;
  if(url.includes('/api/fstream/'))body={success:true,type:'movie',tmdb:{id:801688},players:options.differentLanguages?{vf:[row(1)],vostfr:[row(2)]}:{vostfr:[row(1),row(2)]}};
  else if(url.includes('wrapper.example/')){
   const n=url.endsWith('/2')?2:1;
   final=(options.differentOrigins&&n===2?'https://dood.li':'https://playmogo.com')+'/e/'+(options.differentUploads&&n===2?'other-upload':'same-upload');
   if(options.unrecognized)final='https://foreign.example/e/same-upload';
   body='<title>Movie.1080p.mkv.mp4</title> $.get("/pass_md5/key/publishedtoken'+(options.differentTokens?n:'')+'")';
  }else if(url.includes('/pass_md5/'))body='https://cdn.example/file/';
  else throw Error('Unexpected media/probe request');
  return {status:200,ok:true,url:final,headers:{get:()=> 'text/html'},text:async()=>typeof body==='string'?body:JSON.stringify(body)};
 }};
 let code=fs.readFileSync(file,'utf8');
 code=code.replace('\nif (typeof module !== "undefined" && module.exports)','\nENDPOINTS.movix.catalogues=["fstream"];\nif (typeof module !== "undefined" && module.exports)');
 vm.runInNewContext(code,context);
 return {calls,run:()=>context.module.exports.getStreams('801688','movie')};
}
for(const file of ['providers/movix-catalogues.js','plugins/sources-fr-plus/providers/movix-catalogues.js']){
 test(`${file}: same Dood upload collapses randomized signed URLs without probes or a guessed quality`,async()=>{
  const h=harness(file),rows=await h.run();assert.equal(rows.length,1);
  assert.equal(rows[0].quality,undefined);assert.equal(visibleName(rows[0].name),'VOSTFR');
  assert.equal(rows[0].headers.Referer,'https://playmogo.com/');
  assert.match(rows[0].url,/^https:\/\/cdn\.example\/file\/[A-Za-z0-9]{10}\?token=publishedtoken$/);
  assert.equal(h.calls.length,5);assert.ok(!h.calls.some(u=>u.startsWith('https://cdn.example/')));
  assert.ok(!JSON.stringify(rows).includes('_doodUpload'),'provenance is internal only');
 });
 test(`${file}: merging Dood aliases keeps both caption inventories`,async()=>{
  const h=harness(file,{captionMerge:true}),rows=await h.run();assert.equal(rows.length,1);
  assert.equal(rows[0].subtitles.length,2);
  assert.deepEqual(Array.from(rows[0].subtitles,s=>s.url).sort(),['https://captions.example/1.vtt','https://captions.example/2.vtt']);
  assert.equal(h.calls.length,5);
 });
 for(const option of ['differentUploads','differentLanguages','differentHeaders','differentOrigins','differentTokens','unrecognized']){
  test(`${file}: Dood keeps ${option} separate`,async()=>{
   const h=harness(file,{[option]:true});assert.equal((await h.run()).length,2);
  });
 }
}
