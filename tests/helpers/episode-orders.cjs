const fixture=require('../fixtures/episode-orders/hunter.json');
function metadata(catalog) {
  const ranges=catalog?fixture.catalogSeasons:fixture.cinemetaSeasons;
  let absolute=0;
  const videos=ranges.flatMap(([first,last],s)=>Array.from({length:last-first+1},(_,i)=>{
    const season=s+1,episode=first+i;absolute++;
    const sample=fixture.cases.concat(fixture.unmatched).find(c=>(catalog?c.target:c.input)[0]===season&&(catalog?c.target:c.input)[1]===episode);
    return {season,episode,name:sample?(catalog?sample.catalogName:sample.name):'Fixture episode '+absolute,
      released:sample?(catalog?sample.catalogReleased:sample.inputReleased):new Date(Date.UTC(2010,0,absolute)).toISOString()};
  }));
  return {id:fixture.imdbId,moviedb_id:Number(fixture.tmdbId),name:fixture.name,genres:['Animation'],released:'2011-01-01',videos};
}
module.exports={fixture,metadata};
