// Keep the shared heading format and the original plugin's host caption. Nuvio
// builds that secondary line from quality/size/language, ignoring description;
// its string-valued size field is used only as text, never an invented file size.
function nativeStream(value) {
  const host=value.name.split(' | ')[0].split(' / ').pop();
  return {...value,provider:host,source:host,size:host};
}
module.exports={nativeStream};
