#!/usr/bin/env python3
"""Verify the dedicated Anime-Sama bundle, optionally against a sanitized original-plugin run."""
import argparse
import collections
import concurrent.futures
import contextlib
import datetime
import json
import os
from pathlib import Path
from audit import safe
from quickjs_check import ROOT, check, probe_media, probe_subtitles

CASES = [
    ('jjk-1', 'Jujutsu Kaisen S1E1', ('95479', 'tv', 1, 1)),
    ('jjk-25', 'Jujutsu Kaisen catalog S1E25', ('95479', 'tv', 1, 25)),
    ('one-piece', 'One Piece S23E1180', ('37854', 'tv', 23, 1180)),
    ('bebop', 'Cowboy Bebop S1E1', ('30991', 'tv', 1, 1)),
    ('your-name', 'Your Name', ('372058', 'movie', None, None)),
    ('suzume', 'Suzume', ('916224', 'movie', None, None)),
]


def choices(streams):
    formats = {'hls': 'm3u8', 'video': 'mp4', 'dash': 'mpd'}
    return {(s['source'].lower(), s.get('version', s.get('language', '')).upper(), formats.get(s.get('format'), s.get('format')))
            for s in streams}


def stages(row, name):
    data = row.get('stages', []) if 'stages' in row else row.get('resolver_events', [])
    return [v['data'] for v in data if v['stage'] in [name, 'anime-' + name]]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime', choices=['tv', 'mobile', 'both'], default='both')
    parser.add_argument('--case', action='append', choices=[c[0] for c in CASES])
    parser.add_argument('--baseline', type=Path, help='Sanitized original-plugin report with results[]')
    parser.add_argument('--report', type=Path, required=True)
    options = parser.parse_args()
    original = json.loads(options.baseline.read_text()) if options.baseline else None
    before = {c['id']: c for c in original['results']} if original else {}
    manifest = json.loads((ROOT / 'plugins/anime-sama/manifest.json').read_text())
    stamp = datetime.datetime.now(datetime.timezone.utc)
    private = ROOT / 'reports' / ('anime-verification-' + stamp.strftime('%Y%m%dT%H%M%S%fZ'))
    private.mkdir(parents=True, mode=0o700)
    report = dict(utc=stamp.isoformat(), version=manifest['version'],
                  scope='Dedicated plugin with literal native JS wrappers and Python HTTP; no physical device test',
                  original_baseline=original, results=[], failures=[])
    for runtime in ['tv', 'mobile'] if options.runtime == 'both' else [options.runtime]:
        for case_id, title, args in CASES:
            if options.case and case_id not in options.case:
                continue
            print('Checking', runtime, title, flush=True)
            issues = []
            try:
                with (private / (runtime + '-' + case_id + '.private.log')).open('w') as log, contextlib.redirect_stdout(log):
                    streams, row = check(ROOT / 'plugins/anime-sama/providers/anime-sama.js', args, live=True,
                                         allow_empty=True, runtime=runtime, provider_settings={'diagnostics': True},
                                         metadata_key=os.environ.get('NUVIO_TMDB_API_KEY', ''))
                row.update(id=case_id, title=title, streams=[{k: s.get(k, '') for k in ['name', 'source', 'size', 'version', 'language', 'quality', 'format']} for s in streams])
                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
                    row['media'] = list(pool.map(probe_media, streams))
                    row['subtitle_checks'] = list(pool.map(probe_subtitles, streams))
                if not streams:
                    issues.append('empty-result')
                if any(not item['ok'] for item in row['media'] + row['subtitle_checks']):
                    issues.append('media-or-captions-failed')
                if any(s.get('size') != s.get('source') or not s.get('source') for s in streams):
                    issues.append('host-caption-missing')
                row['languages'] = dict(collections.Counter(s['version'] for s in streams))
                if case_id in before:
                    old = before[case_id]
                    missing = choices(old['streams']) - choices(row['streams'])
                    row['missing_original_choices'] = sorted(missing)
                    if missing or len(streams) < old['sources']:
                        issues.append('original-link-coverage-missing')
                    for stage in ['source', 'episode']:
                        expected, actual = stages(old, stage), stages(row, stage)
                        if expected and expected != actual:
                            issues.append(stage + '-mapping-differs')
                row['issues'] = issues
            except Exception as error:
                row = dict(id=case_id, title=title, runtime=runtime, issues=['verification-error'], error_type=type(error).__name__)
                issues = row['issues']
            if issues:
                report['failures'].append(dict(id=case_id, runtime=runtime, issues=issues))
            report['results'].append(row)
            options.report.parent.mkdir(parents=True, exist_ok=True)
            options.report.write_text(json.dumps(safe(report), indent=2, ensure_ascii=False) + '\n')
            print(' ', row.get('sources', 0), 'sources;', ', '.join(issues) or 'passed', flush=True)
    return int(bool(report['failures']))


if __name__ == '__main__':
    raise SystemExit(main())
