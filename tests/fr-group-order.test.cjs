const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {visibleName}=require('./helpers/display.cjs');
const manifest=require('../manifest.json');
function presenter(entry){
 const sandbox=vm.createContext({module:{exports:{}},console:{warn(){}},fetch:()=>{throw new Error('Presentation must not request anything');}});
 const code=fs.readFileSync(entry.filename,'utf8').replace('getStreams: getStreams','getStreams: getStreams, present: presentSourcesFrStreams');
 vm.runInContext(code,sandbox);return values=>Array.from(sandbox.module.exports.present(values));
}
test('all active Sources FR entries share a display group but retain IDs, descriptive labels and the retired entry',()=>{
 const entries=manifest.scrapers.filter(e=>e.enabled);
 assert.equal(entries.length,6);assert.ok(entries.every(e=>e.name==='Sources FR Preview'&&e.sourceLabel&&e.description.startsWith(e.sourceLabel)));
 assert.deepEqual(entries.map(e=>e.id),['movix-tv','nakios-tv','french-frembed-hosts','french-movix-catalogues','french-movix-extra','french-yablom']);
 assert.equal(manifest.scrapers.find(e=>e.id==='purstream-tv').enabled,false);
});
test('separate compiled entries compose global quality/audio ordering independent of completion order without altering playback data',()=>{
 const entries=manifest.scrapers.filter(e=>e.enabled),all=[],input=[];
 for(const [entryIndex,entry] of entries.entries()){
  const rows=[0,720,800,1080,1440,2160,4320].flatMap(q=>['VO','VOSTFR','VF','MULTI'].flatMap(language=>[0,1].map(tie=>({
   name:entry.sourceLabel+' / Host '+tie,quality:q?q+'p':undefined,language,url:'https://cdn.example/'+entryIndex+'/'+q+'/'+language+'/'+tie,
   headers:{Referer:'https://player.example/'},subtitles:[{url:'https://captions.example/fr.vtt',language:'fr',name:'Français'}],entryIndex,tie,q
  }))));
  const original=JSON.stringify(rows),output=JSON.parse(JSON.stringify(presenter(entry)(rows)));
  assert.equal(JSON.stringify(rows),original);
  for(const item of output){const source=rows.find(s=>s.url===item.url);const {name,size,language,audioLanguage,...playback}=item;const {name:oldName,language:oldAudio,...originalPlayback}=source;assert.deepEqual(playback,JSON.parse(JSON.stringify(originalPlayback)));assert.equal(audioLanguage,oldAudio);assert.equal(language,undefined);assert.ok(size.includes(' · '));}
  input.push(...rows);all.unshift(...output); // Deliberately reverse completion order.
 }
 const audio={MULTI:0,VF:1,VOSTFR:2,VO:3};
 const expected=input.slice().sort((a,b)=>b.q-a.q||audio[a.language]-audio[b.language]||a.entryIndex-b.entryIndex||a.tie-b.tie);
 const sorted=all.sort((a,b)=>a.name.toLowerCase()<b.name.toLowerCase()?-1:a.name.toLowerCase()>b.name.toLowerCase()?1:0);
 assert.deepEqual(sorted.map(s=>s.url),expected.map(s=>s.url));
 assert.ok(sorted.every(s=>!/^\d+\. /.test(visibleName(s.name))));
 const single=presenter(entries[0])([{name:'Host',language:'VF'}])[0];assert.equal(visibleName(single.name),'VF');assert.equal(single.size,'Host');
});
test('compiled delivery keeps the 720p filter and unknown quality, with no extra requests',async()=>{
 let calls=0;
 const sandbox=vm.createContext({module:{exports:{}},SCRAPER_SETTINGS:{episodeMetadataSource:"native",movixFailover:false},console:{warn(){}},fetch:async url=>{
  calls++;assert.ok(url.includes('/api/purstream/'));
  return {ok:true,status:200,url,text:async()=>JSON.stringify({sources:[{url:'https://cdn.example/low.mp4',quality:'480p',lang:'VF'},{url:'https://cdn.example/unknown.mp4',lang:'VF'}]})};
 }});
 vm.runInContext(fs.readFileSync('providers/movix.js','utf8'),sandbox);
 const result=await sandbox.module.exports.getStreams('603','movie');
 assert.equal(calls,1);assert.equal(result.length,1);assert.equal(result[0].url,'https://cdn.example/unknown.mp4');assert.equal(result[0].quality,undefined);
 assert.ok(visibleName(result[0].name).includes('VF'));assert.ok(!visibleName(result[0].name).includes('Sources FR'),'provider label survives manifest grouping');
});
