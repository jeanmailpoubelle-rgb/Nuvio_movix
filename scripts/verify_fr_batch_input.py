#!/usr/bin/env python3
"""Sanitized installed FR controls for generic titles and batch release dates."""
import hashlib
import argparse
import io
import json
import os
from pathlib import Path
import re
import tempfile
from quickjs_check import ROOT,check,helper_bundle

ENTRY="""function getStreams(id,type,season,episode){return run(id,type,season,episode,async function(ctx){await inputEpisodeCoordinates(ctx,'primary','nuvio-catalog');var official=await inputEpisodeDetails(ctx,ctx.season,ctx.episode);event('batch-input-external-proof',{tvdbEpisodeIdPresent:/^[1-9]\\d*$/.test(String(official.external_ids&&official.external_ids.tvdb_id||''))});await inputEpisodeCoordinates(ctx,'backup','cinemeta');return [];});}"""

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--case',choices=['remarried-empress','the-body'],default='remarried-empress')
    parser.add_argument('--output',type=Path,default=ROOT/'reports/fr-batch-input/report.json')
    args=parser.parse_args()
    identifier,episodes=('291507',[1,2]) if args.case=='the-body' else ('279246',[1,4,5])
    key=os.environ.get('NUVIO_TMDB_API_KEY')
    manifests={a:os.environ.get(k) for a,k in [('aiometadata','NUVIO_AIOMETADATA_MANIFEST_URL'),('xperience','NUVIO_XPERIENCE_MANIFEST_URL')]}
    if not key or not all(manifests.values()):raise SystemExit('Saved metadata/TMDB runtime secrets required')
    rows=[]
    for adapter,manifest in manifests.items():
        settings=dict(episodeMetadataSource='aiometadata',inputMetadataAdapter=adapter,inputMetadataProvider='auto',aiometadataManifestUrl=manifest,diagnostics=True)
        for runtime in ['mobile','tv']:
            for episode in episodes:
                production=ROOT/'plugins/sources-fr-plus/providers/movix.js'
                row=dict(adapter=adapter,runtime=runtime,kind='mapping',episode=episode,production_sha256=hashlib.sha256(production.read_bytes()).hexdigest())
                with tempfile.TemporaryDirectory() as directory:
                    bundle=Path(directory)/'movix.js';bundle.write_text(helper_bundle(production,ENTRY))
                    row.update(execute(bundle,episode,runtime,settings,key,True,identifier))
                rows.append(row)
        for entry in ['movix','vodix','movix-catalogues']:
            bundle=ROOT/f'plugins/sources-fr-plus/providers/{entry}.js'
            row=dict(adapter=adapter,runtime='mobile',kind=entry,episode=1,production_sha256=hashlib.sha256(bundle.read_bytes()).hexdigest())
            row.update(execute(bundle,1,'mobile',settings,key,False,identifier))
            rows.append(row)
    for entry in ['movix','vodix','movix-catalogues']:
        bundle=ROOT/f'providers/{entry}.js'
        row=dict(adapter='native',runtime='mobile',kind=entry,episode=1,production_sha256=hashlib.sha256(bundle.read_bytes()).hexdigest())
        row.update(execute(bundle,1,'mobile',{'episodeMetadataSource':'native','diagnostics':True},key,False,identifier))
        rows.append(row)
    report=dict(mapping_ok=all(r['ok'] for r in rows if r['kind']=='mapping'),
        primary_mapping_ok=all(r.get('targets',{}).get('nuvio-catalog') for r in rows if r['kind']=='mapping'),
        cinemeta_mapping_ok=all(r.get('targets',{}).get('cinemeta') for r in rows if r['kind']=='mapping'),
        vodix_discovery_ok=all(r['ok'] for r in rows if r['kind']=='vodix'),coflix_discovery_ok=all(r['ok'] for r in rows if r['kind']=='movix-catalogues'),case=args.case,tmdb_id=identifier,scope='Generic batch-drop episode proof and installed discovery; no physical playback claim',ok=all(r['ok'] for r in rows),results=rows)
    p=args.output;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(report,indent=2)+'\n')
    for row in rows:print(json.dumps(row),flush=True)
    return int(not report['ok'])

def execute(bundle,episode,runtime,settings,key,mapping_only,identifier='279246'):
    log=io.StringIO()
    try:
        streams,summary=check(bundle,(identifier,'tv',1,episode),live=True,allow_empty=True,runtime=runtime,metadata_key=key,provider_settings=settings,log_sink=log)
        proofs=[e['data'] for e in summary['resolver_events'] if e['stage'] in ['episode-mapping','vodix-input-verified','coflix-input-verified']]
        media=[s for s in streams if not s.get('warning')]
        targets={target:any(p.get('to')=={'season':1,'episode':episode} and p.get('targetCatalog')==target for p in proofs) for target in ['nuvio-catalog','cinemeta']}
        external=[e['data'] for e in summary['resolver_events'] if e['stage']=='batch-input-external-proof']
        return dict(ok=all(targets.values()) if mapping_only else bool(media),targets=targets,official_external_proof=external,
            sources=len(media),proofs=proofs,requests=summary['requests'],seconds=summary['seconds'],codes=sorted(set(re.findall(r'\bINPUT_METADATA_[A-Z_]+\b',log.getvalue()))))
    except Exception as e:
        return dict(ok=False,error_type=type(e).__name__)

if __name__=='__main__':raise SystemExit(main())
