#!/usr/bin/env python3
"""Run providers in QuickJS with the actual Nuvio Android TV 1.0.0 JS polyfill.

The native HTTP callback is Python urllib, not Android OkHttp. Native playback,
Android DNS/TLS and the exact device QuickJS build still need a television test.
"""
import argparse
import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
try:
    import quickjs
except ImportError:
    raise SystemExit('Install the test dependency: python3 -m pip install -r tests/requirements.txt')

ROOT = Path(__file__).resolve().parents[1]
POLYFILL = (ROOT / 'tests/fixtures/nuvio-tv-1.0.0-polyfill.js').read_text()
CALL = (ROOT / 'tests/fixtures/nuvio-tv-1.0.0-call.js').read_text()


def fixture_response(provider, url, scenario):
    media = 'https://cdn.example/master.m3u8'
    if '/api/purstream/' in url:
        if scenario == 'network-error':
            return None
        return {'sources': [] if scenario == 'empty' else [{'url': media, 'name': 'pulse | 1440p | MULTI'}]}
    if '/api/cpasmal/' in url:
        return {'links': {'vf': [{'url': media}]}}
    if 'api.themoviedb.org' in url:
        return {'title': 'Matrix', 'original_title': 'Matrix', 'release_date': '1999-03-31'}
    if '/search-bar/search/' in url:
        return {'data': {'items': {'movies': {'items': [{'id': 2633, 'type': 'movie', 'title': 'Matrix', 'release_date': '1999-03-31'}]}}}}
    if '/media/2633/sheet' in url:
        return {'data': {'items': {'tmdbId': 603, 'type': 'movie', 'urls': [{'url': media, 'name': '1440p MULTI'}]}}}
    if '/movie/603' in url or '/serie/1399/0/2' in url:
        return '<iframe id="pf" src="https://vidzy.cc/embed-fixture.html"></iframe><script>var CFG={"version":"vf"};</script>'
    if url == 'https://vidzy.cc/embed-fixture.html':
        host_sum = sum(map(ord, 'vidzy.cc')) & 255
        encoded = base64.b64encode(bytes(ord(ch) ^ ((0x3d + i * 89 + host_sum + 198) & 255) for i, ch in enumerate(media))[::-1]).decode()
        return 'sources:[{src:(function(s){var p="width:calc(1in + 145px)",c="width:calc(100% - 43px)";var kk=(0x3d+i*89+H+BC)&255;return s;})("' + encoded + '")}];'
    raise AssertionError('Unexpected fixture request: ' + urllib.parse.urlsplit(url).path)


def check(provider, args, live=False, scenario='direct', metadata_key='', provider_settings=None, allow_empty=False):
    context = quickjs.Context()
    context.set_memory_limit(32 * 1024 * 1024)
    calls, captured = [], []
    started_all = time.monotonic()
    name = provider.stem

    def native_fetch(url, method, headers_json, body):
        calls.append(url)
        if live:
            started = time.monotonic()
            try:
                req = urllib.request.Request(url, headers=json.loads(headers_json), method=method, data=body.encode() if body else None)
                try:
                    response = urllib.request.urlopen(req, timeout=15)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    data = dict(ok=200 <= response.status < 300, status=response.status, statusText=str(response.reason),
                                url=response.url, headers={k.lower(): v for k, v in response.headers.items()},
                                body=response.read(1024 * 1024).decode('utf-8', errors='replace'))
                parsed = urllib.parse.urlsplit(url)
                print(f"HTTP {data['status']} {parsed.netloc}{parsed.path} ({time.monotonic()-started:.1f}s)", flush=True)
            except Exception as error:
                data = dict(ok=False, status=0, statusText=type(error).__name__, url=url, headers={}, body='')
                print('Network error: ' + type(error).__name__, flush=True)
            return json.dumps(data)
        result = fixture_response(name, url, scenario)
        data = dict(ok=result is not None, status=200 if result is not None else 0, statusText='fixture', url=url, headers={},
                    body=result if isinstance(result, str) else json.dumps(result) if result is not None else '')
        return json.dumps(data)

    context.add_callable('__native_fetch', native_fetch)
    context.add_callable('__log', lambda *items: print('JS', *items, flush=True))
    context.add_callable('__get_scraper_id', lambda: name + '-tv')
    context.add_callable('__get_scraper_settings', lambda: json.dumps(provider_settings or {}))
    context.add_callable('__get_tmdb_api_key', lambda: metadata_key or ('test-key' if not live else ''))
    context.add_callable('__get_call_args', lambda: json.dumps(dict(tmdbId=args[0], mediaType=args[1], season=args[2], episode=args[3])))
    context.add_callable('__capture_result', lambda value: captured.append(value))
    context.eval('var console={log:__log,warn:__log,error:__log};')
    context.eval(POLYFILL)
    assert context.eval('typeof setTimeout') == 'undefined'
    assert context.eval('typeof document') == 'undefined'
    context.eval('var module={exports:{}};var exports=module.exports;(function(){\n' + provider.read_text() + '\n})();')
    context.eval(CALL)
    jobs = 0
    while context.execute_pending_job():
        jobs += 1
        if jobs > 10000:
            raise RuntimeError('Provider failed to settle')
    if not captured:
        raise RuntimeError('Provider did not produce a result')
    result = json.loads(captured[-1])
    print(f'Result: {len(result)} source(s), {len(calls)} request(s)', flush=True)
    if not result and not allow_empty:
        raise RuntimeError('Expected at least one source')
    if not live:
        expected = 1 if name == 'movix' and scenario == 'direct' else 3 if name == 'purstream' else 2
        assert len(calls) == expected, (name, len(calls), expected)
    for item in result:
        assert isinstance(item.get('url'), str) and item['url'].startswith('https://')
        assert isinstance(item.get('headers'), dict)
        assert '/troll/' not in item['url']
    summary = dict(provider=name, args=args, sources=len(result), requests=len(calls), seconds=round(time.monotonic()-started_all, 2))
    return result, summary


def probe_media(item):
    """Read HLS manifests and a small range of one segment; never print signed URLs."""
    url, headers = item['url'], item['headers']
    for depth in range(4):
        try:
            request_headers = {**headers, 'Range': 'bytes=0-1023'} if depth else headers
            req = urllib.request.Request(url, headers=request_headers)
            try:
                response = urllib.request.urlopen(req, timeout=12)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                status = response.status
                body = response.read(65536 if depth < 3 else 1024)
                final_url = response.url
            if status not in (200, 206):
                return dict(ok=False, stage=depth, status=status)
            if body.lstrip().startswith(b'#EXTM3U'):
                links = [line.strip() for line in body.decode('utf-8').splitlines() if line.strip() and not line.startswith('#')]
                if not links:
                    return dict(ok=False, stage=depth, reason='HLS has no media entries')
                url = urllib.parse.urljoin(final_url, links[0])
            else:
                if depth == 0 and item['format'] == 'm3u8':
                    return dict(ok=False, stage=depth, reason='Not an HLS playlist')
                if not body or body.lstrip().lower().startswith((b'<!doctype', b'<html')):
                    return dict(ok=False, stage=depth, reason='Empty or HTML body')
                return dict(ok=True, stage=depth, status=status, sample_bytes=len(body))
        except Exception as error:
            return dict(ok=False, stage=depth, reason=type(error).__name__)
    return dict(ok=False, reason='Manifest nesting limit')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--all', action='store_true', help='Check every provider in manifest.json')
    parser.add_argument('--provider', type=Path, default=ROOT / 'providers/movix.js')
    parser.add_argument('--tmdb-key-env', default='NUVIO_TMDB_API_KEY', help='Environment variable used to emulate the app-injected TMDB key')
    parser.add_argument('--probe-media', action='store_true', help='Also check playlists and a small sample of one media segment')
    parser.add_argument('--report', type=Path, help='Write a summary without signed URLs or credentials')
    options = parser.parse_args()
    providers = [ROOT / entry['filename'] for entry in json.loads((ROOT / 'manifest.json').read_text())['scrapers']] if options.all else [options.provider]
    report = []
    for provider in providers:
        cases = [('603', 'movie', None, None), ('550', 'movie', None, None), ('1399', 'tv', 1, 1)] if options.live else [('603', 'movie', None, None)]
        for args in cases:
            print('Checking', provider.name, args, flush=True)
            result, summary = check(provider, args, live=options.live, metadata_key=os.environ.get(options.tmdb_key_env, ''))
            if options.live and options.probe_media:
                summary['media_probe'] = probe_media(result[0])
                print('Media probe:', summary['media_probe'], flush=True)
            report.append(summary)
        if not options.live and provider.stem == 'movix':
            for scenario in ['empty', 'network-error']:
                check(provider, cases[0], scenario=scenario)
        if not options.live and provider.stem == 'nakios':
            check(provider, ('1399', 'series', 0, 2))
    if options.report:
        options.report.write_text(json.dumps(report, indent=2) + '\n')
    print('PASS: JavaScript/source discovery; physical TV playback remains unverified')


if __name__ == '__main__':
    main()
