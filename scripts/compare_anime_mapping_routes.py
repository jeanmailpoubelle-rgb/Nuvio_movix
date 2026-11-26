#!/usr/bin/env python3
"""Research actual Input/EN mappings with private catalogues; output public facts only."""
import concurrent.futures
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.parse
import urllib.request
from probe_input_metadata import manifest_base

ROOT=Path(__file__).resolve().parents[1]
SOURCE='https://github.com/anibridge/anibridge-mappings/releases/download/v3/mappings.min.json'

def main():
    cache={};http=[]
    def get(url,stage):
        if url in cache:return cache[url]
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req,timeout=25) as r:
                raw=r.read(20*1024*1024+1)
                if len(raw)>20*1024*1024:raise ValueError('size')
                data=json.loads(raw)
            cache[url]=data;return data
        except Exception as e:
            http.append({'stage':stage,'error_type':type(e).__name__,'status':getattr(e,'code',None)})
            raise RuntimeError('STUDY_UPSTREAM_UNAVAILABLE') from None
    cfg=json.loads((ROOT/'config/anime-mapping-study.json').read_text())
    bridge=get(SOURCE,'anibridge')
    pointer=json.loads((ROOT/'plugins/sources-en/data/current.json').read_text());revision=pointer['revision']
    report={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Research only. Actual current pure Input/EN mapping modules against live public/private metadata. No runtime policy changes, host extraction or physical playback. Alternative routes are candidates, not approved playback decisions.','bridge_meta':bridge['$meta'],'published_revision':revision,'published_source_sha256':pointer['source_sha256'],'source_files':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['src/input-metadata.js','src/sources-en/mapping.js','src/sources-en/input-proof.js','plugins/anime-sama-plus/providers/anime-sama.js']},'results':[],'http_errors':http}
    key=os.environ.get('NUVIO_TMDB_API_KEY','')
    def api(path):return get('https://api.themoviedb.org/3/'+path+('&' if '?' in path else '?')+'api_key='+urllib.parse.quote(key,safe=''),'tmdb')
    for case in cfg['series']:
        name,tmdb,imdb=case['name'],case['tmdbId'],case['imdbId']
        try:
            official=api('tv/'+tmdb+'?append_to_response=external_ids')
            ids={'tmdbId':tmdb,'imdbId':official.get('external_ids',{}).get('imdb_id'),'tvdbId':str(official.get('external_ids',{}).get('tvdb_id') or '')}
            if ids['imdbId']!=imdb or ids['tvdbId']!=case['tvdbId']:raise RuntimeError('STUDY_SERIES_IDENTITY_CONFLICT')
            ref=get('https://catalog.nuvio.tv/meta/series/tmdb:'+tmdb+'.json','reference')['meta']
            canonical=get('https://v3-cinemeta.strem.io/meta/series/'+imdb+'.json','cinemeta')['meta']
            descriptors=[k for k in bridge if k.startswith('tvdb_show:'+ids['tvdbId']+':')]
            al={k for d in descriptors for k in bridge[d] if k.startswith('anilist:')}
            relevant={k:bridge[k] for k in descriptors+list(al) if k in bridge}
            bucket=f'{int(ids["tvdbId"])%64:02d}'
            shard=json.loads((ROOT/'plugins/sources-en/data'/revision/'tvdb_show'/(bucket+'.json')).read_text())['rows']
        except Exception as e:
            report['results'].append({'series':name,'code':str(e) if str(e).startswith('STUDY_') else type(e).__name__});continue
        for adapter,env in [('aiometadata','NUVIO_AIOMETADATA_MANIFEST_URL'),('xperience','NUVIO_XPERIENCE_MANIFEST_URL')]:
            secret=os.environ.get(env,'')
            if not secret:
                report['results'].append({'series':name,'adapter':adapter,'code':'STUDY_SECRET_MISSING'});continue
            try:
                base,_=manifest_base(secret);origin=base.scheme+'://'+base.netloc
                meta=get(urllib.parse.urlunsplit(base._replace(path=base.path+'/meta/series/'+imdb+'.json')),'selected-metadata')['meta']
            except Exception as e:
                report['results'].append({'series':name,'adapter':adapter,'code':type(e).__name__});continue
            for season,episode in case['episodes']:
                j={'meta':meta,'ids':ids,'adapter':adapter,'origin':origin,'season':season,'episode':episode,'reference':ref,'canonical':canonical,'bridge':relevant,'publishedRules':shard}
                proc=subprocess.Popen(['node','scripts/anime_mapping_route_worker.cjs'],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,encoding='utf-8')
                proc.stdin.write(json.dumps(j,ensure_ascii=False)+'\n');proc.stdin.flush()
                row=None
                for line in proc.stdout:
                    msg=json.loads(line)
                    if 'result' in msg:row=msg['result'];break
                    try:
                        kind,args=msg['query'],msg['args']
                        if kind=='findTvdb':data=api('find/'+args[0]+'?external_source=tvdb_id')
                        elif kind=='episodeDetails':data=api('tv/'+tmdb+'/season/'+str(args[0])+'/episode/'+str(args[1])+'?append_to_response=translations')
                        elif kind=='referenceByImdb':data=get('https://catalog.nuvio.tv/meta/series/'+imdb+'.json','reference-imdb')['meta']
                        elif kind=='anizip':data=get('https://api.ani.zip/mappings?anilist_id='+str(args[0]),'ani.zip')
                        else:raise ValueError('unknown-query')
                        answer={'ok':True,'data':data}
                    except Exception:answer={'ok':False}
                    proc.stdin.write(json.dumps(answer,ensure_ascii=False)+'\n');proc.stdin.flush()
                proc.stdin.close();proc.wait(timeout=5)
                row={'series':name,'adapter':adapter,'tmdbId':tmdb,'input':{'season':season,'episode':episode},**(row or {'code':'STUDY_WORKER_FAILED'})}
                report['results'].append(row)
        print(name,'complete',flush=True)
    report['metadata_network_reads']=len(cache)
    dest=ROOT/'reports/mapping-routes/report.json';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print('Public mapping comparison written; no private URLs/raw metadata persisted.')
if __name__=='__main__':main()
