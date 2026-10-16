#!/usr/bin/env python3
"""Run providers in QuickJS with the actual Nuvio Android TV 1.0.0 JS polyfill.

The native HTTP callback is Python urllib, not Android OkHttp. Native playback,
Android DNS/TLS and the exact device QuickJS build still need a television test.
"""
import argparse
import base64
import json
import hashlib
import os
import re
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
MOBILE_POLYFILL = (ROOT / 'tests/fixtures/nuvio-mobile-2026-10-15-polyfill.js').read_text()
MOBILE_CALL = (ROOT / 'tests/fixtures/nuvio-mobile-2026-10-15-call.js').read_text()


def fixture_response(provider, url, scenario):
    media = 'https://cdn.example/master.m3u8'
    if url == media:
        return '#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="fr",NAME="Français",URI="fr.vtt"\n#EXT-X-STREAM-INF:BANDWIDTH=1000000\nvideo.m3u8'
    if '/movie/155/' in url:
        return '<iframe id="pf" src="https://vidzy.cc/embed-darkknight.html"></iframe><script>var CFG={"version":"vf"}</script>'
    if '/embed-darkknight.html' in url:
        return 'metaTitle:"The_Dark_Knight_2008_Multi_1080p_fixture.mkv.mp4";file:"' + media + '";'
    if '/serie/2316/1/1/' in url:
        return '<iframe id="pf" src="https://vidzy.cc/embed-office.html"></iframe><script>var CFG={"version":"vf"}</script>'
    if '/embed-office.html' in url:
        tracks = ','.join("{kind:'subtitles',srclang:'" + lang + "',label:'" + label + "',src:(function(u){var j=u.indexOf('/',8);return location.protocol+'//'+location.host+u.slice(j);})('https://vidzy.org/srtproxy/fixture_" + lang + ".vtt')}" for lang, label in [('eng', 'English'), ('fre', 'French')])
        return 'metaTitle:"The.Office.MULTI.1080p.mkv";file:"' + media + '";player.loadTracks([' + tracks + ']);'
    if '/serie/108978/4/1/' in url:
        lang = url.rsplit('/', 1)[-1]
        return '<iframe id="pf" src="https://vidzy.cc/embed-reacher' + lang + '.html"></iframe><script>var CFG={"version":"' + lang + '"};</script>'
    if '/embed-reacher' in url:
        lang = 'vostfr' if 'vostfr' in url else 'vf'
        return 'sources:[{file:"https://cdn.example/reacher/' + lang + '/master.m3u8"}]'
    if '/api/purstream/' in url:
        if scenario == 'network-error':
            return None
        return {'sources': [] if scenario == 'empty' else [{'url': media, 'name': 'pulse | 1440p | MULTI'}]}
    if '/api/cpasmal/' in url:
        return {'links': {'vf': [{'url': 'https://backup.example/master.m3u8' if scenario == 'missing-playlist' else media}]}}
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


def check(provider, args, live=False, scenario='direct', metadata_key='', provider_settings=None, allow_empty=False, runtime='tv'):
    context = quickjs.Context()
    context.set_memory_limit(32 * 1024 * 1024)
    calls, captured, native_sleeps, http_failures = [], [], [], []
    started_all = time.monotonic()
    name = provider.stem

    def native_fetch(url, method, headers_json, *body_args):
        body = body_args[0] if len(body_args) == 1 else body_args[1] if len(body_args) > 1 else ''
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
            data['bodyBase64'] = base64.b64encode(data['body'].encode()).decode()
            if not data['ok']:
                parsed = urllib.parse.urlsplit(url)
                http_failures.append(dict(host=parsed.netloc, status=data['status'], playlist=parsed.path.endswith('.m3u8')))
            return json.dumps(data)
        result = fixture_response(name, url, scenario)
        status = 404 if scenario == 'missing-playlist' and url == 'https://cdn.example/master.m3u8' else 200 if result is not None else 0
        data = dict(ok=200 <= status < 300, status=status, statusText='fixture', url=url, headers={},
                    body=result if isinstance(result, str) else json.dumps(result) if result is not None else '')
        data['bodyBase64'] = base64.b64encode(data['body'].encode()).decode()
        return json.dumps(data)

    context.add_callable('__native_fetch', native_fetch)
    context.add_callable('__log', lambda *items: print('JS', *items, flush=True))
    context.add_callable('__get_scraper_id', lambda: name + '-tv')
    context.add_callable('__get_scraper_settings', lambda: json.dumps(provider_settings or {}))
    context.add_callable('__get_tmdb_api_key', lambda: metadata_key or ('test-key' if not live else ''))
    context.add_callable('__get_call_args', lambda: json.dumps(dict(tmdbId=args[0], mediaType=args[1], season=args[2], episode=args[3])))
    context.add_callable('__capture_result', lambda value: captured.append(value))
    context.add_callable('__native_sleep_started', lambda delay: native_sleeps.append(delay))
    context.eval('var console={log:__log,warn:__log,error:__log};')
    # A coroutine-backed sleep remains an active native job after the timer's
    # JS callback is cleared. Model that pending job without actually sleeping.
    context.eval('function __plugin_sleep(delay){ __native_sleep_started(delay); return new Promise(function(){}); }')
    context.eval(MOBILE_POLYFILL if runtime == 'mobile' else POLYFILL)
    assert context.eval('typeof setTimeout') == ('function' if runtime == 'mobile' else 'undefined')
    assert context.eval('typeof document') == 'undefined'
    context.eval('var module={exports:{}};var exports=module.exports;(function(){\n' + provider.read_text() + '\n})();')
    context.eval(MOBILE_CALL if runtime == 'mobile' else CALL)
    jobs = 0
    while context.execute_pending_job():
        jobs += 1
        if jobs > 10000:
            raise RuntimeError('Provider failed to settle')
    if not captured:
        raise RuntimeError('Provider did not produce a result')
    assert not native_sleeps, 'Provider created pending native timer jobs: ' + str(native_sleeps)
    result = json.loads(captured[-1])
    print(f'Result: {len(result)} source(s), {len(calls)} request(s)', flush=True)
    if not result and not allow_empty and name != 'purstream':
        raise RuntimeError('Expected at least one source')
    if not live:
        expected = 0 if name == 'purstream' else 4 if name == 'nakios' and args[0] == '108978' else 2 if name == 'movix' and scenario == 'direct' else 5 if name == 'movix' and scenario == 'network-error' else 3 if name == 'nakios' or scenario == 'missing-playlist' else 2
        assert len(calls) == expected, (name, len(calls), expected)
    for item in result:
        assert isinstance(item.get('url'), str) and item['url'].startswith('https://')
        assert isinstance(item.get('headers'), dict)
        assert '/troll/' not in item['url']
    summary = dict(provider=name, bundle_sha256=hashlib.sha256(provider.read_bytes()).hexdigest(), runtime=runtime, args=args, sources=len(result), languages=[item.get('language', '') for item in result], subtitles=sum(len(item.get('subtitles', [])) for item in result), requests=len(calls), http_failures=http_failures, pending_native_timers=len(native_sleeps), seconds=round(time.monotonic()-started_all, 2))
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


def probe_subtitles(item):
    """Validate sidecars and HLS subtitle renditions, without modifying the stream.

    No track is not evidence that a VOSTFR label has burned-in subtitles. That
    requires separate visual inspection of decoded dialogue frames.
    """
    def read(url, headers):
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=12) as response:
            return response.read(262144).decode('utf-8-sig'), response.url

    tracks = [(track['url'], track.get('headers', item['headers']), track.get('language', track.get('lang', '')))
              for track in item.get('subtitles', [])]
    try:
        if item.get('format') == 'm3u8':
            body, base = read(item['url'], item['headers'])
            for line in body.splitlines():
                if line.startswith('#EXT-X-MEDIA:') and 'TYPE=SUBTITLES' in line:
                    uri, language = re.search(r'URI="([^"]+)"', line), re.search(r'LANGUAGE="([^"]+)"', line)
                    if uri:
                        tracks.append((urllib.parse.urljoin(base, uri[1]), item['headers'], language[1] if language else ''))
        results = []
        seen = set()
        for url, headers, language in tracks:
            identity = (url, json.dumps(headers, sort_keys=True))
            if identity in seen:
                continue
            seen.add(identity)
            body, base = read(url, headers)
            if body.lstrip().startswith('#EXTM3U'):
                links = [line.strip() for line in body.splitlines() if line.strip() and not line.startswith('#')]
                if not links:
                    raise ValueError('Empty subtitle playlist')
                # Initial subtitle segments can contain only a WEBVTT header.
                has_cues = False
                for link in links[:3]:
                    segment, _ = read(urllib.parse.urljoin(base, link), headers)
                    has_cues = has_cues or bool(re.search(r'\d\d:\d\d[.,]\d{3}\s+-->', segment))
                results.append(dict(language=language, ok=has_cues, type='hls-vtt'))
            else:
                results.append(dict(language=language, ok=bool(re.search(r'\d\d:\d\d[.,]\d{3}\s+-->', body)), type='sidecar'))
        return dict(ok=all(track['ok'] for track in results), tracks=results,
                    note='No separate subtitle track advertised' if not results else '')
    except Exception as error:
        return dict(ok=False, reason=type(error).__name__)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--all', action='store_true', help='Check every provider in manifest.json')
    parser.add_argument('--provider', type=Path, default=ROOT / 'providers/movix.js')
    parser.add_argument('--tmdb-key-env', default='NUVIO_TMDB_API_KEY', help='Environment variable used to emulate the app-injected TMDB key')
    parser.add_argument('--probe-media', action='store_true', help='Also check playlists and a small sample of one media segment')
    parser.add_argument('--report', type=Path, help='Write a summary without signed URLs or credentials')
    parser.add_argument('--runtime', choices=['tv', 'mobile', 'both'], default='tv')
    options = parser.parse_args()
    providers = [ROOT / entry['filename'] for entry in json.loads((ROOT / 'manifest.json').read_text())['scrapers']] if options.all else [options.provider]
    report = []
    for runtime in ['tv', 'mobile'] if options.runtime == 'both' else [options.runtime]:
        for provider in providers:
            cases = [('603', 'movie', None, None), ('550', 'movie', None, None), ('1399', 'tv', 1, 1)] if options.live else [('603', 'movie', None, None)]
            for args in cases:
                print('Checking', runtime, provider.name, args, flush=True)
                result, summary = check(provider, args, live=options.live, metadata_key=os.environ.get(options.tmdb_key_env, ''), runtime=runtime)
                if options.live and options.probe_media:
                    summary['media_probes'] = [{'language': source.get('language'), **probe_media(source)} for source in result]
                    print('Media probes:', summary['media_probes'], flush=True)
                report.append(summary)
            if not options.live and provider.stem == 'movix':
                for scenario in ['empty', 'network-error', 'missing-playlist']:
                    check(provider, cases[0], scenario=scenario, runtime=runtime)
            if not options.live and provider.stem == 'nakios':
                check(provider, ('1399', 'series', 0, 2), runtime=runtime)
                result, _ = check(provider, ('108978', 'tv', 4, 1), runtime=runtime)
                assert [item['language'] for item in result] == ['VF', 'VOSTFR']
                result, _ = check(provider, ('2316', 'tv', 1, 1), runtime=runtime)
                assert result[0]['language'] == 'MULTI'
                assert [track['language'] for track in result[0]['subtitles']] == ['en', 'fr']
                result, _ = check(provider, ('155', 'movie', None, None), runtime=runtime)
                assert result[0]['language'] == 'MULTI' and result[0]['quality'] == '1080p'
                assert not result[0].get('subtitles')
    if options.report:
        options.report.write_text(json.dumps(report, indent=2) + '\n')
    print('PASS: JavaScript/source discovery; physical TV playback remains unverified')


if __name__ == '__main__':
    main()
