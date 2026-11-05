#!/usr/bin/env python3
"""Read a private AIOmetadata endpoint; emit only public show/episode facts.

Never print or persist the manifest URL, raw responses, headers or exceptions.
The URL is supplied only through NUVIO_AIOMETADATA_MANIFEST_URL.
"""
import argparse
import concurrent.futures
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

CASES = [('hunter', '46298', 'tt2098220'), ('jujutsu', '95479', 'tt12343534'), ('apothecary', '220542', 'tt26743760'), ('aot', '1429', 'tt2560140'), ('ippo', '42705', 'tt0481256')]


def manifest_base(value):
    value = value.strip()
    if value.startswith('stremio://'):
        value = 'https://' + value[10:]
    parsed = urllib.parse.urlsplit(value)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password
            or parsed.fragment or re.search(r'\s', value) or not parsed.path.endswith('/manifest.json')):
        raise ValueError('invalid-manifest-url')
    return parsed._replace(path=parsed.path[:-14]), value


def tvdb_episode_id(video):
    direct = str(video.get('_tvdbEpisodeId') or '')
    if re.fullmatch(r'[1-9]\d*', direct):
        return direct
    url = video.get('thumbnail')
    if not isinstance(url, str):
        return None
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname != 'artworks.thetvdb.com':
        return None
    modern = re.fullmatch(r'/banners/v4/episode/([1-9]\d*)/screencap/[^/]+', parsed.path)
    legacy = re.fullmatch(r'/banners/episodes/[1-9]\d*/([1-9]\d*)\.[a-zA-Z0-9]+', parsed.path)
    return (modern or legacy)[1] if modern or legacy else None


def public_meta(meta):
    if not isinstance(meta, dict):
        raise ValueError('missing-meta')
    identity = {}
    for key in ['id', 'imdb_id', '_imdbId', 'moviedb_id', '_tmdbId', '_tvdbId']:
        value = str(meta.get(key) or '')
        if re.fullmatch(r'(?:tt\d+|(?:tmdb|tvdb|kitsu|mal|anilist|anidb):\d+|\d+)', value):
            identity[key] = value
    result = dict(identity=identity, provider=meta.get('_metaProvider') if meta.get('_metaProvider') in ['tmdb', 'tvdb', 'imdb', 'kitsu', 'mal', 'anilist', 'anidb'] else 'unknown', videos=[])
    for v in meta.get('videos', []):
        if not isinstance(v, dict):
            continue
        row = {k: v[k] for k in ['season', 'episode'] if type(v.get(k)) is int}
        video_id = str(v.get('id') or '')
        if re.fullmatch(r'(?:tt\d+|(?:tmdb|tvdb|kitsu|mal|anilist|anidb):\d+)(?::\d+){1,2}', video_id):
            row['id'] = video_id
        name = v.get('title') or v.get('name')
        if isinstance(name, str):
            row['name'] = name[:200]
        date = v.get('released') or v.get('firstAired')
        if isinstance(date, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}(?:T[\d:.+-]+Z?)?', date):
            row['released'] = date
        external = tvdb_episode_id(v)
        if external:
            row['tvdbEpisodeId'] = external
        result['videos'].append(row)
    return result


def fetch_json(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=50) as response:
        body = response.read(4 * 1024 * 1024 + 1)
        if len(body) > 4 * 1024 * 1024:
            raise ValueError('metadata-too-large')
        return json.loads(body)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    secret = os.environ.get('NUVIO_AIOMETADATA_MANIFEST_URL', '')
    report = dict(scope='Public episode facts only; no private config URL/raw response/header retained', results=[])
    try:
        base, _ = manifest_base(secret)
    except Exception:
        report['blocked'] = 'missing-or-invalid-private-manifest-url'
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + '\n')
        print(report['blocked'])
        return 1

    def probe(job):
        name, tmdb, imdb, namespace = job
        catalog_id = imdb if namespace == 'imdb' else 'tmdb:' + tmdb
        url = urllib.parse.urlunsplit(base._replace(path=base.path + '/meta/series/' + catalog_id + '.json'))
        result = dict(case=name, query_namespace=namespace)
        try:
            data = fetch_json(url)
            result.update(status='ok', metadata=public_meta(data.get('meta')))
        except urllib.error.HTTPError as error:
            result.update(status='http-error', http_status=error.code)
        except Exception:
            result.update(status='unavailable-or-invalid-metadata')
        return result

    jobs = [(n, t, i, ns) for n, t, i in CASES for ns in ['imdb', 'tmdb']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        report['results'] = list(pool.map(probe, jobs))
    key = os.environ.get('NUVIO_TMDB_API_KEY', '')
    report['external_episode_checks'] = []
    selected = {'hunter': [(1, 26), (2, 1), (2, 27), (2, 32), (2, 50), (2, 72)], 'jujutsu': [(2, 1)], 'apothecary': [(2, 1), (3, 1)], 'ippo': [(1, 1), (1, 75), (1, 76), (2, 1), (2, 26), (3, 1), (3, 25)], 'aot': [(1, 1), (3, 22), (4, 1), (4, 2), (4, 16), (4, 17), (4, 28), (4, 29), (4, 30)]}
    for row in report['results']:
        if row['query_namespace'] != 'imdb':
            continue
        for v in row.get('metadata', {}).get('videos', []):
            if (v.get('season'), v.get('episode')) not in selected.get(row['case'], []):
                continue
            external = v.get('tvdbEpisodeId')
            item = dict(case=row['case'], input=[v.get('season'), v.get('episode')], tvdbEpisodeId=external)
            if not key or not external:
                item['status'] = 'key-or-episode-id-unavailable'
            else:
                try:
                    url = 'https://api.themoviedb.org/3/find/' + external + '?external_source=tvdb_id&api_key=' + urllib.parse.quote(key, safe='')
                    data = fetch_json(url)
                    item.update(status='ok', results=[{k: x.get(k) for k in ['show_id', 'season_number', 'episode_number', 'id']} for x in data.get('tv_episode_results', [])])
                except Exception:
                    item['status'] = 'external-episode-lookup-unavailable'
            report['external_episode_checks'].append(item)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    for row in report['results']:
        meta = row.get('metadata', {})
        print(row['case'], row['query_namespace'], row['status'], meta.get('provider', ''), 'episodes', len(meta.get('videos', [])), 'TVDB episode IDs', sum(bool(v.get('tvdbEpisodeId')) for v in meta.get('videos', [])))
    return 0 if any(r['status'] == 'ok' for r in report['results']) else 1


if __name__ == '__main__':
    raise SystemExit(main())
