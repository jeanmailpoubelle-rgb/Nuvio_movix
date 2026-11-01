#!/usr/bin/env python3
"""Compare native Anime-Sama discovery against a Git revision, without network I/O.

The real TV/Mobile wrappers run with deterministic catalogue/player responses.
This measures request counts and local processing, not Android or host latency.
"""
import argparse
import base64
import contextlib
import datetime
import hashlib
import io
import json
from pathlib import Path
import re
import statistics
import subprocess
import tempfile
import time
import urllib.response
import urllib.parse
from unittest.mock import patch

from audit import safe
from quickjs_check import ROOT, check, fixture_response


def response(request, episodes):
    url = request.full_url
    payload = fixture_response('anime-sama', url, 'direct')
    if urllib.parse.urlsplit(url).path.endswith('/episodes.js'):
        # Expand the shared native fixture instead of copying its domains/hosts.
        # A changed fixture grammar must fail explicitly, not silently benchmark
        # a single slot while reporting a long-catalogue workload.
        def expand(match):
            values = json.loads(match[2])
            assert len(values) == 1 and isinstance(values[0], str), 'Episode fixture grammar changed'
            return match[1] + json.dumps(values * episodes)
        payload, replacements = re.subn(r'(\bvar eps\d+=)(\[[^\r\n]*\])', expand, payload)
        assert replacements, 'Episode fixture arrays missing'
    override = payload.get('__fixture_response', {}) if isinstance(payload, dict) else {}
    if override:
        raw = base64.b64decode(override['bodyBase64']) if 'bodyBase64' in override else override['body'].encode()
    else:
        raw = (payload if isinstance(payload, str) else json.dumps(payload)).encode()
    headers = {'content-type': 'text/plain', **override.get('headers', {})}
    result = urllib.response.addinfourl(io.BytesIO(raw), headers, override.get('url', url), override.get('status', 200))
    result.reason = 'Fixture'
    return result


def choices(streams):
    return [{key: item.get(key, '') for key in ['source', 'version', 'format', 'quality', 'language']} for item in streams]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline-ref', default='HEAD', help='Committed baseline; default HEAD compares uncommitted work')
    parser.add_argument('--episodes', type=int, default=1000, help='Synthetic source slots per edition, 1–1000')
    parser.add_argument('--repeats', type=int, default=5, help='Measured repetitions after one warm-up, 1–20')
    parser.add_argument('--runtime', choices=['both', 'tv', 'mobile'], default='both')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not 1 <= args.episodes <= 1000 or not 1 <= args.repeats <= 20:
        parser.error('episodes must be 1–1000 and repeats 1–20')
    revision = subprocess.check_output(['git', 'rev-parse', '--verify', '--end-of-options', args.baseline_ref + '^{commit}'], cwd=ROOT, text=True).strip()
    relative = 'plugins/anime-sama/providers/anime-sama.js'
    previous = subprocess.check_output(['git', 'show', revision + ':' + relative], cwd=ROOT)
    current = ROOT / relative
    report = {'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'baseline_commit': revision,
              'scope': 'Synthetic HTTP only, actual native JS wrappers; local processing and request counts, no network/device speed guarantee',
              'slots_per_edition': args.episodes, 'repeats': args.repeats, 'warmups': 1,
              'physical_android_tested': False, 'before_sha256': hashlib.sha256(previous).hexdigest(),
              'after_sha256': hashlib.sha256(current.read_bytes()).hexdigest(), 'results': []}
    # No live endpoint can be reached: every native HTTP request goes through the
    # existing fixture router, including binary responses on capable Mobile.
    with tempfile.TemporaryDirectory(prefix='anime-speed-') as tmp:
        old = Path(tmp) / 'anime-sama.js'
        old.write_bytes(previous)
        for runtime in ['tv', 'mobile'] if args.runtime == 'both' else [args.runtime]:
            runs = {'before': [], 'after': []}
            reference = None
            for repetition in range(args.repeats + 1):
                for label, bundle in [('before', old), ('after', current)]:
                    started, cpu_started = time.perf_counter(), time.process_time()
                    with patch('urllib.request.urlopen', side_effect=lambda req, **kwargs: response(req, args.episodes)), contextlib.redirect_stdout(io.StringIO()):
                        streams, summary = check(bundle, ['95479', 'tv', 1, 1], live=True, runtime=runtime, allow_empty=True)
                    elapsed, cpu_elapsed = time.perf_counter() - started, time.process_time() - cpu_started
                    assert len(streams) == (8 if runtime == 'tv' else 10), 'Playable host/edition coverage changed'
                    if reference is None:
                        reference = streams
                    assert streams == reference, 'Playback data, ordering, editions, headers or captions changed'
                    selection = [e['data'] for e in summary['resolver_events'] if e['stage'] == 'anime-selection']
                    assert len(selection) == 1 and selection[0]['remaining'] == 0 and selection[0]['stop'] == 'candidates-exhausted'
                    if repetition:
                        runs[label].append({'seconds': round(elapsed, 6), 'cpu_seconds': round(cpu_elapsed, 6), 'requests': summary['requests'],
                                            'sources': len(streams), 'transport_skipped': selection[0].get('transportSkipped', 0)})
            assert max(r['requests'] for r in runs['after']) <= min(r['requests'] for r in runs['before'])
            row = {'runtime': runtime, 'playback_data_identical': True, 'choices': choices(reference), 'samples': runs,
                   'median_seconds': {label: round(statistics.median(r['seconds'] for r in values), 6) for label, values in runs.items()},
                   'median_cpu_seconds': {label: round(statistics.median(r['cpu_seconds'] for r in values), 6) for label, values in runs.items()}}
            report['results'].append(row)
            print(runtime, 'CPU', row['median_cpu_seconds'], 'wall', row['median_seconds'],
                  'requests', runs['before'][0]['requests'], '->', runs['after'][0]['requests'], flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(safe(report), indent=2, ensure_ascii=False) + '\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
