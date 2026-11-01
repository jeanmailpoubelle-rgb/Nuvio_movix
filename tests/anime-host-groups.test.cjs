const {test}=require('node:test');
const assert=require('node:assert/strict');
const {entryScope,assignedScope,entryRank,sortPrefix}=require('../src/anime-sama/host-groups');
test('entry scopes accept actual TV/mobile prefixed IDs and reject unrelated native IDs',()=>{
  for(const prefix of ['', 'repository-uuid:', 'https://raw.example/repo/manifest.json:'])
    assert.equal(entryScope(prefix+'anime-sama-uqload'),'uqload');
  assert.equal(entryScope(''),'all');
  assert.throws(()=>entryScope('repository-uuid:unrelated'),/Unsupported/);
});
test('the fallback entry owns unassigned families and unknown aliases without overlapping assigned hosts',()=>{
  assert.equal(assignedScope('fixture',()=> 'voe'),'voe');
  assert.equal(assignedScope('fixture',()=> 'sendvid'),'other');
  assert.equal(assignedScope('fixture',()=> ''),'other');
});
test('composable labels sort all qualities before audio across separately completed entries',()=>{
  const qualities=[0,144,170,240,360,480,540,576,720,800,900,1080,1440,2160,4320];
  const audio=['VOSTFR','VF','VO','MULTI'];
  const values=qualities.flatMap(q=>audio.map(language=>({quality:q?q+'p':undefined,language,q})));
  const rankLanguage={MULTI:0,VF:1,VOSTFR:2,VO:3};
  const expected=values.slice().sort((a,b)=>b.q-a.q||rankLanguage[a.language]-rankLanguage[b.language]);
  const actual=values.slice().sort((a,b)=>entryRank(a).localeCompare(entryRank(b)));
  assert.deepEqual(actual,expected);
});
test('invisible prefixes preserve the app ordinal comparator, visible names and JSON round trips',()=>{
  const priorities=['10.002.','10.007.','11.001.','11.005.','12z15484-1.001.','81.001.'];
  const encoded=priorities.map(priority=>sortPrefix(priority)+'Anime-Sama / Host');
  assert.deepEqual(encoded.slice().reverse().sort(),encoded);
  assert.deepEqual(JSON.parse(JSON.stringify(encoded)),encoded);
  assert.ok(encoded.every(name=>name.replace(/^[\ufe00-\ufe0f]+/,'')==='Anime-Sama / Host'));
  assert.ok(encoded.every(name=>name.trim()===name&&name.toLowerCase().startsWith(name.match(/^[\ufe00-\ufe0f]+/)[0])));
  for(const priority of priorities){
    const prefix=sortPrefix(priority),bytes=[];
    for(let i=0;i<prefix.length;i+=2)bytes.push(((prefix.charCodeAt(i)-0xfe00)<<4)|(prefix.charCodeAt(i+1)-0xfe00));
    assert.equal(String.fromCharCode(...bytes),priority+'\0');
  }
});
