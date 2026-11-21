#!/usr/bin/env python3
"""Exercise the installed EN entry, mapping, master/media and preferred captions.

Runtime secrets configure only this cloud check, never the installed plugin.
Reports contain no URLs, keys, private config, bodies or subtitle dialogue.
"""
import argparse, hashlib, io, json, os, pathlib, re, sys, time
from quickjs_check import check, probe_media, probe_subtitles

ROOT = pathlib.Path(__file__).resolve().parents[1]

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=pathlib.Path, default=ROOT / 'reports/sources-en/report.json')
    p.add_argument('--case', action='append', default=[])
    options = p.parse_args()
    inventory = json.loads((ROOT / 'config/sources-en-maintenance.json').read_text())
    key = os.environ.get('NUVIO_TMDB_API_KEY', '')
    manifest = os.environ.get('NUVIO_AIOMETADATA_MANIFEST_URL', '')
    provider = ROOT / 'plugins/sources-en/providers/sources-en.js'
    config = json.loads((ROOT / 'config/sources-en.json').read_text())
    report = {'scope': 'Installed phone entry in literal Mobile wrapper with Python HTTP; not physical Android playback.',
              'version': json.loads((ROOT / 'plugins/sources-en/manifest.json').read_text())['version'],
              'bundle_sha256': hashlib.sha256(provider.read_bytes()).hexdigest(),
              'mapping_revision': config['mappingRevision'], 'results': []}
    cases = [c for c in inventory['cases'] if not options.case or c['id'] in options.case]
    if not cases or set(options.case) - {c['id'] for c in cases}:
        raise SystemExit('Unknown or empty public case selection')
    for case in cases:
        row = {'case': case['id'], 'args': case['args']}
        if not key or case['args'][1] == 'tv' and not manifest:
            row.update(status='blocked', code='RUNTIME_SECRET_MISSING')
        else:
            logs = io.StringIO()
            try:
                streams, summary = check(provider, case['args'], live=True, metadata_key=key,
                    provider_settings={'aiometadataManifestUrl': manifest, 'diagnostics': True},
                    runtime='mobile', scraper_id='repository:' + inventory['entryId'], allow_empty=True, log_sink=logs)
                events = []
                for line in logs.getvalue().splitlines():
                    m = re.search(r'\[sources-en\] (\{.*\})$', line)
                    if m:
                        event = json.loads(m[1])
                        events.append({k: v for k, v in event.items() if k in ('code', 'type', 'id', 'input', 'anilistId', 'episode', 'sources', 'requests', 'channel')})
                mapped = [e for e in events if e['code'] == 'EN_MAPPED']
                mapping_ok = len(mapped) == 1 and mapped[0]['anilistId'] == case['anilistId'] and mapped[0]['episode'] == case['episode']
                media = [probe_media(s) for s in streams]
                subtitles = [s for stream in streams for s in probe_subtitles(stream)]
                row.update(status='pass' if mapping_ok and streams and all(m['ok'] for m in media) and all(s['ok'] for s in subtitles) else 'attention',
                    mapping_ok=mapping_ok, events=events, sources=len(streams), requests=summary['requests'], seconds=summary['seconds'],
                    streams=[{'quality': s.get('quality'), 'audio': s.get('audioLanguages'), 'subtitles': s.get('subtitleLanguages')} for s in streams],
                    media=media, captions=subtitles, http_failures=summary['http_failures'])
            except Exception as error:
                row.update(status='attention', code=type(error).__name__)
        report['results'].append(row)
        options.output.parent.mkdir(parents=True, exist_ok=True)
        options.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
        print(case['id'], row['status'], 'mapping', row.get('mapping_ok'), 'sources', row.get('sources'), flush=True)
    return 0 if all(r['status'] == 'pass' for r in report['results']) else 1

if __name__ == '__main__':
    sys.exit(main())
