// Relative Anime-Sama identities follow the configured origin. This local URL
// reader needs no app URL/DOM bridge and preserves query bytes in playback URLs.
function absolute(raw, base) {
  let value = String(raw || '').trim().replace(/&amp;/g, '&');
  if (!value || /[\r\n]/.test(value)) return null;
  if (value.startsWith('//')) value = 'https:' + value;
  if (!/^https?:\/\//i.test(value)) {
    if (!base) return null;
    const root = /^(https?:\/\/[^/?#]+)/i.exec(base);
    if (!root) return null;
    value = value.startsWith('/') ? root[1] + value : String(base).split(/[?#]/)[0].replace(/[^/]*$/, '') + value;
  }
  const match = /^(https?:\/\/[^\s/?#@]+)(\/[^\s]*)?$/i.exec(value);
  if (!match) return null;
  const rest = match[2] || '/', end = rest.search(/[?#]/), suffix = end < 0 ? '' : rest.slice(end), parts = [];
  for (const part of (end < 0 ? rest : rest.slice(0,end)).split('/')) {
    if (part === '..') parts.pop(); else if (part !== '.') parts.push(part);
  }
  return match[1].toLowerCase() + parts.join('/') + suffix;
}
class URL {
  constructor(raw, base) {
    this.href = absolute(raw,base);
    if (!this.href) throw new Error('Invalid HTTP URL.');
    const m = /^(https?:)\/\/([^/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(this.href);
    this.protocol=m[1]; this.hostname=m[2].split(':')[0]; this.origin=m[1]+'//'+m[2];
    this.pathname=m[3] || '/'; this.search=m[4] || ''; this.hash=m[5] || '';
  }
}
function rootPath(value) {
  const path = new URL(value,'https://relative.invalid').pathname;
  const m = /^\/catalogue\/([a-zA-Z0-9_%.-]+)(?:\/.*)?$/.exec(path);
  if (!m || /^(\.|\.\.)$|%2e|%2f|%5c/i.test(m[1])) throw new Error('Invalid Anime-Sama path.');
  return `/catalogue/${m[1]}/`;
}
function sitePath(value) {
  const path = new URL(value,'https://relative.invalid').pathname;
  if (!/^\/catalogue\/[A-Za-z0-9_%.-]+\/[A-Za-z0-9_-]+\/(vostfr|vf|vf1|vf2|vqc)\/$/.test(path) || /%2e|%2f|%5c|\/\.\.?\//i.test(path)) throw new Error('Invalid episode path.');
  return path;
}
function server(raw,base) {
  const url=absolute(raw,base);
  if (!url || /(?:^|\.)sibnet\.ru$/.test(new URL(url).hostname)) return null;
  return url.replace(/^(https?:\/\/(?:www\.)?)vidmoly\.(?:to|net)(?=\/|:|$)/i,'$1vidmoly.biz');
}
function relativeSiteUrl(raw,base) {
  const url=absolute(raw,base);
  if (!url) return null;
  const u=new URL(url); return u.pathname+u.search;
}
function onSite(raw,base) { const path=relativeSiteUrl(raw,base); return path ? base+path : null; }
module.exports={URL,absolute,rootPath,sitePath,server,relativeSiteUrl,onSite};
