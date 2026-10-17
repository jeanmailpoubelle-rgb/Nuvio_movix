const defaults = require('../../config/anime-sama.json');
const {URL} = require('./url');
function configuration(settings = {}) {
  const input=String(settings.animeSamaBaseUrl || defaults.baseUrl).trim();
  if(/[?#@]/.test(input))throw new Error('Expected a website home address.');
  const url=new URL(input.includes('://')?input:'https://'+input);
  if(url.protocol!=='https:'||!/^\/*$/.test(url.pathname))throw new Error('Expected an HTTPS site origin.');
  const version=settings.version || defaults.version;
  if(!['all','vf','vostfr'].includes(version))throw new Error('Invalid edition preference.');
  return {...defaults,animeSamaBaseUrl:url.origin,version};
}
module.exports={defaults:{...defaults,animeSamaBaseUrl:defaults.baseUrl},configuration};
