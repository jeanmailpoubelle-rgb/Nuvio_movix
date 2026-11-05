// Native matching ported from Nuvio_anime_sama f8605f1; shared resolver delivery.
const { AnimeSamaProvider } = require('./provider');
const { defaults } = require('./config');
const Id = require('./ids');
const Catalog = require('./catalog-context');
const InputMetadata = require('../input-metadata');
const {chooseCatalogEpisode,episodeReferences} = require('./episode-mapping');
const {nativeStream} = require('./streams');
const {entryScope} = require('./host-groups');
const pluginVersion = typeof VERSION === 'string' ? VERSION : 'development';
function clean(value) { return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function failure(code) { return Object.assign(new Error(code),{code}); }
function nativeProvider(settings,scope) {
  return new AnimeSamaProvider({animeSamaBaseUrl:settings.animeSamaBaseUrl || defaults.animeSamaBaseUrl,version:settings.version || defaults.version,
    hostScope:scope || entryScope(typeof SCRAPER_ID==='string'?SCRAPER_ID:'')});
}
function diagnostic(settings,stage,data) {
  if (settings.diagnostics && typeof event === 'function') event('anime-'+stage,data);
}
function titleNames(metadata) {
  return [...new Set([metadata.name,metadata.title,metadata.original_name,metadata.original_title,...(metadata.aliases || []),
    ...(metadata.alternative_titles?.titles || metadata.alternative_titles?.results || []).map(t => t.title),
    ...(metadata.translations?.translations || []).filter(t => ['en','fr','ja'].includes(t.iso_639_1)).map(t => t.data?.title || t.data?.name)].filter(v => typeof v === 'string' && clean(v)))];
}
function exactTitle(names,card) { return [card.title,...(card.aliases || [])].some(n => names.has(clean(n))); }
function compatibleYear(detail,metadata,type) {
  const year = Number(String((type === 'movie' ? metadata.release_date : metadata.first_air_date) || '').slice(0,4));
  return !detail.year || !year || Math.abs(detail.year-year) <= 1 || (metadata.sourceSeason > 1 && detail.year <= year);
}
function sourceIdentity(detail,metadata,type) {
  const ids=detail.externalIds;
  if(!ids)return 0;
  if(metadata.tmdb_id && !ids.tmdb?.[type]?.length && ids.tmdb?.[type==='tv'?'movie':'tv']?.length)return -1;
  let matched=false;
  for(const [expected,values] of [[metadata.tmdb_id,ids.tmdb?.[type]],[metadata.imdb_id,ids.imdb]]) {
    if(!expected || !values?.length)continue;
    if(values.length!==1 || values[0]!==String(expected))return -1;
    matched=true;
  }
  return matched?1:0;
}
function acceptedDetail(detail,metadata,type,names) {
  const identity=sourceIdentity(detail,metadata,type);
  return identity>=0 && compatibleYear(detail,metadata,type) && (identity===1 || exactTitle(names,detail));
}
async function sourceTitle(provider,metadata,type) {
  const titles = titleNames(metadata), names = new Set(titles.map(clean)), candidates = new Map();
  // The usual source slug is the normalized title. Verify the actual page's
  // identity/year before accepting it; translated/exceptional slugs still use
  // the existing search/alias path. No ID-to-title guesses or stored domains.
  const slug = clean(titles[0]).replace(/ /g,'-');
  if (slug && slug.length <= 160) {
    const path = `/catalogue/${slug}/`;
    try {
      const detail = await provider.details(path);
      if (detail.path === path && acceptedDetail(detail,metadata,type,names)) return detail;
    } catch (_error) { /* Missing/unreadable guessed path uses source search. */ }
  }
  for (const title of titles.slice(0,3)) {
    const search = await provider.search(title);
    for (const card of search.items) candidates.set(card.path,card);
    const exact = search.items.filter(c => exactTitle(names,c));
    if (exact.length === 1) {
      const detail = await provider.details(exact[0].path);
      if (acceptedDetail(detail,metadata,type,names)) return detail;
    }
    // The website indexes translated/original aliases. Check actual detail aliases,
    // rather than rejecting a card whose primary title uses another language.
    if (search.items.length && search.items.length <= 4) {
      const matched = [];
      for (const card of search.items) {
        const detail = await provider.details(card.path);
        if (acceptedDetail(detail,metadata,type,names)) matched.push(detail);
      }
      if (matched.length === 1) return matched[0];
      if (matched.length > 1) throw failure('AMBIGUOUS_SOURCE_TITLE');
    }
  }
  if (candidates.size) throw failure('NO_EXACT_SOURCE_ALIAS');
  throw failure('SOURCE_TITLE_NOT_FOUND');
}
async function resolveSelection(provider,id,type,season,episode,settings,key) {
  let map = {};
  if (settings.sourceMap) {
    map = JSON.parse(settings.sourceMap);
    if (!map || typeof map !== 'object' || Array.isArray(map)) throw failure('INVALID_SOURCE_MAP');
  }
  const binding = map[`${type}:${id}`];
  if (binding) {
    const selected = type === 'tv' ? binding.seasons?.[String(season)] : {path:binding.group,index:binding.index};
    if (!selected?.path) return [];
    const index = type === 'movie' ? Number(selected.index || 0) : Number(episode)-1+Number(selected.indexOffset || 0);
    const languages = selected.languages || binding.languages || ['vostfr','vf'];
    if (!Array.isArray(languages)) return [];
    return languages.filter(l => Id.accepts(provider.config.version,l)).map(language => {
      const path = selected.path.replace(/\/+$/, '')+'/'+language+'/';
      return Id.validateRef({path,index,language,script:path+'episodes.js'});
    });
  }
  let metadata = await Catalog.titleContext(provider,id,type,key,season,settings);
  type = metadata.kind || type;
  season = metadata.sourceSeason || season;
  const mapped=type==='tv'?await Catalog.inputEpisodeContext(provider,id,season,episode,key,metadata,settings):null;
  if(mapped) {
    diagnostic(settings,'input-mapping',{from:{season,episode},to:{season:mapped.season,episode:mapped.episode},basis:mapped.basis});
    provider.previewMapped={season:mapped.season,episode:mapped.episode};
    season=mapped.season;episode=mapped.episode;
    metadata={...metadata,tmdb_id:mapped.ids.tmdbId,imdb_id:mapped.ids.imdbId};
  }
  diagnostic(settings,'catalog',{id,type,name:metadata.name || metadata.title,season,episode});
  if (!metadata.genres?.some(g => g.id === 16)) return [];
  let detail;
  try { detail=await sourceTitle(provider,metadata,type); }
  catch(error) {
    if(!['NO_EXACT_SOURCE_ALIAS','SOURCE_TITLE_NOT_FOUND'].includes(error.code))throw error;
    let alternate;
    try {alternate=await Catalog.sourceTitleAliases(provider,type,season,metadata);}
    catch(aliasError){diagnostic(settings,'alias-unavailable',{code:aliasError.code||'ALIAS_METADATA_UNAVAILABLE'});throw error;}
    if(!alternate?.aliases.length)throw error;
    const aliases=alternate.aliases;
    // Give the verified alternate spelling its own direct/search opportunity.
    // Only source title matching uses this view; seasonContext below keeps the
    // original metadata and all its episode coordinates.
    detail=await sourceTitle(provider,{...metadata,tmdb_id:metadata.tmdb_id || alternate.tmdb_id,name:aliases[0],title:aliases[0],aliases:[...titleNames(metadata),...aliases.slice(1)]},type);
    diagnostic(settings,'alias-recovery',{catalog:'cinemeta',imdbId:metadata.imdb_id,title:detail.title});
  }
  diagnostic(settings,'source',{title:detail.title,path:detail.path});
  if (type === 'movie') {
    if (detail.groups.length !== 1 || !/\/films?\/$/.test(detail.groups[0].path)) throw failure('MOVIE_GROUP_AMBIGUOUS');
    const versions = await provider.versions(detail.groups[0],provider.config.version);
    if (versions.some(v => v.episodes.length !== 1)) throw failure('MOVIE_GROUP_AMBIGUOUS');
    return versions.filter(v => v.episodes[0]?.servers.length).map(v => ({path:v.path,index:0,language:v.language,script:v.script}));
  }
  const context = mapped?.context || await Catalog.seasonContext(provider,id,season,key,metadata);
  const refs = await episodeReferences(provider,detail,context,season,episode);
  diagnostic(settings,'episode',{count:context.episodes?.length,inputCatalog:context.inputCatalog,refs:refs.map(r => ({path:r.path,index:r.index,language:r.language}))});
  return refs;
}
async function getStreams(tmdbId,mediaType,season,episode) {
  try {
    const settings = typeof SCRAPER_SETTINGS === 'undefined' ? {} : SCRAPER_SETTINGS;
    console.log('[Anime-Sama]',pluginVersion,'getStreams',Catalog.nativeId(tmdbId) || 'source/unsupported ID',mediaType,season,episode);
    const provider = nativeProvider(settings);
    if (String(tmdbId).startsWith('as:ep:')) return (await provider.streams(tmdbId)).streams.map(nativeStream);
    const id = Catalog.nativeId(tmdbId), type = ['tv','series','show','anime'].includes(mediaType) ? 'tv' : mediaType;
    if (!id || !['tv','movie'].includes(type)) {
      diagnostic(settings,'unsupported catalog ID',{prefix:String(tmdbId).split(':')[0],mediaType});
      return [];
    }
    season = season == null ? 1 : Number(season); episode = episode == null ? 1 : Number(episode);
    if (type === 'tv' && (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1)) return [];
    if(type==='tv'&&season>0&&InputMetadata.active(settings))InputMetadata.configuration(settings);
    const key = typeof TMDB_API_KEY === 'string' ? TMDB_API_KEY.trim() : '';
    const refs = await resolveSelection(provider,id,type,season,episode,settings,key);
    const values=refs.length ? (await provider.streams(Id.encodeEpisode(refs),{reuseDiscovery:true})).streams.map(nativeStream) : [];
    return type==='tv'&&season>0&&provider.previewMapped?InputMetadata.annotateStreams(values,{season,episode},provider.previewMapped,settings):values;
  } catch (error) { console.warn('[Anime-Sama]',error.code || (error.status ? `HTTP ${error.status}` : 'Source unavailable.')); return []; }
}
function onSettings() {
  const scope=entryScope(typeof SCRAPER_ID==='string'?SCRAPER_ID:'');
  const label=scope==='other'?'Autres hébergeurs':scope==='all'?'Tous les hébergeurs':HOST_NAMES[scope];
  return [
    {type:'info',label:`Anime-Sama ${pluginVersion} · ${label} · Entrée indépendante. Paramètres propres à cette entrée. Tester avec un véritable épisode animé ; Matrix est indisponible.`},
    {type:'text',key:'animeSamaBaseUrl',label:'Adresse du site Anime-Sama',placeholder:defaults.animeSamaBaseUrl,description:'Laisser vide pour utiliser la configuration du plugin.'},
    {type:'select',key:'version',label:'Version',defaultValue:defaults.version,options:[{label:'Toutes les versions',value:'all'},{label:'VOSTFR',value:'vostfr'},{label:'VF',value:'vf'}]},
    ...InputMetadata.settingsFields(),
    {type:'text',key:'sourceMap',label:'Correspondances TMDB (JSON)',description:'Correspondances personnalisées facultatives pour des cas ambigus. Voir le README.'},
    {type:'toggle',key:'diagnostics',label:'Diagnostic',defaultValue:false,description:'Journaliser les étapes et les causes des liens manquants, sans URL signée ni clé API.'}
  ];
}
module.exports = { nativeProvider, getStreams, onSettings, resolveSelection, clean, sourceTitle, chooseCatalogEpisode, episodeReferences };
