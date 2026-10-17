// A bounded literal HTML reader for the imported Anime-Sama selectors. No app
// DOM/cheerio bridge, network access, scripts or browser execution is involved.
function decode(value) {
  const named={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',eacute:'é',egrave:'è',ecirc:'ê',agrave:'à',acirc:'â',ocirc:'ô',ucirc:'û',ccedil:'ç',Eacute:'É',iuml:'ï',hellip:'…'};
  return String(value).replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(all,key)=>{
    if (key[0]!=='#') return Object.prototype.hasOwnProperty.call(named,key)?named[key]:all;
    const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
    return n>0&&n<=0x10ffff ? String.fromCodePoint(n) : all;
  });
}
function parse(source) {
  if (typeof source!=='string'||source.length>1048576) throw new Error('Invalid or oversized HTML.');
  const root={tag:'root',attrs:{},children:[],source,start:0,end:source.length},stack=[root];
  const tags=/<!--[\s\S]*?-->|<\s*(\/?)\s*([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
  let position=0,count=0,match;
  const text=(raw)=>{if(raw)stack[stack.length-1].children.push({tag:'#text',raw,parent:stack[stack.length-1]});};
  while((match=tags.exec(source))) {
    if(++count>50000)throw new Error('Too many HTML elements.');
    text(source.slice(position,match.index));
    position=tags.lastIndex;if(!match[2])continue;
    const tag=match[2].toLowerCase();
    if(match[1]) {
      for(let i=stack.length-1;i>0;i--)if(stack[i].tag===tag){
        while(stack.length>i){const node=stack.pop();node.end=match.index;}break;
      }
      continue;
    }
    const attrs={},pattern=/([^\s=<>/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let a;while((a=pattern.exec(match[3])))attrs[a[1].toLowerCase()]=decode(a[2]??a[3]??a[4]??'');
    const parent=stack[stack.length-1],node={tag,attrs,children:[],parent,source,start:position,end:position};parent.children.push(node);
    if(/^(?:script|style|textarea)$/.test(tag)) {
      const close=new RegExp('</'+tag+'\\s*>','ig');close.lastIndex=position;const end=close.exec(source);
      node.end=end?end.index:source.length;node.children.push({tag:'#text',raw:source.slice(position,node.end),parent:node});
      position=end?close.lastIndex:source.length;tags.lastIndex=position;
    } else if(!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag)&&! /\/\s*$/.test(match[3]))stack.push(node);
  }
  text(source.slice(position));while(stack.length>1)stack.pop().end=source.length;return root;
}
function simple(node,selector) {
  if(node.tag==='#text')return false;
  const negations=[];selector=selector.replace(/:not\(([^)]+)\)/g,(_m,v)=>{negations.push(v);return '';});
  if(negations.some(s=>simple(node,s)))return false;
  const conditions=[];selector=selector.replace(/\[([^\]]+)\]/g,(_m,v)=>{conditions.push(v);return '';});
  for(const c of conditions){const m=/^([\w:-]+)(?:([*^$]?=)["']?([^"']*)["']?)?$/.exec(c);if(!m)return false;
    const value=node.attrs[m[1].toLowerCase()];if(value==null)return false;
    if(m[2]&&!(m[2]==='='?value===m[3]:m[2]==='*='?value.includes(m[3]):m[2]==='^='?value.startsWith(m[3]):value.endsWith(m[3])))return false;}
  const tag=/^[\w:-]+/.exec(selector);if(tag&&node.tag!==tag[0].toLowerCase())return false;
  for(const m of selector.matchAll(/([.#])([\w-]+)/g))if(m[1]==='#'?node.attrs.id!==m[2]:!String(node.attrs.class||'').split(/\s+/).includes(m[2]))return false;
  return true;
}
function descendants(node,out=[]) {for(const child of node.children||[]){if(child.tag!=='#text'){out.push(child);descendants(child,out);}}return out;}
function select(roots,selector) {
  const result=[],seen=new Set();
  for(const root of roots)for(const node of descendants(root))for(const group of selector.split(/\s*,\s*/)){
    const parts=group.trim().match(/(?:\[[^\]]*\]|:not\([^)]*\)|[^\s])+/g)||[];let cursor=node,index=parts.length-1;
    if(index<0||!simple(cursor,parts[index--]))continue;
    while(index>=0){cursor=cursor.parent;while(cursor&&cursor!==root&&!simple(cursor,parts[index]))cursor=cursor.parent;
      if(!cursor||cursor===root)break;index--;}
    if(index<0&&!seen.has(node)){seen.add(node);result.push(node);}
  }
  return result;
}
function content(node){return node.tag==='#text'?decode(node.raw):node.children.map(content).join('');}
function load(source) {
  const root=parse(source);
  function wrap(nodes){return {length:nodes.length,each(fn){nodes.forEach((n,i)=>fn(i,n));return this;},first(){return wrap(nodes.slice(0,1));},
    find(selector){return wrap(select(nodes,selector));},text(){return nodes.map(content).join('');},
    attr(name){return nodes[0]?.attrs[name];},html(){const n=nodes[0];return n?n.source.slice(n.start,n.end):null;},
    next(){const n=nodes[0],siblings=n?.parent?.children||[];return wrap(siblings.slice(siblings.indexOf(n)+1).filter(s=>s.tag!=='#text').slice(0,1));}};}
  const $=value=>typeof value==='string'?wrap(select([root],value)):wrap(value?[value]:[]);$.root=()=>wrap([root]);return $;
}
module.exports={load,decode};
