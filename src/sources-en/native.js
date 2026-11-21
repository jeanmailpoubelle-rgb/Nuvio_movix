const config=require('../../config/sources-en.json');
const Input=require('../input-metadata');
const MapEpisodes=require('./mapping');
const Playlist=require('./playlist');
const {runtimeFetch}=require('../anime-sama/transport');
const {URL}=require('../anime-sama/url');
const {sortPrefix}=require('../stream-order');
const {positive}=MapEpisodes;
function diagnostic(settings,code,data={}) {
  // Never print request URLs, error messages/bodies, keys or session grants.
  if(settings.diagnostics&&typeof console!=='undefined')console.log('[sources-en]',JSON.stringify({code,...data}));
}
function origin(url) {return new URL(url).origin;}
function publicUrl(value) {
  if(typeof value!=='string'||!/^https:\/\//i.test(value))throw Input.fail('EN_UNTRUSTED_URL');
  const u=new URL(value);
  if(u.username||u.password||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||u.hash)throw Input.fail('EN_UNTRUSTED_URL');
  return value; // Keep original signed URL bytes, not URL.href.
}
function http(settings) {
  const started=Date.now(),fetcher=runtimeFetch(typeof fetch==='function'?fetch:undefined);let requests=0;
  async function text(url,headers={}) {
    if(requests>=config.limits.requests||Date.now()-started>=config.limits.elapsedMs)throw Input.fail('EN_LOOKUP_BUDGET');
    requests++;
    let response;
    try {response=await fetcher(url,{headers:{'User-Agent':config.userAgent,...headers}});}
    catch(_error){throw Input.fail('EN_NETWORK_UNAVAILABLE');}
    if(!response.ok)throw Input.fail(response.status===429?'EN_RATE_LIMITED':'EN_HTTP_UNAVAILABLE');
    if(response.url&&origin(response.url)!==origin(url))throw Input.fail('EN_ORIGIN_CHANGED');
    const body=await response.text();
    if(body.length>2*1024*1024)throw Input.fail('EN_RESPONSE_TOO_LARGE');
    return body;
  }
  return {text,json:async(url,headers)=>{try{return JSON.parse(await text(url,headers));}catch(e){if(e.code)throw e;throw Input.fail('EN_JSON_UNREADABLE');}},count:()=>requests};
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
async function mapping(io,provider,id,season,episode) {
  if(!positive(id))throw Input.fail('EN_MAPPING_IDENTITY_UNAVAILABLE');
  const bucket=String(Number(id)%config.mappingBuckets).padStart(2,'0');
  const shard=await io.json(config.mappingBaseUrl+'/'+config.mappingRevision+'/'+provider+'/'+bucket+'.json');
  if(shard.schema!==1||shard.revision!==config.mappingRevision)throw Input.fail('EN_MAPPING_REVISION_CONFLICT');
  const descriptor=provider+':'+id+(provider.endsWith('_show')?':s'+season:'');
  return MapEpisodes.target(shard.rows?.[descriptor],episode);
}
async function selectedEpisode(io,settings,context,season,episode) {
  const cfg=Input.configuration(settings);
  const payload=await io.json(Input.requestUrl(cfg,context.ids)); // no Referer/private URL propagation
  const meta=payload?.meta,ids=Input.identity(meta,context.ids),state=Input.select(meta,ids,season,episode,cfg.origin);
  if(!['tvdb','tmdb'].includes(state.provider))throw Input.fail('EN_INPUT_PROVIDER_UNSUPPORTED');
  const provider=state.provider==='tvdb'?'tvdb_show':'tmdb_show',id=state.provider==='tvdb'?ids.tvdbId:ids.tmdbId;
  const mapped=await mapping(io,provider,id,season,episode);
  const inventory=await io.json(config.episodeApi+'?anilist_id='+mapped.anilistId);
  MapEpisodes.corroborate(state,mapped,inventory);
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
  const embed=publicUrl(grant.embedUrl),u=new URL(embed);
  if(u.origin!==config.embedOrigin||u.pathname!=='/embed/v1')throw Input.fail('EN_EMBED_ORIGIN_CONFLICT');
  const raw=/(?:\?|&)t=([^&#]+)/.exec(embed);
  if(!raw)throw Input.fail('EN_SESSION_UNAVAILABLE');
  const session=await io.json(config.embedOrigin+'/api/embed/session?t='+raw[1],{'Referer':embed,'Origin':config.embedOrigin});
  const url=publicUrl(session.source);
  if(!config.mediaHosts.includes(new URL(url).hostname)||session.kind!=='hls')throw Input.fail('EN_MEDIA_PROTOCOL_UNSUPPORTED');
  const playbackHeaders={'User-Agent':config.userAgent,'Referer':config.embedOrigin+'/','Origin':config.embedOrigin};
  const hls=Playlist.parse(await io.text(url,playbackHeaders),url);
  const audio=hls.audioGroups?hls.audioLanguages:[Playlist.language(session.audioLang)].filter(Boolean);
  const tracks=Playlist.subtitleTracks([...(session.subtitles||[]),...hls.subtitles]);
  if(!Playlist.eligible(audio,tracks,original))return null;
  const wanted=audio.filter(l=>Playlist.allowedLanguage(l,original));
  const subtitleLanguages=[...new Set(tracks.map(t=>t.lang))];
  const quality=hls.height?hls.height+'p':'';
  const rank=String(16384-hls.height).padStart(5,'0')+'-'+(audio.includes(original)?'0':audio.includes('fr')?'1':'2');
  const caption='Audio : '+Playlist.audioLabel(audio,original)+'\nSous-titres : '+(subtitleLanguages.map(l=>l==='fr'?'Français':'Anglais').join(' · ')||'aucun FR/EN')+'\nAni.pm';
  const annotation=mapped.input&&mapped.input.episode!==mapped.episode?'\n'+mapped.input.provider.toUpperCase()+' S'+mapped.input.season+'E'+mapped.input.episode+' → Ani.pm E'+mapped.episode:'';
  return {name:sortPrefix(rank)+(quality||'Ani.pm'),...(quality?{quality}:{}),size:caption+annotation,
    url,format:'m3u8',headers:playbackHeaders,provider:'Ani.pm',source:'Ani.pm',
    audioLanguage:wanted.length>1?'MULTI':wanted[0]||'',
    subtitles:tracks.filter(t=>!t.hls).map(t=>({url:t.url,language:t.lang,lang:t.lang,name:t.name,format:/\.ass(?:\?|$)/i.test(t.url)?'ass':/\.srt(?:\?|$)/i.test(t.url)?'srt':'vtt',headers:playbackHeaders})),
    audioLanguages:wanted,subtitleLanguages};
}
async function getStreams(id,type,season,episode) {
  const settings=typeof SCRAPER_SETTINGS==='object'&&SCRAPER_SETTINGS?SCRAPER_SETTINGS:{};
  const scraper=typeof SCRAPER_ID==='string'?SCRAPER_ID.split(':').pop():'';
  if(scraper&&scraper!=='sources-en-anipm')return [];
  if(!['tv','series','movie'].includes(type))return [];
  type=type==='series'?'tv':type;
  const io=http(settings);
  try {
    if(type==='tv') {
      Input.configuration(settings); // fail before ALL network work
      season=Number(season);episode=Number(episode);
      if(!positive(season)||!positive(episode))throw Input.fail('EN_SPECIALS_UNSUPPORTED');
    }
    const context=await title(io,id,type);
    const mapped=type==='tv'?await selectedEpisode(io,settings,context,season,episode):await mapping(io,'tmdb_movie',context.ids.tmdbId,null,1);
    diagnostic(settings,'EN_MAPPED',{type,id:String(id),...(mapped.input?{input:mapped.input}:{}),anilistId:mapped.anilistId,episode:mapped.episode});
    const b=await bootstrap(io,mapped);
    const packages=b.anipmPackages?.episodes?.[String(mapped.episode)];
    if(!packages)throw Input.fail('EN_EPISODE_NOT_PUBLISHED');
    const modes=['sub','dub'].filter(mode=>packages[mode]===true);
    // Per lookup only: no persistent session/master/caption cache.
    const results=await Promise.all(modes.map(mode=>channel(io,b,mapped,mode,context.original).catch(error=>{diagnostic(settings,error.code||'EN_CHANNEL_UNAVAILABLE',{channel:mode});return null;})));
    const unique=[];for(const item of results.filter(Boolean))if(!unique.some(other=>other.url===item.url))unique.push(item);
    unique.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
    diagnostic(settings,'EN_COMPLETE',{sources:unique.length,requests:io.count()});
    return unique;
  }catch(error){diagnostic(settings,error.code||'EN_LOOKUP_UNAVAILABLE',{requests:io.count()});return [];}
}
function onSettings() {
  return [
    {type:'info',label:'Phone Preview · Series require your personal AIOmetadata manifest. TVDB Aired Order or TMDB only. IMDb is recommended. Settings are local to this entry/device.'},
    ...Input.settingsFields().filter(f=>['aiometadataManifestUrl','aiometadataIdType'].includes(f.key)),
    {type:'info',label:'No minimum resolution. Original/French/English audio; French/English subtitles. Original-only streams without full FR/EN subtitles are hidden. Test on a real anime: the app’s Matrix test is not in this catalogue.'}
  ];
}
module.exports={getStreams,onSettings};
