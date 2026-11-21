const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {validate}=require('../scripts/validate_en_mappings.cjs');
function fixture(base,revision,count) {
  const files={};
  for(const family of ['tvdb_show','tmdb_show','tmdb_movie'])for(let bucket=0;bucket<64;bucket++) {
    const rows={};for(let i=1;i<=count;i++)if(family==='tmdb_movie'&&i%64===bucket)rows['tmdb_movie:'+i]={'anilist:1':{'1':'1'}};
    const name=family+'/'+String(bucket).padStart(2,'0')+'.json',bytes=JSON.stringify({schema:1,revision,rows});
    fs.mkdirSync(path.join(base,revision,family),{recursive:true});fs.writeFileSync(path.join(base,revision,name),bytes);
    files[name]=crypto.createHash('sha256').update(bytes).digest('hex');
  }
  fs.writeFileSync(path.join(base,revision,'index.json'),JSON.stringify({schema:1,revision,source_sha256:revision.repeat(4),buckets:64,files}));
}
test('daily mapping validator rejects corrupted shards and large coverage drops',()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'en-mapping-'));
  try{
    const old='a'.repeat(16),fresh='b'.repeat(16);fixture(base,old,20);fixture(base,fresh,1);
    assert.equal(validate(old,null,base,[]).rows,20);
    assert.throws(()=>validate(fresh,old,base,[]),/10%/);
    fs.appendFileSync(path.join(base,old,'tmdb_movie/01.json'),'\n');
    assert.throws(()=>validate(old,null,base,[]),/hash mismatch/);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});
