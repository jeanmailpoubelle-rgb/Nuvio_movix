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
test('five-to-eight alias candidates retain verified identity, ambiguity and bounded-search guards',async()=>{
 for(const [count,matches] of [[5,[4]],[8,[7]],[5,[0,4]],[5,[]],[9,[8]]]){
  const cards=Array.from({length:count},(_,i)=>({path:'/catalogue/alias-'+i+'/',title:'Other '+i}));
  const calls=[],p={search:async()=>({items:cards}),details:async path=>{
   calls.push(path);const index=cards.findIndex(c=>c.path===path);
   if(index<0)throw Object.assign(new Error('Missing'),{status:404});
   return {...detail(['https://www.themoviedb.org/tv/'+(matches.includes(index)?123:900+index)]),path,title:cards[index].title};
  }};
  if(matches.length===1&&count<=8)assert.equal((await sourceTitle(p,meta,'tv')).path,cards[matches[0]].path);
  else await assert.rejects(sourceTitle(p,meta,'tv'),{code:matches.length>1?'AMBIGUOUS_SOURCE_TITLE':'NO_EXACT_SOURCE_ALIAS'});
  assert.equal(calls.length,1+(count<=8?count:0),'One guessed path plus only a complete bounded candidate set');
 }
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
