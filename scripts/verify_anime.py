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
from quickjs_check import ROOT, check, probe_media, probe_subtitles, visible_label, label_priority
from anime_entries import check_entries

CASES = [
    ('hxh-58', 'Hunter x Hunter Cinemeta S1E58', ('46298', 'tv', 1, 58)),
    ('hxh-s2e1', 'Hunter x Hunter Cinemeta S2E1', ('46298', 'tv', 2, 1)),
    ('hxh-s2e22', 'Hunter x Hunter Cinemeta S2E22', ('46298', 'tv', 2, 22)),
    ('hxh-s2e62', 'Hunter x Hunter Cinemeta S2E62', ('46298', 'tv', 2, 62)),
    ('hxh-s2e63', 'Hunter x Hunter Cinemeta S2E63', ('46298', 'tv', 2, 63)),
    ('hxh-s2e78', 'Hunter x Hunter Cinemeta S2E78', ('46298', 'tv', 2, 78)),
    ('hxh-s3e1', 'Hunter x Hunter Cinemeta S3E1', ('46298', 'tv', 3, 1)),
    ('apothecary-s2e1', 'Apothecary Diaries S2E1 control', ('220542', 'tv', 2, 1)),
    ('apothecary-s3e1', 'Apothecary Diaries S3E1 control', ('220542', 'tv', 3, 1)),
    ('aot-1', 'Attack on Titan S1E1', ('1429', 'tv', 1, 1)),
    ('aot-imdb-1', 'Attack on Titan IMDb S1E1', ('tt2560140', 'tv', 1, 1)),
    ('bleach', 'Bleach S1E1', ('30984', 'tv', 1, 1)),
    ('ace-1', 'Ace of Diamond (2013) S1E1', ('60761', 'tv', 1, 1)),
    ('jjk-1', 'Jujutsu Kaisen S1E1', ('95479', 'tv', 1, 1)),
    ('jjk-25', 'Jujutsu Kaisen catalog S1E25', ('95479', 'tv', 1, 25)),
    ('jjk-48', 'Jujutsu Kaisen continuous S1E48', ('95479', 'tv', 1, 48)),
    ('jjk-s2e1', 'Jujutsu Kaisen seasonal S2E1', ('95479', 'tv', 2, 1)),
    ('jjk-s2e22', 'Jujutsu Kaisen seasonal S2E22', ('95479', 'tv', 2, 22)),
    ('jjk-s2e23', 'Jujutsu Kaisen seasonal S2E23', ('95479', 'tv', 2, 23)),
    ('jjk-s3e1', 'Jujutsu Kaisen seasonal S3E1', ('95479', 'tv', 3, 1)),
    ('one-piece', 'One Piece S23E1180', ('37854', 'tv', 23, 1180)),
    ('bebop', 'Cowboy Bebop S1E1', ('30991', 'tv', 1, 1)),
    ('your-name', 'Your Name', ('372058', 'movie', None, None)),
    ('suzume', 'Suzume', ('916224', 'movie', None, None)),
]
EXPECTED_REFS = {
    'jjk-1': (1, 0), 'jjk-25': (2, 0), 'jjk-48': (3, 0),
    'jjk-s2e1': (2, 0), 'jjk-s2e22': (2, 21), 'jjk-s2e23': (2, 22), 'jjk-s3e1': (3, 0),
}
EXPECTED_REFS = {case: (f'/catalogue/jujutsu-kaisen/saison{season}/', index) for case, (season,index) in EXPECTED_REFS.items()}
EXPECTED_REFS['aot-1'] = ('/catalogue/shingeki-no-kyojin/saison1/', 0)
EXPECTED_REFS['aot-imdb-1'] = ('/catalogue/shingeki-no-kyojin/saison1/', 0)
EXPECTED_REFS['ace-1'] = ('/catalogue/ace-of-diamond/saison1/', 0)
for case, absolute in [('hxh-58',58),('hxh-s2e1',59),('hxh-s2e22',80),('hxh-s2e62',120),('hxh-s2e63',121),('hxh-s2e78',136),('hxh-s3e1',137)]:
    EXPECTED_REFS[case] = ('/catalogue/hunter-x-hunter/saison1/', absolute-1)
for season in [2,3]:
    EXPECTED_REFS[f'apothecary-s{season}e1'] = (f'/catalogue/les-carnets-de-lapothicaire/saison{season}/',0)


def choices(streams):
    formats = {'hls': 'm3u8', 'video': 'mp4', 'dash': 'mpd'}
    return {(s['source'].lower(), s.get('version', s.get('language', '')).upper(), formats.get(s.get('format'), s.get('format')))
            for s in streams}


def stages(row, name):
    data = row.get('stages', []) if 'stages' in row else row.get('resolver_events', [])
    return [v['data'] for v in data if v['stage'] in [name, 'anime-' + name]]


def selection_issues(row):
    """A playable subset is not evidence that every published host was attempted."""
    events = stages(row, 'selection')
    if len(events) != 1:
        return ['selection-evidence-missing']
    selection = events[0]
    issues = ['lookup-budget'] if 'budget' in selection.get('stop', '') and selection['stop'] != 'host-budget' else []
    if selection.get('hostBudgetStops', 0) or selection.get('stop') == 'host-budget':
        issues.append('host-budget')
    fields = ['published', 'attempted', 'remaining']
    if any(type(selection.get(k)) is not int or selection[k] < 0 for k in fields) or selection['attempted'] + selection['remaining'] != selection['published']:
        return issues + ['selection-evidence-invalid']
    if selection['remaining']:
        issues.append('candidate-coverage-incomplete')
    return issues


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
                case_directory = private / (runtime + '-' + case_id)
                case_directory.mkdir(mode=0o700)
                streams, row = check_entries(args, runtime, case_directory, metadata_key=os.environ.get('NUVIO_TMDB_API_KEY', ''))
                row.update(id=case_id, title=title, streams=[{**{k: s.get(k, '') for k in ['name', 'source', 'size', 'version', 'language', 'quality', 'format']},
                    'display_name':visible_label(s['name']), 'sort_priority':label_priority(s['name'])} for s in streams])
                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
                    row['media'] = list(pool.map(probe_media, streams))
                    row['subtitle_checks'] = list(pool.map(probe_subtitles, streams))
                if not streams:
                    issues.append('empty-result')
                issues.extend(selection_issues(row))
                if not row.get('entry_evidence_complete'):
                    issues.append('entry-evidence-incomplete')
                if not row.get('partition_complete'):
                    issues.append('host-partition-incomplete')
                if row.get('http_failures'):
                    issues.append('upstream-http-failure')
                if case_id in EXPECTED_REFS:
                    group, index = EXPECTED_REFS[case_id]
                    mapped = stages(row, 'episode')
                    if len(mapped) != 1 or not mapped[0].get('refs') or any(
                            not ref['path'].startswith(group) or ref['index'] != index
                            for ref in mapped[0].get('refs', [])):
                        issues.append('episode-mapping-differs')
                if any(not item['ok'] for item in row['media'] + row['subtitle_checks']):
                    issues.append('media-or-captions-failed')
                if any(s.get('size') != s.get('source') or not s.get('source') for s in streams):
                    issues.append('host-caption-missing')
                order = [(-int(s.get('quality', '0p')[:-1]), {'MULTI': 0, 'VF': 1, 'VOSTFR': 2}.get(s.get('language'), 3)) for s in streams]
                if order != sorted(order) or len(streams) > 1 and [s['name'] for s in streams] != sorted(s['name'] for s in streams):
                    issues.append('presentation-order')
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
