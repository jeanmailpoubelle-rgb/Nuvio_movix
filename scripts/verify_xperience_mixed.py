#!/usr/bin/env python3
"""Check mixed Xperience input using the generated FR mapping on both bridges."""
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
from quickjs_check import ROOT, check, helper_bundle

ENTRY = '''async function getStreams(id,type,season,episode){return run(id,type,season,episode,async function(ctx){await inputEpisodeCoordinates(ctx,'primary','nuvio-catalog');return [];});}'''


def main():
    settings = dict(episodeMetadataSource='aiometadata', inputMetadataAdapter='xperience', inputMetadataProvider='auto',
                    aiometadataManifestUrl=os.environ.get('NUVIO_XPERIENCE_MANIFEST_URL',''), diagnostics=True)
    key = os.environ.get('NUVIO_TMDB_API_KEY','')
    rows = []
    source = ROOT / 'providers/movix.js'
    for name, tmdb, season, episode in [('hunter','46298',2,72), ('office','2316',4,1), ('office','2316',6,1)]:
        for runtime in ['mobile','tv']:
            row = dict(case=name,input=[season,episode],runtime=runtime)
            if not settings['aiometadataManifestUrl'] or not key:
                row.update(ok=False,status='runtime-secrets-missing');rows.append(row);continue
            try:
                with tempfile.TemporaryDirectory() as directory:
                    bundle = Path(directory) / 'movix.js'
                    bundle.write_text(helper_bundle(source, ENTRY))
                    with contextlib.redirect_stdout(io.StringIO()):
                        _, summary = check(bundle, [tmdb,'tv',season,episode], live=True, allow_empty=True,
                            runtime=runtime, metadata_key=key, provider_settings=settings, log_sink=io.StringIO())
                events=[e['data'] for e in summary['resolver_events'] if e['stage']=='episode-mapping']
                row.update(ok=len(events)==1, mappings=[{k:d[k] for k in ['backend','from','to','basis'] if k in d} for d in events],
                           failure_codes=sorted({e['data'].get('reason') for e in summary['resolver_events'] if isinstance(e.get('data'),dict) and isinstance(e['data'].get('reason'),str) and e['data']['reason'].startswith('INPUT_METADATA_') and all(c.isupper() or c=='_' for c in e['data']['reason'])}),
                           requests=summary['requests'],production_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                           executed_bundle_sha256=summary['bundle_sha256'])
            except Exception as e:
                row.update(ok=False,error_type=type(e).__name__)
            rows.append(row)
    report=dict(scope='Generated FR mapping entrypoint override; mixed-profile evidence, no media or physical playback.',results=rows,ok=all(r['ok'] for r in rows))
    path=ROOT/'reports/xperience/mixed.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,indent=2)+'\n')
    print(sum(r['ok'] for r in rows),'of',len(rows),'mixed-profile mapping checks passed')
    return int(not report['ok'])

if __name__=='__main__':
    raise SystemExit(main())
