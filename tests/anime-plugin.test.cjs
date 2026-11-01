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
      calls.push({url,request});const language=url.includes('vostfr')?'vostfr':'vf';
      let body='',status=200,type='text/html';
      if(options.discovery&&url.startsWith('https://catalog.nuvio.tv/')){
        lookup++;body=JSON.stringify({meta:{name:'Example',genres:['Animation'],released:'2000-01-01',videos:[{season:1,episode:1}]}});
      }else if(options.discovery&&url===base+'/catalogue/example/'){
        body='<h1>Example</h1><script>panneauAnime("Saison 1","saison1/vostfr/");panneauAnime("Saison 1","saison1/vf/");</script>';
      }else if(options.discovery&&url.startsWith(base)&&!url.includes('episodes.js')){
        body='<script src="episodes.js?revision=1"></script><script>resetListe();finirListe(1);</script>';
      }else if(url.startsWith(base)&&url.includes('episodes.js')){
        const hosts=['ansembed.net','smoothpre.com','vidmoly.biz','uqload.to'];
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
test('Anime-Sama is a separately installable plugin and is absent from Sources FR manifest',()=>{
  const root=require('../manifest.json'),anime=require('../plugins/anime-sama/manifest.json');
  assert.equal(anime.name,'Anime-Sama');assert.equal(anime.scrapers.length,1);
  assert.ok(!root.scrapers.some(p=>p.id==='anime-sama'));assert.equal(anime.scrapers[0].hasSettings,true);
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
