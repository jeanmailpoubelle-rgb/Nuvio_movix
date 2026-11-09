// Final native presentation only. Keep semantic audio separate from the bridge's
// language caption, so it appears once while playback tracks remain untouched.
function compactStream(item) {
  const {_layoutMapping,...output}=item;
  const prefix=/^[\ufe00-\ufe0f]+/.exec(item.name||'')?.[0]||'';
  const label=String(item.name||'').slice(prefix.length).replace(/^\d+\. /,'').split(' | ')[0];
  const provenance=[...new Set([...label.split(' / '),item.size||''].map(s=>String(s).trim()).filter(Boolean))].join(' · ');
  const audio=item.audioLanguage??item.language??'';
  const heading=[item.quality,audio||item.version].filter(Boolean).join(' · ')||'Source';
  return {...output,name:prefix+heading,size:provenance+(_layoutMapping?'\n'+_layoutMapping:''),audioLanguage:audio,language:undefined};
}
module.exports={compactStream};
