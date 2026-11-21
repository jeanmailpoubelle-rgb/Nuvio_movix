#!/usr/bin/env python3
"""Exercise the installed EN entry, mapping, master/media and preferred captions.

Runtime secrets configure only this cloud check, never the installed plugin.
Reports contain no URLs, keys, private config, bodies or subtitle dialogue.
"""
import argparse, hashlib, io, json, os, pathlib, re, sys, urllib.request
from contextlib import nullcontext
from unittest.mock import patch
from urllib.parse import urlsplit, urljoin
from quickjs_check import check, probe_media, probe_subtitles

ROOT = pathlib.Path(__file__).resolve().parents[1]

class BundleChangedDuringAudit(RuntimeError):
    pass

def probe_audio(stream):
    """Bounded network checks of preferred, referenced alternate audio tracks.

    Media probes alone follow a video variant and can miss dead audio groups.
    Never return rendition URLs, signed headers or response/segment bodies.
    """
    def attrs(line):
        return {m[0]: m[1] if m[1] else m[2] for m in re.findall(r'([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))(?:,|$)', line)}
    def lang(raw):
        value = str(raw).lower().replace('_', '-').split('-')[0]
        return {'jpn':'ja', 'eng':'en', 'fre':'fr', 'fra':'fr', 'zho':'zh', 'chi':'zh', 'kor':'ko'}.get(value, value)
    try:
        with urllib.request.urlopen(urllib.request.Request(stream['url'], headers=stream['headers']), timeout=12) as response:
            body, base = response.read(2 * 1024 * 1024).decode('utf-8-sig'), response.url
        lines = body.splitlines()
        groups = {attrs(l[18:]).get('AUDIO') for l in lines if l.startswith('#EXT-X-STREAM-INF:')}
        tracks = [attrs(l[13:]) for l in lines if l.startswith('#EXT-X-MEDIA:')]
        wanted = set(stream.get('audioLanguages', []))
        results, seen = [], set()
        for track in tracks:
            language, uri = lang(track.get('LANGUAGE', '')), track.get('URI')
            if track.get('TYPE') != 'AUDIO' or track.get('GROUP-ID') not in groups or language not in wanted or not uri:
                continue
            url = urljoin(base, uri)
            if url in seen:
                continue
            seen.add(url)
            if urlsplit(url).netloc != urlsplit(stream['url']).netloc:
                return {'ok':False, 'code':'AUDIO_ORIGIN_CHANGED'}
            result = probe_media({'url':url, 'headers':stream['headers'], 'format':'m3u8'})
            results.append({'language':language, 'ok':result['ok'], **({} if result['ok'] else {'code':'AUDIO_MEDIA_UNAVAILABLE'})})
        found = {r['language'] for r in results}
        return {'ok': bool(wanted) and wanted <= found and all(r['ok'] for r in results), 'tracks':results}
    except Exception as error:
        return {'ok':False, 'code':type(error).__name__}

def public_control_open(original):
    """Replace only key-dependent/private metadata with public fixture facts.

    All mapping shards, ani.zip proof, Ani.pm/Settlar and media/captions stay live.
    This is explicitly NOT a private configured-input end-to-end test.
    """
    fixtures = json.loads((ROOT / 'tests/fixtures/input-metadata/series.json').read_text()) + json.loads((ROOT / 'tests/fixtures/sources-en-extra.json').read_text())
    starts = json.loads((ROOT / 'tests/fixtures/sources-en-starts.json').read_text())
    class Response(io.BytesIO):
        status = 200
        reason = 'OK'
        headers = {'content-type': 'application/json'}
        def __init__(self, url, data):
            super().__init__(json.dumps(data).encode())
            self.url = url
    def open_(request, *args, **kwargs):
        url = request.full_url if hasattr(request, 'full_url') else str(request)
        u = urlsplit(url)
        for f in fixtures:
            if u.hostname == 'api.themoviedb.org' and u.path == '/3/find/' + f['imdbId']:
                return Response(url, dict(tv_results=[dict(id=int(f['tmdbId']))], movie_results=[]))
            if u.hostname == 'api.themoviedb.org' and u.path == '/3/tv/' + f['tmdbId']:
                return Response(url, dict(id=int(f['tmdbId']), original_language='ja', external_ids=dict(imdb_id=f['imdbId'], tvdb_id=int(f['tvdbId']))))
            if u.hostname == 'input.example' and u.path.endswith('/meta/series/' + f['imdbId'] + '.json'):
                extra = [dict(id=v['imdbId']+':1:1', season=1, episode=1, released=v['released'], _tvdbEpisodeId=v['tvdbEpisodeId']) for v in starts if v['tmdbId']==f['tmdbId'] and not any(e['input']==[1,1] for e in f['episodes'])]
                return Response(url, dict(meta=dict(id=f['imdbId'], _imdbId=f['imdbId'], _tmdbId=f['tmdbId'], _tvdbId=f['tvdbId'], _metaProvider='tvdb',
                    videos=[dict(id=v['streamId'], season=v['input'][0], episode=v['input'][1], released=v['released'], **({'_tvdbEpisodeId':v['tvdbEpisodeId']} if v['tvdbEpisodeId'] else {})) for v in f['episodes']]+extra)))
        if u.hostname == 'api.themoviedb.org' and u.path == '/3/movie/372058':
            return Response(url, dict(id=372058, original_language='ja', external_ids=dict(imdb_id='tt5311514')))
        if u.hostname == 'input.example':
            raise ValueError('No public metadata fixture for this request')
        return original(request, *args, **kwargs)
    return open_

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=pathlib.Path, default=ROOT / 'reports/sources-en/report.json')
    p.add_argument('--case', action='append', default=[])
    p.add_argument('--public-controls', action='store_true', help='Live source controls with public metadata fixtures; no private/key access')
    options = p.parse_args()
    inventory = json.loads((ROOT / 'config/sources-en-maintenance.json').read_text())
    key = os.environ.get('NUVIO_TMDB_API_KEY', '')
    manifest = os.environ.get('NUVIO_AIOMETADATA_MANIFEST_URL', '')
    if options.public_controls:
        key, manifest = 'public-control', 'https://input.example/control/manifest.json'
    provider = ROOT / 'plugins/sources-en/providers/sources-en.js'
    config = json.loads((ROOT / 'config/sources-en.json').read_text())
    report = {'scope': ('Live source control; ONLY TMDB/private metadata replaced with public fixtures; not full configured-input evidence. ' if options.public_controls else 'Private configured-input installed entry. ') + 'Literal Mobile wrapper with Python HTTP; not physical Android playback.',
              'version': json.loads((ROOT / 'plugins/sources-en/manifest.json').read_text())['version'],
              'bundle_sha256': hashlib.sha256(provider.read_bytes()).hexdigest(),
              'mapping_revision': config['mappingRevision'], 'results': []}
    cases = [c for c in inventory['cases'] if not options.case or c['id'] in options.case]
    if not cases or set(options.case) - {c['id'] for c in cases}:
        raise SystemExit('Unknown or empty public case selection')
    for case in cases:
        entry_id = case.get('entryId', inventory['entryId'])
        if entry_id not in ('sources-en-anipm', 'sources-en-anipm-beta'):
            raise SystemExit('Unknown playback entry in inventory')
        row = {'case': case['id'], 'args': case['args'], 'entryId': entry_id}
        if not key or case['args'][1] == 'tv' and not manifest:
            row.update(status='blocked', code='RUNTIME_SECRET_MISSING')
        else:
            logs = io.StringIO()
            try:
                control = patch('urllib.request.urlopen', public_control_open(urllib.request.urlopen)) if options.public_controls else nullcontext()
                with control:
                    streams, summary = check(provider, case['args'], live=True, metadata_key=key,
                        provider_settings={'aiometadataManifestUrl': manifest, 'diagnostics': True},
                        runtime='mobile', scraper_id='repository:' + entry_id, allow_empty=True, log_sink=logs)
                if summary['bundle_sha256'] != report['bundle_sha256']:
                    raise BundleChangedDuringAudit()
                warning_codes=[s.get('warningCode') for s in streams if s.get('warning') is True]
                streams=[s for s in streams if s.get('warning') is not True]
                row['warning_codes']=warning_codes
                events = []
                for line in logs.getvalue().splitlines():
                    m = re.search(r'\[sources-en\] (\{.*\})$', line)
                    if m:
                        event = json.loads(m[1])
                        events.append({k: v for k, v in event.items() if k in ('code', 'type', 'id', 'input', 'anilistId', 'episode', 'provider', 'season', 'tvdbEpisodeId', 'sources', 'requests', 'channel', 'stage', 'status', 'kind', 'challenge', 'state', 'tmdbId', 'revision', 'checks', 'field', 'expected', 'actual')})
                mapped = [e for e in events if e['code'] == 'EN_MAPPED']
                mapping_ok = len(mapped) == 1 and mapped[0]['anilistId'] == case['anilistId'] and mapped[0]['episode'] == case['episode']
                player_contract_ok = bool(streams) and all(s.get('type') == 'hls' and s.get('format') == 'm3u8' for s in streams)
                row.update(mapping_ok=mapping_ok, mapping_revisions=[e['revision'] for e in events if e['code']=='EN_MAPPING_DATA'], player_contract_ok=player_contract_ok, events=events, sources=len(streams), requests=summary['requests'], seconds=summary['seconds'],
                    streams=[{'server':s.get('server'), 'type': s.get('type'), 'quality': s.get('quality'), 'audio': s.get('audioLanguages'), 'subtitles': s.get('subtitleLanguages')} for s in streams],
                    http_failures=summary['http_failures'])
                media = [probe_media(s) for s in streams]
                subtitles = [probe_subtitles(stream) for stream in streams]
                audio = [probe_audio(stream) for stream in streams] if entry_id == 'sources-en-anipm-beta' else []
                expected_audio_ok = all(language in {l for stream in streams for l in stream.get('audioLanguages', [])} for language in case.get('expectedAudio', []))
                row.update(status='pass' if mapping_ok and player_contract_ok and expected_audio_ok and all(m['ok'] for m in media) and all(s['ok'] for s in subtitles) and all(a['ok'] for a in audio) else 'attention',
                    media=media, captions=subtitles, audio=audio)
            except Exception as error:
                row.update(status='attention', code=type(error).__name__)
        report['results'].append(row)
        options.output.parent.mkdir(parents=True, exist_ok=True)
        options.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
        print(case['id'], row['status'], 'mapping', row.get('mapping_ok'), 'sources', row.get('sources'), flush=True)
    return 0 if all(r['status'] == 'pass' for r in report['results']) else 1

if __name__ == '__main__':
    sys.exit(main())
