// Shared composable display priority; no networking or playback changes.
function entryRank(item) {
  const tiers=[2160,1440,1080,720,576,480,360,240,144];
  const match=/^([1-9]\d*)p$/.exec(item.quality||''),q=match?Number(match[1]):0;
  const audio={MULTI:0,VF:1,VOSTFR:2}[String(item.language||'').toUpperCase()]??3;
  const at=tiers.indexOf(q);
  if(at>=0)return String(at*4+audio+1).padStart(2,'0');
  if(!q)return String(81+audio);
  // Preserve exact order for nonstandard resolutions without guessing a tier.
  const above=tiers.filter(n=>n>q).length;
  return String(above*4).padStart(2,'0')+'z'+String(Math.max(0,16384-q)).padStart(5,'0')+'-'+audio;
}
function sortPrefix(priority) {
  // Encode ASCII priority bytes as leading Unicode variation selectors (VS1–16).
  // These default-ignorable characters have no visible glyph/advance. Nuvio's
  // ordinal lowercase String comparison preserves them; locale collators may
  // ignore them and must not be used to model the app's ordering.
  let prefix='';
  for(let i=0;i<priority.length;i++){
    const byte=priority.charCodeAt(i);
    prefix+=String.fromCharCode(0xfe00+(byte>>4),0xfe00+(byte&15));
  }
  return prefix+'\ufe00\ufe00'; // Byte-zero terminator, before the visible label.
}
module.exports={entryRank,sortPrefix};
