#!/usr/bin/env python3
"""Check actual Vodix input eligibility using private manifests; no media grants."""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tempfile
from quickjs_check import ROOT, check, helper_bundle

# Execute the production coordinate checker without inventing playable streams.
ENTRY = 'function getStreams(id,type,season,episode){return run(id,type,season,episode,function(ctx){return vodixCoordinates(ctx).then(function(){return [];});});}'
CASES = [('got-1-1','1399',1,1,True),('got-2-3','1399',2,3,True),('hunter-tvdb-2-72','46298',2,72,False)]

def main():
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'reports/vodix-input/report.json')
    args=parser.parse_args()
    key=os.environ.get('NUVIO_TMDB_API_KEY')
    manifests={adapter:os.environ.get(env) for adapter,env in [('aiometadata','NUVIO_AIOMETADATA_MANIFEST_URL'),('xperience','NUVIO_XPERIENCE_MANIFEST_URL')]}
    if not key or not all(manifests.values()):parser.error('Saved metadata manifests and TMDB runtime secret are required')
    production=ROOT/'plugins/sources-fr-plus/providers/vodix.js'
    rows=[]
    with tempfile.TemporaryDirectory() as directory:
        bundle=Path(directory)/'vodix.js';bundle.write_text(helper_bundle(production,ENTRY))
        executed_sha256=hashlib.sha256(bundle.read_bytes()).hexdigest()
        for adapter,manifest in manifests.items():
            settings=dict(episodeMetadataSource='aiometadata',aiometadataManifestUrl=manifest,inputMetadataAdapter=adapter,inputMetadataProvider='auto')
            for name,identifier,season,episode,expected in CASES:
                for runtime in ['tv','mobile']:
                    row=dict(case=name,adapter=adapter,runtime=runtime,expected_verified=expected)
                    log=io.StringIO()
                    try:
                        _,summary=check(bundle,(identifier,'tv',season,episode),live=True,allow_empty=True,runtime=runtime,
                            metadata_key=key,provider_settings=settings,log_sink=log)
                        verified=[e['data'] for e in summary['resolver_events'] if e['stage']=='vodix-input-verified']
                        skipped=[e['data'] for e in summary['resolver_events'] if e['stage']=='vodix-input-skipped']
                        proof=[e['data'] for e in summary['resolver_events'] if e['stage']=='vodix-input-proof']
                        row['proof']=proof[-1] if proof else None
                        row.update(verified=len(verified)==1,basis=verified[0]['basis'] if verified else None,
                            provider=(verified or skipped or [{}])[0].get('provider'),requests=summary['requests'],seconds=summary['seconds'])
                        row['ok']=bool(verified) if expected else not verified and bool(skipped)
                        row['codes']=sorted(set(re.findall(r'\bINPUT_METADATA_[A-Z_]+\b',log.getvalue())))
                    except Exception as error:
                        # Never upload exception text, private URLs or raw upstream responses.
                        row.update(ok=False,error=type(error).__name__)
                    rows.append(row);print(json.dumps(row),flush=True)
    report=dict(scope='production-input-proof-only; no Vodix media or playback validation',
        bundle_sha256=hashlib.sha256(production.read_bytes()).hexdigest(),executed_bundle_sha256=executed_sha256,ok=all(r['ok'] for r in rows),results=rows)
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n')
    raise SystemExit(0 if report['ok'] else 1)

if __name__=='__main__':main()
