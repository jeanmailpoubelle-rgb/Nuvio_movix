#!/usr/bin/env python3
"""Hunter S1E1 through installed entries with saved slots and untouched defaults."""
import argparse
import contextlib
import hashlib
import io
import json
import os
import re
import urllib.request
from unittest.mock import patch
from quickjs_check import ROOT, check
from probe_xperience import base_url


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tmdb-id',default='46298')
    parser.add_argument('--season',type=int,default=1)
    parser.add_argument('--episode',type=int,default=1)
    parser.add_argument('--anilist-id',type=int,default=11061)
    parser.add_argument('--native-control',action='store_true')
    parser.add_argument('--output',type=lambda v:ROOT/v,default=ROOT/'reports/xperience/defaults.json')
    args=parser.parse_args()
    if not re.fullmatch(r'[1-9]\d*',args.tmdb_id) or min(args.season,args.episode,args.anilist_id)<1:parser.error('Positive public identifiers/coordinates required')
    active=os.environ.get('NUVIO_XPERIENCE_MANIFEST_URL','')
    inactive=os.environ.get('NUVIO_AIOMETADATA_MANIFEST_URL','')
    key=os.environ.get('NUVIO_TMDB_API_KEY','')
    settings=dict(episodeMetadataSource='aiometadata',inputMetadataAdapter='xperience',xperienceManifestUrl=active,
                  aiometadataSavedManifestUrl=inactive,diagnostics=True)
    # Deliberately omit order, query namespace and legacy URL. The harness
    # otherwise injects native mode into nonempty settings, so enable configured
    # metadata explicitly; do not mistake a native control for an Xperience test.
    cases=[('fr','providers/movix.js','movix-tv'),('anime','plugins/anime-sama/providers/anime-sama.js','anime-sama'),
           ('en-standard','plugins/sources-en/providers/sources-en.js','sources-en-anipm'),
           ('en-beta','plugins/sources-en/providers/sources-en.js','sources-en-anipm-beta')]
    if args.native_control:
        settings['episodeMetadataSource']='native'
        cases=[c for c in cases if c[0] in ['fr','anime']]
    result=[]
    try:
        a,_=base_url(active);active_base=a._replace(query='').geturl()+'/'
    except Exception:
        active_base=''
    try:
        i,_=base_url(inactive);inactive_base=i._replace(query='').geturl()+'/'
    except Exception:
        inactive_base=''
    for name,path,entry in cases:
        row=dict(case=name,tmdb_id=args.tmdb_id,input=[args.season,args.episode],entry_id=entry,native_control=args.native_control)
        if not active or not key or not active_base:
            row.update(status='blocked',code='RUNTIME_SECRET_MISSING');result.append(row);continue
        reads=dict(active=0,inactive=0)
        real=urllib.request.urlopen
        def observed(req,*args,**kwargs):
            url=req.full_url if hasattr(req,'full_url') else str(req)
            if url.startswith(active_base):reads['active']+=1
            if inactive_base and inactive_base!=active_base and url.startswith(inactive_base):reads['inactive']+=1
            return real(req,*args,**kwargs)
        logs=io.StringIO()
        try:
            with patch('urllib.request.urlopen',observed),contextlib.redirect_stdout(io.StringIO()):
                streams,summary=check(ROOT/path,[args.tmdb_id,'tv',args.season,args.episode],live=True,allow_empty=True,runtime='mobile',
                    scraper_id='repo:'+entry,metadata_key=key,provider_settings=settings,log_sink=logs)
            media=[s for s in streams if not s.get('warning')]
            mapping=[e['data'] for e in summary['resolver_events'] if e['stage'] in ['episode-mapping','anime-input-mapping']]
            en=[]
            for line in logs.getvalue().splitlines():
                m=re.search(r'\[sources-en\] (\{.*\})$',line)
                if m:
                    d=json.loads(m[1])
                    if d.get('code')=='EN_MAPPED':en.append(d)
            verified=(any(d.get('to')=={'season':args.season,'episode':args.episode} for d in mapping) if name in ['fr','anime'] else any(d.get('anilistId')==args.anilist_id and d.get('episode')==args.episode for d in en))
            passed=bool(media) and reads['inactive']==0 and (reads['active']==0 if args.native_control else verified and reads['active']>0)
            row.update(status='pass' if passed else 'attention',
                sources=len(media),mapping_ok=None if args.native_control else verified,manifest_reads=reads,requests=summary['requests'],
                codes=sorted(set(re.findall(r'\b(?:EN|INPUT_METADATA)_[A-Z0-9_]+\b',logs.getvalue()))),
                bundle_sha256=hashlib.sha256((ROOT/path).read_bytes()).hexdigest())
        except Exception as e:
            row.update(status='attention',error_type=type(e).__name__,manifest_reads=reads)
        result.append(row)
    report=dict(scope='Actual installed Mobile entrypoints, saved manifests, untouched selectors, live discovery only; no physical playback claim.',results=result)
    path=args.output;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,indent=2)+'\n')
    for r in result:print(r['case'],r['status'],'sources',r.get('sources',0))
    return int(any(r['status']!='pass' for r in result))

if __name__=='__main__':raise SystemExit(main())
