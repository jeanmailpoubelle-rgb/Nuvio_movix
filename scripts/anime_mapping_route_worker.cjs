// Research-only worker: execute current pure mapping modules; RPC contains no URLs.
const fs=require('node:fs');
const Input=require('../src/input-metadata');
const EN=require('../src/sources-en/mapping');
const Proof=require('../src/sources-en/input-proof');
let pending=Buffer.alloc(0);
function read(){
 let end;
 while((end=pending.indexOf(10))<0){
  const chunk=Buffer.alloc(65536),n=fs.readSync(0,chunk,0,chunk.length,null);
  if(!n)throw Error('STUDY_EOF');pending=Buffer.concat([pending,chunk.subarray(0,n)]);
  if(pending.length>20*1024*1024)throw Error('STUDY_SIZE');
 }
 const line=pending.subarray(0,end).toString('utf8');pending=pending.subarray(end+1);return JSON.parse(line);
}
function ask(kind,args=[]){process.stdout.write(JSON.stringify({query:kind,args})+'\n');const r=read();if(!r.ok)throw Input.fail('STUDY_UPSTREAM_UNAVAILABLE');return r.data;}
function candidates(rules,episode,pattern){
 const out=[];const unsupported=[];
 for(const [descriptor,ranges] of Object.entries(rules||{})){
  if(!pattern.test(descriptor))continue;
  try{const m=EN.target({'anilist:1':ranges},episode);out.push({descriptor,episode:m.episode});}
  catch(e){if(e.code!=='EN_MAPPING_MISSING')unsupported.push({descriptor,code:e.code});}
 }
 return {candidates:out,unsupported};
}
(async()=>{
 const j=read(),ids=Input.identity(j.meta,j.ids),cfg={adapter:j.adapter,provider:'auto'};
 const state=Input.select(j.meta,ids,j.season,j.episode,j.origin,cfg);
 const out={input:{season:j.season,episode:j.episode},selected:{provider:state.provider,id:state.video.id,title:state.video.title||state.video.name,released:state.video.released,tvdbEpisodeId:Input.tvdbEpisode(state.video,state.provider,state.proxyOrigin)?.id||null}};
 const reference=j.reference,canonical=j.canonical;
 try{
  const mapped=await Input.resolve(state,reference,'nuvio-catalog',{
   cinemeta:async()=>canonical,referenceByImdb:async()=>ask('referenceByImdb'),
   findTvdb:async id=>ask('findTvdb',[id]),episodeDetails:async(s,e)=>ask('episodeDetails',[s,e])
  });out.current={season:mapped.season,episode:mapped.episode,basis:mapped.basis};
 }catch(e){out.current={code:e.code||'STUDY_ERROR'};}
 // Reproduce EN's explicit TVDB configuration and its existing missing-ID proof.
 let enState;
 try{
  const enCfg={adapter:j.adapter,provider:'tvdb'};
  try{enState=Input.select(j.meta,ids,j.season,j.episode,j.origin,enCfg);}
  catch(e){
   if(e.code!=='INPUT_METADATA_XPERIENCE_EPISODE_ID_REQUIRED'||j.adapter!=='xperience')throw e;
   const candidate=Input.select(j.meta,ids,j.season,j.episode,j.origin,{...enCfg,provider:'auto'});
   const external=Proof.episode(candidate,canonical);if(!external)throw e;
   const recovered={...j.meta,videos:j.meta.videos.map(v=>v===candidate.video?{...v,_tvdbEpisodeId:external.id}:v)};
   enState=Input.select(recovered,ids,j.season,j.episode,j.origin,enCfg);
  }
  if(enState.provider!=='tvdb')throw Input.fail('EN_INPUT_PROVIDER_MISMATCH');
  const descriptor='tvdb_show:'+ids.tvdbId+':s'+j.season;
  out.direct=candidates(j.bridge[descriptor],j.episode,/^tmdb_show:/);
  const al=EN.target(j.publishedRules[descriptor],j.episode);out.en={anilistId:al.anilistId,episode:al.episode};
  const full=EN.target(j.bridge[descriptor],j.episode);out.en.upstream_agrees=JSON.stringify(full)===JSON.stringify(al);
  let zip;try{zip=ask('anizip',[al.anilistId]);}catch(e){out.en.corroboration={state:'unavailable'};}
  if(zip)try{out.en.corroboration=EN.corroborate(enState,al,zip);}catch(e){out.en.corroboration={code:e.code,detail:e.detail};}
  out.via_anilist=candidates(j.bridge['anilist:'+al.anilistId],al.episode,/^tmdb_show:/);
 }catch(e){out.en={code:e.code||'STUDY_ERROR'};}
 const annotate=route=>{
  if(!route)return;
  for(const c of route.candidates){
   const m=/^tmdb_show:(\d+):s(\d+)$/.exec(c.descriptor);
   c.expected_series=!!m&&m[1]===String(ids.tmdbId);
   const rows=(reference?.videos||[]).filter(v=>m&&Number(v.season)===Number(m[2])&&Number(v.episode)===c.episode);
   c.reference_rows=rows.length;
   if(rows.length===1){const v=rows[0];c.reference={id:v.id,title:v.title||v.name,released:v.released};
    const a=Date.parse(state.video.released),b=Date.parse(v.released);c.release_delta_hours=Number.isFinite(a)&&Number.isFinite(b)?Math.round((a-b)/3600000*100)/100:null;
   }
   c.agrees_current=out.current.season!=null?Number(m?.[2])===out.current.season&&c.episode===out.current.episode:null;
   if(m)c.season=Number(m[2]);
  }
 };
 annotate(out.direct);annotate(out.via_anilist);
 process.stdout.write(JSON.stringify({result:out})+'\n');
})().catch(e=>process.stdout.write(JSON.stringify({result:{code:e.code||'STUDY_INPUT_UNAVAILABLE'}})+'\n'));
