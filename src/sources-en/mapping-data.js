// One immutable revision per lookup, even if the daily pointer changes midway.
const config=require('../../config/sources-en.json');
const Input=require('../input-metadata');
function pointer(value) {
  if(value?.schema!==1||!/^[a-f0-9]{16}$/.test(value.revision||'')||!/^[a-f0-9]{64}$/.test(value.source_sha256||'')||!value.source_sha256.startsWith(value.revision))throw Input.fail('EN_MAPPING_REVISION_CONFLICT');
  return value.revision;
}
async function load(io,provider,id,report=()=>{}) {
  let revision=config.mappingRevision,state='current';
  try{revision=pointer(await io.json(config.mappingBaseUrl+'/current.json'));}
  catch(_error){state='baseline';}
  const bucket=String(Number(id)%config.mappingBuckets).padStart(2,'0');
  async function shard(rev) {
    const value=await io.json(config.mappingBaseUrl+'/'+rev+'/'+provider+'/'+bucket+'.json');
    if(value?.schema!==1||value.revision!==rev||!value.rows||typeof value.rows!=='object'||Array.isArray(value.rows))throw Input.fail('EN_MAPPING_REVISION_CONFLICT');
    return value;
  }
  let value;
  try{value=await shard(revision);}
  catch(error){
    if(revision===config.mappingRevision)throw error;
    revision=config.mappingRevision;state='baseline';value=await shard(revision);
  }
  report({revision,state});
  return {revision,rows:value.rows};
}
module.exports={load,pointer};
