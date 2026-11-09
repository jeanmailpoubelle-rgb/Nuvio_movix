const {test}=require('node:test'),assert=require('node:assert/strict');
const {compactStream}=require('../src/link-layout');
const {sortPrefix}=require('../src/stream-order');
test('native cards put quality/audio first and provenance below without losing playback metadata',()=>{
 const value={name:sortPrefix('01.')+'Movix / Wiflix / Voe | 1080p | MULTI',quality:'1080p',language:'MULTI',url:'https://cdn.example/master.m3u8?sig=A%2FB',headers:{Referer:'https://player.example/'},subtitles:[{language:'fr',url:'https://captions.example/fr.vtt'}]};
 const original=JSON.stringify(value),row=compactStream(value),json=JSON.parse(JSON.stringify(row));
 assert.equal(JSON.stringify(value),original);assert.equal(row.name,sortPrefix('01.')+'1080p · MULTI');
 assert.equal(row.size,'Movix · Wiflix · Voe');assert.equal(json.language,undefined);assert.equal(json.audioLanguage,'MULTI');
 assert.equal(row.url,value.url);assert.deepEqual(row.headers,value.headers);assert.deepEqual(row.subtitles,value.subtitles);
 // The actual bridge rules: Mobile repeats native quality; TV puts it in name.
 assert.equal([json.quality,json.size,json.language].filter(Boolean).join(' • '),'1080p • Movix · Wiflix · Voe');
 assert.equal([json.size,json.language].filter(v=>v!=null).join(' • '),'Movix · Wiflix · Voe');
});
test('unknown values stay unknown and changed mapping is a separate reference-labelled line',()=>{
 const row=compactStream({name:'Anime-Sama / ANSEmbed | VF',language:'VF',_layoutMapping:'AIO S2E72 → Réf. S2E130'});
 assert.equal(row.name,'VF');assert.equal(row.quality,undefined);assert.equal(row.size,'Anime-Sama · ANSEmbed\nAIO S2E72 → Réf. S2E130');
 assert.equal(compactStream({name:'Host',quality:'720p',size:'1.2 GB'}).size,'Host · 1.2 GB');
 assert.equal(row._layoutMapping,undefined);assert.equal(compactStream({name:'Host'}).name,'Source');
});
