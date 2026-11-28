const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const custom='https://cdn.example/custom.mp4?sig=a%2Fb&v=1&v=2';
const omega='https://cdn.example/omega.mp4?sig=c%2Fd';
for(const file of ['providers/movix-extra.js','plugins/sources-fr-plus/providers/movix-extra.js']){
 for(const empty of [false,true]) test(`${file}: disabled SwiftFlow is never fetched; ${empty?'empty':'working'} Custom/Omega stay independent`,async()=>{
  const calls=[],unexpected=[];
  const sandbox={module:{exports:{}},TMDB_API_KEY:'fixture',SCRAPER_SETTINGS:{episodeMetadataSource:'native',movixFailover:false},console:{warn(){}},
   fetch:async(url)=>{
    calls.push(url);let body;
    if(url.includes('/api/links/'))body={success:true,type:'movie',data:{id:'603',links:empty?[]:[{url:custom,quality:'720p',language:'VF'}]}};
    else if(url.includes('/3/movie/'))body={title:'The Matrix',release_date:'1999-03-31',imdb_id:'tt0133093'};
    else if(url.includes('/api/imdb/'))body={player_links:empty?[]:[{url:omega,quality:'1080p',language:'VF'}]};
    else {unexpected.push(url);throw Error('Unexpected network request');}
    return {ok:true,status:200,url,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(body)};
   }};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox);
  const rows=await sandbox.module.exports.getStreams('603','movie');
  assert.deepEqual(unexpected,[]);
  assert.ok(!calls.some(u=>u.includes('/api/swiftflow/')));
  assert.ok(calls.some(u=>u.includes('/api/links/')));
  assert.ok(calls.some(u=>u.includes('/api/imdb/')));
  assert.deepEqual(Array.from(rows,r=>r.url).sort(),empty?[]:[custom,omega].sort());
 });
}
