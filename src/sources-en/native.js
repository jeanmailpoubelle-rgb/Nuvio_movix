const config=require('../../config/sources-en.json');
const Input=require('../input-metadata');
const MapEpisodes=require('./mapping');
const MappingData=require('./mapping-data');
const Playlist=require('./playlist');
const {runtimeFetch}=require('../anime-sama/transport');
const {URL}=require('../anime-sama/url');
const {sortPrefix}=require('../stream-order');
const {positive}=MapEpisodes;
function diagnostic(settings,code,data={},trace) {
  // Never print request URLs, error messages/bodies, keys or session grants.
  if(trace)trace.push({code,...data});
  if(settings.diagnostics&&typeof console!=='undefined')console.log('[sources-en]',JSON.stringify({code,...data}));
}
function origin(url) {return new URL(url).origin;}
function publicUrl(value) {
  if(typeof value!=='string'||!/^https:\/\//i.test(value))throw Input.fail('EN_UNTRUSTED_URL');
  const u=new URL(value);
  if(u.username||u.password||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||u.hash)throw Input.fail('EN_UNTRUSTED_URL');
  return value; // Keep original signed URL bytes, not URL.href.
}
function requestStage(url) {
  if(url.startsWith(config.tmdbApi+'/'))return 'TMDB';
  if(url===config.mappingBaseUrl+'/current.json')return 'Version AniBridge HTTP';
  if(url.startsWith(config.mappingBaseUrl+'/'))return 'Correspondance';
  if(url.startsWith(config.episodeApi+'?'))return 'Preuve épisode';
  if(url.startsWith(config.baseUrl+'/api/anime/playback-bootstrap/'))return 'Ani.pm bootstrap';
  if(url.startsWith(config.baseUrl+'/api/anime/settlar/session?'))return 'Ani.pm session';
  if(url.startsWith(config.baseUrl+config.betaServerPath))return url.includes('/copy?')?'Ani.pm Beta accès':'Ani.pm Beta catalogue';
  if(url.startsWith(config.embedOrigin+config.betaMediaPath))return 'Playlist Beta';
  if(url.startsWith(config.embedOrigin+'/embed/v1?'))return 'Initialisation Settlar';
  if(url.startsWith(config.embedOrigin+'/'))return 'Lecteur Settlar';
  if(config.mediaHosts.some(host=>origin(url)==='https://'+host))return 'Playlist vidéo';
  return 'AIOmetadata';
}
function http(settings,trace) {
  const started=Date.now(),fetcher=runtimeFetch(typeof fetch==='function'?fetch:undefined);let requests=0;
  async function text(url,headers={},received) {
    if(requests>=config.limits.requests||Date.now()-started>=config.limits.elapsedMs)throw Input.fail('EN_LOOKUP_BUDGET');
    requests++;
    let response;
    try {response=await fetcher(url,{headers:{'User-Agent':config.userAgent,...headers}});}
    catch(_error){diagnostic(settings,'EN_HTTP',{stage:requestStage(url),status:0},trace);throw Input.fail('EN_NETWORK_UNAVAILABLE');}
    let denial={};
    if(response.status===403&&origin(url)===config.embedOrigin) {
      // Classify locally; never retain/display upstream text, cookies, challenge
      // IDs, IP addresses or arbitrary error fields from the response.
      const body=(await response.text()).slice(0,16384),trimmed=body.trim();
      const kind=/^(?:<!doctype html|<html|<head)/i.test(trimmed)?'html':/^[{[]/.test(trimmed)?'json':'text';
      const challenge=response.headers?.get('cf-mitigated')==='challenge'||/\/cdn-cgi\/challenge-platform\//i.test(body);
      denial={kind,challenge};
    }
    if(trace||!response.ok)diagnostic(settings,'EN_HTTP',{stage:requestStage(url),status:Number(response.status)||0,...denial},trace);
    if(!response.ok)throw Object.assign(Input.fail(response.status===429?'EN_RATE_LIMITED':'EN_HTTP_UNAVAILABLE'),{status:Number(response.status)||0});
    if(response.url&&origin(response.url)!==origin(url))throw Input.fail('EN_ORIGIN_CHANGED');
    if(received)received(response);
    const body=await response.text();
    if(body.length>2*1024*1024)throw Input.fail('EN_RESPONSE_TOO_LARGE');
    return body;
  }
  return {text,json:async(url,headers)=>{try{return JSON.parse(await text(url,headers));}catch(e){if(e.code)throw e;throw Input.fail('EN_JSON_UNREADABLE');}},count:()=>requests};
}
function sessionCookies(header) {
  // Only fresh cookies applicable to this exact HTTPS host and API path. Never
  // share them between channels/lookups or propagate them to the media CDN.
  const cookies=[];
  for(const part of String(header||'').split(/,(?=\s*[^\s;,=]+=)/)) {
    const fields=part.trim().split(';').map(s=>s.trim()),pair=fields.shift();
    if(!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+=[\x21-\x2B\x2D-\x3A\x3C-\x7E]*$/.test(pair))continue;
    let allowed=true,path='/embed'; // Default path for the validated /embed/v1 document.
    for(const field of fields) {
      const i=field.indexOf('='),name=(i<0?field:field.slice(0,i)).toLowerCase(),value=i<0?'':field.slice(i+1);
      if(name==='domain') {
        const domain=value.toLowerCase().replace(/^\./,''),host=new URL(config.embedOrigin).hostname;
        if(!domain.includes('.')||host!==domain&&!host.endsWith('.'+domain))allowed=false;
      }
      if(name==='path')path=value;
      if(name==='max-age'&&Number(value)<=0)allowed=false;
    }
    if(allowed&&['/','/api','/api/','/api/embed','/api/embed/','/api/embed/session'].includes(path))cookies.push(pair);
  }
  return cookies.join('; ');
}
async function embedSession(io,embed,rawToken) {
  const endpoint=config.embedOrigin+'/api/embed/session?t='+rawToken;
  // Match the player's no-referrer, same-origin JSON fetch. In particular, do
  // not send the token-bearing embed URL as a Referer.
  const headers={Accept:'application/json'};
  try{return await io.json(endpoint,headers);}
  catch(error){if(error.status!==403)throw error;}
  // Bounded recovery used by native Ani.pm clients: establish the document's
  // session before retrying the same token once. Never execute its scripts.
  let cookies='';
  try{
    await io.text(embed,{'Referer':config.baseUrl+'/',Accept:'text/html,application/xhtml+xml'},response=>{cookies=sessionCookies(response.headers?.get('set-cookie'));});
    return await io.json(endpoint,{...headers,...(cookies?{Cookie:cookies}:{})});
  }
  catch(error){if(error.status===403)throw Input.fail('EN_SETTLAR_ACCESS_DENIED');throw error;}
}
function query(values) {return Object.entries(values).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');}
async function title(io,id,type) {
  const raw=String(id),imdb=/^tt\d+$/.test(raw)?raw:null;
  let tmdb=/^(?:tmdb:)?([1-9]\d*)$/.exec(raw)?.[1];
  const key=typeof TMDB_API_KEY==='string'?TMDB_API_KEY:'';
  if(!key)throw Input.fail('EN_TMDB_KEY_UNAVAILABLE');
  if(imdb) {
    const found=await io.json(config.tmdbApi+'/find/'+imdb+'?'+query({external_source:'imdb_id',api_key:key}));
    const rows=found[type==='movie'?'movie_results':'tv_results'];
    if(!Array.isArray(rows)||rows.length!==1||!positive(rows[0].id))throw Input.fail('EN_TITLE_IDENTITY_UNAVAILABLE');
    tmdb=String(rows[0].id);
  }
  if(!positive(tmdb))throw Input.fail('EN_UNSUPPORTED_ID');
  const data=await io.json(config.tmdbApi+'/'+type+'/'+tmdb+'?'+query({append_to_response:'external_ids',api_key:key}));
  if(String(data?.id)!==tmdb||imdb&&data.external_ids?.imdb_id!==imdb)throw Input.fail('EN_TITLE_IDENTITY_CONFLICT');
  return {data,ids:{tmdbId:tmdb,imdbId:data.external_ids?.imdb_id||imdb,tvdbId:data.external_ids?.tvdb_id?String(data.external_ids.tvdb_id):undefined},original:Playlist.language(data.original_language)};
}
async function mapping(io,provider,id,season,episode,settings,trace) {
  if(!positive(id))throw Input.fail('EN_MAPPING_IDENTITY_UNAVAILABLE');
  const shard=await MappingData.load(io,provider,id,data=>diagnostic(settings,'EN_MAPPING_DATA',data,trace));
  const descriptor=provider+':'+id+(provider.endsWith('_show')?':s'+season:'');
  let mapped;
  try{mapped=MapEpisodes.target(shard.rows[descriptor],episode);}
  catch(error){error.revision=shard.revision;throw error;}
  return {...mapped,revision:shard.revision};
}
async function selectedEpisode(io,settings,context,season,episode,trace) {
  const cfg=Input.configuration(settings);
  const payload=await io.json(Input.requestUrl(cfg,context.ids)); // no Referer/private URL propagation
  const meta=payload?.meta,ids=Input.identity(meta,context.ids),state=Input.select(meta,ids,season,episode,cfg.origin);
  const external=Input.tvdbEpisode(state.video,state.provider,state.proxyOrigin);
  diagnostic(settings,'EN_INPUT_SELECTED',{provider:state.provider,season,episode,tvdbEpisodeId:external?.id||null},trace);
  if(!['tvdb','tmdb'].includes(state.provider))throw Input.fail('EN_INPUT_PROVIDER_UNSUPPORTED');
  const expected=settings.inputMetadataProvider||'tvdb';
  if(!['tvdb','tmdb'].includes(expected)||state.provider!==expected)throw Input.fail('EN_INPUT_PROVIDER_MISMATCH');
  const provider=state.provider==='tvdb'?'tvdb_show':'tmdb_show',id=state.provider==='tvdb'?ids.tvdbId:ids.tmdbId;
  const mapped=await mapping(io,provider,id,season,episode,settings,trace);
  diagnostic(settings,'EN_MAPPING_TARGET',{anilistId:mapped.anilistId,episode:mapped.episode},trace);
  let inventory;
  try{inventory=await io.json(config.episodeApi+'?anilist_id='+mapped.anilistId);}
  catch(_error){diagnostic(settings,'EN_EPISODE_CHECK',{state:'unavailable'},trace);}
  if(inventory)try {
    diagnostic(settings,'EN_EPISODE_CHECK',MapEpisodes.corroborate(state,mapped,inventory),trace);
  }catch(error){
    error.mapping={anilistId:mapped.anilistId,episode:mapped.episode};error.revision=mapped.revision;
    diagnostic(settings,'EN_MAPPING_CONFLICT',{...error.detail,...error.mapping,revision:mapped.revision},trace);throw error;
  }
  return {...mapped,input:{provider:state.provider,season,episode}};
}
async function bootstrap(io,mapped) {
  const b=await io.json(config.baseUrl+'/api/anime/playback-bootstrap/anilist/'+mapped.anilistId+'?'+query({ep:mapped.episode,lang:'sub'}),{'Referer':config.baseUrl+'/','Origin':config.baseUrl});
  if(Number(b?.core?.anilistId)!==mapped.anilistId||Number(b?.episode)!==mapped.episode||typeof b.settlarSelection!=='string'||!b.settlarSelection)throw Input.fail('EN_PLAYBACK_IDENTITY_CONFLICT');
  return b;
}
async function channel(io,b,mapped,mode,original) {
  const headers={'Referer':config.baseUrl+'/','Origin':config.baseUrl};
  const grant=await io.json(config.baseUrl+'/api/anime/settlar/session?'+query({selection:b.settlarSelection,provider:'anipm',ep:mapped.episode,channel:mode,telemetry:'0'}),headers);
  return renderSession(io,await openEmbed(io,grant.embedUrl),mapped,original,'standard');
}
async function openEmbed(io,value) {
  const embed=publicUrl(value),u=new URL(embed);
  if(u.origin!==config.embedOrigin||u.pathname!=='/embed/v1')throw Input.fail('EN_EMBED_ORIGIN_CONFLICT');
  const raw=/(?:\?|&)t=([^&#]+)/.exec(embed);
  if(!raw)throw Input.fail('EN_SESSION_UNAVAILABLE');
  return embedSession(io,embed,raw[1]);
}
function betaMedia(url) {
  try {
    const u=new URL(url);
    return u.origin===config.embedOrigin&&!u.username&&!u.password&&!u.hash&&u.pathname.startsWith(config.betaMediaPath)&&/^[A-Za-z0-9_.-]+\.m3u8$/.test(u.pathname.slice(config.betaMediaPath.length));
  }catch(_error){return false;}
}
async function betaChannel(io,mapped,original,settings,trace) {
  const endpoint=config.baseUrl+config.betaServerPath+mapped.anilistId;
  const headers={Accept:'application/json',Referer:config.baseUrl+'/'};
  const available=await io.json(endpoint,headers);
  if(typeof available?.available!=='boolean')throw Input.fail('EN_BETA_SCHEMA_CHANGED');
  if(!available.available){diagnostic(settings,'EN_BETA_STATUS',{state:'unavailable'},trace);return null;}
  if(!Array.isArray(available.episodes))throw Input.fail('EN_BETA_SCHEMA_CHANGED');
  if(!available.episodes.includes(mapped.episode)){diagnostic(settings,'EN_BETA_STATUS',{state:'episode-absent'},trace);return null;}
  // The same proven AniList episode is used for availability and the grant.
  // One complete master preserves every audio track; do not request a copy per
  // language or persist the signed player URL between searches.
  const grant=await io.json(endpoint+'/copy?'+query({ep:mapped.episode,lang:'sub'}),{...headers,'Cache-Control':'no-cache'});
  if(!Number.isSafeInteger(grant?.expires)||grant.expires<=Date.now()/1000+30)throw Input.fail('EN_BETA_GRANT_EXPIRED');
  const stream=await renderSession(io,await openEmbed(io,grant.player),mapped,original,'beta');
  diagnostic(settings,'EN_BETA_STATUS',{state:'ready'},trace);
  return stream;
}
async function renderSession(io,session,mapped,original,server) {
  const url=publicUrl(session.source);
  if(!(server==='beta'?betaMedia(url):config.mediaHosts.includes(new URL(url).hostname))||session.kind!=='hls')throw Input.fail('EN_MEDIA_PROTOCOL_UNSUPPORTED');
  const playbackHeaders={'User-Agent':config.userAgent,'Referer':config.embedOrigin+'/','Origin':config.embedOrigin};
  const hls=Playlist.parse(await io.text(url,playbackHeaders),url);
  if(server==='beta'&&[...hls.variants.map(v=>v.URI),...hls.audioTracks.map(t=>t.url)].some(uri=>!betaMedia(uri)))throw Input.fail('EN_BETA_MEDIA_ORIGIN_CONFLICT');
  const audio=hls.audioGroups?hls.audioLanguages:[Playlist.language(session.audioLang)].filter(Boolean);
  const tracks=Playlist.subtitleTracks([...(session.subtitles||[]),...hls.subtitles]);
  if(!Playlist.eligible(audio,tracks,original))throw Input.fail('EN_LANGUAGE_FILTERED');
  const wanted=audio.filter(l=>Playlist.allowedLanguage(l,original));
  const subtitleLanguages=[...new Set(tracks.map(t=>t.lang))];
  const quality=hls.height?hls.height+'p':'';
  const rank=String(16384-hls.height).padStart(5,'0')+'-'+(wanted.length>1?'0':audio.includes(original)?'1':audio.includes('fr')?'2':'3');
  const caption='Audio : '+Playlist.audioLabel(audio,original)+'\nSous-titres : '+(subtitleLanguages.map(l=>l==='fr'?'Français':'Anglais').join(' · ')||'aucun FR/EN')+'\nAni.pm'+(server==='beta'?' · Beta':'');
  const annotation=mapped.input&&mapped.input.episode!==mapped.episode?'\n'+mapped.input.provider.toUpperCase()+' S'+mapped.input.season+'E'+mapped.input.episode+' → Ani.pm E'+mapped.episode:'';
  return {name:sortPrefix(rank)+([quality,wanted.length>1?'MULTI':''].filter(Boolean).join(' · ')||'Ani.pm'),...(quality?{quality}:{}),size:caption+annotation,
    // Mobile imports `type`, not `format`, into the player's streamType. Settlar
    // uses opaque /v1/object/... URLs: extension-based HLS detection cannot work.
    url,type:'hls',format:'m3u8',headers:playbackHeaders,provider:'Ani.pm',source:'Ani.pm',
    audioLanguage:wanted.length>1?'MULTI':wanted[0]||'',
    subtitles:tracks.filter(t=>!t.hls).map(t=>({url:t.url,language:t.lang,lang:t.lang,name:t.name,format:/\.ass(?:\?|$)/i.test(t.url)?'ass':/\.srt(?:\?|$)/i.test(t.url)?'srt':'vtt',headers:playbackHeaders})),
    audioLanguages:wanted,subtitleLanguages,server};
}
async function lookup(settings,id,type,season,episode,trace,server='standard') {
  if(!['tv','series','movie'].includes(type))return [];
  type=type==='series'?'tv':type;
  const io=http(settings,trace);
  try {
    if(type==='tv') {
      Input.configuration(settings); // fail before ALL network work
      season=Number(season);episode=Number(episode);
      if(!positive(season)||!positive(episode))throw Input.fail('EN_SPECIALS_UNSUPPORTED');
    }
    const context=await title(io,id,type);
    const mapped=type==='tv'?await selectedEpisode(io,settings,context,season,episode,trace):await mapping(io,'tmdb_movie',context.ids.tmdbId,null,1,settings,trace);
    diagnostic(settings,'EN_MAPPED',{type,id:String(id),tmdbId:context.ids.tmdbId,...(mapped.input?{input:mapped.input}:{}),anilistId:mapped.anilistId,episode:mapped.episode},trace);
    const standard=async()=>{
      const b=await bootstrap(io,mapped),packages=b.anipmPackages?.episodes?.[String(mapped.episode)];
      const modes=['sub','dub'].filter(mode=>packages?.[mode]===true);
      if(!modes.length)throw Input.fail('EN_EPISODE_NOT_PUBLISHED');
      return Promise.all(modes.map(mode=>channel(io,b,mapped,mode,context.original).catch(error=>{diagnostic(settings,error.code||'EN_CHANNEL_UNAVAILABLE',{channel:mode},trace);return null;})));
    };
    // Per lookup only: no persistent session/master/caption cache.
    // Installed standard/Beta entries are independent: a stalled server cannot
    // hide the other's results. Only the settings diagnostic may compare both.
    const workers=[];
    if(server!=='beta')workers.push(standard().catch(error=>{diagnostic(settings,error.code||'EN_CHANNEL_UNAVAILABLE',{channel:'standard'},trace);return [];}));
    if(server!=='standard')workers.push(betaChannel(io,mapped,context.original,settings,trace).then(s=>s?[s]:[]).catch(error=>{diagnostic(settings,error.code||'EN_CHANNEL_UNAVAILABLE',{channel:'beta'},trace);return [];}));
    const results=(await Promise.all(workers)).flat();
    const unique=[];for(const item of results.filter(Boolean))if(!unique.some(other=>other.url===item.url))unique.push(item);
    unique.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
    diagnostic(settings,'EN_COMPLETE',{sources:unique.length,requests:io.count()},trace);
    return unique;
  }catch(error){diagnostic(settings,error.code||'EN_LOOKUP_UNAVAILABLE',{requests:io.count()},trace);return !trace&&settings.mappingWarnings!==false?mappingWarning(error,season,episode):[];}
}

function mappingWarning(error,season,episode) {
  if(!/^EN_MAPPING_(?:IDENTITY_CONFLICT|EPISODE_CONFLICT|RELEASE_CONFLICT|MISSING|INVALID|AMBIGUOUS|COMBINED_EPISODE|IDENTITY_UNAVAILABLE)$/.test(error.code||''))return [];
  const conflict=error.code.endsWith('_CONFLICT');
  const detail=error.detail,lines=['Information uniquement — non lisible', 'Sélection : S'+season+'E'+episode];
  if(error.mapping)lines.push('Cible AniList '+error.mapping.anilistId+' · E'+error.mapping.episode);
  if(detail)lines.push(detail.field+' : attendu '+detail.expected+' / reçu '+detail.actual);
  if(error.revision)lines.push('AniBridge : '+error.revision);
  lines.push(error.code);
  return [{name:'⚠ '+(conflict?'Correspondance contradictoire — lecture bloquée':'Correspondance indisponible — aucun épisode supposé'),
    title:'Avertissement de correspondance',type:'diagnostic',url:'diagnostic:sources-en/'+error.code,size:lines.join('\n'),warning:true,warningCode:error.code}];
}
function runtimeSettings(){return typeof SCRAPER_SETTINGS==='object'&&SCRAPER_SETTINGS?SCRAPER_SETTINGS:{};}
function runtimeEntry(){return typeof SCRAPER_ID==='string'?SCRAPER_ID.split(':').pop():'';}
function compactReport(rows) {
  // Nuvio Mobile renders scraperResults.take(8), without a nested scroller.
  // Keep the outcome/error and the failing (or final) HTTP stage visible first.
  const pick=name=>rows.find(r=>r.name===name),causes=[...new Set(rows.filter(r=>r.name==='Cause').map(r=>r.url.slice(11)))];
  const http=rows.filter(r=>/HTTP \d+|Réseau indisponible/.test(r.url));
  const failed=http.filter(r=>r.url.includes('Réseau indisponible')||[...r.url.matchAll(/HTTP (\d+)/g)].some(m=>Number(m[1])<200||Number(m[1])>=300));
  const cause={name:'Cause',title:'Cause',type:'diagnostic',url:'diagnostic:'+(causes.join(' · ')||'Aucune erreur détectée')};
  const ordered=[pick('Bilan'),cause,...failed,
    ...(!failed.length&&http.length?[http[http.length-1]]:[]),
    pick('Conflit de correspondance')||pick('Vérification ani.zip'),
    pick('Serveur Beta'),
    pick('Épisode confirmé')||pick('Cible proposée — non encore vérifiée'),pick('Épisode AIO sélectionné'),pick('Configuration'),pick('Requête')];
  return ordered.filter((r,i,a)=>r&&a.indexOf(r)===i).slice(0,8);
}
async function diagnosticStreams(settings,id,type) {
  // Empty supportedTypes keeps this entry out of ordinary searches. The second
  // guard also prevents arbitrary calls from producing pseudo playback links.
  if(String(id)!=='603'||!['movie','tv','series'].includes(type))return [];
  const rows=[],trace=[];
  function row(name,value){rows.push({name,title:name,type:'diagnostic',url:'diagnostic:'+value});}
  const tmdb=String(settings.diagnosticTmdbId||'46298'),season=Number(settings.diagnosticSeason||2),episode=Number(settings.diagnosticEpisode||72);
  const order=settings.inputMetadataProvider||'tvdb';
  row('Configuration','Manifeste '+(settings.aiometadataManifestUrl?'présent':'absent')+' / clé TMDB '+(typeof TMDB_API_KEY==='string'&&TMDB_API_KEY?'présente':'absente')+' / ordre '+(['tvdb','tmdb'].includes(order)?order:'invalide'));
  if(!positive(tmdb)||!positive(season)||!positive(episode)){row('Cause','EN_INVALID_DIAGNOSTIC_REQUEST');return compactReport(rows);}
  row('Requête','TMDB '+tmdb+' / S'+season+'E'+episode);
  const selectedServer=settings.diagnosticServer||'both';
  if(!['both','standard','beta'].includes(selectedServer)){row('Cause','EN_INVALID_DIAGNOSTIC_SERVER');return compactReport(rows);}
  const streams=await lookup(settings,tmdb,'tv',season,episode,trace,selectedServer);
  const stages=new Map();let dataRevision=config.mappingRevision;
  for(const item of trace) {
    if(item.code==='EN_HTTP') {
      if(!stages.has(item.stage)){row(item.stage,'');stages.set(item.stage,{row:rows[rows.length-1],statuses:[]});}
      const record=stages.get(item.stage);
      record.statuses.push((item.status?'HTTP '+item.status:'Réseau indisponible')+(item.challenge?' [challenge navigateur]':item.kind?' ['+item.kind.toUpperCase()+']':''));
      record.row.url='diagnostic:'+record.statuses.join(' / ');
    }else if(item.code==='EN_MAPPING_DATA'){dataRevision=item.revision;row('Version AniBridge',item.revision+' / '+item.state);}
    else if(item.code==='EN_EPISODE_CHECK')row('Vérification ani.zip',(item.state==='no-conflict'?'Aucune contradiction détectée':item.state==='missing'?'Données absentes — AniBridge conservé':'Service indisponible — AniBridge conservé')+' · '+dataRevision);
    else if(item.code==='EN_MAPPING_CONFLICT')row('Conflit de correspondance',item.field+' : attendu '+item.expected+' / reçu '+item.actual+' · AniList '+item.anilistId+' E'+item.episode+' · AniBridge '+item.revision);
    else if(item.code==='EN_BETA_STATUS')row('Serveur Beta',item.state==='ready'?'Flux Beta disponible':item.state==='episode-absent'?'Épisode non proposé':'Titre non proposé');
    else if(item.code==='EN_INPUT_SELECTED')row('Épisode AIO sélectionné',item.provider+' S'+item.season+'E'+item.episode+(item.tvdbEpisodeId?' / TVDB épisode '+item.tvdbEpisodeId:' / ID épisode TVDB absent'));
    else if(item.code==='EN_MAPPING_TARGET')row('Cible proposée — non encore vérifiée','AniList '+item.anilistId+' / E'+item.episode);
    else if(item.code==='EN_MAPPED')row('Épisode confirmé',item.input.provider.toUpperCase()+' S'+item.input.season+'E'+item.input.episode+' → AniList '+item.anilistId+' / E'+item.episode);
    else if(item.code!=='EN_COMPLETE')row('Cause',/^(?:EN|INPUT_METADATA)_[A-Z0-9_]+$/.test(item.code)?item.code:'EN_LOOKUP_UNAVAILABLE');
  }
  row('Bilan',streams.length+' lien(s) accepté(s) / aucun lien vidéo affiché dans ce diagnostic');
  return compactReport(rows);
}
async function getStreams(id,type,season,episode) {
  const settings=runtimeSettings(),scraper=runtimeEntry();
  if(scraper==='sources-en-diagnostic')return diagnosticStreams(settings,id,type);
  if(scraper&&!['sources-en-anipm','sources-en-anipm-beta'].includes(scraper))return [];
  return lookup(settings,id,type,season,episode,undefined,scraper==='sources-en-anipm-beta'?'beta':'standard');
}
function onSettings() {
  const fields=[
    {type:'info',label:'Phone Preview · Series require your personal AIOmetadata manifest. TVDB Aired Order or TMDB only. IMDb is recommended. Settings are local to this entry/device.'},
    {type:'toggle',key:'mappingWarnings',label:'Show informational mapping warning rows (not playable)',defaultValue:true},
    ...Input.settingsFields().filter(f=>['aiometadataManifestUrl','aiometadataIdType'].includes(f.key)),
    {type:'select',key:'inputMetadataProvider',label:'Anime episode order shown in your profile',defaultValue:'tvdb',options:[{label:'TVDB — Aired Order',value:'tvdb'},{label:'TMDB',value:'tmdb'}]},
    {type:'info',label:'No minimum resolution. Original/French/English audio; French/English subtitles. Original-only streams without full FR/EN subtitles are hidden. Test on a real anime: the app’s Matrix test is not in this catalogue.'},
    ...(runtimeEntry()==='sources-en-anipm-beta'?[{type:'info',label:'Ani.pm Beta: choose audio inside the player. The complete multi-audio stream is preserved. Copy your personal AIOmetadata settings into this entry once; standard Sub/Dub remains independent.'}]:[])
  ];
  if(runtimeEntry()==='sources-en-diagnostic')fields.push(
    {type:'info',label:'Diagnostic uniquement : collez le même manifeste ici, Enregistrer, puis Tester le fournisseur. Champs vides : Hunter S2E72. Aucun lien vidéo ni URL privée n’est affiché.'},
    {type:'text',key:'diagnosticTmdbId',label:'ID TMDB de la série',placeholder:'46298 (Hunter) ou 220542 (Apothecary)'},
    {type:'text',key:'diagnosticSeason',label:'Saison affichée',placeholder:'2'},
    {type:'text',key:'diagnosticEpisode',label:'Épisode affiché',placeholder:'72'},
    {type:'select',key:'diagnosticServer',label:'Serveur à vérifier',defaultValue:'both',options:[{label:'Standard et Beta',value:'both'},{label:'Standard Sub/Dub',value:'standard'},{label:'Beta multi-audio',value:'beta'}]});
  return fields;
}
module.exports={getStreams,onSettings};
