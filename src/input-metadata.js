// Shared, pure input-episode adapter. HTTP is supplied by each native worker.
const {canonicalEpisodeSeparators} = require('./episode-title');
function fail(code) { return Object.assign(new Error(code), {code}); }
function positive(value) { return /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)); }
function active(settings) {
  let value=settings?.episodeMetadataSource;
  if(value==null||value==='')value=typeof PREVIEW_INPUT_REQUIRED!=='undefined'&&PREVIEW_INPUT_REQUIRED?'aiometadata':'native';
  if(value!=null&&value!==''&&!['native','aiometadata'].includes(value))throw fail('INPUT_METADATA_CONFIG_REQUIRED');
  return value==='aiometadata';
}
function configuration(settings = {}) {
  const namespace = settings.aiometadataIdType || 'imdb';
  let value = String(settings.aiometadataManifestUrl || '').trim().replace(/^stremio:\/\//i,'https://');
  const m = /^(https:\/\/[a-zA-Z0-9.-]+(?::\d+)?)(\/[^\s?#\\]*\/manifest\.json|\/manifest\.json)(\?[^\s#]*)?$/.exec(value);
  if (!m || /^https:\/\/(?:github\.com|raw\.githubusercontent\.com)(?::\d+)?$/i.test(m[1]) || !['imdb','tmdb'].includes(namespace) || /%0[ad]/i.test(value)) throw fail('INPUT_METADATA_CONFIG_REQUIRED');
  let path;
  try { path=decodeURIComponent(m[2]); } catch (_error) { throw fail('INPUT_METADATA_CONFIG_REQUIRED'); }
  if(path.split('/').some(p=>p==='.'||p==='..'))throw fail('INPUT_METADATA_CONFIG_REQUIRED');
  return {origin:m[1],base:m[1]+m[2].slice(0,-14),query:m[3]||'',namespace};
}
function requestUrl(config, ids) {
  const id = config.namespace === 'imdb' ? ids.imdbId : positive(ids.tmdbId) ? 'tmdb:'+ids.tmdbId : null;
  if (!id || config.namespace==='imdb'&&!/^tt\d+$/.test(id)) throw fail('INPUT_METADATA_QUERY_ID_UNAVAILABLE');
  return config.base+'/meta/series/'+encodeURIComponent(id)+'.json'+config.query;
}
function identity(meta, expected = {}, reference = false) {
  if (!meta || typeof meta!=='object' || Array.isArray(meta) || meta.type && !['series','tv','anime'].includes(meta.type)) throw fail('INPUT_METADATA_INVALID_SERIES');
  const supplied={imdbId:[],tmdbId:[],tvdbId:[]};
  for (const [name,keys] of [['imdbId',['imdb_id','_imdbId']],['tmdbId',['moviedb_id','tmdb_id','_tmdbId']],['tvdbId',['tvdb_id','_tvdbId']]])
    for(const key of keys)if(meta[key]!=null&&meta[key]!=='')supplied[name].push(String(meta[key]));
  const raw=String(meta.id||'');
  if(/^tt\d+$/.test(raw))supplied.imdbId.push(raw);
  else {const m=/^(tmdb|tvdb):([1-9]\d*)$/.exec(raw);if(m)supplied[m[1]+'Id'].push(m[2]);}
  let matched=false;const ids={...expected};
  for(const [name,values] of Object.entries(supplied)) {
    if(values.some(v=>name==='imdbId'?!/^tt\d+$/.test(v):!positive(v)) || new Set(values).size>1)throw fail('INPUT_METADATA_IDENTITY_CONFLICT');
    if(!values.length)continue;
    if(expected[name] && String(expected[name])!==values[0])throw fail('INPUT_METADATA_IDENTITY_CONFLICT');
    if(expected[name])matched=true;
    ids[name]=values[0];
  }
  // Public Nuvio Catalog binds its TMDB request route to an explicit IMDb ID.
  // A private input response must itself match an independently known ID.
  if(!matched && !(reference && positive(expected.tmdbId) && ids.imdbId))throw fail('INPUT_METADATA_IDENTITY_UNVERIFIED');
  return ids;
}
function videos(meta) {
  if(!Array.isArray(meta?.videos)||!meta.videos.length)throw fail('INPUT_METADATA_EPISODES_UNAVAILABLE');
  return meta.videos.filter(v=>v&&typeof v==='object');
}
function streamId(value) {
  const m=/^(tt\d+|(?:tmdb|tvdb):[1-9]\d*):([1-9]\d*):([1-9]\d*)$/.exec(String(value||''));
  if(!m || !positive(m[2]) || !positive(m[3]))return null;
  return {base:m[1],season:Number(m[2]),episode:Number(m[3])};
}
function select(meta, ids, season, episode, proxyOrigin) {
  const bases=[ids.imdbId,ids.tmdbId&&'tmdb:'+ids.tmdbId,ids.tvdbId&&'tvdb:'+ids.tvdbId].filter(Boolean);
  // Nuvio passes UI season/episode fields. The stream ID may have a different
  // suffix after AIOmetadata's compatibility conversion; retain both identities.
  const rows=videos(meta).filter(v=>Number(v.season)===season&&Number(v.episode)===episode);
  if(rows.length!==1 || !positive(rows[0].season) || !positive(rows[0].episode))throw fail('INPUT_METADATA_EPISODE_UNAVAILABLE');
  const parsed=streamId(rows[0].id);
  if(!parsed||!bases.includes(parsed.base))throw fail('INPUT_METADATA_STREAM_ID_UNAVAILABLE');
  return {meta,ids,video:rows[0],provider:['tvdb','tmdb','imdb','kitsu','mal','anilist','anidb'].includes(String(meta._metaProvider||'').toLowerCase())?String(meta._metaProvider).toLowerCase():'unknown',stream:streamId(rows[0].id),proxyOrigin};
}
function date(video) {
  const value=String(video?.released||video?.firstAired||video?.air_date||'');
  const number=/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)?Date.parse(value):NaN;
  return Number.isFinite(number)?number:null;
}
function sameDate(a,b) { const x=date(a),y=date(b);return x!==null&&y!==null&&Math.abs(x-y)<=86400000; }
function signature(video) {
  if(!video||!positive(video.season)||!positive(video.episode))return null;
  const raw=canonicalEpisodeSeparators(video.title||video.name||'').replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi,entity=>{
    const known={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};
    if(known[entity.toLowerCase()])return known[entity.toLowerCase()];
    const n=entity[2].toLowerCase()==='x'?parseInt(entity.slice(3),16):parseInt(entity.slice(2),10);
    return n>0&&n<=65535?String.fromCharCode(n):entity;
  });
  const title=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/œ/g,'oe').replace(/æ/g,'ae').replace(/[^a-z0-9]+/g,' ').trim();
  const released=date(video);
  if(title.length<4||/^(?:(?:episode|ep|chapter|part)\s*\d+|untitled|tba)$/.test(title)||released===null)return null;
  return {title,date:released};
}
function sameSignature(a,b) {return a&&b&&a.title===b.title&&Math.abs(a.date-b.date)<=86400000;}
function tvdbEpisode(video, provider, proxyOrigin) {
  if(positive(video?._tvdbEpisodeId))return {id:String(video._tvdbEpisodeId),basis:'explicit'};
  if(provider==='imdb'&&positive(video?.tvdb_id))return {id:String(video.tvdb_id),basis:'explicit'};
  let thumbnail=String(video?.thumbnail||'');
  if(proxyOrigin && thumbnail.startsWith(proxyOrigin+'/api/image/blur?')) {
    const raw=/(?:\?|&)url=([^&#]*)/.exec(thumbnail);
    try { thumbnail=raw?decodeURIComponent(raw[1]):''; } catch (_error) { thumbnail=''; }
  }
  const m=/^https:\/\/artworks\.thetvdb\.com(\/[^?#]*)(?:\?[^#]*)?$/.exec(thumbnail);
  if(!m)return null;
  const modern=/^\/banners\/v4\/episode\/([1-9]\d*)\/screencap\/[^/]+$/.exec(m[1]);
  const legacy=/^\/banners\/episodes\/[1-9]\d*\/([1-9]\d*)\.[A-Za-z0-9]+$/.exec(m[1]);
  return modern||legacy?{id:(modern||legacy)[1],basis:'artwork'}:null;
}
function coordinates(video) {return {season:Number(video.season),episode:Number(video.episode)};}
function only(rows,code) {if(rows.length!==1)throw fail(code);return rows[0];}
function targetRow(meta, season, episode) {
  const rows=videos(meta).filter(v=>Number(v.season)===season&&Number(v.episode)===episode);
  if(rows.length>1)throw fail('INPUT_METADATA_TARGET_EPISODE_AMBIGUOUS');
  return only(rows,'INPUT_METADATA_TARGET_EPISODE_UNAVAILABLE');
}
function result(video,basis) {return {video,...coordinates(video),basis};}
function titleMatch(state,target) {
  const key=signature(state.video);
  if(!key)return null;
  const source=videos(state.meta).filter(v=>sameSignature(key,signature(v)));
  const candidates=videos(target).filter(v=>sameSignature(key,signature(v)));
  return source.length===1&&candidates.length===1?candidates[0]:null;
}
function streamReleaseAnchor(state, canonical) {
  // A compatibility ID alone can carry a foreign numbering layout. It needs
  // one unique released episode in both lists, plus independent series IDs.
  if(state.provider!=='tvdb'||state.stream?.base!==state.ids.imdbId)return null;
  identity(canonical,state.ids);
  const sourceRows=videos(state.meta),targetRows=videos(canonical);
  const sourceId=sourceRows.filter(v=>v.id===state.video.id);
  const matches=targetRows.filter(v=>v.id===state.video.id);
  if(sourceId.length!==1||matches.length!==1||!sameDate(state.video,matches[0]))return null;
  const anchor=matches[0];
  const parsed=streamId(anchor.id);
  if(!parsed||parsed.base!==state.ids.imdbId||!positive(anchor.season)||!positive(anchor.episode)||parsed.season!==Number(anchor.season)||parsed.episode!==Number(anchor.episode))return null;
  if(sourceRows.filter(v=>sameDate(state.video,v)).length!==1||targetRows.filter(v=>sameDate(anchor,v)).length!==1)return null;
  return {meta:canonical,ids:state.ids,video:anchor,provider:'imdb',stream:parsed};
}
function recoveredReference(primary, alternate, ids) {
  identity(alternate,ids);
  const regular=meta=>videos(meta).filter(v=>positive(v.season)&&positive(v.episode));
  const original=primary.videos.filter(v=>positive(v?.season)&&positive(v?.episode)),replacement=regular(alternate),rows=new Map();
  for(const video of replacement) {
    const key=video.season+':'+video.episode;
    if(rows.has(key))throw fail('INPUT_METADATA_TARGET_LAYOUT_AMBIGUOUS');
    rows.set(key,video);
  }
  const seen=new Set();
  // This is recovery of an incomplete inventory from the same service, not
  // permission to replace its ordering. Require a compatible superset.
  for(const video of original) {
    const key=video.season+':'+video.episode,other=rows.get(key);
    if(seen.has(key))throw fail('INPUT_METADATA_TARGET_LAYOUT_AMBIGUOUS');
    seen.add(key);
    if(!other||!sameSignature(signature(video),signature(other)))throw fail('INPUT_METADATA_REFERENCE_CONFLICT');
  }
  return alternate;
}
async function resolve(state, target, kind, io = {}) {
  const external=new Map(),lookup=io.findTvdb;
  const attempt={...io,findTvdb:lookup? id=>{
    if(!external.has(id))external.set(id,Promise.resolve().then(()=>lookup(id)));
    return external.get(id);
  }:undefined};
  try { return await resolveAgainst(state,target,kind,attempt); }
  catch(error) {
    if(kind!=='nuvio-catalog'||!['INPUT_METADATA_TARGET_EPISODE_UNAVAILABLE','INPUT_METADATA_EPISODES_UNAVAILABLE'].includes(error.code)||
      !Array.isArray(target?.videos)||!state.ids.imdbId||!io.referenceByImdb)throw error;
    const alternate=recoveredReference(target,await io.referenceByImdb(),state.ids);
    const mapped=await resolveAgainst(state,alternate,kind,{...attempt,referenceByImdb:undefined});
    return {...mapped,basis:'catalog-imdb-recovery/'+mapped.basis,referenceMeta:alternate};
  }
}
async function resolveAgainst(state, target, kind, io = {}) {
  identity(target,state.ids,kind==='nuvio-catalog');
  const external=tvdbEpisode(state.video,state.provider,state.proxyOrigin);
  if(kind==='cinemeta' && external) {
    const matches=videos(target).filter(v=>String(v.tvdb_id||v._tvdbEpisodeId||'')===external.id);
    if(matches.length>1)throw fail('INPUT_METADATA_EXTERNAL_ID_AMBIGUOUS');
    if(matches.length===1 && (external.basis==='explicit'||sameDate(state.video,matches[0])))return result(matches[0],'tvdb-episode-id');
  }
  if(state.provider==='tmdb' && kind==='nuvio-catalog' || state.provider==='imdb' && kind==='cinemeta') {
    const selected=kind==='cinemeta'?videos(target).filter(v=>v.id===state.video.id):videos(target).filter(v=>Number(v.season)===Number(state.video.season)&&Number(v.episode)===Number(state.video.episode));
    if(selected.length>1)throw fail('INPUT_METADATA_TARGET_EPISODE_AMBIGUOUS');
    if(selected.length===1 && sameDate(state.video,selected[0]))return result(selected[0],'provider-coordinates-and-release');
  }
  if(kind==='nuvio-catalog' && external && io.findTvdb) {
    let data;
    try { data=await io.findTvdb(external.id); }
    catch (_error) {
      const fallback=titleMatch(state,target);
      if(fallback)return result(fallback,'unique-title-and-release');
      throw fail(_error.code || 'INPUT_METADATA_EXTERNAL_ID_UNAVAILABLE');
    }
    // A successful empty /find response is distinct from foreign/ambiguous rows
    // or a transport error. Corroborate the known TVDB ID before borrowing names.
    if(Array.isArray(data?.tv_episode_results)&&data.tv_episode_results.length===0&&io.cinemeta) {
      const canonical=await io.cinemeta();identity(canonical,state.ids);
      const proofs=videos(canonical).filter(v=>v.id===state.video.id&&tvdbEpisode(v,'imdb')?.id===external.id&&sameDate(state.video,v));
      const originals=videos(state.meta).filter(v=>tvdbEpisode(v,state.provider,state.proxyOrigin)?.id===external.id);
      if(proofs.length===1&&originals.length===1&&videos(state.meta).filter(v=>v.id===state.video.id).length===1) {
        const corroborated=titleMatch({meta:canonical,video:proofs[0]},target);
        if(corroborated)return result(corroborated,'tvdb-canonical-title-and-release');
      }
      throw fail('INPUT_METADATA_EXTERNAL_ID_UNAVAILABLE');
    }
    const matches=(data?.tv_episode_results||[]).filter(v=>String(v.show_id)===String(state.ids.tmdbId)&&positive(v.id)&&positive(v.season_number)&&positive(v.episode_number));
    const found=only(matches,'INPUT_METADATA_EXTERNAL_ID_UNAVAILABLE');
    const selected=targetRow(target,Number(found.season_number),Number(found.episode_number));
    if(external.basis==='explicit'||sameDate(state.video,selected))return result(selected,'tvdb-episode-id');
    // Artwork is a hint, not a field with guaranteed identity. A discrepant
    // target date needs independent stream-ID + TVDB-ID corroboration.
    if(io.cinemeta) {
      const canonical=await io.cinemeta();identity(canonical,state.ids);
      const proofs=videos(canonical).filter(v=>v.id===state.video.id&&String(v.tvdb_id||'')===external.id&&sameDate(state.video,v));
      if(proofs.length===1)return result(selected,'tvdb-id-with-stream-corroboration');
    }
    throw fail('INPUT_METADATA_EPISODE_DATE_CONFLICT');
  }
  const matched=titleMatch(state,target);
  if(matched)return result(matched,'unique-title-and-release');
  // Some TVDB artwork is an opaque filename: no episode ID can be extracted.
  // Recover through an explicitly corroborated IMDb stream row, not counts,
  // coordinate equality, translated-title guesses or dates alone.
  if(!external&&state.provider==='tvdb'&&(kind==='cinemeta'||io.cinemeta)) {
    const canonical=kind==='cinemeta'?target:await io.cinemeta();
    const anchor=streamReleaseAnchor(state,canonical);
    if(anchor) {
      if(kind==='cinemeta')return result(anchor.video,'imdb-stream-and-unique-release');
      const canonicalMatch=titleMatch(anchor,target);
      if(canonicalMatch)return result(canonicalMatch,'imdb-stream-and-unique-release/canonical-title-and-release');
      const mapped=await resolve(anchor,target,kind,io);
      return {...mapped,basis:'imdb-stream-and-unique-release/'+mapped.basis};
    }
  }
  // A known TMDB episode may still need a different backend's order.
  if(kind==='cinemeta' && io.reference) {
    const reference=await io.reference();
    const canonical=await resolve(state,reference,'nuvio-catalog',io);
    const normalized={meta:reference,video:canonical.video};
    const alternate=titleMatch(normalized,target);
    if(alternate)return result(alternate,'canonical-title-and-release');
  }
  throw fail('INPUT_METADATA_EPISODE_UNVERIFIED');
}
function targetContext(meta, video) {
  const regular=videos(meta).filter(v=>positive(v.season)&&positive(v.episode));
  const keys=new Set(regular.map(v=>`${Number(v.season)}:${Number(v.episode)}`));
  if(keys.size!==regular.length)throw fail('INPUT_METADATA_TARGET_LAYOUT_AMBIGUOUS');
  const season=Number(video.season),episode=Number(video.episode),selected=regular.filter(v=>Number(v.season)===season);
  if(selected.filter(v=>Number(v.episode)===episode).length!==1)throw fail('INPUT_METADATA_TARGET_EPISODE_UNAVAILABLE');
  const groups=[...new Set(regular.map(v=>Number(v.season)))];
  const global=Number(regular[0]?.episode)===1 && regular.every((v,i)=>!i||Number(v.episode)>Number(regular[i-1].episode));
  let absolute=global?episode:null,offset=0;
  if(absolute===null) {
    let valid=true;
    for(let s=1;s<=season;s++) {
      const group=regular.filter(v=>Number(v.season)===s);
      if(!group.length||group.some((v,i)=>Number(v.episode)!==i+1)){valid=false;break;}
      if(s<season)offset+=group.length;
    }
    if(valid)absolute=offset+episode;
  }
  return {episodes:selected.map(v=>({episode_number:Number(v.episode),name:v.title||v.name,...(Number(v.episode)===episode&&absolute!==null?{absoluteNumber:absolute}:{})})),
    singleSeason:groups.length===1&&groups[0]===1,strictNumbers:true,strictSourceAbsolute:true,inputCatalog:'aiometadata'};
}
function requiredPreview() { return typeof PREVIEW_INPUT_REQUIRED!=='undefined'&&PREVIEW_INPUT_REQUIRED; }
function annotation(from,to,settings={}) {
  if(!requiredPreview()||!active(settings))return '';
  const input='S'+from.season+'E'+from.episode;
  return active(settings)?' [AIO '+input+' → S'+to.season+'E'+to.episode+']':' [NATIF '+input+']';
}
function annotateStreams(values,from,to,settings={}) {
  const label=annotation(from,to,settings);
  return label?values.map(item=>({...item,name:item.name+label})):values;
}
function tagStreams(values,from,to,settings={}) {
  if(!requiredPreview()||!active(settings))return values;
  return values.map(item=>({...item,_previewMapping:{from:{season:from.season,episode:from.episode},to:{season:to.season,episode:to.episode}}}));
}
function renderTaggedStreams(values,settings={}) {
  return values.map(item=>{
    const {_previewMapping,...output}=item;
    return _previewMapping?annotateStreams([output],_previewMapping.from,_previewMapping.to,settings)[0]:output;
  });
}
function settingsFields() {
  return [
    {type:'info',label:requiredPreview()?'PREVIEW · Séries : AIOmetadata requis par défaut. Collez ici votre manifeste personnel, pas l’URL GitHub. Enregistrez. Réglages propres à cette entrée.':'Correspondance facultative des épisodes'},
    {type:'header',label:'Correspondance des épisodes'},
    {type:'select',key:'episodeMetadataSource',label:'Métadonnées des épisodes',defaultValue:requiredPreview()?'aiometadata':'native',options:[{label:'Native — contrôle explicite, sans traduction',value:'native'},{label:'Ma configuration AIOmetadata',value:'aiometadata'}]},
    {type:'text',key:'aiometadataManifestUrl',label:'Manifeste personnel AIOmetadata',isPassword:true,placeholder:'https://…/manifest.json',description:'URL d’installation personnelle. Réglage propre à cette entrée et à cet appareil.'},
    {type:'select',key:'aiometadataIdType',label:'Format de la fiche AIOmetadata',defaultValue:'imdb',options:[{label:'IMDb',value:'imdb'},{label:'TMDB',value:'tmdb'}]}
  ];
}
module.exports={active,configuration,requestUrl,identity,select,signature,sameSignature,tvdbEpisode,resolve,targetContext,settingsFields,requiredPreview,annotateStreams,annotation,tagStreams,renderTaggedStreams,fail};
