const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(__dirname+'/../src/common.js','utf8'),context);
const present=context.presentStreams;
test('final display orders by resolution, then audio group, with unknown resolution last and stable ties',()=>{
  const input=[
    {name:'VF unknown',language:'VF'},
    {name:'VO 2160',language:'VO',quality:'2160p'},
    {name:'VF 2160',language:'VF',quality:'2160p'},
    {name:'Multi 720',language:'MULTI',quality:'720p'},
    {name:'Sub 2160',language:'VOSTFR',quality:'2160p'},
    {name:'Multi 1080 first',language:'MULTI',quality:'1080p'},
    {name:'Sub unknown 4K filename',language:'VOSTFR'},
    {name:'Multi unknown',language:'MULTI'},
    {name:'VF 720',language:'VF',quality:'720p'},
    {name:'Multi 1080 second',language:'MULTI',quality:'1080p'},
    {name:'No audio hint',quality:'1080p'},
  ];
  const snapshot=JSON.stringify(input),result=Array.from(present(input));
  assert.deepEqual(result.map(s=>s.name),[
    '01. VF 2160','02. Sub 2160','03. VO 2160','04. Multi 1080 first','05. Multi 1080 second',
    '06. No audio hint','07. Multi 720','08. VF 720','09. Multi unknown','10. VF unknown',
    '11. Sub unknown 4K filename',
  ]);
  assert.equal(JSON.stringify(input),snapshot,'do not mutate source/selection data');
  assert.deepEqual(result.map(s=>s.name).slice().sort(),result.map(s=>s.name),'Mobile alphabetical sorting retains the requested order');
  assert.equal(result[10].quality,undefined,'do not infer resolution from an unknown source filename');
});
test('display ranks scale beyond 99 results and leave a single stream label unchanged',()=>{
  const input=Array.from({length:105},(_,i)=>({name:'Host '+i,language:'VF',quality:'720p'}));
  const result=Array.from(present(input));
  assert.equal(result[0].name,'001. Host 0');assert.equal(result[104].name,'105. Host 104');
  assert.deepEqual(result.map(s=>s.name).slice().sort(),result.map(s=>s.name));
  const single={name:'Host',url:'https://cdn.example/video.mp4'};
  assert.equal(present([single])[0],single);
});
test('Sources FR applies final display order without fetching video or changing playback data',async()=>{
  const sources=[
    {url:'https://cdn.example/vf-low.mp4',lang:'VF',quality:'720p',headers:{Referer:'https://player.example/'}},
    {url:'https://cdn.example/sub.mp4',lang:'VOSTFR',quality:'2160p'},
    {url:'https://cdn.example/multi.mp4',lang:'MULTI',quality:'1080p',subtitles:[{url:'https://captions.example/fr.vtt',lang:'fr'}]},
    {url:'https://cdn.example/vf-high.mp4',lang:'VF',quality:'1080p'},
  ],calls=[];
  const app=vm.createContext({module:{exports:{}},SCRAPER_SETTINGS:{movixFailover:false},console:{warn(){}},fetch:async url=>{
    calls.push(url);assert.ok(url.includes('/api/purstream/'));
    return {ok:true,status:200,url,text:async()=>JSON.stringify({sources})};
  }});
  vm.runInContext(fs.readFileSync(__dirname+'/../providers/movix.js','utf8'),app);
  const result=Array.from(await app.module.exports.getStreams('424242','movie'));
  assert.deepEqual(result.map(s=>s.url),[sources[1].url,sources[2].url,sources[3].url,sources[0].url]);
  assert.equal(calls.length,1);assert.equal(result[3].headers.Referer,'https://player.example/');
  assert.equal(result[1].subtitles[0].url,sources[2].subtitles[0].url);
});
