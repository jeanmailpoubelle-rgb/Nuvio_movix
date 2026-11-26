// Validate hashes/shape and important directional boundaries with production code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {candidates}=require('../src/anime-sama/input-bridge');
function validate(dir){
 const index=JSON.parse(fs.readFileSync(path.join(dir,'index.json')));let count=0;const all={};
 if(index.schema!==1||!/^[a-f0-9]{16}$/.test(index.revision)||!index.source_sha256?.startsWith(index.revision)||Object.keys(index.files).length!==64)throw Error('Invalid Anime mapping index');
 for(const [name,hash] of Object.entries(index.files)){
  if(!/^tvdb_show\/(?:[0-5]\d|6[0-3])\.json$/.test(name))throw Error('Invalid shard path');
  const raw=fs.readFileSync(path.join(dir,name));if(crypto.createHash('sha256').update(raw).digest('hex')!==hash)throw Error('Invalid shard hash');
  const shard=JSON.parse(raw);if(shard.schema!==1||shard.revision!==index.revision||!shard.rows||Array.isArray(shard.rows))throw Error('Invalid shard');
  for(const [key,row] of Object.entries(shard.rows)){
   const m=/^tvdb_show:([1-9]\d*):s[1-9]\d*$/.exec(key);
   if(!m||name!=='tvdb_show/'+String(Number(m[1])%64).padStart(2,'0')+'.json'||!row.direct||!row.via)throw Error('Invalid row');
   const ranges=r=>{if(!r||typeof r!=='object'||Array.isArray(r)||Object.values(r).some(v=>typeof v!=='string'))throw Error('Invalid ranges');};
   for(const [target,r] of Object.entries(row.direct)){if(!/^tmdb_show:[1-9]\d*:s\d+$/.test(target))throw Error('Invalid target');ranges(r);}
   for(const [al,v] of Object.entries(row.via)){if(!/^anilist:[1-9]\d*$/.test(al))throw Error('Invalid AniList link');ranges(v.input);for(const [target,r] of Object.entries(v.targets)){if(!/^tmdb_show:[1-9]\d*:s\d+$/.test(target))throw Error('Invalid target');ranges(r);}}
   all[key]=row;count++;
  }
 }
 if(count!==index.rows)throw Error('Invalid row count');
 for(const [tv,s,e,tm,expected] of [[477424,1,8,321518,[[1,8]]],[252322,2,1,46298,[[1,59]]],[252322,2,5,46298,[[2,63]]],[252322,2,72,46298,[[2,130]]],[431162,3,4,220542,[[1,52]]],[278157,4,14,60863,[[4,14]]],[377543,2,1,95479,[[1,25],[2,1]]],[72454,34,1,30983,[[1,1187]]]]){
  const x=candidates(all['tvdb_show:'+tv+':s'+s],e,tm).targets.map(v=>[v.season,v.episode]);if(JSON.stringify(x)!==JSON.stringify(expected))throw Error('Anime mapping boundary regression');
 }
 return {revision:index.revision,rows:count};
}
if(require.main===module)console.log(JSON.stringify(validate(process.argv[2])));
module.exports={validate};
