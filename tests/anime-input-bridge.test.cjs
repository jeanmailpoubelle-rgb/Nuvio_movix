const test=require('node:test'),assert=require('node:assert/strict');
const Bridge=require('../src/anime-sama/input-bridge'),Input=require('../src/input-metadata'),config=require('../config/anime-mapping.json');
function fixture(provider='tvdb'){
 const video={id:'tt123:1:8',season:1,episode:8,title:'Titre français',released:'2026-11-25T13:00:00Z',_tvdbEpisodeId:'88'};
 const ids={imdbId:'tt123',tmdbId:'321',tvdbId:'477'};
 const state={ids,provider,adapter:provider==='unknown'?'xperience':'aiometadata',video,meta:{id:'tt123',videos:[video]},stream:{base:'tt123',season:1,episode:8}};
 const canonical={id:'tt123',moviedb_id:321,tvdb_id:477,videos:[{...video,title:'Episode 8',tvdb_id:88}]};
 delete canonical.videos[0]._tvdbEpisodeId;
 const target={id:'tt123',videos:[{id:'tt123:1:8',season:1,episode:8,title:'Teleport!',released:'2026-11-25T00:00:00Z'}]};
 const row={direct:{'tmdb_show:321:s1':{'1-12':'1-12'}},via:{'anilist:211':{input:{'1-12':'1-12'},targets:{'tmdb_show:321:s1':{'1-12':'1-12'}}}}};
 const zip={mappings:{anilist_id:211,thetvdb_id:477},episodes:{8:{tvdbId:88,tvdbShowId:477,seasonNumber:1,episodeNumber:8}}};
 const find={tv_episode_results:[]},calls=[];
 const io={json:async url=>{calls.push(url);if(url.endsWith('current.json'))return {schema:1,revision:config.mappingRevision,source_sha256:config.mappingRevision+'0'.repeat(48)};if(url.includes('ani.zip'))return zip;return {schema:1,revision:config.mappingRevision,rows:{'tvdb_show:477:s1':row}};}};
 return {state,canonical,target,row,zip,find,io,calls};
}
test('historical Witch-style metadata gap recovers only after exact selected/canonical proof',async()=>{
 for(const p of ['tvdb','unknown']){const f=fixture(p),m=await Bridge.recover(f.state,f.target,f.canonical,f.find,f.io);assert.deepEqual([m.season,m.episode],[1,8]);assert.match(m.basis,/^anibridge\//);assert.equal(f.calls.length,3);assert.equal(m.referenceMeta,f.target);}
});
test('foreign find data, failed find shape, wrong canonical IDs and unverified input cannot open fallback',async()=>{
 for(const change of [f=>f.find.tv_episode_results.push({show_id:999}),f=>delete f.find.tv_episode_results,f=>f.state.provider='tmdb',f=>f.canonical.videos[0].tvdb_id=99,f=>f.canonical.videos[0].released='2026-10-01',f=>f.state.meta.videos.push({...f.state.video})]){
  const f=fixture();change(f);assert.equal(await Bridge.recover(f.state,f.target,f.canonical,f.find,f.io),null);assert.equal(f.calls.length,0);
 }
 const f=fixture();f.canonical.moviedb_id=999;await assert.rejects(Bridge.recover(f.state,f.target,f.canonical,f.find,f.io),/IDENTITY_CONFLICT/);assert.equal(f.calls.length,0);
});
test('supported directional composition preserves Hunter and split-part coordinates; no empty identity mapping guess',()=>{
 const row={direct:{},via:{'anilist:11061':{input:{'1-78':'59-136'},targets:{'tmdb_show:46298:s1':{'1-62':'1-62'},'tmdb_show:46298:s2':{'63-136':'63-136'}}}}};
 for(const [e,s,n] of [[1,1,59],[4,1,62],[5,2,63],[72,2,130]])assert.deepEqual(Bridge.candidates(row,e,46298).targets,[{season:s,episode:n}]);
 assert.deepEqual(Bridge.candidates({direct:{},via:{}},1,321).targets,[]);
 assert.throws(()=>Bridge.candidates({direct:{'tmdb_show:321:s1':{'1-2':'1-4'}},via:{}},1,321),/UNSUPPORTED/);
});
test('conflicting routes and overlapping target rows stop rather than selecting the first result',async()=>{
 const f=fixture();f.row.via['anilist:211'].targets={'tmdb_show:321:s1':{'1-12':'2-13'}};await assert.rejects(Bridge.recover(f.state,f.target,f.canonical,f.find,f.io),/CONFLICT/);
 const g=fixture();g.target.videos.push({...g.target.videos[0]});await assert.rejects(Bridge.recover(g.state,g.target,g.canonical,g.find,g.io),/AMBIGUOUS/);
 const h=fixture();h.row.direct['tmdb_show:321:s2']={'1-12':'1-12'};h.row.via['anilist:211'].targets=h.row.direct;h.target.videos.push({...h.target.videos[0],season:2});await assert.rejects(Bridge.recover(h.state,h.target,h.canonical,h.find,h.io),/AMBIGUOUS/);
});
test('known ani.zip contradictions veto; missing data is allowed only with established input order',async()=>{
 for(const mutate of [f=>f.zip.episodes[8].tvdbId=99,f=>f.zip.mappings.thetvdb_id=999,f=>f.zip.mappings.anilist_id=999]){const f=fixture();mutate(f);await assert.rejects(Bridge.recover(f.state,f.target,f.canonical,f.find,f.io),/CONFLICT/);}
 for(const provider of ['tvdb','unknown']){const f=fixture(provider);delete f.zip.episodes[8];const m=await Bridge.recover(f.state,f.target,f.canonical,f.find,f.io);assert.equal(!!m,provider==='tvdb');}
});
test('specials and missing reference/rules remain unavailable; no older-revision retry for semantic absence',async()=>{
 const f=fixture();f.row.direct={'tmdb_show:321:s0':{'1-12':'1-12'}};f.row.via['anilist:211'].targets=f.row.direct;assert.equal(await Bridge.recover(f.state,f.target,f.canonical,f.find,f.io),null);
 const g=fixture();g.target.videos=[];assert.equal(await Bridge.recover(g.state,g.target,g.canonical,g.find,g.io),null);
 const h=fixture();const revision='a'.repeat(16);h.io.json=async url=>{h.calls.push(url);return url.endsWith('current.json')?{schema:1,revision,source_sha256:revision+'0'.repeat(48)}:{schema:1,revision,rows:{}};};assert.equal(await Bridge.recover(h.state,h.target,h.canonical,h.find,h.io),null);assert.equal(h.calls.length,2);assert.ok(!h.calls[1].includes(config.mappingRevision));
});
test('every immutable shipped shard validates with real directional boundary cases',()=>{
 const fs=require('node:fs'),path=require('node:path');const p=require('../plugins/anime-sama-plus/data/current.json');const v=require('../scripts/validate_anime_mappings.cjs').validate(path.join(__dirname,'../plugins/anime-sama-plus/data',p.revision));assert.ok(v.rows>5000);
});
test('delivery failure may use baseline, while semantic conflict never retries old rules',async()=>{
 const f=fixture();let latest='a'.repeat(16),seen=[];
 const data={schema:1,revision:config.mappingRevision,rows:{'tvdb_show:477:s1':f.row}};
 const io={json:async url=>{seen.push(url);if(url.endsWith('current.json'))return {schema:1,revision:latest,source_sha256:latest+'0'.repeat(48)};if(url.includes(latest))throw Error('delivery');return data;}};
 const loaded=await Bridge.load(io,477);assert.equal(loaded.revision,config.mappingRevision);assert.equal(seen.length,3);
 const g=fixture();g.row.via['anilist:211'].targets={'tmdb_show:321:s2':{'1-12':'1-12'}};await assert.rejects(Bridge.recover(g.state,g.target,g.canonical,g.find,g.io),/CONFLICT/);assert.equal(g.calls.length,2);
});
