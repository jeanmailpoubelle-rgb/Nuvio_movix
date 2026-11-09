const {compactStream}=require('../link-layout');
function nativeStream(value) {
  const host=value.name.replace(/^[\ufe00-\ufe0f]+/,'').replace(/^\d+\. /,'').split(' | ')[0].split(' / ').pop();
  return compactStream({...value,provider:host,source:host});
}
module.exports={nativeStream};
