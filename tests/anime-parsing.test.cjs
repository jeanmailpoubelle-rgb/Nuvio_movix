const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Pages=require('../src/anime-sama/pages');
const Js=require('../src/anime-sama/js-data');
const U=require('../src/anime-sama/url');
const Id=require('../src/anime-sama/ids');
const Catalog=require('../src/anime-sama/catalog-context');
const {resolveSelection}=require('../src/anime-sama/native');
const {configuration}=require('../src/anime-sama/config');
const fixture=n=>fs.readFileSync(__dirname+'/fixtures/anime-sama/'+n,'utf8');
const base='https://domain-b.example';
test('ported title/search parsers preserve all source cards and group order without a DOM bridge',()=>{
  assert.equal(Pages.cards(fixture('catalog.html'),base+'/catalogue/').length,48);
  assert.equal(Pages.cards(fixture('catalog-vf.html'),base+'/catalogue/').length,48);
  assert.deepEqual(Pages.cards(fixture('search.html'),base+'/catalogue/').map(c=>c.path),['/catalogue/jujutsu-kaisen/']);
  const jjk=Pages.detail(fixture('jujutsu.html'),base+'/catalogue/jujutsu-kaisen/');
  assert.equal(jjk.year,2020);assert.ok(jjk.plot.includes('Yuji'));assert.ok(jjk.tags.includes('Action'));
  assert.deepEqual(jjk.groups.map(g=>g.name),['Saison 1','Film','Saison 2','Saison 3']);
  assert.equal(Pages.detail(fixture('one-piece.html'),base+'/catalogue/one-piece/').groups.length,27);
});
test('literal script parsing retains sparse positions, escaped names and known calls without executing code',()=>{
  assert.deepEqual(Js.arrays(`// eps1=['fake']\nvar eps2=['a',,null,undefined,'b',];eps1=['\\u0061',{'bad':1},'it\\\'s'];`),{1:['a',null,"it's"],2:['a',null,null,null,'b']});
  assert.deepEqual(Js.calls(`/*panneauAnime('fake','url')*/function panneauAnime(a,b){};panneauAnime('real','path');`,['panneauAnime']).map(c=>c.args.map(a=>a.text)),[['real','path']]);
});
test('ongoing One Piece helper retains recap positions and current global episode numbering',()=>{
  const egghead=Pages.episodeSlots("eps1=["+Array.from({length:74},(_,i)=>`'https://player.example/${i}'`).join(',')+"]",fixture('one-piece-egghead.html'),base+'/catalogue/one-piece/saison11/vostfr/');
  assert.equal(egghead[73].number,1155);assert.equal(egghead[73].index,73);
  const elbaf=Pages.episodeSlots("eps1=["+Array.from({length:25},(_,i)=>`'https://player.example/${i}'`).join(',')+"]",fixture('one-piece-elbaf.html'),base+'/catalogue/one-piece/saison12/vostfr/');
  assert.equal(elbaf[24].number,1180);
});
test('relative IDs and site configuration keep editions and allow domain changes without stale paths',()=>{
  const ref={path:'/catalogue/example/saison1/vostfr/',index:2,language:'vostfr',script:'/catalogue/example/saison1/vostfr/episodes.js?filever=1'};
  assert.deepEqual(Id.decodeEpisode(Id.encodeEpisode([ref])),[ref]);
  assert.equal(U.onSite('https://old.example/catalogue/example/saison1/vostfr/',base),base+'/catalogue/example/saison1/vostfr/');
  assert.equal(U.server('https://video.sibnet.ru/shell.php?id=1',base),null);
  assert.equal(U.server('https://vidmoly.to/w/file',base),'https://vidmoly.biz/w/file');
  for(const bad of ['https://host.example/path','https://user@host.example','https://host.example/?key=1'])assert.throws(()=>configuration({animeSamaBaseUrl:bad}));
});
test('metadata keeps TMDB/IMDb/Kitsu identity and season suffixes',()=>{
  for(const id of ['37854','tmdb:37854','series:37854:1:1','tmdb/37854'])assert.equal(Catalog.nativeId(id),'37854');
  assert.equal(Catalog.nativeId('tt0388629:1:1'),'tt0388629');assert.equal(Catalog.nativeId('kitsu:12:1'),'kitsu:12');
  const title='<script type="application/ld+json">'+JSON.stringify({'@type':'TVSeries',name:'ONE PIECE',genre:['Animation'],startDate:'1999-10-20'})+'</script>';
  assert.equal(Catalog.publicTitle(title,'tv').genres[0].id,16);
  assert.deepEqual(Catalog.publicSeason('<section class="episode_list"><article class="episode"><span class="episode_number">62</span><h3 class="episode_title"><a>E62</a></h3></article></section>').episodes,[{episode_number:62,name:'E62'}]);
});
test('HTML comments cannot introduce fake source titles, groups or player scripts',()=>{
  const d=Pages.detail('<!--<h1>Wrong</h1><script>panneauAnime("wrong","saison99/vf/")</script>--><h1>Right</h1><script>panneauAnime("Saison 1","saison1/vostfr/")</script>',base+'/catalogue/example/');
  assert.equal(d.title,'Right');assert.equal(d.groups.length,1);assert.ok(d.groups[0].path.endsWith('/saison1/'));
});
test('a non-animation catalog selection returns no anime instead of searching for a similarly named title',async()=>{
  const provider={config:{version:'all'},http:{request:async()=>({body:JSON.stringify({meta:{name:'The Matrix',genres:['Action'],released:'1999-01-01'}})})},
    details:async()=>{throw new Error('Must not search Anime-Sama for a non-animation title');}};
  assert.deepEqual(await resolveSelection(provider,'603','movie',1,1,{},''),[]);
});
test('Kitsu metadata retains aliases, absolute numbering and declared source season without inventing audio',async()=>{
  const provider={http:{request:async()=>({body:JSON.stringify({data:{attributes:{canonicalTitle:'Example 2nd Season',titles:{en:'Example Season 2'},startDate:'2000-01-01',subtype:'TV'}}})})}};
  const data=await Catalog.titleContext(provider,'kitsu:123','tv');
  assert.equal(data.absolute,true);assert.equal(data.sourceSeason,2);assert.ok(data.aliases.includes('Example Season 2'));assert.equal(data.genres[0].id,16);
});
