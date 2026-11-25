// EN-only missing-ID proof. This supplies identity, never episode numbering.
const Input=require('../input-metadata');
const positive=n=>/^[1-9]\d*$/.test(String(n))&&Number.isSafeInteger(Number(n));
function stamp(v) {
  const raw=String(v?.released||v?.firstAired||v?.air_date||'');
  return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(raw)?Date.parse(raw):NaN;
}
function near(a,b) {return Number.isFinite(stamp(a))&&Number.isFinite(stamp(b))&&Math.abs(stamp(a)-stamp(b))<=86400000;}
function episode(state,canonical) {
  Input.identity(canonical,state.ids);
  if(String(canonical.tvdb_id)!==state.ids.tvdbId||!Array.isArray(canonical.videos))return null;
  const source=state.meta.videos.filter(v=>v&&typeof v==='object'),reference=canonical.videos.filter(v=>v&&typeof v==='object');
  // A stream suffix is insufficient. Require one identical stream identity and
  // one matching release in each independently identified series inventory.
  if(state.stream.base!==state.ids.imdbId||source.filter(v=>v.id===state.video.id).length!==1)return null;
  const matches=reference.filter(v=>v.id===state.video.id);
  if(matches.length!==1||!near(state.video,matches[0]))return null;
  const anchor=matches[0];
  if(!positive(anchor.season)||!positive(anchor.episode)||anchor.id!==state.ids.imdbId+':'+Number(anchor.season)+':'+Number(anchor.episode))return null;
  if(source.filter(v=>near(v,state.video)).length!==1||reference.filter(v=>near(v,anchor)).length!==1)return null;
  const external=Input.tvdbEpisode(anchor,'imdb');
  if(!external||reference.filter(v=>Input.tvdbEpisode(v,'imdb')?.id===external.id).length!==1)return null;
  return external;
}
module.exports={episode};
