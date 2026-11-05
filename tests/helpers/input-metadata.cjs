const fixtures=require('../fixtures/input-metadata/series.json');
const settings={episodeMetadataSource:'aiometadata',aiometadataManifestUrl:'https://input.example/stremio/private-fixture/manifest.json?viewer=fixture-viewer'};
function reference(f=fixtures[0]) {
  return {id:f.imdbId,type:'series',name:f.title,genres:['Animation'],released:f.year+'-01-01',videos:f.layout.flatMap(([first,last],s)=>Array.from({length:last-first+1},(_,i)=>{
    const episode=first+i,season=s+1,record=f.episodes.find(v=>v.target[0]===season&&v.target[1]===episode);
    return {id:`${f.imdbId}:${season}:${episode}`,season,episode,title:record?.targetTitle||'Fixture episode '+episode,released:record?.targetReleased||'2010-01-01T00:00:00Z'};
  }))};
}
function input(f=fixtures[0]) {
  return {id:f.imdbId,type:'series',_imdbId:f.imdbId,_tmdbId:f.tmdbId,_tvdbId:f.tvdbId,_metaProvider:'tvdb',name:f.title,
    videos:f.episodes.map(v=>({id:v.streamId,season:v.input[0],episode:v.input[1],title:v.title,released:v.released,
      thumbnail:`https://artworks.thetvdb.com/banners/v4/episode/${v.tvdbEpisodeId}/screencap/fixture.jpg`}))};
}
function cinemeta(f=fixtures[0]) { return {id:f.imdbId,type:'series',moviedb_id:Number(f.tmdbId),tvdb_id:Number(f.tvdbId),videos:f.episodes.map(v=>({...v.cinemeta}))}; }
function find(f,id) {const row=f.episodes.find(v=>v.tvdbEpisodeId===id);return {tv_episode_results:row?[{...row.find}]:[]};}
module.exports={fixtures,settings,reference,input,cinemeta,find};
