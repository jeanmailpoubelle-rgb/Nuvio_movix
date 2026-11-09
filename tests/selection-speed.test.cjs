const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(){
 let parsed=0,classified=0;const seen=[];
 const c=vm.createContext({ENDPOINTS:{selection:{targetSources:1,hostPriority:['voe']},limits:{hostConcurrency:1,requests:24,elapsedMs:45000}},PROVIDER_NAME:'Fixture',Date,Promise,
 asUrl:(u,base,decode)=>{parsed++;return decode===false?u:u.replace(/&amp;/g,'&');},formatOf:(url,declared)=>declared||(/\.mp4/.test(url)?'mp4':''),
 hostFamily:(url,label)=>{classified++;seen.push(url);return label==='voe'?'voe':'';},event(){},log(){},message:e=>e.message,unique:rows=>rows,
 resolveHost:async link=>[{url:link.url,language:'VF',headers:link.headers}],enrichHlsStreams:async rows=>rows,filterResolution:rows=>rows});
 vm.runInContext(fs.readFileSync('src/selection.js','utf8'),c);
 return {run:links=>c.selectLinks(links,'https://site.example/',{started:Date.now(),requests:0},'Fixture'),counts:()=>({parsed,classified}),seen};
}
test('selection reuses normalized identity and one host classification per ordinary candidate',async()=>{
 const h=harness(),links=Array.from({length:40},(_,i)=>({url:'https://host.example/'+i,server:'voe',lang:'VF'})),before=JSON.stringify(links);
 const rows=await h.run(links);assert.equal(rows[0].url,links[0].url);assert.equal(JSON.stringify(links),before);
 assert.deepEqual(h.counts(),{parsed:40,classified:40});
});
test('signed identity and historically decoded priority retain distinct classification when bytes differ',async()=>{
 const h=harness(),url='https://host.example/a?sig=x%2Fy&amp;k=1',headers={Referer:'https://origin.example/'};
 const rows=await h.run([{url,headers,preserveUrl:true,server:'voe',lang:'VF'}]);
 assert.equal(rows[0].url,url);assert.deepEqual(rows[0].headers,headers);assert.deepEqual(h.counts(),{parsed:2,classified:2});
 assert.deepEqual(h.seen,[url,url.replace('&amp;','&')]);
});
