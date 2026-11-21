const fs=require('node:fs');
const path=require('node:path');
const config=require('../../config/sources-en.json');
const fixtures=require('./input-metadata.cjs');
const mapping=require('../../src/sources-en/mapping');
const root=path.join(__dirname,'../..');
const signed='https://media.settlar.io/v1/object/fixture-capability?token=keep%2F&x=1+2';
function response(url,options={}) {
  const f=options.series||fixtures.fixtures[0],at=options.at||[2,72];
  if(url.startsWith(config.tmdbApi+'/'))return {id:Number(f.tmdbId),original_language:options.original||'ja',external_ids:{imdb_id:f.imdbId,tvdb_id:Number(f.tvdbId)}};
  if(url.startsWith('https://input.example/'))return {meta:{...fixtures.input(f),...(options.meta||{})}};
  if(url.startsWith(config.mappingBaseUrl+'/'))return JSON.parse(fs.readFileSync(root+'/plugins/sources-en/data/'+url.split(config.mappingBaseUrl+'/')[1]));
  const id=f.tvdbId,bucket=String(Number(id)%64).padStart(2,'0'),shard=JSON.parse(fs.readFileSync(root+'/plugins/sources-en/data/'+config.mappingRevision+'/tvdb_show/'+bucket+'.json'));
  const mapped=mapping.target(shard.rows['tvdb_show:'+id+':s'+at[0]],at[1]);
  if(url.startsWith(config.episodeApi)) {
    const v=f.episodes.find(v=>v.input[0]===at[0]&&v.input[1]===at[1]);
    return {mappings:{anilist_id:mapped.anilistId},episodes:{[mapped.episode]:{tvdbShowId:id,tvdbId:options.wrongEpisode?'99999999':v.tvdbEpisodeId,seasonNumber:at[0],episodeNumber:at[1],airDateUtc:v.released}}};
  }
  if(url.includes('/playback-bootstrap/'))return {core:{anilistId:options.wrongBootstrap?1:mapped.anilistId},episode:mapped.episode,settlarSelection:'private-grant',anipmPackages:{episodes:{[mapped.episode]:{sub:true,dub:!options.subOnly}}}};
  if(url.startsWith(config.baseUrl+'/api/anime/settlar/session?'))return {embedUrl:config.embedOrigin+'/embed/v1?t='+(url.includes('channel=dub')?'dub':'sub')};
  if(url.startsWith(config.embedOrigin+'/api/embed/session?')) {
    const dub=url.includes('t=dub');
    return {source:options.foreignMedia?'https://foreign.example/movie.m3u8':signed+(options.multi||options.sameUrl?'':'&mode='+(dub?'dub':'sub')),kind:'hls',audioLang:options.foreignAudio?'hi':dub?'en':'ja',
      subtitles:options.noSubs?[]:[{url:'https://media.settlar.io/sub.vtt?sig=keep%2F&x=1+2',srclang:options.spanishSubs?'es':'en',label:options.signsOnly?'English Signs/Songs':'English'},{url:'https://media.settlar.io/sub-fr.vtt',srclang:'fr',label:'Français'},{url:'https://media.settlar.io/sub-hi.vtt',srclang:'hi',label:'Hindi'}].filter(x=>!options.signsOnly||x.srclang!=='fr')};
  }
  if(url.startsWith('https://media.settlar.io/')) {
    if(options.deadPlaylist)return {__fixture_response:{status:403,body:''}};
    const dub=url.includes('mode=dub'),languages=options.multi?['ja','en','fr','es']:options.unknownAudio?['und']:options.foreignAudio?['hi']:[dub?'eng':options.original||'jpn'];
    return '#EXTM3U\n'+languages.map(l=>'#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="'+l+'",NAME="'+l+'",URI="'+l+'.m3u8"').join('\n')+'\n#EXT-X-STREAM-INF:BANDWIDTH=1000,AUDIO="a"'+(options.unknownQuality?'':',RESOLUTION=640x'+(options.height||360))+'\nvideo.m3u8';
  }
  throw Error('Unexpected public endpoint');
}
module.exports={response,signed,config,fixtures};
