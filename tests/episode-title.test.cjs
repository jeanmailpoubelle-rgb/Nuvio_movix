const {test}=require('node:test');
const assert=require('node:assert/strict');
const {canonicalEpisodeSeparators}=require('../src/episode-title');
test('standalone multiplication separators canonicalize without changing words, order or embedded operators',()=>{
  assert.equal(canonicalEpisodeSeparators('Magic × To × Destroy'),'Magic x To x Destroy');
  assert.equal(canonicalEpisodeSeparators('Magic x To x Destroy'),'Magic x To x Destroy');
  for(const title of ['2×2','A×B','Darkness','Interest And Curse','Komugi And Gungi','×ray','ray×'])
    assert.equal(canonicalEpisodeSeparators(title),title);
});
