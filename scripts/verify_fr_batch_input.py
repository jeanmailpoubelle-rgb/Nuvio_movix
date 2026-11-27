#!/usr/bin/env python3
"""Sanitized installed FR controls for generic titles and batch release dates."""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tempfile
from quickjs_check import ROOT,check,helper_bundle

ENTRY="""function getStreams(id,type,season,episode){return run(id,type,season,episode,async function(ctx){await inputEpisodeCoordinates(ctx,'primary','nuvio-catalog');return [];});}"""

def main():
    key=os.environ.get('NUVIO_TMDB_API_KEY')
    manifests={a:os.environ.get(k) for a,k in [('aiometadata','NUVIO_AIOMETADATA_MANIFEST_URL'),('xperience','NUVIO_XPERIENCE_MANIFEST_URL')]}
    if not key or not all(manifests.values()):raise SystemExit('Saved metadata/TMDB runtime secrets required')
    rows=[]
    for adapter,manifest in manifests.items():
        settings=dict(episodeMetadataSource='aiometadata',inputMetadataAdapter=adapter,inputMetadataProvider='auto',aiometadataManifestUrl=manifest,diagnostics=True)
        for runtime in ['mobile','tv']:
            for episode in [1,4,5]:
                production=ROOT/'plugins/sources-fr-plus/providers/movix.js'
                row=dict(adapter=adapter,runtime=runtime,kind='mapping',episode=episode,production_sha256=hashlib.sha256(production.read_bytes()).hexdigest())
                with tempfile.TemporaryDirectory() as directory:
                    bundle=Path(directory)/'movix.js';bundle.write_text(helper_bundle(production,ENTRY))
                    row.update(execute(bundle,episode,runtime,settings,key,True))
                rows.append(row)
        for entry in ['movix','vodix']:
            bundle=ROOT/f'plugins/sources-fr-plus/providers/{entry}.js'
            row=dict(adapter=adapter,runtime='mobile',kind=entry,episode=1,production_sha256=hashlib.sha256(bundle.read_bytes()).hexdigest())
            row.update(execute(bundle,1,'mobile',settings,key,False))
            rows.append(row)
    for entry in ['movix','vodix']:
        bundle=ROOT/f'providers/{entry}.js'
        row=dict(adapter='native',runtime='mobile',kind=entry,episode=1,production_sha256=hashlib.sha256(bundle.read_bytes()).hexdigest())
        row.update(execute(bundle,1,'mobile',{'episodeMetadataSource':'native','diagnostics':True},key,False))
        rows.append(row)
    report=dict(scope='TMDB279246 generic batch-drop episode proof and installed discovery; no physical playback claim',ok=all(r['ok'] for r in rows),results=rows)
    p=ROOT/'reports/fr-batch-input/report.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(report,indent=2)+'\n')
    for row in rows:print(json.dumps(row),flush=True)
    return int(not report['ok'])

def execute(bundle,episode,runtime,settings,key,mapping_only):
    log=io.StringIO()
    try:
        streams,summary=check(bundle,('279246','tv',1,episode),live=True,allow_empty=True,runtime=runtime,metadata_key=key,provider_settings=settings,log_sink=log)
        proofs=[e['data'] for e in summary['resolver_events'] if e['stage'] in ['episode-mapping','vodix-input-verified']]
        media=[s for s in streams if not s.get('warning')]
        verified=any(p.get('to')=={'season':1,'episode':episode} for p in proofs)
        return dict(ok=verified if mapping_only else bool(media),sources=len(media),proofs=proofs,requests=summary['requests'],seconds=summary['seconds'],codes=sorted(set(re.findall(r'\bINPUT_METADATA_[A-Z_]+\b',log.getvalue()))))
    except Exception as e:
        return dict(ok=False,error_type=type(e).__name__)

if __name__=='__main__':raise SystemExit(main())
