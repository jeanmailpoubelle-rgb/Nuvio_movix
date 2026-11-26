#!/usr/bin/env python3
"""Research only: feed explicit range candidates into unchanged source-slot logic."""
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tempfile
from quickjs_check import ROOT,check,helper_bundle

# The only replaced production decision is input-to-reference correspondence.
# Each candidate must exist uniquely in the real reference. TargetContext and
# all Anime-Sama title/group/range/edition/slot code execute unchanged.
BEFORE="const mapped=type==='tv'?await Catalog.inputEpisodeContext(provider,id,season,episode,key,metadata,settings):null;"
AFTER='''const researchResponse=await provider.http.request(`${defaults.metadata.nuvioCatalog}/meta/series/tmdb:${id}.json`,{category:'mapping'});
const researchReference=JSON.parse(researchResponse.body).meta;
const researchIds=InputMetadata.identity(researchReference,{imdbId:metadata.imdb_id,tmdbId:String(id)});
const researchRows=researchReference.videos.filter(v=>Number(v.season)===season&&Number(v.episode)===episode);
if(researchRows.length!==1)throw InputMetadata.fail('INPUT_METADATA_TARGET_EPISODE_UNAVAILABLE');
const mapped={season,episode,ids:researchIds,basis:'research-candidate-only',context:InputMetadata.targetContext(researchReference,researchRows[0])};'''
ENTRY='''async function getStreams(id,type,season,episode){
var conf=SCRAPER_SETTINGS,provider=AnimeSama.nativeProvider(conf);
try {await AnimeSama.resolveSelection(provider,id,type,season,episode,conf,TMDB_API_KEY);}
catch(error){event('study-error',{code:error.code||'STUDY_SELECTION_FAILED'});}return [];}'''
SELECTED={('witch',1,8),('hunter',2,1),('hunter',2,4),('hunter',2,5),('hunter',2,62),('hunter',2,63),('hunter',2,72),('haikyuu',2,15),('haikyuu',4,13),('haikyuu',4,14),('apothecary',2,1),('apothecary',3,4),('aot',3,13),('aot',4,16),('aot',4,17),('aot',4,29),('ippo',2,1),('ippo',3,1),('vinland',1,1),('jujutsu',2,1),('conan',20,1),('conan',34,1)}

def main():
    study=ROOT/'reports/mapping-routes/report.json'
    if study.exists():
        facts=json.loads(study.read_text())['results']
        rows=[{'series':r['series'],'tmdbId':r['tmdbId'],'input':[r['input']['season'],r['input']['episode']],
               'direct':[(c['descriptor'],c['episode']) for c in r.get('direct',{}).get('candidates',[])],
               'via':[(c['descriptor'],c['episode']) for c in r.get('via_anilist',{}).get('candidates',[])]}
              for r in facts if r.get('adapter')=='xperience' and r.get('input')]
    else:rows=json.loads((ROOT/'reports/mapping-routes/public-candidates.json').read_text())
    production=ROOT/'plugins/anime-sama-plus/providers/anime-sama.js';raw=production.read_text();assert raw.count(BEFORE)==1
    result=[]
    with tempfile.TemporaryDirectory() as directory:
        p=Path(directory)/'anime-sama.js';p.write_text(raw.replace(BEFORE,AFTER));p.write_text(helper_bundle(p,ENTRY))
        for row in rows:
            if (row['series'],*row['input']) not in SELECTED:continue
            candidates=set(tuple(c) for c in row['direct']+row['via'])
            for descriptor,episode in sorted(candidates):
                m=re.fullmatch(r'tmdb_show:(\d+):s(\d+)',descriptor)
                out={'series':row['series'],'input':row['input'],'candidate':descriptor,'episode':episode}
                if not m or m[1]!=row['tmdbId']:out['code']='STUDY_FOREIGN_TARGET';result.append(out);continue
                if int(m[2])==0:out['code']='PRODUCTION_SEASON_ZERO_UNSUPPORTED';result.append(out);continue
                # Both wrappers for representative continuous, split and new-release paths.
                runtimes=['mobile','tv'] if (row['series'],*row['input']) in {('witch',1,8),('hunter',2,5),('haikyuu',4,14),('apothecary',3,4),('conan',34,1)} else ['mobile']
                for runtime in runtimes:
                    r={**out,'runtime':runtime};logs=io.StringIO()
                    try:
                        with contextlib.redirect_stdout(io.StringIO()):
                            _,s=check(p,[row['tmdbId'],'tv',int(m[2]),episode],live=True,allow_empty=True,runtime=runtime,scraper_id='repo:anime-sama',provider_settings={'episodeMetadataSource':'native','diagnostics':True},metadata_key=os.environ.get('NUVIO_TMDB_API_KEY',''),log_sink=logs)
                        events=[]
                        for line in logs.getvalue().splitlines():
                            match=re.search(r'\{\"stage\":\"study-error\",\"data\":\{\"code\":\"([A-Z0-9_]+)\"\}\}',line)
                            if match:events.append(match[1])
                        r.update(requests=s['requests'],seconds=s['seconds'],refs=[ref for e in s['resolver_events'] if e['stage']=='anime-episode' for ref in e['data']['refs']],codes=events)
                        if not r['refs'] and not events:r['codes']=['STUDY_NO_SELECTION_EVIDENCE']
                    except Exception as e:r['error_type']=type(e).__name__
                    result.append(r);print(row['series'],row['input'],descriptor,episode,runtime,'refs',len(r.get('refs',[])),'codes',r.get('codes',[]),flush=True)
    report={'scope':'Research candidate injection replaces input correspondence only. Real reference identity/unique target row and unchanged strict TargetContext/Anime-Sama source matching/group/slot logic. No source URLs, host extraction or physical playback. Multiple candidate success is not identity approval.','production_sha256':hashlib.sha256(production.read_bytes()).hexdigest(),'tmdb_key_available':bool(os.environ.get('NUVIO_TMDB_API_KEY')),'results':result}
    dest=ROOT/'reports/mapping-routes/source-slots.json';dest.write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__':main()
