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
  if(!positive(episode)||!rules||typeof rules!=='object')throw Input.fail('EN_MAPPING_INVALID');
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
  if(Number(data?.mappings?.anilist_id)!==mapped.anilistId)throw Input.fail('EN_MAPPING_IDENTITY_CONFLICT');
  const ep=data?.episodes?.[String(mapped.episode)];
  if(!ep)throw Input.fail('EN_MAPPING_EPISODE_UNAVAILABLE');
  if(state.ids.tvdbId&&String(ep.tvdbShowId)!==String(state.ids.tvdbId))throw Input.fail('EN_MAPPING_IDENTITY_CONFLICT');
  const external=Input.tvdbEpisode(state.video,state.provider,state.proxyOrigin);
  if(external) {
    if(String(ep.tvdbId)!==external.id||String(ep.tvdbShowId)!==String(state.ids.tvdbId))throw Input.fail('EN_MAPPING_EPISODE_CONFLICT');
    if(external.basis!=='explicit'&&!closeDate(state.video.released,ep.airDateUtc||ep.airDate))throw Input.fail('EN_MAPPING_RELEASE_CONFLICT');
    return;
  }
  // The published range must be corroborated, never substitute absolute counts.
  // Require a unique source release and the exact target show's aired position.
  const released=state.video.released;
  if(state.meta.videos.filter(v=>closeDate(v.released,released)).length!==1 ||
     !closeDate(released,ep.airDateUtc||ep.airDate))throw Input.fail('EN_MAPPING_RELEASE_CONFLICT');
  if(state.provider==='tvdb' && (String(ep.tvdbShowId)!==String(state.ids.tvdbId)||Number(ep.seasonNumber)!==Number(state.video.season)||Number(ep.episodeNumber)!==Number(state.video.episode)))throw Input.fail('EN_MAPPING_EPISODE_CONFLICT');
}
module.exports={interval,target,corroborate,positive};
