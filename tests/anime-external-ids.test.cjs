const {test}=require('node:test');
const assert=require('node:assert/strict');
const Pages=require('../src/anime-sama/pages');
const {sourceTitle}=require('../src/anime-sama/native');
const {sourceTitleAliases,titleContext}=require('../src/anime-sama/catalog-context');
const base='https://source.example/catalogue/original-name/';
function detail(links){return Pages.detail('<h1>Original Name</h1><p id="titreAlter">Other Name</p><ul class="oe-liens">'+links.map(href=>`<li><a href="${href}">TMDB</a></li>`).join('')+'</ul>',base);}
const meta={name:'English Name',tmdb_id:'123',imdb_id:'tt1234567',first_air_date:'2013-01-01'};
function provider(d){return {details:async()=>d,search:async()=>({items:[{path:d.path,title:d.title}]})};}
test('dedicated external-link parser accepts only exact trusted origins and typed canonical IDs',()=>{
 const d=detail(['https://www.themoviedb.org/tv/123-name?language=fr','https://www.themoviedb.org/tv/123',
 'https://www.themoviedb.org/movie/456','https://www.imdb.com/title/tt1234567/',
 'https://themoviedb.org.evil.example/tv/999','https://evil.example/?url=https://www.themoviedb.org/tv/888',
 'https://www.themoviedb.org/tv/123/season/2','https://www.themoviedb.org/tv/0']);
 assert.deepEqual(d.externalIds,{tmdb:{tv:['123'],movie:['456']},imdb:['tt1234567']});
 const outside=Pages.detail('<h1>X</h1><a href="https://www.themoviedb.org/tv/999">advert</a>',base);
 assert.deepEqual(outside.externalIds.tmdb.tv,[]);
});
test('an exact typed external identity restores a differently named source without extra metadata',async()=>{
 assert.equal((await sourceTitle(provider(detail(['https://www.themoviedb.org/tv/123'])),meta,'tv')).path,'/catalogue/original-name/');
 assert.equal((await sourceTitle(provider(detail(['https://www.imdb.com/title/tt1234567/'])),meta,'tv')).path,'/catalogue/original-name/');
});
test('conflicting, duplicate identities and wrong kinds cannot override matching names or years',async()=>{
 for(const links of [['https://www.themoviedb.org/tv/999'],['https://www.themoviedb.org/tv/123','https://www.themoviedb.org/tv/999'],['https://www.themoviedb.org/movie/123'],['https://www.themoviedb.org/tv/123','https://www.imdb.com/title/tt9999999/']]){
  const d=detail(links);d.title=meta.name;
  await assert.rejects(sourceTitle(provider(d),meta,'tv'));
 }
 const d=detail(['https://www.themoviedb.org/tv/123']);d.year=2020;
 await assert.rejects(sourceTitle(provider(d),meta,'tv'));
});
test('IMDb recovery may borrow verified TMDB correspondence but rejects disagreement',async()=>{
 const p={http:{request:async()=>({body:JSON.stringify({meta:{id:meta.imdb_id,name:meta.name,moviedb_id:123}})})}};
 const m={imdb_id:meta.imdb_id,catalogSource:'nuvio-catalog'};
 assert.equal((await sourceTitleAliases(p,'tv',1,m)).tmdb_id,'123');
 await assert.rejects(sourceTitleAliases(p,'tv',1,{...m,tmdb_id:'999'}));
 for(const identities of [{},{id:'tt9999999',imdb_id:meta.imdb_id}]) {
  const fallback={http:{request:async url=>{
   if(url.includes('catalog.nuvio.tv'))throw new Error('Offline');
   return {body:JSON.stringify({meta:{...identities,name:'Example',moviedb_id:123,genres:['Animation'],videos:[{season:1,episode:1}]}})};
  }}};
  const context=await titleContext(fallback,meta.imdb_id,'tv');
  assert.equal(context.tmdb_id,undefined,'Do not borrow TMDB correspondence without consistent IMDb evidence');
 }

});
