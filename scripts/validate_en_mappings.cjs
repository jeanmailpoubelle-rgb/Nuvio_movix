/* Validate daily data with the actual production range resolver. No network. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {target}=require('../src/sources-en/mapping');
const root=path.resolve(__dirname,'..'),base=path.join(root,'plugins/sources-en/data');
function validate(revision,previous,folder=base,cases=require('../tests/fixtures/sources-en-mapping.json').cases) {
  if(previous&&!/^[a-f0-9]{16}$/.test(previous))throw Error('Invalid previous revision');
  if(!/^[a-f0-9]{16}$/.test(revision))throw Error('Invalid mapping revision');
  const dir=path.join(folder,revision),index=JSON.parse(fs.readFileSync(path.join(dir,'index.json')));
  if(index.schema!==1||index.revision!==revision||!index.source_sha256.startsWith(revision)||index.buckets!==64||Object.keys(index.files).length!==192)throw Error('Invalid mapping index');
  let rows=0;const shards={};
  for(const [name,hash] of Object.entries(index.files)) {
    if(!/^(tvdb_show|tmdb_show|tmdb_movie)\/(?:[0-5][0-9]|6[0-3])\.json$/.test(name))throw Error('Invalid shard path');
    const bytes=fs.readFileSync(path.join(dir,name));
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Shard hash mismatch');
    const shard=JSON.parse(bytes);shards[name]=shard;
    if(shard.schema!==1||shard.revision!==revision||!shard.rows||Array.isArray(shard.rows))throw Error('Invalid shard');
    for(const [source,links] of Object.entries(shard.rows)) {
      if(!/^(?:tvdb_show|tmdb_show):[1-9]\d*:s\d+$|^tmdb_movie:[1-9]\d*$/.test(source)||typeof links!=='object'||Array.isArray(links))throw Error('Invalid source mapping');
      const [family,id]=source.split(':');
      if(name!==family+'/'+String(Number(id)%64).padStart(2,'0')+'.json')throw Error('Incorrect bucket');
      for(const [destination,ranges] of Object.entries(links)) {
        if(!/^anilist:[1-9]\d*$/.test(destination)||!ranges||typeof ranges!=='object'||Array.isArray(ranges)||Object.values(ranges).some(v=>typeof v!=='string'))throw Error('Invalid mapping ranges');
      }
      rows++;
    }
  }
  if(previous&&previous!==revision) {
    const old=JSON.parse(fs.readFileSync(path.join(folder,previous,'index.json')));
    const count=Object.keys(old.files).reduce((n,f)=>n+Object.keys(JSON.parse(fs.readFileSync(path.join(folder,previous,f))).rows).length,0);
    if(rows<count*.9)throw Error('Mapping count fell by more than 10%; review required');
  }
  for(const c of cases) {
    const name='tvdb_show/'+String(Number(c.tvdbId)%64).padStart(2,'0')+'.json';
    const result=target(shards[name].rows['tvdb_show:'+c.tvdbId+':s'+c.input[0]],c.input[1]);
    if(result.anilistId!==c.anilistId||result.episode!==c.episode)throw Error('Episode regression: '+c.series+' S'+c.input.join('E'));
  }
  return {revision,rows,fixtures:cases.length};
}
if(require.main===module){try{console.log(JSON.stringify(validate(process.argv[2],process.argv[3])));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={validate};
