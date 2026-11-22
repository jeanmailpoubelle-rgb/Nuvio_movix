// Shared, pure input-episode adapter. HTTP is supplied by each native worker.
const {canonicalEpisodeSeparators} = require('./episode-title');
function fail(code) { return Object.assign(new Error(code), {code}); }
function positive(value) { return /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)); }
function active(settings) {
  if (typeof INPUT_METADATA_ENABLED !== 'undefined' && !INPUT_METADATA_ENABLED) return false;
  let value=settings?.episodeMetadataSource;
  if(value==null||value==='')value=typeof PREVIEW_INPUT_REQUIRED!=='undefined'&&PREVIEW_INPUT_REQUIRED?'aiometadata':'native';
  if(value!=null&&value!==''&&!['native','aiometadata'].includes(value))throw fail('INPUT_METADATA_CONFIG_REQUIRED');
  return value==='aiometadata';
}
function selectedManifestUrl(settings = {}) {
  // Legacy installations used one shared key. Once either dedicated slot has
  // been saved, never substitute that legacy URL or the inactive addon’s slot.
  const slots=Object.prototype.hasOwnProperty.call(settings,'aiometadataSavedManifestUrl')||Object.prototype.hasOwnProperty.call(settings,'xperienceManifestUrl');
  const key=settings.inputMetadataAdapter==='xperience'?'xperienceManifestUrl':'aiometadataSavedManifestUrl';
  return slots?settings[key]||'':settings.aiometadataManifestUrl||'';
}
function configuration(settings = {}, defaults = {}) {
  const namespace = settings.aiometadataIdType || 'imdb';
  const adapter=settings.inputMetadataAdapter||'aiometadata';
  if(!['aiometadata','xperience'].includes(adapter))throw fail('INPUT_METADATA_CONFIG_REQUIRED');
  const provider=settings.inputMetadataProvider||defaults.provider||'auto';
  if(adapter==='xperience'&&!['tvdb','tmdb','auto'].includes(provider))throw fail('INPUT_METADATA_PROVIDER_REQUIRED');
  let value = String(selectedManifestUrl(settings)).trim().replace(/^stremio:\/\//i,'https://');
  const m = /^(https:\/\/[a-zA-Z0-9.-]+(?::\d+)?)(\/[^\s?#\\]*\/manifest\.json|\/manifest\.json)(\?[^\s#]*)?$/.exec(value);
  if (!m || /^https:\/\/(?:github\.com|raw\.githubusercontent\.com)(?::\d+)?$/i.test(m[1]) || !['imdb','tmdb'].includes(namespace) || /%0[ad]/i.test(value)) throw fail('INPUT_METADATA_CONFIG_REQUIRED');
  let path;
  try { path=decodeURIComponent(m[2]); } catch (_error) { throw fail('INPUT_METADATA_CONFIG_REQUIRED'); }
  if(path.split('/').some(p=>p==='.'||p==='..'))throw fail('INPUT_METADATA_CONFIG_REQUIRED');
  return {origin:m[1],base:m[1]+m[2].slice(0,-14),query:m[3]||'',namespace,adapter,provider};
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
function select(meta, ids, season, episode, proxyOrigin, config = {}) {
  const bases=[ids.imdbId,ids.tmdbId&&'tmdb:'+ids.tmdbId,ids.tvdbId&&'tvdb:'+ids.tvdbId].filter(Boolean);
  // Nuvio passes UI season/episode fields. The stream ID may have a different
  // suffix after AIOmetadata's compatibility conversion; retain both identities.
  const rows=videos(meta).filter(v=>Number(v.season)===season&&Number(v.episode)===episode);
  if(rows.length!==1 || !positive(rows[0].season) || !positive(rows[0].episode))throw fail('INPUT_METADATA_EPISODE_UNAVAILABLE');
  const parsed=streamId(rows[0].id);
  if(!parsed||!bases.includes(parsed.base))throw fail('INPUT_METADATA_STREAM_ID_UNAVAILABLE');
  const state={meta,ids,video:rows[0],provider:['tvdb','tmdb','imdb','kitsu','mal','anilist','anidb'].includes(String(meta._metaProvider||'').toLowerCase())?String(meta._metaProvider).toLowerCase():'unknown',stream:streamId(rows[0].id),proxyOrigin};
  if(config.adapter==='xperience') {
    // Xperience omits AIO's provider stamp. The explicit user-selected order is
    // a declaration, never inferred from an IMDb suffix or season lengths.
    if(!['tvdb','tmdb','auto'].includes(config.provider))throw fail('INPUT_METADATA_PROVIDER_REQUIRED');
    if(config.provider!=='auto'&&state.provider!=='unknown'&&state.provider!==config.provider)throw fail('INPUT_METADATA_PROVIDER_MISMATCH');
    if(config.provider!=='auto')state.provider=config.provider;
    state.adapter='xperience';
    const external=tvdbEpisode(state.video,state.provider,proxyOrigin);
    if(config.provider==='tvdb'&&!external)throw fail('INPUT_METADATA_XPERIENCE_EPISODE_ID_REQUIRED');
    if(external&&videos(meta).filter(v=>tvdbEpisode(v,state.provider,proxyOrigin)?.id===external.id).length!==1)throw fail('INPUT_METADATA_EXTERNAL_ID_AMBIGUOUS');
  }
  return state;
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
  const match=modern||legacy||/^\/banners\/series\/[1-9]\d*\/episodes\/([1-9]\d*)\.[A-Za-z0-9]+$/.exec(m[1]);
  return match?{id:match[1],basis:'artwork'}:null;
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
  if(!(state.provider==='tvdb'||state.adapter==='xperience'&&state.provider==='unknown')||state.stream?.base!==state.ids.imdbId)return null;
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
async function xperienceOfficialAnchor(state,target,io) {
  if(state.adapter!=='xperience'||state.provider!=='unknown'||state.stream?.base!==state.ids.imdbId||!io.episodeDetails)return null;
  const allSource=videos(state.meta),allTarget=videos(target);
  const regular=v=>positive(v.season)&&positive(v.episode);
  const source=allSource.filter(regular),targetRegular=allTarget.filter(regular),rows=allTarget.filter(v=>v.id===state.video.id);
  if(rows.length!==1||allSource.filter(v=>v.id===state.video.id).length!==1)return null;
  const v=rows[0],parsed=streamId(v.id),a=date(state.video),b=date(v);
  if(!parsed||parsed.season!==Number(v.season)||parsed.episode!==Number(v.episode)||
    a===null||b===null||Math.abs(a-b)>48*3600000||source.filter(v=>sameDate(v,state.video)).length!==1||targetRegular.filter(other=>sameDate(other,v)).length!==1)return null;
  const details=await io.episodeDetails(parsed.season,parsed.episode);
  if(!positive(details?.id)||Number(details.season_number)!==parsed.season||Number(details.episode_number)!==parsed.episode||
    details.show_id!=null&&String(details.show_id)!==state.ids.tmdbId||!/^\d{4}-\d{2}-\d{2}$/.test(details.air_date||''))throw fail('INPUT_METADATA_OFFICIAL_EPISODE_CONFLICT');
  // Only this independent official-title proof permits a midnight/date-only
  // reference versus next-day broadcast airtime. Never widen sameDate globally.
  const day=Date.parse(details.air_date+'T00:00:00Z');
  if(new Date(b).toISOString().slice(0,10)!==details.air_date||a<day||a>=day+48*3600000)return null;
  const title=v=>signature(v)?.title;
  const left=title(state.video),right=title(v);
  const names=new Set([details.name,...(Array.isArray(details.translations?.translations)?details.translations.translations.map(t=>t?.data?.name):[])].map(name=>title({title:name,released:details.air_date,season:parsed.season,episode:parsed.episode})).filter(Boolean));
  if(!left||!right||!names.has(left)||!names.has(right)||source.filter(v=>title(v)===left).length!==1||targetRegular.filter(v=>title(v)===right).length!==1)return null;
  return v;
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
    const missing=error.code==='INPUT_METADATA_TARGET_EPISODE_UNAVAILABLE'||error.code==='INPUT_METADATA_EPISODES_UNAVAILABLE'&&target?.videos?.length===0;
    if(kind!=='nuvio-catalog'||!missing||
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
  if(state.adapter!=='xperience'&&(state.provider==='tmdb' && kind==='nuvio-catalog' || state.provider==='imdb' && kind==='cinemeta')) {
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
  // Xperience auto mode can omit a provider stamp and localized titles can
  // differ. Reuse the established exact stream-ID + independently unique release
  // anchor, never date/coordinate equality alone or a repeated batch date.
  if(state.adapter==='xperience'&&state.provider==='unknown'&&!external) {
    const anchor=streamReleaseAnchor(state,target);
    if(anchor)return result(anchor.video,'xperience-stream-and-unique-release');
    const official=await xperienceOfficialAnchor(state,target,io);
    if(official)return result(official,'xperience-official-episode-translations-and-release');
  }
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
  if(from.season===to.season&&from.episode===to.episode)return '';
  const input='S'+from.season+'E'+from.episode;
  return (settings.inputMetadataAdapter==='xperience'?'Xperience ':'AIO ')+input+' → Réf. S'+to.season+'E'+to.episode;
}
function annotateStreams(values,from,to,settings={}) {
  const label=annotation(from,to,settings);
  return label?values.map(item=>({...item,_layoutMapping:label})):values;
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
  if (typeof INPUT_METADATA_ENABLED !== 'undefined' && !INPUT_METADATA_ENABLED) return [];
  return [
    {type:'info',label:requiredPreview()?'VERSION + · Séries : métadonnées configurées requises par défaut. Collez ici votre manifeste personnel, pas l’URL GitHub. Enregistrez. Réglages propres à cette entrée.':'Correspondance facultative des épisodes'},
    {type:'header',label:'Correspondance des épisodes'},
    {type:'select',key:'episodeMetadataSource',label:'Métadonnées des épisodes',defaultValue:requiredPreview()?'aiometadata':'native',options:[{label:'Native — contrôle explicite, sans traduction',value:'native'},{label:'Ma configuration AIOmetadata / Xperience',value:'aiometadata'}]},
    {type:'select',key:'inputMetadataAdapter',label:'Manifeste actif',defaultValue:'aiometadata',options:[{label:'AIOmetadata',value:'aiometadata'},{label:'Xperience',value:'xperience'}]},
    {type:'select',key:'inputMetadataProvider',label:'Ordre Xperience — ignoré avec AIOmetadata',defaultValue:'auto',options:[{label:'Automatique — correspondance vérifiée, profils mixtes',value:'auto'},{label:'TVDB — Aired Order',value:'tvdb'},{label:'TMDB',value:'tmdb'}]},
    {type:'text',key:'aiometadataSavedManifestUrl',label:'Manifeste personnel AIOmetadata',isPassword:true,placeholder:'https://…/manifest.json',description:'URL privée conservée pour AIOmetadata. Saisissez les deux manifestes une fois pour basculer avec Manifeste actif.'},
    {type:'text',key:'xperienceManifestUrl',label:'Manifeste personnel Xperience',isPassword:true,placeholder:'https://…/manifest.json',description:'URL privée conservée pour Xperience. Le manifeste inactif n’est pas consulté.'},
    {type:'select',key:'aiometadataIdType',label:'Format de la requête metadata',defaultValue:'imdb',options:[{label:'IMDb',value:'imdb'},{label:'TMDB',value:'tmdb'}]}
  ];
}
module.exports={active,selectedManifestUrl,configuration,requestUrl,identity,select,signature,sameSignature,tvdbEpisode,resolve,targetContext,settingsFields,requiredPreview,annotateStreams,annotation,tagStreams,renderTaggedStreams,fail};
