// AniBridge v3 ranges are directional. Empty maps are identity links, not
// permission to guess episode numbering. Ratios/multi-segment targets are
// deliberately unsupported in the first preview.
const Input = require('../input-metadata');
const positive = n => /^[1-9]\d*$/.test(String(n)) && Number.isSafeInteger(Number(n));
function interval(value) {
  const m=/^([1-9]\d*)(?:-([1-9]\d*)?)?$/.exec(String(value));
  if(!m)return null;
  const first=Number(m[1]),last=m[2]?Number(m[2]):String(value).includes('-')?null:first;
  return positive(first)&&(last===null||positive(last)&&last>=first)?{first,last}:null;
}
function target(rules, episode) {
  if(!positive(episode))throw Input.fail('EN_MAPPING_INVALID');
  if(rules===null||rules===undefined)throw Input.fail('EN_MAPPING_MISSING');
  if(typeof rules!=='object'||Array.isArray(rules))throw Input.fail('EN_MAPPING_INVALID');
  const matches=[];
  for(const [key,ranges] of Object.entries(rules)) {
    const id=/^anilist:([1-9]\d*)$/.exec(key);
    if(!id)continue;
    for(const [source,destination] of Object.entries(ranges||{})) {
      const a=interval(source);
      if(!a)throw Input.fail('EN_MAPPING_INVALID');
      if(episode<a.first||a.last!==null&&episode>a.last)continue;
      const b=interval(destination);
      if(!b||(a.last===null)!==(b.last===null)||a.last!==null&&a.last-a.first!==b.last-b.first)throw Input.fail('EN_MAPPING_COMBINED_EPISODE');
      matches.push({anilistId:Number(id[1]),episode:b.first+episode-a.first});
    }
  }
  if(matches.length!==1)throw Input.fail(matches.length?'EN_MAPPING_AMBIGUOUS':'EN_MAPPING_MISSING');
  return matches[0];
}
function day(value) {const n=Date.parse(String(value||''));return Number.isFinite(n)?n:null;}
function closeDate(a,b) {const x=day(a),y=day(b);return x!==null&&y!==null&&Math.abs(x-y)<=86400000;}
function corroborate(state, mapped, data) {
  let checks=0;
  function compare(code,field,expected,actual,known=positive) {
    if(!known(expected)||!known(actual))return;
    checks++;
    if(String(expected)!==String(actual))throw Object.assign(Input.fail(code),{detail:{field,expected:String(expected),actual:String(actual)}});
  }
  compare('EN_MAPPING_IDENTITY_CONFLICT','AniList',mapped.anilistId,data?.mappings?.anilist_id);
  compare('EN_MAPPING_IDENTITY_CONFLICT','TVDB série',state.ids.tvdbId,data?.mappings?.thetvdb_id);
  const ep=data?.episodes?.[String(mapped.episode)];
  if(!ep||typeof ep!=='object')return {state:'missing',checks};
  compare('EN_MAPPING_IDENTITY_CONFLICT','TVDB série',state.ids.tvdbId,ep.tvdbShowId);
  const external=Input.tvdbEpisode(state.video,state.provider,state.proxyOrigin);
  compare('EN_MAPPING_EPISODE_CONFLICT','TVDB épisode',external?.id,ep.tvdbId);
  // Equal explicit episode IDs are stronger than alternate season labels or
  // differing broadcast/streaming dates. Missing fields never constitute a veto.
  if(external&&positive(ep.tvdbId)&&String(ep.tvdbId)===external.id)return {state:'no-conflict',checks};
  if(state.provider==='tvdb') {
    const season=v=>v!==null&&v!==undefined&&v!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=0;
    compare('EN_MAPPING_EPISODE_CONFLICT','TVDB saison',state.video.season,ep.seasonNumber,season);
    compare('EN_MAPPING_EPISODE_CONFLICT','TVDB numéro',state.video.episode,ep.episodeNumber);
  }
  const released=state.video.released,actual=ep.airDateUtc||ep.airDate;
  if(day(released)!==null&&day(actual)!==null&&state.meta.videos.filter(v=>closeDate(v.released,released)).length===1) {
    checks++;
    if(!closeDate(released,actual))throw Object.assign(Input.fail('EN_MAPPING_RELEASE_CONFLICT'),{detail:{field:'Date de diffusion',expected:new Date(day(released)).toISOString().slice(0,10),actual:new Date(day(actual)).toISOString().slice(0,10)}});
  }
  return {state:checks?'no-conflict':'missing',checks};
}
module.exports={interval,target,corroborate,positive};
