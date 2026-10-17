const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const media='https://cdn.example/master.m3u8?keep=%2F&keep=2';
const single='#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1728x720,CODECS="avc1.64001f,mp4a.40.2"\nindex-v1-a1.m3u8';
const multi=single.replace('CODECS=', 'AUDIO="audio",CODECS=')+'\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="French",LANGUAGE="fr",URI="fr.m3u8"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",URI="en.m3u8"';
function load(provider,routes){
    const calls=[],logs=[];
    const context=vm.createContext({module:{exports:{}},console:{warn:m=>logs.push(m)},
        fetch:async(url,options)=>{
            calls.push({url,options});const r=routes.find(r=>url.includes(r.path));
            if(!r)throw Error('Unexpected request');
            return {ok:true,status:200,url:r.final||url,text:async()=>typeof r.body==='string'?r.body:JSON.stringify(r.body)};
        }});
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../providers',provider+'.js'),'utf8'),context);
    return {calls,logs,run:()=>context.module.exports.getStreams('424242','movie')};
}
function wiflix(body,lang='vf',title='Fixture.MULTI.(VFF+VFQ).1080p.mkv.mp4'){
    return load('movix-catalogues',[
        {path:'/api/wiflix/',body:{tmdb_id:424242,players:{[lang]:[{url:'https://livavid.sbs/e/fixture',language:lang==='multi'?'MULTI':undefined}]}}},
        {path:'/api/fstream/',body:{success:false}}, {path:'/api/tmdb/',body:{success:false}},
        {path:'/e/fixture',body:`<title>${title}</title>sources:[{file:'${media}',label:'1080p'}]`},
        {path:media,body},
    ]);
}
test('Wiflix/Lulu retains VF when a MULTI upload title describes a single served rendition',async()=>{
    const h=wiflix(single),[s]=await h.run();
    assert.equal(s.name,'Movix / Wiflix / LuluStream | 720p | VF');
    assert.equal(s.url,media);assert.equal(s.language,'VF');assert.equal(h.calls.length,5);
    assert.ok(h.logs.some(m=>m.includes('audio-hint')&&m.includes('upload-title')));
    assert.ok(!h.calls.some(c=>c.url.includes('index-v1-a1')||c.url.includes('.ts')));
});
test('real French and English HLS renditions establish MULTI even after ignoring an upload hint',async()=>{
    const h=wiflix(multi),[s]=await h.run();
    assert.equal(s.name,'Movix / Wiflix / LuluStream | 720p | MULTI');assert.equal(s.url,media);
    assert.equal(h.calls.length,5);assert.ok(h.logs.some(m=>m.includes('"evidence":"hls"')));
    assert.ok(!h.calls.some(c=>/\/(?:fr|en)\.m3u8/.test(c.url)),'preserve the master; do not flatten audio renditions');
});
test('Frembed/Dood MP4 does not promote a copied MULTI filename over its VF catalogue hint',async()=>{
    const h=load('frembed-hosts',[
        {path:'/api/films?',body:{links:[{url:'https://dood.li/e/fixture',lang:'vf'}]}},
        {path:'/e/fixture',body:'<title>Fixture.MULTI.1080p.mkv.mp4</title>$.get("/pass_md5/key/fixture")'},
        {path:'/pass_md5/',body:'https://cdn.example/video/'},
    ]),[s]=await h.run();
    assert.equal(s.name,'Frembed / Dood | 1080p | VF');assert.equal(s.format,'mp4');assert.equal(h.calls.length,3);
    assert.ok(!h.calls.some(c=>c.url.startsWith('https://cdn.example/')),'no MP4 download for labels');
});
test('an unlabelled host source stays without a language when MULTI appears only in its upload title',async()=>{
    const h=load('frembed-hosts',[
        {path:'/api/films?',body:{links:[{url:'https://livavid.sbs/e/fixture'}]}},
        {path:'/e/fixture',body:`<title>Fixture DUAL-AUDIO</title>sources:[{file:'${media}'}]`},
        {path:media,body:single},
    ]),[s]=await h.run();
    assert.equal(s.name,'Frembed / LuluStream | 720p');assert.equal(s.language,'');assert.equal(h.calls.length,3);
});
test('explicit catalogue MULTI metadata remains a separate hint when playlist metadata is inconclusive',async()=>{
    const h=wiflix(single,'multi'),[s]=await h.run();
    // This hint comes from structured API data, not the copied upload filename.
    // Actual single-language HLS metadata still overrides it in the shared tests.
    assert.equal(s.language,'MULTI');assert.equal(h.calls.length,5);
});
