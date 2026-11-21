const {fail}=require('../input-metadata');
const {absolute}=require('../anime-sama/url');
function language(value) {
  const raw=String(value||'').trim().toLowerCase().replace(/_/g,'-');
  const aliases={jpn:'ja',japanese:'ja',japonais:'ja',eng:'en',english:'en',anglais:'en',fre:'fr',fra:'fr',french:'fr','français':'fr',zho:'zh',chi:'zh',chinese:'zh',mandarin:'zh',kor:'ko',korean:'ko',deu:'de',ger:'de',german:'de',spa:'es',spanish:'es',ita:'it',italian:'it',por:'pt',portuguese:'pt',rus:'ru',russian:'ru',hin:'hi',hindi:'hi'};
  if(aliases[raw])return aliases[raw];
  return /^[a-z]{2}(?:-[a-z0-9]+)*$/.test(raw)?raw.split('-')[0]:'';
}
function attributes(line) {
  const out={};let match;
  const re=/([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))(?:,|$)/g;
  while((match=re.exec(line)))out[match[1]]=match[2]===undefined?match[3]:match[2];
  return out;
}
function parse(text, url) {
  if(!/^\s*#EXTM3U(?:\r?\n|$)/.test(text))throw fail('EN_PLAYLIST_UNREADABLE');
  const lines=text.trim().split(/\r?\n/),variants=[],media=[];
  for(let i=0;i<lines.length;i++) {
    if(lines[i].startsWith('#EXT-X-MEDIA:'))media.push(attributes(lines[i].slice(13)));
    if(lines[i].startsWith('#EXT-X-STREAM-INF:')) {
      const attrs=attributes(lines[i].slice(18));
      if(!lines[i+1]||lines[i+1].startsWith('#'))throw fail('EN_PLAYLIST_UNREADABLE');
      const uri=absolute(lines[i+1],url,true);
      if(!uri)throw fail('EN_PLAYLIST_UNREADABLE');
      variants.push({...attrs,URI:uri});
    }
  }
  if(!variants.length&&!lines.some(line=>line.startsWith('#EXTINF:')))throw fail('EN_PLAYLIST_UNREADABLE');
  const group=(kind)=>media.filter(m=>m.TYPE===kind&&variants.some(v=>v[kind==='AUDIO'?'AUDIO':'SUBTITLES']===m['GROUP-ID']));
  const audio=group('AUDIO'),subs=group('SUBTITLES');
  const heights=variants.map(v=>/^[1-9]\d*x([1-9]\d*)$/.exec(v.RESOLUTION||'')).filter(Boolean).map(m=>Number(m[1])).filter(n=>n<=16384);
  return {height:heights.length?Math.max(...heights):0,audioGroups:audio.length,
    audioLanguages:[...new Set(audio.map(m=>language(m.LANGUAGE)).filter(Boolean))],
    audioTracks:audio.filter(m=>m.URI).map(m=>({lang:language(m.LANGUAGE),url:absolute(m.URI,url,true)||''})),
    subtitles:subs.map(m=>({url:m.URI?absolute(m.URI,url,true):'',label:m.NAME||'',srclang:m.LANGUAGE||'',hls:true})).filter(s=>s.url),
    variants};
}
function allowedLanguage(lang, original) {return !!lang&&(lang===original||lang==='en'||lang==='fr');}
function subtitleTracks(values) {
  const result=[];const seen=new Set();
  for(const item of values||[]) {
    const lang=language(item.srclang||item.lang||item.language);
    const url=item.url||item.file||item.src;
    if(!['en','fr'].includes(lang)||typeof url!=='string'||!/^https:\/\//i.test(url)||seen.has(url))continue;
    const label=String(item.label||item.name||'');
    // HLS caption groups remain inside the original master, not native sidecars.
    const full=!/signs?|songs?|forced|on.screen/i.test(label);
    result.push({url,lang,name:(lang==='fr'?'Français':'Anglais')+(label?' · '+label:''),full,hls:!!item.hls});seen.add(url);
  }
  return result;
}
function eligible(audio, subtitles, original) {
  return audio.includes('en')||audio.includes('fr')||!!original&&audio.includes(original)&&subtitles.some(s=>s.full);
}
const names={ja:'Japonais',en:'Anglais',fr:'Français',zh:'Chinois',ko:'Coréen',de:'Allemand',es:'Espagnol',it:'Italien',pt:'Portugais',ru:'Russe',hi:'Hindi',ar:'Arabe',th:'Thaï',vi:'Vietnamien'};
function audioLabel(languages,original) {
  return languages.filter(l=>allowedLanguage(l,original)).sort((a,b)=>(a===original?0:a==='fr'?1:2)-(b===original?0:b==='fr'?1:2))
    .map(l=>(names[l]||l.toUpperCase())+(l===original?' (original)':'')).join(' · ')||'non vérifié';
}
module.exports={language,attributes,parse,subtitleTracks,eligible,audioLabel,allowedLanguage};
