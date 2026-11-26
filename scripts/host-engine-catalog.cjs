const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=function(root){
  const engines={},files={};
  for(const [family,folder,prefix] of [['anime-sama','plugins/anime-sama-plus','anime'],['sources-fr','plugins/sources-fr-plus','fr'],['sources-en','plugins/sources-en','en']]){
    const manifest=JSON.parse(fs.readFileSync(path.join(root,folder,'manifest.json'))),entries=[];
    for(const row of manifest.scrapers){
      if(row.enabled===false||!row.supportedTypes.length||family==='anime-sama'&&entries.length)continue;
      const file=prefix+'-'+path.basename(row.filename),source=path.posix.join(folder,row.filename);
      files[file]={path:source,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,source))).digest('hex')};
      entries.push({id:family==='anime-sama'?'':row.id,file,types:row.supportedTypes});
    }
    engines[family]={version:manifest.version,entries};
  }
  return JSON.stringify({api:1,minApp:9,sequence:0,engines,files},null,2)+'\n';
};
