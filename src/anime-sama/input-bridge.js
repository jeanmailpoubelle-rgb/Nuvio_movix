// Anime-Sama+ only. A failed /find is NOT permission to guess coordinates.
const Input=require('../input-metadata');
const Ranges=require('../sources-en/mapping');
const config=require('../../config/anime-mapping.json');
const positive=Ranges.positive;
function fail(code){return Input.fail('INPUT_METADATA_ANIBRIDGE_'+code);}
function rows(meta){return Array.isArray(meta?.videos)?meta.videos:[];}
function sameDate(a,b){const x=Date.parse(a?.released||a?.firstAired||''),y=Date.parse(b?.released||b?.firstAired||'');return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-y)<=86400000;}
function proof(state,canonical,find){
  if(!Array.isArray(find?.tv_episode_results)||find.tv_episode_results.length||
    !(state.provider==='tvdb'||state.adapter==='xperience'&&state.provider==='unknown'))return null;
  Input.identity(canonical,state.ids);
  const external=Input.tvdbEpisode(state.video,state.provider,state.proxyOrigin);
  const tvdb=String(canonical.tvdb_id||canonical._tvdbId||state.ids.tvdbId||'');
  if(!external||!positive(tvdb)||state.ids.tvdbId&&state.ids.tvdbId!==tvdb)return null;
  const selected=rows(state.meta).filter(v=>v.id===state.video.id);
  const originals=rows(state.meta).filter(v=>Input.tvdbEpisode(v,state.provider,state.proxyOrigin)?.id===external.id);
  const linked=rows(canonical).filter(v=>v.id===state.video.id);
  if(linked.some(v=>positive(v._tvdbEpisodeId)&&positive(v.tvdb_id)&&String(v._tvdbEpisodeId)!==String(v.tvdb_id)))throw fail('CONFLICT');
  if(linked.length!==1)return null;
  const anchors=rows(canonical).filter(v=>v.id===state.video.id&&Input.tvdbEpisode(v,'imdb')?.id===external.id&&sameDate(v,state.video));
  if(selected.length!==1||originals.length!==1||anchors.length!==1)return null;
  return {external,tvdb};
}
function targets(rules,episode,show){
  if(!rules||typeof rules!=='object'||Array.isArray(rules))throw fail('INVALID_DATA');
  const out=[];
  for(const [descriptor,ranges] of Object.entries(rules)){
    const m=/^tmdb_show:([1-9]\d*):s(\d+)$/.exec(descriptor);
    if(!m)throw fail('INVALID_DATA');
    if(m[1]!==String(show))continue;
    try{const x=Ranges.target({'anilist:1':ranges},episode);out.push({season:Number(m[2]),episode:x.episode});}
    catch(e){if(e.code!=='EN_MAPPING_MISSING')throw fail(e.code==='EN_MAPPING_AMBIGUOUS'?'AMBIGUOUS':'UNSUPPORTED');}
  }
  return unique(out);
}
function unique(list){const found=new Map();for(const v of list)found.set(v.season+':'+v.episode,v);return [...found.values()].sort((a,b)=>a.season-b.season||a.episode-b.episode);}
function candidates(row,episode,show){
  if(!row||typeof row!=='object'||!row.direct||!row.via||Array.isArray(row.via))throw fail('INVALID_DATA');
  const direct=targets(row.direct,episode,show),via=[],anime=[];
  for(const [key,link] of Object.entries(row.via)){
    const m=/^anilist:([1-9]\d*)$/.exec(key);if(!m)throw fail('INVALID_DATA');
    let a;try{a=Ranges.target({[key]:link.input},episode);}catch(e){if(e.code==='EN_MAPPING_MISSING')continue;throw fail('UNSUPPORTED');}
    anime.push(a);via.push(...targets(link.targets,a.episode,show));
  }
  if(anime.length>1)throw fail('AMBIGUOUS');
  const composed=unique(via);
  if(direct.length&&composed.length&&JSON.stringify(direct)!==JSON.stringify(composed))throw fail('CONFLICT');
  return {targets:direct.length?direct:composed,anime:anime[0]};
}
function revision(p){if(p?.schema!==1||!/^[a-f0-9]{16}$/.test(p.revision||'')||!/^[a-f0-9]{64}$/.test(p.source_sha256||'')||!p.source_sha256.startsWith(p.revision))throw fail('INVALID_REVISION');return p.revision;}
async function load(io,id){
  let rev=config.mappingRevision;
  try{rev=revision(await io.json(config.mappingBaseUrl+'/current.json'));}catch(_error){/* Delivery failure only: immutable bundled baseline. */}
  async function shard(r){
    const d=await io.json(config.mappingBaseUrl+'/'+r+'/tvdb_show/'+String(Number(id)%64).padStart(2,'0')+'.json');
    if(d?.schema!==1||d.revision!==r||!d.rows||Array.isArray(d.rows))throw fail('INVALID_DATA');return d.rows;
  }
  let data;try{data=await shard(rev);}catch(e){if(rev===config.mappingRevision)throw e;rev=config.mappingRevision;data=await shard(rev);}
  return {revision:rev,rows:data};
}
async function recover(state,target,canonical,find,io){
  const p=proof(state,canonical,find);if(!p)return null;
  Input.identity(target,state.ids,true);
  const data=await load(io,p.tvdb),row=data.rows['tvdb_show:'+p.tvdb+':s'+Number(state.video.season)];
  if(!row)return null; // A missing rule never retries an older revision.
  const mapped=candidates(row,Number(state.video.episode),state.ids.tmdbId);
  const possible=[];
  for(const t of mapped.targets){
    if(t.season<1)continue;
    const matches=rows(target).filter(v=>Number(v.season)===t.season&&Number(v.episode)===t.episode);
    if(matches.length>1)throw fail('AMBIGUOUS');if(matches.length===1)possible.push(matches[0]);
  }
  if(possible.length>1)throw fail('AMBIGUOUS');if(!possible.length)return null;
  let zip;
  if(mapped.anime)try{zip=await io.json(config.episodeApi+'?anilist_id='+mapped.anime.anilistId);}catch(_error){/* Missing veto data is not a contradiction. */}
  if(zip&&mapped.anime){
    try{Ranges.corroborate({...state,ids:{...state.ids,tvdbId:p.tvdb}},mapped.anime,zip);}catch(_error){throw fail('CONFLICT');}
  }
  // Auto Xperience does not declare its numbering provider. Here a positive
  // episode-ID match is required to establish input order, not as a zip veto.
  if(state.provider==='unknown'&&(!zip||!mapped.anime||String(zip.episodes?.[String(mapped.anime.episode)]?.tvdbId)!==p.external.id))return null;
  const video=possible[0];Input.targetContext(target,video); // Strict inventory/absolute-order guard.
  return {video,season:Number(video.season),episode:Number(video.episode),basis:'anibridge/'+data.revision,referenceMeta:target};
}
module.exports={proof,candidates,load,recover};
