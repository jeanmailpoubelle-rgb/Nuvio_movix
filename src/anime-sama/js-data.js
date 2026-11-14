// Adapted from Nuvio_anime_sama f8605f1 (GPL-3.0-or-later).
// Adapted from CloudStream AnimeSama/JsData.kt. Parse literals; never execute page JS.
function tokens(source) {
  if (source.length > 4000000) throw new Error('Script too large.');
  const out = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) { i++; continue; }
    if (source.startsWith('//', i)) { const n = source.indexOf('\n', i + 2); i = n < 0 ? source.length : n; continue; }
    if (source.startsWith('/*', i)) { const n = source.indexOf('*/', i + 2); i = n < 0 ? source.length : n + 2; continue; }
    if ('\'"`'.includes(c)) {
      const quote = c;
      let text = '';
      i++;
      while (i < source.length && source[i] !== quote) {
        let ch = source[i++];
        if (ch === '\\' && i < source.length) {
          ch = source[i++];
          const escapes = { n: '\n', r: '\r', t: '\t' };
          if (ch in escapes) text += escapes[ch];
          else if (ch === '\n') continue;
          else if (ch === '\r') { if (source[i] === '\n') i++; }
          else if (ch === 'x' || ch === 'u') {
            const n = ch === 'x' ? 2 : 4;
            const hex = source.slice(i, i + n);
            if (hex.length === n && /^[\da-f]+$/i.test(hex)) { text += String.fromCharCode(parseInt(hex, 16)); i += n; }
            else text += ch;
          } else text += ch;
        } else text += ch;
      }
      if (i < source.length) i++;
      out.push({ text, kind: 's' });
    } else if (/[a-zA-Z0-9_$]/.test(c)) {
      const start = i++;
      while (i < source.length && /[a-zA-Z0-9_$]/.test(source[i])) i++;
      out.push({ text: source.slice(start, i), kind: 'w' });
    } else { out.push({ text: c, kind: 'p' }); i++; }
  }
  return out;
}
function arrays(source) {
  const t = tokens(source), result = {};
  for (let i = 0; i < t.length - 2; i++) {
    const m = /^eps(\d+)$/.exec(t[i].text);
    if (!m || t[i].kind !== 'w' || t[i+1].text !== '=' || t[i+2].text !== '[') continue;
    const values = [];
    let field = [], depth = 0;
    for (let j = i+3; j < t.length && values.length < 20000; j++) {
      const v = t[j];
      if (v.kind !== 's' && depth === 0 && v.text === ']') { if (field.length) values.push(field.length === 1 && field[0].kind === 's' ? field[0].text : null); break; }
      if (v.kind !== 's' && depth === 0 && v.text === ',') { values.push(field.length === 1 && field[0].kind === 's' ? field[0].text : null); field = []; }
      else {
        if (v.kind !== 's' && ['[','{','('].includes(v.text)) depth++;
        if (v.kind !== 's' && [']','}',')'].includes(v.text)) depth--;
        field.push(v);
      }
    }
    result[Number(m[1])] = values;
  }
  return result;
}
function calls(source, names) {
  const t = tokens(source), out = [];
  for (let i = 0; i < t.length - 1; i++) {
    if (t[i].kind !== 'w' || !names.includes(t[i].text) || t[i+1].text !== '(' || t[i-1]?.text === 'function') continue;
    const args = [];
    for (let j = i+2; j < t.length && (t[j].kind === 's' || t[j].text !== ')') && args.length < 20; j++) {
      if (t[j].kind === 's' || t[j].text !== ',') args.push(t[j]);
    }
    out.push({ name: t[i].text, args });
  }
  return out;
}
// Read only complete JSON-compatible literal assignments. Never evaluate page
// expressions, including a literal followed by concatenation/function calls.
function literals(source, names) {
  const t=tokens(source),result={};
  for(let i=0;i<t.length-2;i++){
    if(t[i].kind!=='w'||!names.includes(t[i].text)||t[i+1].text!=='='||
      !(t[i-1]?.kind==='w'&&['var','let','const'].includes(t[i-1].text)||t[i-1]?.text==='.'&&t[i-2]?.text==='window'))continue;
    let end=i+2,depth=0;
    for(;end<t.length;end++){
      const v=t[end];
      if(v.kind!=='s'&&['{','['].includes(v.text))depth++;
      if(v.kind!=='s'&&['}',']'].includes(v.text))depth--;
      if(depth<=0){end++;break;}
    }
    if(depth!==0||end<t.length&&t[end].text!==';')continue;
    try {
      const value=JSON.parse(t.slice(i+2,end).map(v=>v.kind==='s'?JSON.stringify(v.text):v.text).join(''));
      if(Object.prototype.hasOwnProperty.call(result,t[i].text))result[t[i].text]=null;
      else result[t[i].text]=value;
    }catch(_error){}
  }
  return result;
}
// Video-host unpacking is centralized in src/extractors.js.
module.exports = { tokens, arrays, calls, literals };
