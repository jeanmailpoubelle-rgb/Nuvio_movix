#!/usr/bin/env python3
"""Verify configured episode translation in executed bundles; never host playback."""
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
from quickjs_check import ROOT, check, helper_bundle

ROOT_ENTRY = '''function getStreams(id,type,season,episode){return run(id,type,season,episode,async function(ctx){
for(var backend of ['primary','direct','custom','frembed','swiftflow','backup','vidzy'])
await orderedEpisodeLookup(ctx,backend,function(){return Promise.resolve([]);});return [];});}'''
ANIME_ENTRY = '''async function getStreams(id,type,season,episode){
var conf=SCRAPER_SETTINGS, provider=AnimeSama.nativeProvider(conf);
await AnimeSama.resolveSelection(provider,id,type,season,episode,conf,TMDB_API_KEY);return [];}'''

def main():
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    options=parser.parse_args()
    if not os.environ.get('NUVIO_AIOMETADATA_MANIFEST_URL') or not os.environ.get('NUVIO_TMDB_API_KEY'):
        parser.error('Configured metadata and TMDB runtime secrets are required')
    fixtures=json.loads((ROOT/'tests/fixtures/input-metadata/series.json').read_text())
    settings=dict(episodeMetadataSource='aiometadata',aiometadataManifestUrl=os.environ['NUVIO_AIOMETADATA_MANIFEST_URL'],diagnostics=True)
    jobs=[(f,v,kind,runtime) for f in fixtures for v in f['episodes'] for kind in ['root','anime'] for runtime in ['tv','mobile']]
    def run(job):
        f,v,kind,runtime=job
        production=ROOT/('providers/movix.js' if kind=='root' else 'plugins/anime-sama/providers/anime-sama.js')
        row=dict(series=f['name'],input=v['input'],kind=kind,runtime=runtime,production_sha256=hashlib.sha256(production.read_bytes()).hexdigest())
        try:
            with tempfile.TemporaryDirectory() as directory:
                bundle=Path(directory)/production.name
                bundle.write_text(helper_bundle(production,ROOT_ENTRY if kind=='root' else ANIME_ENTRY))
                # Raw logs remain in memory and are discarded, never uploaded.
                with contextlib.redirect_stdout(io.StringIO()):
                    _,summary=check(bundle,[f['tmdbId'],'tv',*v['input']],live=True,allow_empty=True,runtime=runtime,
                        metadata_key=os.environ['NUVIO_TMDB_API_KEY'],provider_settings=settings,log_sink=io.StringIO())
            events=summary['resolver_events']
            mappings=[e['data'] for e in events if e['stage']==('episode-mapping' if kind=='root' else 'anime-input-mapping')]
            row['mappings']=[{k:d[k] for k in ['backend','from','to','basis'] if k in d} for d in mappings]
            expected=dict(zip(['season','episode'],v['target']))
            if kind=='root':
                verified=[d for d in mappings if d.get('backend') in ['primary','direct','custom','frembed','swiftflow']]
                row['ok']=len(verified)==5 and all(d['to']==expected for d in verified)
                # Independent Cinemeta backends must resolve to the selected stream row.
                cine=[d for d in mappings if d.get('backend') in ['backup','vidzy']]
                cine_expected={k:v['cinemeta'][k] for k in ['season','episode']}
                row['ok']=row['ok'] and len(cine)==2 and all(d['to']==cine_expected for d in cine)
            else:
                refs=[r for e in events if e['stage']=='anime-episode' for r in e['data']['refs']]
                row['refs']=refs
                # Fixtures retain expected public source slots, never a production mapping.
                row['ok']=len(mappings)==1 and mappings[0]['to']==expected and bool(refs)
                group='/catalogue/hunter-x-hunter/saison1' if f['name']=='hunter' else '/catalogue/jujutsu-kaisen/saison2' if f['name']=='jujutsu' else '/catalogue/les-carnets-de-lapothicaire/saison'+str(v['input'][0])
                index=v['target'][1]-1 if f['name']=='hunter' else v['input'][1]-1
                row['ok']=row['ok'] and all(r['path'].rstrip('/').rsplit('/',1)[0]==group and r['index']==index for r in refs)
            row.update(requests=summary['requests'],seconds=summary['seconds'])
        except Exception as error:
            row.update(ok=False,error_type=type(error).__name__)
        return row
    # Contextlib stdout redirection is process-global, so keep this verifier sequential.
    rows=[run(job) for job in jobs]
    report=dict(scope='Literal native wrappers; metadata correspondence and Anime-Sama source slots only. No host extraction or physical playback.',results=rows,ok=all(r['ok'] for r in rows))
    options.output.parent.mkdir(parents=True,exist_ok=True)
    options.output.write_text(json.dumps(report,indent=2)+'\n')
    print(sum(r['ok'] for r in rows),'of',len(rows),'translation checks passed')
    return int(not report['ok'])

if __name__=='__main__':
    raise SystemExit(main())
