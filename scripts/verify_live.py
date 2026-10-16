#!/usr/bin/env python3
"""Repeatable live discovery, catalogue-count, media and subtitle checks.

Reports omit credentials, signed media URLs and full HTTP bodies. This uses the
real Nuvio JS fixtures with Python HTTP, not Android networking or a TV decoder.
"""
import argparse
import collections
import concurrent.futures
import datetime
import json
import os
import re
import urllib.request
import urllib.parse
from pathlib import Path
from quickjs_check import ROOT, check, probe_media, probe_subtitles

CASES = [
    ('Dragons / How to Train Your Dragon', ('10191', 'movie', None, None), None),
    ('Matrix', ('603', 'movie', None, None), '/movie/matrix'),
    ('Fight Club', ('550', 'movie', None, None), '/movie/fight-club'),
    ('Spider-Man: Brand New Day', ('969681', 'movie', None, None), '/movie/spider-man-brand-new-day'),
    ('Game of Thrones S1E1', ('1399', 'tv', 1, 1), '/episode/game-of-thrones/1-1'),
    ('Reacher S4E1', ('108978', 'tv', 4, 1), '/episode/reacher/4-1'),
    ('Breaking Bad S1E1', ('1396', 'tv', 1, 1), '/episode/breaking-bad/1-1'),
    ('The Office S1E1', ('2316', 'tv', 1, 1), None),
    ('The Dark Knight', ('155', 'movie', None, None), None),
    ('Spirited Away', ('129', 'movie', None, None), None),
    ('The Simpsons S1E1', ('456', 'tv', 1, 1), None),
    ('Jujutsu Kaisen 0', ('810693', 'movie', None, None), '/movie/jujutsu-kaisen-0'),
    ('The Storm', ('1623256', 'movie', None, None), '/movie/the-storm'),
    ('Reacher S1E1', ('108978', 'tv', 1, 1), '/episode/reacher/1-1'),
]


def inventory(base, route):
    if route is None:
        return dict(host=base, skipped=True, reason='Direct TMDB provider verification only'), None
    try:
        request = urllib.request.Request(base + route, headers={'User-Agent': 'Mozilla/5.0', 'Referer': base + '/'})
        with urllib.request.urlopen(request, timeout=15) as response:
            body = response.read(1048576).decode('utf-8')
        marker = body.index('const videos =') + len('const videos =')
        videos, _ = json.JSONDecoder().raw_decode(body[marker:].lstrip())
        lulu = json.loads((ROOT / 'config/endpoints.json').read_text())['catalogue']['lulu']
        host_patterns = json.loads((ROOT / 'config/endpoints.json').read_text())['hosts']
        def supported_host(url):
            host = urllib.parse.urlsplit(url).netloc
            return any(re.fullmatch(r'(?:[a-z0-9-]+\.)*' + re.escape(pattern).replace(r'\*', r'[a-z0-9.-]+'), host, re.I)
                       for patterns in host_patterns.values() for pattern in patterns)
        supported = [video for video in videos if supported_host(video.get('link', '')) or re.search(r'https://(?:[a-z0-9-]+\.)?vidzy\.(?:cc|org|live|lol)/embed-', video.get('link', ''))
                     or re.search(r'\.(?:m3u8|mp4)(?:[?#]|$)', video.get('link', ''))
                     or any(video.get('link', '').startswith(base + '/e/') for base in lulu)]
        # Keep identifiers only in memory for comparing catalogue replicas.
        identity = sorted((video.get('link', ''), video.get('version', '')) for video in videos)
        return dict(host=base, ok=True, advertised=len(videos), supported=len(supported),
                    distinct_supported=len({video.get('link') for video in supported}),
                    languages=dict(collections.Counter(video.get('version', '') for video in videos)),
                    supported_languages=dict(collections.Counter(video.get('version', '') for video in supported))), identity
    except Exception as error:
        return dict(host=base, ok=False, reason=type(error).__name__), None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime', choices=['tv', 'mobile', 'both'], default='both')
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--case', choices=sorted({case[1][0] for case in CASES}), action='append', help='Select TMDB IDs; repeat to run a focused set')
    parser.add_argument('--provider', choices=[Path(entry['filename']).stem for entry in json.loads((ROOT / 'manifest.json').read_text())['scrapers'] if entry['enabled']], action='append', help='Select provider filenames without .js; repeat to focus a run')
    parser.add_argument('--season', type=int, help='Limit TV checks to an exact season, including zero')
    parser.add_argument('--episode', type=int, help='Limit TV checks to an exact episode')
    options = parser.parse_args()
    config = json.loads((ROOT / 'config/endpoints.json').read_text())
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    providers = [entry for entry in manifest['scrapers'] if entry['enabled']]
    if options.provider:
        providers = [entry for entry in providers if Path(entry['filename']).stem in options.provider]
    report = dict(version=manifest['version'], utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  limits='Python HTTP with real JS fixtures; no physical TV playback or timing certification', cases=[])
    failures = []
    for title, args, route in CASES:
        if options.case and args[0] not in options.case:
            continue
        if options.season is not None and args[2] != options.season:
            continue
        if options.episode is not None and args[3] != options.episode:
            continue
        print('Verifying', title, flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            inventories = list(pool.map(lambda base: inventory(base, route), config['catalogue']['mirrors']))
        identities = [identity for _, identity in inventories if identity is not None]
        case = dict(title=title, args=args, catalogue=[summary for summary, _ in inventories],
                    available_catalogues_identical=len(identities) >= 2 and all(identity == identities[0] for identity in identities), results=[])
        for runtime in ['tv', 'mobile'] if options.runtime == 'both' else [options.runtime]:
            for provider in providers:
                result, summary = check(ROOT / provider['filename'], args, live=True, allow_empty=True, runtime=runtime,
                                        metadata_key=os.environ.get('NUVIO_TMDB_API_KEY', ''))
                summary['name'] = provider['name']
                summary['qualities'] = [item.get('quality', '') for item in result]
                summary['streams'] = [dict(name=item['name'], format=item['format'], language=item.get('language', ''), quality=item.get('quality', '')) for item in result]
                summary['filtered_empty'] = not result and summary['filtered_sources'] > 0
                summary['media'] = [dict(language=item.get('language', ''), **probe_media(item)) for item in result]
                summary['subtitle_checks'] = [dict(language=item.get('language', ''), **probe_subtitles(item)) for item in result]
                if (not result and not summary['filtered_empty']) or any(not probe['ok'] for probe in summary['media'] + summary['subtitle_checks']):
                    failures.append(dict(title=title, provider=provider['name'], runtime=runtime))
                # Reacher's two known Vidzy versions are an explicit regression.
                if not summary['filtered_sources'] and args[0] == '108978' and args[2] == 4 and provider['id'] == 'nakios-tv' and sorted(summary['languages']) != ['VF', 'VOSTFR']:
                    failures.append(dict(title=title, reason='Missing reference language', runtime=runtime))
                if not summary['filtered_sources'] and args[0] == '2316' and provider['id'] in ['movix-tv','nakios-tv'] and (summary['languages'] != ['MULTI'] or not result or
                        not {'en', 'fr'}.issubset({track.get('language') for track in result[0].get('subtitles', [])})):
                    failures.append(dict(title=title, provider=provider['name'], reason='Missing Office audio label or caption language', runtime=runtime))
                if not summary['filtered_sources'] and args[0] == '129' and provider['id'] in ['movix-tv','nakios-tv'] and (summary['languages'] != ['MULTI'] or summary['subtitles'] != 0 or
                        not any({'fr', 'ja'}.issubset(set(item['audio'])) for item in summary['hls_metadata'])):
                    failures.append(dict(title=title, provider=provider['name'], reason='Chihiro audio/caption regression', runtime=runtime))
                if not summary['filtered_sources'] and args[0] == '456' and provider['id'] in ['movix-tv','nakios-tv']:
                    expected = ['VF'] if provider['id'] == 'nakios-tv' else ['MULTI']
                    if summary['languages'] != expected or (provider['id'] == 'movix-tv' and (not result or
                            not {'en', 'fr'}.issubset({track.get('language') for track in result[0].get('subtitles', [])}))):
                        failures.append(dict(title=title, provider=provider['name'], reason='Simpsons audio/caption regression', runtime=runtime))
                case['results'].append(summary)
        report['cases'].append(case)
        # Preserve partial results if an upstream check or later run is interrupted.
        report['failures'] = failures
        options.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    if not report['cases']:
        parser.error('No verification case matches the selected IDs/coordinates')
    print('Live checks complete; failures:', len(failures), flush=True)
    raise SystemExit(bool(failures))


if __name__ == '__main__':
    main()
