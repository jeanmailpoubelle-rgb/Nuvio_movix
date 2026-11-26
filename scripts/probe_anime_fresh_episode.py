#!/usr/bin/env python3
"""Focused new-episode investigation. Only public facts/codes leave this process."""
import argparse
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tempfile
import urllib.parse
from quickjs_check import ROOT, check, helper_bundle
from probe_input_metadata import fetch_json, manifest_base, public_meta

ENTRY = '''async function getStreams(id,type,season,episode){
var conf=SCRAPER_SETTINGS,provider=AnimeSama.nativeProvider(conf);
await AnimeSama.resolveSelection(provider,id,type,season,episode,conf,TMDB_API_KEY);return [];}'''

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tmdb-id', default='321518')
    parser.add_argument('--imdb-id', default='tt43691408')
    parser.add_argument('--season', type=int, default=1)
    parser.add_argument('--episodes', default='7,8')
    parser.add_argument('--output', type=Path, default=ROOT/'reports/fresh-episode/probe.json')
    args=parser.parse_args()
    if not re.fullmatch(r'[1-9]\d*',args.tmdb_id) or not re.fullmatch(r'tt\d+',args.imdb_id) or args.season<1 or not re.fullmatch(r'[1-9]\d*(?:,[1-9]\d*){0,5}',args.episodes):
        parser.error('Public numeric series/episode identifiers required')
    episodes=[int(v) for v in args.episodes.split(',')]
    key=os.environ.get('NUVIO_TMDB_API_KEY','')
    manifests={a:os.environ.get(env,'') for a,env in [('aiometadata','NUVIO_AIOMETADATA_MANIFEST_URL'),('xperience','NUVIO_XPERIENCE_MANIFEST_URL')]}
    report={'scope':'Public episode metadata and literal Mobile Anime-Sama selection only; no host extraction/physical playback. Private metadata bodies/URLs/logs discarded.','tmdb_id':args.tmdb_id,'imdb_id':args.imdb_id,'season':args.season,'episodes':episodes,'metadata':[],'checks':[]}
    externals=set()
    def facts(label,url):
        try:
            data=fetch_json(url); meta=public_meta(data.get('meta'))
            meta['videos']=[v for v in meta['videos'] if v.get('season')==args.season and v.get('episode') in episodes]
            externals.update(v['tvdbEpisodeId'] for v in meta['videos'] if v.get('tvdbEpisodeId'))
            report['metadata'].append({'source':label,'facts':meta})
        except Exception as e:report['metadata'].append({'source':label,'error_type':type(e).__name__})
    for adapter,url in manifests.items():
        if not url:
            report['metadata'].append({'source':adapter,'error_type':'SecretMissing'});continue
        try:
            base,_=manifest_base(url)
            for query in [args.imdb_id,'tmdb:'+args.tmdb_id]:
                facts(adapter+'/'+query,urllib.parse.urlunsplit(base._replace(path=base.path+'/meta/series/'+query+'.json')))
        except Exception as e:report['metadata'].append({'source':adapter,'error_type':type(e).__name__})
    for name,base in [('reference','https://catalog.nuvio.tv'),('cinemeta','https://v3-cinemeta.strem.io')]:
        for query in ([args.imdb_id,'tmdb:'+args.tmdb_id] if name=='reference' else [args.imdb_id]):facts(name+'/'+query,base+'/meta/series/'+query+'.json')
    def tmdb(path):return fetch_json('https://api.themoviedb.org/3/'+path+('&' if '?' in path else '?')+'api_key='+urllib.parse.quote(key,safe=''))
    report['find']=[];report['official_episodes']=[]
    if key:
        for external in sorted(externals):
            try:
                data=tmdb('find/'+external+'?external_source=tvdb_id')
                report['find'].append({'tvdb_episode_id':external,'results':[{k:v.get(k) for k in ['id','show_id','season_number','episode_number','name','air_date']} for v in data.get('tv_episode_results',[])]})
            except Exception as e:report['find'].append({'tvdb_episode_id':external,'error_type':type(e).__name__})
        for ep in episodes:
            try:
                d=tmdb('tv/'+args.tmdb_id+'/season/'+str(args.season)+'/episode/'+str(ep)+'?append_to_response=external_ids,translations')
                row={k:d.get(k) for k in ['id','season_number','episode_number','name','air_date']}
                row['tvdb_episode_id']=d.get('external_ids',{}).get('tvdb_id')
                row['translations']=[{'language':t.get('iso_639_1'),'name':t.get('data',{}).get('name')} for t in d.get('translations',{}).get('translations',[]) if t.get('iso_639_1') in ['en','fr','ja']]
                report['official_episodes'].append(row)
            except Exception as e:report['official_episodes'].append({'episode':ep,'error_type':type(e).__name__})
    production=ROOT/'plugins/anime-sama-plus/providers/anime-sama.js'
    report['production_sha256']=hashlib.sha256(production.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory() as directory:
        bundle=Path(directory)/'anime-sama.js';bundle.write_text(helper_bundle(production,ENTRY))
        for adapter,provider in [('aiometadata','auto'),('xperience','auto'),('xperience','tvdb'),('native','auto')]:
            if adapter!='native' and (not manifests[adapter] or not key):continue
            settings={'episodeMetadataSource':'native' if adapter=='native' else 'aiometadata','inputMetadataAdapter':'aiometadata' if adapter=='native' else adapter,'inputMetadataProvider':provider,'aiometadataSavedManifestUrl':manifests['aiometadata'],'xperienceManifestUrl':manifests['xperience'],'diagnostics':True}
            for ep in episodes:
                row={'adapter':adapter,'provider':provider,'input':[args.season,ep]};logs=io.StringIO()
                try:
                    with contextlib.redirect_stdout(io.StringIO()):
                        _,s=check(bundle,[args.tmdb_id,'tv',args.season,ep],live=True,allow_empty=True,runtime='mobile',scraper_id='repo:anime-sama',provider_settings=settings,metadata_key=key,log_sink=logs)
                    row.update(requests=s['requests'],seconds=s['seconds'],codes=sorted(set(re.findall(r'\bINPUT_METADATA_[A-Z0-9_]+\b',logs.getvalue()))))
                    row['selection']=[{'stage':e['stage'],'data':{k:v for k,v in e['data'].items() if k in ['from','to','basis','refs','reason','code']}} for e in s['resolver_events'] if e['stage'] in ['anime-input-mapping','anime-episode','anime-metadata-error']]
                except Exception as e:row['error_type']=type(e).__name__
                report['checks'].append(row)
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n')
    for row in report['checks']:print(row['adapter'],row['provider'],row['input'],'codes',','.join(row.get('codes',[])) or 'none')
    return 0
if __name__=='__main__':raise SystemExit(main())
