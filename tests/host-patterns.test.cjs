const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function harness(){
  let compilations=0;
  function CountedRegExp(pattern,flags){compilations++;return new RegExp(pattern,flags);}
  const context=vm.createContext({RegExp:CountedRegExp});
  vm.runInContext(fs.readFileSync(__dirname+'/../src/common.js','utf8'),context);
  return {context,match:context.matchesHost,compilations:()=>compilations};
}

test('host matching keeps exact and wildcard boundaries while reusing public patterns',()=>{
  const h=harness();
  for(let repeat=0;repeat<3;repeat++){
    for(const [url,expected] of [
      ['https://voe.sx/e/a?signature=first',true],
      ['https://VOE.SX/e/b?signature=second',true],
      ['https://cdn.voe.sx/e/c',true],
      ['https://voe.sx.evil.example/e/a',false],
      ['https://evil.example/?next=https://voe.sx/e/a',false],
      ['https://voe.sx@evil.example/e/a',false],
      ['https://notvoe.sx/e/a',false],
      ['https://voe.sx:443/e/a',false],
      ['not-a-url',false],
    ])assert.equal(h.match(url,['voe.sx']),expected,url);
    assert.equal(h.match('https://cdn.voe.other/e/a',['voe.*']),true);
    assert.equal(h.match('https://voe./e/a',['voe.*']),false);
    assert.equal(h.match('https://voe.sx.evil.example/e/a',['voe.*']),true,'Retain existing wildcard semantics');
  }
  assert.equal(h.compilations(),2,'Distinct URLs never recompile the same public rule');
  assert.deepEqual(Object.keys(h.context.hostPatternCache).sort(),['voe.*','voe.sx']);
});

test('changed pattern arrays do not reuse stale host decisions',()=>{
  const h=harness(),patterns=['old.example'];
  assert.equal(h.match('https://old.example/a',patterns),true);
  patterns[0]='new.example';
  assert.equal(h.match('https://old.example/a',patterns),false);
  assert.equal(h.match('https://new.example/a',patterns),true);
  assert.equal(h.compilations(),2);
});

test('pattern compilation storage stays bounded and uncached rules still work',()=>{
  const h=harness();
  for(let i=0;i<150;i++)assert.equal(h.match('https://host'+i+'.example/a',['host'+i+'.example']),true);
  assert.equal(Object.keys(h.context.hostPatternCache).length,128);
  assert.equal(h.match('https://host149.example/a',['host149.example']),true);
  assert.equal(h.match('https://attacker.example/a',['host149.example']),false);
  const before=h.compilations();
  assert.equal(h.match('https://host0.example/different-signed-url',['host0.example']),true);
  assert.equal(h.compilations(),before,'Warm rules remain usable after reaching the cap');
});
