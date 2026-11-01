const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const bundle=fs.readFileSync(__dirname+'/../plugins/anime-sama/providers/anime-sama.js','utf8');
function load(options={}){
  const calls=[],logs=[],base='https://anime.example';
  let lookup=0;
  const sourceMap=JSON.stringify({'tv:95479':{seasons:{1:{path:'/catalogue/example/saison1/',languages:['vostfr','vf']}}}});
  const context=vm.createContext({module:{exports:{}},SCRAPER_SETTINGS:{animeSamaBaseUrl:base,sourceMap,...options.settings},
    btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),
    console:{log:(...m)=>logs.push(m.join(' ')),warn:(...m)=>logs.push(m.join(' ')),error:()=>{}},
    fetch:async(url,request={})=>{
      if(options.beforeRequest)await options.beforeRequest(url,request);
      calls.push({url,request});const language=url.includes('vostfr')?'vostfr':'vf';
      let body='',status=200,type='text/html';
      if(options.discovery&&url.startsWith('https://catalog.nuvio.tv/')){
        lookup++;body=JSON.stringify({meta:{name:'Example',genres:['Animation'],released:'2000-01-01',videos:[{season:1,episode:1}]}});
      }else if(options.discovery&&url===base+'/catalogue/example/'){
        body='<h1>Example</h1><script>panneauAnime("Saison 1","saison1/vostfr/");panneauAnime("Saison 1","saison1/vf/");</script>';
      }else if(options.discovery&&url.startsWith(base)&&!url.includes('episodes.js')){
        body='<script src="episodes.js?revision=1"></script><script>resetListe();finirListe(1);</script>';
      }else if(url.startsWith(base)&&url.includes('episodes.js')){
        const hosts=options.hosts||['ansembed.net','smoothpre.com','vidmoly.biz','uqload.to'];
        if(options.sendvid)hosts.push('sendvid.com');
        if(options.voeTitle)hosts.push('rotation-entry.example');
        body=hosts.map((h,i)=>`var eps${i+1}=['https://${h}/embed-${language}${options.fresh?'-'+lookup:''}.html'];`).join('\n');
      }else if(url.startsWith('https://cdn.example/')||url.startsWith('https://redirectcdn.example/')){
        type='application/vnd.apple.mpegurl';
        if(url.includes('low.m3u8')||url.includes('video.m3u8'))body='#EXTM3U\n#EXTINF:10,\nsegment.ts';
        else if(options.deniedHigh&&url.includes('high.m3u8'))status=403;
        else if(url.includes('high.m3u8'))body='#EXTM3U\n#EXTINF:10,\nsegment.ts';
        else body=options.deniedHigh?'#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1280x720,BANDWIDTH=2000000\nhigh.m3u8\n#EXT-X-STREAM-INF:RESOLUTION=640x360,BANDWIDTH=500000\nlow.m3u8':
          '#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION='+ (url.includes('smoothpre')?'640x360':'1280x720')+',BANDWIDTH=1000000\nvideo.m3u8';
      }else{
        const host=new URL(url).hostname;
        const media='https://cdn.example/'+host+'/'+language+'/master.m3u8?sig=keep%2F&x=2'+(options.fresh?'&lookup='+lookup:'');
        body=options.objectPlayer&&host==='ansembed.net'?`<script>var player={hls1:'${media}'};setup({sources:[{file:player.hls1,type:'hls'}]});</script>`:
          `<script>sources:[{file:'${media}'}];</script><track kind="captions" srclang="fr" label="Français" src="/captions/fr.vtt">`;
        if(host==='sendvid.com')body=options.metaVideo?'<meta content="https://binary.example/movie.mp4" property="og:video:secure_url">':'<video><source src="https://binary.example/movie.mp4"></video>';
        if(host==='rotation-entry.example')body='<title>Redirecting...</title><script>window.location.href="https://rotation-final.example/embed-'+language+'.html";</script>';
        if(host==='rotation-final.example')body='<title>'+options.voeTitle+'</title><script type="application/json">'+JSON.stringify([fs.readFileSync(__dirname+'/fixtures/hosts/voe-f7.txt','utf8').trim()])+'</script>';
        if(options.deadHost===host)status=404;
      }
      if(options.audioGroups&&url.startsWith('https://cdn.example/')&&url.includes('master.m3u8'))
        body=body.replace(/#EXT-X-STREAM-INF:/g,'#EXT-X-STREAM-INF:AUDIO="audio",')+'\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="fr",URI="fr.m3u8"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="ja",URI="ja.m3u8"';
      let bytes;
      if(url==='https://binary.example/movie.mp4'){
        type='video/mp4';bytes=new Uint8Array(44);const view=new DataView(bytes.buffer);
        view.setUint32(0,44);bytes.set([109,111,111,118],4);view.setUint32(8,36);bytes.set([109,118,104,100],12);
        view.setUint32(28,1000);view.setUint32(32,(options.placeholder?5:30)*1000);
      }
      const final=options.redirectMaster&&url.startsWith('https://cdn.example/')&&url.includes('master.m3u8')?url.replace('cdn.example','redirectcdn.example'):url;
      return {ok:status<400,status,url:final,headers:{get:k=>k.toLowerCase()==='content-type'?type:null},text:async()=>body,
        arrayBuffer:async()=>bytes?.buffer||new ArrayBuffer(0)};
    }});
  if(options.clock)context.Date=class extends Date{static now(){return options.clock.now;}};
  if(options.scraperId!==undefined)context.SCRAPER_ID=options.scraperId;
  if(options.nativeAsync){
    const fetch=context.fetch;
    context.__native_fetch=async(url,method,headers)=>{
      const response=await fetch(url,{method,headers:JSON.parse(headers)});
      return JSON.stringify({ok:response.ok,status:response.status,url:response.url,
        body:await response.text(),bodyBase64:Buffer.from(await response.arrayBuffer()).toString('base64'),
        headers:{'content-type':response.headers.get('content-type')}});
    };
  }
  let code=bundle;
  if(options.profile){
    assert.equal(code.split('function arrays(source) {').length,2);
    assert.equal(code.split('function load(source) {').length,2);
    code=code.replace('function arrays(source) {','function arrays(source) {globalThis.arrayParses=(globalThis.arrayParses||0)+1;')
      .replace('function load(source) {','function load(source) {globalThis.htmlParses=(globalThis.htmlParses||0)+1;');
  }
  if(options.providerAccess){
    const marker='return require("src/anime-sama/native.js");';
    assert.equal(code.split(marker).length,2);
    code=code.replace(marker,'globalThis.TestProvider=require("src/anime-sama/provider.js").AnimeSamaProvider;'+marker);
  }
  vm.runInContext(code,context);
  return {calls,logs,context,run:()=>context.module.exports.getStreams('95479','tv',1,1),settings:()=>context.module.exports.onSettings()};
}
async function until(predicate){for(let i=0;i<1000&&!predicate();i++)await Promise.resolve();assert.ok(predicate(),'Expected asynchronous fixture progress');}
test('mobile schedules six actual asynchronous hosts; unknown bridges keep four without a preflight',async()=>{
  for(const nativeAsync of [false,true]){
    let active=0,peak=0;const releases=[];
    const h=load({nativeAsync,beforeRequest:url=>{
      if(!url.includes('/embed-'))return;
      active++;peak=Math.max(peak,active);
      return new Promise(resolve=>releases.push(()=>{active--;resolve();}));
    }});
    const running=h.run(),workers=nativeAsync?6:4;
    await until(()=>releases.length===workers);
    assert.equal(peak,workers);
    // Release each wave. No actual sleep or elapsed-time assertion is needed.
    let released=0;
    while(released<8){
      const batch=releases.splice(0);batch.forEach(release=>release());released+=batch.length;
      if(released<8)await until(()=>releases.length>0);
    }
    const baselineHarness=load({nativeAsync}),streams=await running,baseline=await baselineHarness.run();
    assert.deepEqual(JSON.parse(JSON.stringify(streams)),JSON.parse(JSON.stringify(baseline)));
    assert.equal(streams.length,8);assert.ok(peak<=workers);
    if(nativeAsync)assert.ok(h.logs.some(s=>s.includes('anime-selection')&&s.includes('"hostWorkers":'+workers)));
    assert.equal(h.calls.length,baselineHarness.calls.length,'No extra capability preflight or duplicate media reads');
  }
});
test('one pending mobile host allows every other candidate to finish, but still needs its native call to settle',async()=>{
  let release,settled=false;
  const h=load({nativeAsync:true,beforeRequest:url=>url==='https://ansembed.net/embed-vostfr.html'?new Promise(resolve=>{release=resolve;}):undefined});
  const running=h.run().then(value=>{settled=true;return value;});
  await until(()=>h.logs.filter(s=>s.includes('"stage":"hls-tracks"')).length>=7);
  assert.equal(settled,false,'A timer race cannot cancel the pending native HTTP job');
  assert.ok(h.calls.some(c=>c.url==='https://uqload.to/embed-vf.html'),'Queued candidates continue behind the stuck host');
  release();const streams=await running;
  assert.equal(streams.length,8);
});
test('mobile host budget stops late-response followups, retains other links, and retries fresh on the next lookup',async()=>{
  const clock={now:0};let release,first=true;
  const h=load({nativeAsync:true,clock,settings:{version:'vf'},beforeRequest:url=>{
    if(first&&url==='https://ansembed.net/embed-vf.html'){first=false;return new Promise(resolve=>{release=resolve;});}
  }});
  const running=h.run();
  await until(()=>h.logs.filter(s=>s.includes('"stage":"hls-tracks"')).length>=3);
  // Let their final validation/serialization continuations finish before
  // advancing the shared fake clock for the one deliberately pending host.
  for(let i=0;i<100;i++)await Promise.resolve();
  clock.now=20001;release();const streams=await running;
  assert.equal(streams.length,3);assert.ok(streams.every(s=>s.source!=='ANSEmbed'));
  assert.ok(!h.calls.some(c=>c.url.includes('cdn.example/ansembed.net')),'An expired embed cannot trigger a playlist read');
  const selection=JSON.parse(h.logs.find(s=>s.includes('"stage":"anime-selection"')).replace(/^.*?\] /,'')).data;
  assert.equal(selection.hostBudgetStops,1);assert.equal(selection.stop,'host-budget');
  assert.equal(selection.published,4);assert.equal(selection.attempted,4);assert.equal(selection.remaining,0);
  assert.equal(selection.requests,h.calls.length);
  assert.equal((await h.run()).length,4,'An over-budget host is not blacklisted across lookups');
});
test('a mobile host keeps its already-validated HLS when its alternate MP4 exceeds the budget',async()=>{
  const clock={now:0};let release;
  const h=load({nativeAsync:true,clock,settings:{version:'vf'},hosts:['rotation-entry.example'],
    voeTitle:'VOE | Content Delivery Network',beforeRequest:(url,request)=>request.method==='HEAD'?new Promise(resolve=>{release=resolve;}):undefined});
  const running=h.run();
  await until(()=>release&&h.logs.some(s=>s.includes('"stage":"hls-tracks"')));
  for(let i=0;i<100;i++)await Promise.resolve();
  clock.now=20001;release();const streams=await running;
  assert.equal(streams.length,1);assert.equal(streams[0].format,'m3u8');assert.equal(streams[0].source,'Voe');
  assert.ok(h.logs.some(s=>s.includes('anime-selection')&&s.includes('"hostBudgetStops":1')));
});
test('six mobile workers cannot multiply the global 64-request budget',async()=>{
  const h=load({nativeAsync:true,providerAccess:true}),provider=new h.context.TestProvider({animeSamaBaseUrl:'https://anime.example'});
  provider.ctx.requests=61;
  const refs=['vf','vostfr'].map(language=>({path:'/catalogue/example/saison1/'+language+'/',index:0,language,
    script:'/catalogue/example/saison1/'+language+'/episodes.js'}));
  await provider.streams(refs);
  assert.equal(provider.ctx.requests,64);assert.equal(h.calls.length,3);
  assert.ok(h.logs.some(s=>s.includes('anime-selection')&&s.includes('"stop":"request-budget"')&&s.includes('"hostWorkers":6')));
});
test('normal discovery parses each edition once and keeps every host and language',async()=>{
  const h=load({discovery:true,profile:true,settings:{sourceMap:''}}),sources=await h.run();
  assert.equal(sources.length,8);assert.equal(sources.filter(s=>s.language==='VF').length,4);
  assert.equal(sources.filter(s=>s.language==='VOSTFR').length,4);
  assert.ok(sources.every(s=>s.subtitles?.[0].name==='Français'&&s.headers.Origin&&s.url.endsWith('?sig=keep%2F&x=2')));
  assert.equal(h.context.arrayParses,2,'Mapping and extraction must share the same verified edition slots');
  assert.equal(h.context.htmlParses,3,'Parse one title page and one page per edition');
  assert.equal(h.calls.filter(c=>c.url.includes('episodes.js')).length,2);
  assert.ok(h.calls.filter(c=>c.url.includes('episodes.js')).every(c=>c.url.endsWith('?revision=1')));
});
test('parsed edition reuse ends with the lookup; the next request fetches fresh scripts and players',async()=>{
  const h=load({discovery:true,fresh:true,profile:true,settings:{sourceMap:''}});
  const first=await h.run(),second=await h.run();
  assert.equal(first.length,8);assert.equal(second.length,8);
  assert.ok(first.every(s=>s.url.endsWith('&lookup=1')));assert.ok(second.every(s=>s.url.endsWith('&lookup=2')));
  assert.equal(h.calls.filter(c=>c.url.includes('episodes.js')).length,4);
  assert.equal(h.context.arrayParses,4);assert.equal(h.context.htmlParses,6);
});
test('external episode references still fetch their explicit script without relying on a warm mapping cache',async()=>{
  const Id=require('../src/anime-sama/ids'),path='/catalogue/example/saison1/vf/';
  const id=Id.encodeEpisode([{path,index:0,language:'vf',script:path+'episodes.js?revision=external'}]);
  const h=load({profile:true}),sources=await h.context.module.exports.getStreams(id,'tv',1,1);
  assert.equal(sources.length,4);assert.ok(sources.every(s=>s.language==='VF'));
  assert.equal(h.calls.filter(c=>c.url.includes('episodes.js')).length,1);
  assert.equal(h.calls[0].url,'https://anime.example'+path+'episodes.js?revision=external');
  assert.equal(h.context.arrayParses,1);assert.equal(h.context.htmlParses,undefined);
});
test('a changed script revision or failed mapping cache retains fresh source-reference extraction',async()=>{
  const path='/catalogue/example/saison1/vf/';
  for(const rejected of [false,true]){
    const h=load({profile:true,providerAccess:true}),provider=new h.context.TestProvider({animeSamaBaseUrl:'https://anime.example'});
    provider.versionsCache.set(path,rejected?Promise.reject(new Error('Unavailable mapping page')):
      Promise.resolve({script:path+'episodes.js?revision=old',episodes:[{servers:['https://wrong.example/wrong.mp4']}]}));
    const result=await provider.streams([{path,index:0,language:'vf',script:path+'episodes.js?revision=new'}]);
    assert.equal(result.streams.length,4);
    assert.equal(h.calls[0].url,'https://anime.example'+path+'episodes.js?revision=new');
    assert.ok(!h.calls.some(c=>c.url.includes('wrong.example')));
    assert.equal(h.context.arrayParses,1);
  }
});
test('Anime-Sama has independent entries in its dedicated repository, sharing one generated bundle',()=>{
  const root=require('../manifest.json'),anime=require('../plugins/anime-sama/manifest.json');
  const entries=require('../config/anime-sama.json').hostEntries;
  assert.equal(anime.name,'Anime-Sama');assert.equal(anime.scrapers.length,6);
  assert.deepEqual(anime.scrapers.map(s=>s.id),Object.keys(entries));
  assert.ok(!root.scrapers.some(p=>p.id.startsWith('anime-sama')));
  assert.ok(anime.scrapers.every(s=>s.name==='Anime-Sama'&&s.hasSettings));
  assert.equal(new Set(anime.scrapers.map(s=>s.filename)).size,1);
});
test('independent host entries preserve the aggregate playback data, editions, aliases and all resolutions',async()=>{
  const entries=require('../config/anime-sama.json').hostEntries,options={nativeAsync:true,sendvid:true,voeTitle:'Watch Example.mp4 - VOE | Content Delivery Network'};
  const aggregateHarness=load(options),aggregate=await aggregateHarness.run();
  const rows=await Promise.all(Object.entries(entries).map(async([id,scope])=>{
    const h=load({...options,scraperId:'https://example.test/manifest.json:'+id}),streams=await h.run();
    const selection=JSON.parse(h.logs.find(s=>s.includes('"stage":"anime-selection"')).replace(/^.*?\] /,'')).data;
    assert.equal(selection.scope,scope);assert.equal(selection.remaining,0);
    assert.ok(h.calls.filter(c=>c.url.includes('/embed-')).every(c=>scope==='other'?/rotation-|sendvid/.test(c.url):c.url.includes(scope)),'Only the owned host receives player requests');
    return {streams,selection};
  }));
  const combined=rows.flatMap(r=>r.streams);
  const canonical=values=>JSON.stringify(values.map(s=>({...s,name:s.name.replace(/^(?:[\dz-]+\.)+ /,'')})).sort((a,b)=>(a.url+a.version).localeCompare(b.url+b.version)));
  assert.equal(canonical(combined),canonical(aggregate),'Only composable display ranks may change');
  assert.equal(rows.reduce((n,r)=>n+r.selection.published,0),rows[0].selection.discovered);
  assert.equal(combined.length,14);assert.equal(combined.filter(s=>s.quality==='360p').length,2);
  const ordered=combined.slice().sort((a,b)=>a.name.localeCompare(b.name));
  assert.deepEqual(ordered.map(s=>s.url),Array.from(aggregate,s=>s.url),'Stable quality/audio ties retain original candidate order across entries');
  const keys=ordered.map(s=>[-Number(s.quality?.slice(0,-1)||0),{MULTI:0,VF:1,VOSTFR:2}[s.language]??3]);
  assert.deepEqual(keys,keys.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]));
});
test('a pending host entry does not hold the other installed entries results',async()=>{
  const entries=require('../config/anime-sama.json').hostEntries,complete=new Map();let release;
  const pending=Object.keys(entries).map(id=>{
    const h=load({nativeAsync:true,scraperId:'repository-uuid:'+id,beforeRequest:url=>
      id==='anime-sama'&&url==='https://ansembed.net/embed-vostfr.html'?new Promise(resolve=>{release=resolve;}):undefined});
    return h.run().then(streams=>{complete.set(id,streams);return streams;});
  });
  await until(()=>complete.size===5);
  assert.ok(!complete.has('anime-sama'));assert.equal([...complete.values()].flat().length,6);
  release();assert.equal((await Promise.all(pending)).flat().length,8);
});
test('unknown native entry IDs fail closed instead of resolving every host',async()=>{
  const h=load({nativeAsync:true,scraperId:'repository-uuid:unknown-anime-entry'});
  assert.equal((await h.run()).length,0);assert.equal(h.calls.length,0);
});
test('dedicated plugin returns every supported host in both editions, including sub-720p sources',async()=>{
  const h=load(),sources=await h.run();assert.equal(sources.length,8);
  assert.deepEqual([...new Set(sources.map(s=>s.language))].sort(),['VF','VOSTFR']);
  assert.equal(sources.filter(s=>s.quality==='360p').length,2);
  assert.ok(sources.every(s=>/^\d{2}\. Anime-Sama \/ .+ \| (?:360|720)p \| (?:VF|VOSTFR)$/.test(s.name)));
  assert.deepEqual(Array.from(sources,s=>s.quality+':'+s.language),[
    '720p:VF','720p:VF','720p:VF','720p:VOSTFR','720p:VOSTFR','720p:VOSTFR','360p:VF','360p:VOSTFR',
  ]);
  assert.ok(sources.every(s=>s.url.endsWith('?sig=keep%2F&x=2')));
  assert.ok(sources.every(s=>s.headers.Origin&&s.headers.Referer.includes('embed-')));
  assert.ok(sources.every(s=>s.headers['User-Agent'].includes('Chrome/131.0.0.0')));
  assert.ok(h.calls.filter(c=>c.url.includes('/embed-')).every(c=>c.request.headers['User-Agent'].includes('Chrome/131.0.0.0')),'host and media requests preserve the original plugin browser headers');
  assert.ok(sources.every(s=>s.size===s.source&&s.provider===s.source),'native secondary line retains the actual video host');
  assert.ok(sources.some(s=>s.size==='ANSEmbed')&&sources.some(s=>s.size==='Smoothpre'));
  assert.ok(sources.every(s=>s.subtitles?.[0].name==='Français'));
  assert.ok(h.calls.length>24,'the separate anime budget must not inherit the 24-request limit');
  assert.ok(h.logs.some(s=>s.includes('anime-selection')&&s.includes('"returned":8')));
});
test('a failed host does not cancel other editions or host results',async()=>{
  const h=load({deadHost:'smoothpre.com'}),sources=await h.run();assert.equal(sources.length,6);
  assert.equal(sources.filter(s=>s.language==='VF').length,3);assert.equal(sources.filter(s=>s.language==='VOSTFR').length,3);
});
test('shared literal object player support resolves ANSEmbed without executing downloaded JavaScript',async()=>{
  const h=load({objectPlayer:true}),sources=await h.run();assert.equal(sources.length,8);
  assert.equal(sources.filter(s=>s.name.includes('ANSEmbed')).length,2);
});
test('shared validation retains a playable low-resolution fallback when the higher variant is denied',async()=>{
  const h=load({deniedHigh:true}),sources=await h.run();assert.equal(sources.length,8);
  assert.ok(sources.every(s=>s.url.endsWith('low.m3u8')&&s.quality==='360p'));
});
test('a lower validated rendition cannot flatten a master with external French/Japanese audio groups',async()=>{
  const h=load({deniedHigh:true,audioGroups:true,discovery:true,settings:{sourceMap:''}}),sources=await h.run();assert.equal(sources.length,8);
  assert.ok(sources.every(s=>s.url.includes('master.m3u8?sig=keep%2F&x=2')&&s.language==='MULTI'));
  assert.ok(!h.calls.some(c=>/\/(?:fr|ja)\.m3u8/.test(c.url)),'audio stays on the original master for native selection');
});
test('Sendvid binary placeholder rejection is shared, and valid long files remain available',async()=>{
  const good=load({sendvid:true}),bad=load({sendvid:true,placeholder:true});
  assert.equal((await good.run()).length,10);assert.equal((await bad.run()).length,8);
  assert.ok(good.calls.filter(c=>c.url==='https://binary.example/movie.mp4').every(c=>c.request.headers.Range==='bytes=0-65535'));
});
test('Sendvid secure-video metadata works independently of HTML attribute order',async()=>{
  const h=load({sendvid:true,metaVideo:true});assert.equal((await h.run()).length,10);
});
test('HLS validation returns the observed redirect target instead of replaying a consumed entry URL',async()=>{
  const h=load({redirectMaster:true}),sources=await h.run();assert.equal(sources.length,8);
  assert.ok(sources.every(s=>s.url.startsWith('https://redirectcdn.example/')&&s.url.endsWith('?sig=keep%2F&x=2')));
  assert.ok(h.calls.some(c=>c.url.startsWith('https://redirectcdn.example/')&&c.url.includes('video.m3u8')));
});
test('edition settings remain available on the dedicated plugin',async()=>{
  const h=load({settings:{version:'vf'}}),sources=await h.run();assert.equal(sources.length,4);
  assert.ok(sources.every(s=>s.language==='VF'));assert.equal(h.settings().find(s=>s.key==='version').type,'select');
});
test('unlisted VOE aliases keep both editions and formats when branding follows the filename',async()=>{
  for(const voeTitle of ['VOE | Content Delivery Network','Watch Example_S01E01.mp4 - VOE | Content Delivery Network']){
    const h=load({voeTitle}),sources=await h.run(),voe=sources.filter(s=>s.source==='Voe');
    assert.equal(sources.length,12);assert.equal(voe.length,4);
    assert.deepEqual(Array.from(voe,s=>s.version+':'+s.format).sort(),['VF:m3u8','VF:mp4','VOSTFR:m3u8','VOSTFR:mp4']);
    assert.ok(voe.every(s=>s.size==='Voe'&&s.headers.Origin==='https://rotation-final.example'&&s.headers.Referer.includes('/embed-')));
    assert.equal(h.calls.filter(c=>c.url.startsWith('https://rotation-entry.example/')).length,2);
    assert.equal(h.calls.filter(c=>c.url.startsWith('https://rotation-final.example/')).length,2);
  }
});
test('a filename mentioning VOE without host branding does not select the VOE decoder',async()=>{
  const h=load({voeTitle:'Watch VOE Documentary.mp4 | Example Host'}),sources=await h.run();
  assert.equal(sources.length,8);assert.ok(!sources.some(s=>s.source==='Voe'));
});
