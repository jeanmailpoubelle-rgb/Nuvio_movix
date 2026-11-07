// Adapted from Nuvio_anime_sama f8605f1 (GPL-3.0-or-later).
const { URL } = require('./url');
const cheerio = require('./html');
const ENDPOINTS = require('./config').defaults.metadata;
const InputMetadata = require('../input-metadata');
function nativeId(value) {
  const kitsu = /^(?:kitsu|kitsu-anime)[:/](\d+)(?=[:/]|$)/i.exec(String(value || '').trim());
  if (kitsu) return 'kitsu:'+kitsu[1];
  const id = String(value || '').trim().replace(/^(?:tmdb|movie|series|tv)[:/]/i,'').split(/[:/]/)[0];
  return /^(?:\d+|tt\d+)$/i.test(id) ? id.toLowerCase() : null;
}
function jsonLd(html,type) {
  const $ = cheerio.load(html), found = [];
  $('script[type="application/ld+json"]').each((_i,el) => {
    try {
      const raw = $(el).html() || '';
      const data = JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
      const entries = data['@graph'] || [data];
      for (const entry of entries) if ([].concat(entry['@type'] || []).includes(type === 'tv' ? 'TVSeries' : 'Movie')) found.push(entry);
    } catch (_error) { /* An unrelated/invalid schema block is not catalog metadata. */ }
  });
  if (found.length !== 1) throw Object.assign(new Error('Public title metadata unavailable.'),{code:'METADATA_UNAVAILABLE'});
  return {data:found[0],$};
}
function publicTitle(html,type) {
  const {data,$} = jsonLd(html,type);
  const names = [data.name,...[].concat(data.alternateName || [])].filter(v => typeof v === 'string' && v.trim());
  const genres = [].concat(data.genre || []).filter(v => typeof v === 'string');
  let original;
  $('.facts p').each((_i,el) => {
    const text = $(el).text().trim();
    const m = /^Original (?:Name|Title)\s+(.+)$/.exec(text);
    if (m) original = m[1].trim();
  });
  if (!names.length) throw Object.assign(new Error('Public title name unavailable.'),{code:'METADATA_UNAVAILABLE'});
  const date = type === 'tv' ? data.startDate : data.datePublished;
  return {name:names[0],original_name:original,aliases:names.slice(1),
    genres:genres.map(name => ({name,id:/^animation$/i.test(name) ? 16 : undefined})),
    ...(type === 'tv' ? {first_air_date:date} : {title:names[0],release_date:date})};
}
function publicSeason(html) {
  const $ = cheerio.load(html), episodes = [];
  $('.episode_list .episode').each((_i,el) => {
    const row = $(el), raw = row.find('.episode_number').first().text().trim();
    if (!/^\d+$/.test(raw)) return;
    const episode_number = Number(raw);
    if (episodes.some(e => e.episode_number === episode_number)) return;
    episodes.push({episode_number,name:row.find('.episode_title a').first().text().trim()});
  });
  if (!episodes.length) throw Object.assign(new Error('Public season episodes unavailable.'),{code:'SEASON_UNAVAILABLE'});
  return {episodes};
}
async function api(provider,path,key) {
  const auth = key.includes('.') ? {Authorization:`Bearer ${key}`} : {};
  const url = ENDPOINTS.tmdbApi+path+(path.includes('?') ? '&':'?')+(key.includes('.') ? '' : 'api_key='+encodeURIComponent(key));
  const r = await provider.http.request(url,{headers:auth,category:'mapping'});
  return JSON.parse(r.body);
}
// Cinemeta's long-running shows can exceed Nuvio's 1 MiB response cap. Read the
// complete identity header and complete video entries only through the requested
// season, instead of parsing an oversized/truncated whole-show response.
function cinemetaMeta(raw,season) {
  const start = /^\s*\{\s*"meta"\s*:\s*\{/.exec(raw);
  if (!start) throw Object.assign(new Error('Invalid catalog metadata.'),{code:'METADATA_UNAVAILABLE'});
  let depth=2,quote=false,escaped=false,videos=-1,header;
  for(let i=start[0].length;i<raw.length;i++) {
    const ch=raw[i];
    if(quote) {if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quote=false;continue;}
    if(ch==='"') {
      if(depth===2 && raw.startsWith('"videos"',i)) {
        let j=i+8;while(/\s/.test(raw[j] || '') && j<raw.length)j++;
        if(raw[j]===':') {
          j++;while(/\s/.test(raw[j] || '') && j<raw.length)j++;
          if(raw[j]==='[') {header=JSON.parse(raw.slice(0,i).replace(/,\s*$/,'')+'}}').meta;videos=j+1;break;}
        }
      }
      quote=true;
    } else if(ch==='{' || ch==='[')depth++;
    else if(ch==='}' || ch===']')depth--;
  }
  if(videos<0)return JSON.parse(raw).meta;
  const selected=[],groups=new Set();let offset=0,objectStart=-1,complete=false;depth=0;quote=false;escaped=false;
  for(let i=videos;i<raw.length;i++) {
    const ch=raw[i];
    if(quote) {if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quote=false;continue;}
    if(ch==='"'){quote=true;continue;}
    if(ch==='{'){if(depth===0)objectStart=i;depth++;}
    else if(ch==='}') {
      depth--;
      if(depth===0 && objectStart>=0) {
        const v=JSON.parse(raw.slice(objectStart,i+1)),number=Number(v.episode),group=Number(v.season);
        if(Number.isInteger(group) && group>0)groups.add(group);
        if(group>season)break;
        if(Number.isInteger(number) && number>0) {
          if(group>0 && group<season)offset++;
          else if(group===season)selected.push({episode_number:number,name:v.title || v.name});
        }
      }
    } else if(ch===']' && depth===0){complete=true;break;}
  }
  return {...header,catalogEpisodes:selected,absoluteOffset:offset,singleSeason:complete && groups.size===1 && groups.has(1)};
}
function imdbIdentity(meta) {
  return [meta?.imdb_id,meta?.id].find(value => typeof value === 'string' && /^tt\d+$/.test(value));
}
async function titleContext(provider,id,type,key = '',season = 1,settings = {}) {
  if (id.startsWith('kitsu:')) {
    const r = await provider.http.request(`${ENDPOINTS.kitsu}/${id.slice(6)}`,{category:'mapping'});
    const attributes = JSON.parse(r.body)?.data?.attributes;
    if (!attributes?.canonicalTitle) throw Object.assign(new Error('Kitsu catalog metadata unavailable.'),{code:'METADATA_UNAVAILABLE'});
    const aliases = [...Object.values(attributes.titles || {}),...(attributes.abbreviatedTitles || [])].filter(v => typeof v === 'string');
    const seasonName = [attributes.canonicalTitle,...aliases].map(v => /\b(?:season\s+(\d+)|(\d+)(?:nd|rd|th)\s+season)\b/i.exec(v)).find(Boolean);
    return {name:attributes.canonicalTitle,title:attributes.canonicalTitle,aliases,genres:[{id:16,name:'Animation'}],
      first_air_date:attributes.startDate,release_date:attributes.startDate,kind:attributes.subtype === 'movie' ? 'movie':'tv',
      sourceSeason:seasonName ? Number(seasonName[1] || seasonName[2]):undefined,absolute:true};
  }
  // Resolve against the same public metadata used by Nuvio Catalog. One request
  // supplies both identity and episode numbers, without app keys or HTML scraping.
  let imdbId = id.startsWith('tt') ? id : null;
  try {
    const catalogId = id.startsWith('tt') ? id : 'tmdb:'+id;
    const r = await provider.http.request(`${ENDPOINTS.nuvioCatalog}/meta/${type === 'tv' ? 'series':'movie'}/${catalogId}.json`,{category:'mapping'});
    const meta = cinemetaMeta(r.body,season);
    if (!meta?.name || !Array.isArray(meta.genres)) throw new Error('Incomplete catalog metadata.');
    const linkedId = imdbIdentity(meta);
    if (imdbId && linkedId && linkedId !== imdbId) throw new Error('Catalog identity mismatch.');
    // The app can request seasonal coordinates even when Nuvio Catalog puts the
    // whole anime under S1. Retain its explicit IMDb correspondence before the
    // season check, then ask Cinemeta for that exact requested season. Never
    // guess an IMDb ID, hardcode a title's lengths or reuse S1 rows for S2.
    if (linkedId) imdbId = linkedId;
    if (type === 'tv' && !meta.catalogEpisodes?.length && !InputMetadata.active(settings)) throw new Error('Catalog season unavailable.');
    const referenceMeta = type === 'tv' && InputMetadata.active(settings) ? JSON.parse(r.body)?.meta : undefined;
    return {name:meta.name,title:meta.name,aliases:meta.aliases || [],imdb_id:imdbId,tmdb_id:/^[1-9]\d*$/.test(id)?id:undefined,catalogSource:'nuvio-catalog',
      genres:meta.genres.map(name => ({name,id:/^animation$/i.test(name)?16:undefined})),
      first_air_date:meta.released || meta.releaseInfo,release_date:meta.released || meta.releaseInfo,
      catalogEpisodes:meta.catalogEpisodes,absoluteOffset:meta.absoluteOffset,singleSeason:meta.singleSeason,referenceMeta};
  } catch (_error) { /* Isolated fallback for catalog outages or unsupported identities. */ }
  if (imdbId) {
    try {
      const r = await provider.http.request(`${ENDPOINTS.cinemeta}/meta/${type === 'tv' ? 'series':'movie'}/${imdbId}.json`,{category:'mapping'});
      const meta = cinemetaMeta(r.body,season), linkedId = imdbIdentity(meta);
      if (!meta?.name || (linkedId && linkedId !== imdbId)) throw Object.assign(new Error('IMDb catalog metadata unavailable.'),{code:'METADATA_UNAVAILABLE'});
      if (type === 'tv' && !meta.catalogEpisodes?.length) throw Object.assign(new Error('IMDb catalog season unavailable.'),{code:'SEASON_UNAVAILABLE'});
      return {name:meta.name,title:meta.name,aliases:meta.aliases || [],imdb_id:imdbId,tmdb_id:tmdbIdentity(meta,imdbId),catalogSource:'cinemeta',genres:(meta.genres || []).map(name => ({name,id:/^animation$/i.test(name)?16:undefined})),
        first_air_date:meta.released || meta.year || meta.releaseInfo,release_date:meta.released || meta.year || meta.releaseInfo,
        catalogEpisodes:meta.catalogEpisodes,absoluteOffset:meta.absoluteOffset,singleSeason:meta.singleSeason};
    } catch (error) {
      if (id.startsWith('tt')) throw error;
      // A failed alternate catalogue must not disable existing TMDB fallbacks.
    }
  }
  if (key) {
    try { return await api(provider,`/${type}/${id}?append_to_response=translations,alternative_titles`,key); }
    catch (_error) { /* The plugin must not stop at a missing, rejected or unavailable app key. */ }
  }
  const r = await provider.http.request(`${ENDPOINTS.tmdbSite}/${type}/${id}`,{category:'mapping'});
  return publicTitle(r.body,type);
}
async function seasonContext(provider,id,season,key = '',metadata) {
  if (id.startsWith('kitsu:')) return {absolute:true};
  if (metadata?.catalogEpisodes?.length) return {episodes:metadata.catalogEpisodes,absoluteOffset:metadata.absoluteOffset,singleSeason:metadata.singleSeason};
  if (id.startsWith('tt')) {
    const episodes = metadata?.catalogEpisodes || [];
    if (!episodes.length) throw Object.assign(new Error('IMDb catalog season unavailable.'),{code:'SEASON_UNAVAILABLE'});
    return {episodes,absoluteOffset:metadata.absoluteOffset};
  }
  if (key) {
    try { return await api(provider,`/tv/${id}/season/${season}`,key); }
    catch (_error) { /* Public TMDB episode lists require no credentials. */ }
  }
  const r = await provider.http.request(`${ENDPOINTS.tmdbSite}/tv/${id}/season/${season}`,{category:'mapping'});
  return publicSeason(r.body);
}
async function inputEpisodeContext(provider,id,season,episode,key,metadata,settings = {}) {
  if (!InputMetadata.active(settings)) return null;
  if (!metadata.referenceMeta) throw InputMetadata.fail('INPUT_METADATA_TARGET_UNAVAILABLE');
  const expected={imdbId:metadata.imdb_id,tmdbId:metadata.tmdb_id};
  const config=InputMetadata.configuration(settings);
  const response=await provider.http.request(InputMetadata.requestUrl(config,expected),{category:'input metadata',sensitive:true});
  let input;
  try { input=JSON.parse(response.body)?.meta; } catch (_error) { throw InputMetadata.fail('INPUT_METADATA_INVALID_RESPONSE'); }
  const ids=InputMetadata.identity(input,expected);
  const state=InputMetadata.select(input,ids,season,episode,config.origin);
  if(InputMetadata.requiredPreview() && state.provider!=='tvdb')throw InputMetadata.fail('INPUT_METADATA_PROVIDER_MISMATCH');
  let canonical;
  async function cinemeta() {
    if(!canonical)canonical=(async()=>{
      if(!ids.imdbId)throw InputMetadata.fail('INPUT_METADATA_QUERY_ID_UNAVAILABLE');
      const r=await provider.http.request(`${ENDPOINTS.cinemeta}/meta/series/${ids.imdbId}.json`,{category:'mapping'});
      let meta;try{meta=JSON.parse(r.body)?.meta;}catch(_error){throw InputMetadata.fail('INPUT_METADATA_INVALID_RESPONSE');}
      InputMetadata.identity(meta,ids);return meta;
    })();
    return canonical;
  }
  const mapped=await InputMetadata.resolve(state,metadata.referenceMeta,'nuvio-catalog',{
    referenceByImdb:async()=>{
      if(!ids.imdbId)throw InputMetadata.fail('INPUT_METADATA_QUERY_ID_UNAVAILABLE');
      const r=await provider.http.request(`${ENDPOINTS.nuvioCatalog}/meta/series/${ids.imdbId}.json`,{category:'mapping'});
      let meta;try{meta=JSON.parse(r.body)?.meta;}catch(_error){throw InputMetadata.fail('INPUT_METADATA_INVALID_RESPONSE');}
      InputMetadata.identity(meta,ids);return meta;
    },
    findTvdb:async external=>{
      if(!key)throw InputMetadata.fail('INPUT_METADATA_TMDB_KEY_REQUIRED');
      return api(provider,'/find/'+external+'?external_source=tvdb_id',key);
    },cinemeta
  });
  return {...mapped,ids,context:InputMetadata.targetContext(mapped.referenceMeta||metadata.referenceMeta,mapped.video)};
}
function tmdbIdentity(meta,expectedImdb) {
  if(expectedImdb) {
    const ids=[meta?.imdb_id,meta?.id].filter(v=>typeof v==='string' && /^tt\d+$/.test(v));
    if(!ids.length || ids.some(id=>id!==expectedImdb))return undefined;
  }
  const value=String(meta?.moviedb_id || '');
  return /^[1-9]\d*$/.test(value)?value:undefined;
}
async function sourceTitleAliases(provider,type,season,metadata,key = '') {
  // A source-title mismatch is different from a missing catalogue season. Only
  // borrow names through explicit identity; never replace episode inventories,
  // dates or layout with this alternate catalogue's potentially different data.
  const imdbId=imdbIdentity(metadata);
  if(metadata.catalogSource!=='nuvio-catalog'||!imdbId)return null;
  const r=await provider.http.request(`${ENDPOINTS.cinemeta}/meta/${type==='tv'?'series':'movie'}/${imdbId}.json`,{category:'mapping'});
  const meta=cinemetaMeta(r.body,season);
  const identities=[meta?.imdb_id,meta?.id].filter(v=>typeof v==='string'&&/^tt\d+$/.test(v));
  if(!identities.length||identities.some(v=>v!==imdbId)||typeof meta.name!=='string'||!meta.name.trim())
    throw Object.assign(new Error('Alternate title identity unavailable.'),{code:'ALIAS_IDENTITY_UNAVAILABLE'});
  const tmdb_id=tmdbIdentity(meta);
  if(metadata.tmdb_id && tmdb_id && String(metadata.tmdb_id)!==tmdb_id)throw Object.assign(new Error('Alternate TMDB identity mismatch.'),{code:'ALIAS_IDENTITY_UNAVAILABLE'});
  let aliases=[...new Set([meta.name,...(Array.isArray(meta.aliases)?meta.aliases:[])].filter(v=>typeof v==='string'&&v.trim()))];
  const normalize=v=>v.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const known=new Set([metadata.name,metadata.title,...(metadata.aliases||[])].filter(v=>typeof v==='string').map(normalize));
  if(key&&tmdb_id&&!aliases.some(v=>!known.has(normalize(v)))) {
    const official=await api(provider,`/${type==='tv'?'tv':'movie'}/${tmdb_id}?append_to_response=external_ids,alternative_titles`,key);
    if(String(official.id)!==tmdb_id||official.external_ids?.imdb_id!==imdbId)
      throw Object.assign(new Error('Official alias identity mismatch.'),{code:'ALIAS_IDENTITY_UNAVAILABLE'});
    const rows=official.alternative_titles?.results||official.alternative_titles?.titles||[];
    aliases=[...new Set([...rows.map(v=>v.title).filter(v=>typeof v==='string'&&normalize(v)&&!known.has(normalize(v))),...aliases])];
  }
  return {aliases,tmdb_id};
}
module.exports = {cinemetaMeta,nativeId,publicTitle,publicSeason,titleContext,seasonContext,inputEpisodeContext,sourceTitleAliases};
