#!/usr/bin/env python3
"""Actual generated selection: current metadata and labelled historical empty-find simulation."""
import contextlib,io,json,os,re,tempfile,urllib.request,urllib.parse
from pathlib import Path
from unittest.mock import patch
from quickjs_check import ROOT,check,helper_bundle
ENTRY='''async function getStreams(id,type,season,episode){var conf=SCRAPER_SETTINGS,provider=AnimeSama.nativeProvider(conf);await AnimeSama.resolveSelection(provider,id,type,season,episode,conf,TMDB_API_KEY);return [];}'''
class Response(io.BytesIO):
    def __init__(self,data,url):
        super().__init__(json.dumps(data).encode());self.url=url;self.status=200;self.reason='OK';self.headers={'content-type':'application/json'}
    def getcode(self):return self.status

def main():
    out=[];key=os.environ.get('NUVIO_TMDB_API_KEY','');real=urllib.request.urlopen
    production=ROOT/'plugins/anime-sama-plus/providers/anime-sama.js'
    cases=[('witch-now','321518',1,8,False),('witch-historical-gap','321518',1,8,True),('hunter-start','46298',2,1,False),('hunter-72','46298',2,72,False),('haikyuu-15','60863',2,15,False),('apothecary-3-4','220542',3,4,False),('conan-34','30983',34,1,False)]
    def historical(req,*args,**kwargs):
        url=req.full_url if hasattr(req,'full_url') else str(req);p=urllib.parse.urlsplit(url)
        if p.hostname=='api.themoviedb.org' and p.path=='/3/find/12023449':return Response({'tv_episode_results':[]},url)
        if p.hostname=='v3-cinemeta.strem.io' and p.path=='/meta/series/tt43691408.json':
            with real(req,*args,**kwargs) as response:data=json.load(response)
            for v in data.get('meta',{}).get('videos',[]):
                if v.get('season')==1 and v.get('episode')==8:v['name']='Episode 8';v['title']='Episode 8'
            return Response(data,url)
        return real(req,*args,**kwargs)
    with tempfile.TemporaryDirectory() as directory:
        bundle=Path(directory)/'anime-sama.js';bundle.write_text(helper_bundle(production,ENTRY))
        for adapter,env in [('aiometadata','NUVIO_AIOMETADATA_MANIFEST_URL'),('xperience','NUVIO_XPERIENCE_MANIFEST_URL')]:
            conf={'episodeMetadataSource':'aiometadata','inputMetadataAdapter':adapter,'inputMetadataProvider':'auto','aiometadataSavedManifestUrl':os.environ.get('NUVIO_AIOMETADATA_MANIFEST_URL',''),'xperienceManifestUrl':os.environ.get('NUVIO_XPERIENCE_MANIFEST_URL',''),'diagnostics':True}
            for name,tm,s,e,simulate in cases:
                for runtime in (['mobile','tv'] if tm=='321518' else ['mobile']):
                    row={'case':name,'adapter':adapter,'runtime':runtime,'input':[s,e],'historical_simulation':simulate};logs=io.StringIO()
                    try:
                        with patch('urllib.request.urlopen',historical if simulate else real),contextlib.redirect_stdout(io.StringIO()):
                            _,summary=check(bundle,[tm,'tv',s,e],live=True,allow_empty=True,runtime=runtime,scraper_id='repo:anime-sama',provider_settings=conf,metadata_key=key,log_sink=logs)
                        events=summary['resolver_events'];mapping=[x['data'] for x in events if x['stage']=='anime-input-mapping'];refs=[r for x in events if x['stage']=='anime-episode' for r in x['data']['refs']]
                        row.update(mapping=mapping,refs=refs,requests=summary['requests'],seconds=summary['seconds'],codes=sorted(set(re.findall(r'\bINPUT_METADATA_[A-Z0-9_]+\b',logs.getvalue()))))
                        row['ok']=bool(mapping and refs) and (not simulate or mapping[0]['basis'].startswith('anibridge/'))
                    except Exception as error:row.update(ok=False,error_type=type(error).__name__)
                    out.append(row);print(adapter,name,runtime,'pass' if row.get('ok') else 'attention')
    report={'scope':'Actual current generated selection on literal wrappers; no host extraction/physical playback. Historical case alters only in-memory public find/canonical title responses; private metadata remains live.','results':out,'ok':all(r.get('ok') for r in out)}
    dest=ROOT/'reports/anime-bridge-live/report.json';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(report,indent=2)+'\n');return int(not report['ok'])
if __name__=='__main__':raise SystemExit(main())
