// Shared, pure input-episode adapter. HTTP is supplied by each native worker.
const {canonicalEpisodeSeparators} = require('./episode-title');
function fail(code) { return Object.assign(new Error(code), {code}); }
function positive(value) { return /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)); }
function active(settings) {
  const value=settings?.episodeMetadataSource;
  if(value!=null&&value!==''&&!['native','aiometadata'].includes(value))throw fail('INPUT_METADATA_CONFIG_REQUIRED');
  return value==='aiometadata';
}
function configuration(settings = {}) {
  const namespace = settings.aiometadataIdType || 'imdb';
  let value = String(settings.aiometadataManifestUrl || '').trim().replace(/^stremio:\/\//i,'https://');
  const m = /^(https:\/\/[a-zA-Z0-9.-]+(?::\d+)?)(\/[^\s?#\\]*\/manifest\.json|\/manifest\.json)(\?[^\s#]*)?$/.exec(value);
  if (!m || !['imdb','tmdb'].includes(namespace) || /%0[ad]/i.test(value)) throw fail('INPUT_METADATA_CONFIG_REQUIRED');
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
  return {meta,ids,video:rows[0],provider:String(meta._metaProvider||'').toLowerCase(),stream:streamId(rows[0].id),proxyOrigin};
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
function targetRow(meta, season, episode) {return only(videos(meta).filter(v=>Number(v.season)===season&&Number(v.episode)===episode),'INPUT_METADATA_TARGET_EPISODE_UNAVAILABLE');}
function result(video,basis) {return {video,...coordinates(video),basis};}
function titleMatch(state,target) {
  const key=signature(state.video);
  if(!key)return null;
  const source=videos(state.meta).filter(v=>sameSignature(key,signature(v)));
  const candidates=videos(target).filter(v=>sameSignature(key,signature(v)));
  return source.length===1&&candidates.length===1?candidates[0]:null;
}
async function resolve(state, target, kind, io = {}) {
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
function settingsFields() {
  return [
    {type:'header',label:'Correspondance des épisodes'},
    {type:'select',key:'episodeMetadataSource',label:'Métadonnées des épisodes',defaultValue:'native',options:[{label:'Numérotation native',value:'native'},{label:'Ma configuration AIOmetadata',value:'aiometadata'}]},
    {type:'text',key:'aiometadataManifestUrl',label:'Manifeste personnel AIOmetadata',isPassword:true,placeholder:'https://…/manifest.json',description:'URL d’installation personnelle. Réglage propre à cette entrée et à cet appareil.'},
    {type:'select',key:'aiometadataIdType',label:'Format de la fiche AIOmetadata',defaultValue:'imdb',options:[{label:'IMDb',value:'imdb'},{label:'TMDB',value:'tmdb'}]}
  ];
}
module.exports={active,configuration,requestUrl,identity,select,signature,sameSignature,tvdbEpisode,resolve,targetContext,settingsFields,fail};
