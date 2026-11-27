#!/usr/bin/env python3
"""Compare private Xperience/AIO episode facts; never retain private URLs or bodies."""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import os
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CASES = [
    ('hunter', '46298', 'tt2098220', '252322', [(1, 1), (2, 1), (2, 22), (2, 62), (2, 63), (2, 72)]),
    ('apothecary', '220542', 'tt26743760', '431162', [(1, 1), (2, 1), (3, 1)]),
    ('haikyuu', '60863', 'tt3398540', '278157', [(1, 1), (2, 1), (2, 15), (3, 1)]),
    ('jujutsu', '95479', 'tt12343534', '377543', [(1, 1), (1, 2), (1, 3), (2, 1)]),
    ('office', '2316', 'tt0386676', '73244', [(1, 1), (2, 1), (4, 1), (6, 1)]),
    ('vinland','88803','tt10233448','359274',[(1,1),(1,2),(1,3),(1,24),(2,1),(2,24)]),
    ('remarried-empress','279246','tt39325975','455351',[(1,1),(1,2),(1,4),(1,5)]),
    ('the-body','291507','tt8014982','463695',[(1,1),(1,2)]),
]
KNOWN = {
    'id', 'type', 'imdb_id', '_imdbId', 'tmdb_id', '_tmdbId', 'moviedb_id',
    'tvdb_id', '_tvdbId', '_metaProvider', 'videos', 'behaviorHints', 'external_ids',
    'season', 'episode', 'title', 'name', 'released', 'firstAired', 'air_date',
    'thumbnail', '_tvdbEpisodeId', 'tvdbEpisodeId', 'tvdb_episode_id',
    'absolute', 'absoluteNumber', 'absolute_number', 'provider', 'metadataSource',
}
PROVIDERS = {'tmdb', 'tvdb', 'imdb', 'kitsu', 'mal', 'anilist', 'anidb'}
ID = re.compile(r'(?:tt\d+|(?:tmdb|tvdb|kitsu|mal|anilist|anidb):\d+|\d+)(?::\d+){0,2}\Z')
DATE = re.compile(r'\d{4}-\d{2}-\d{2}(?:T[\d:.+\-]+Z?)?\Z')

def base_url(value):
    value = value.strip()
    if value.startswith('stremio://'):
        value = 'https://' + value[10:]
    p = urllib.parse.urlsplit(value)
    if (p.scheme != 'https' or not p.hostname or p.username or p.password or p.fragment
            or re.search(r'\s|%0[ad]', value, re.I) or not p.path.endswith('/manifest.json')):
        raise ValueError('invalid-manifest')
    return p._replace(path=p.path[:-14]), value


def safe_fields(obj):
    return sorted(KNOWN.intersection(obj)) if isinstance(obj, dict) else []


def safe_id(value):
    return str(value) if not isinstance(value, (dict, list, bool)) and ID.fullmatch(str(value)) else None


def episode(v):
    out = {'fields': safe_fields(v)}
    for k in ['season', 'episode', 'absolute', 'absoluteNumber', 'absolute_number']:
        if type(v.get(k)) is int and 0 <= v[k] <= 100000:
            out[k] = v[k]
    for k in ['id', '_tvdbEpisodeId', 'tvdbEpisodeId', 'tvdb_episode_id', 'tvdb_id']:
        if (value := safe_id(v.get(k))) is not None:
            out[k] = value
    for k in ['released', 'firstAired', 'air_date']:
        if isinstance(v.get(k), str) and DATE.fullmatch(v[k]):
            out[k] = v[k]
    # Do not expose artwork URLs, title strings or non-whitelisted values.
    u = urllib.parse.urlsplit(v.get('thumbnail') if isinstance(v.get('thumbnail'), str) else '')
    if u.scheme == 'https' and u.hostname == 'artworks.thetvdb.com':
        if re.fullmatch(r'/banners/series/[1-9]\d*/episodes/[1-9]\d*\.[A-Za-z0-9]+',u.path):out['artwork_path_shape']='series-episode'
        elif re.fullmatch(r'/banners/v4/episode/[1-9]\d*/screencap/[^/]+',u.path):out['artwork_path_shape']='v4-episode'
        elif re.fullmatch(r'/banners/episodes/[1-9]\d*/[1-9]\d*\.[A-Za-z0-9]+',u.path):out['artwork_path_shape']='legacy-episode'
        m = re.fullmatch(r'/banners/(?:v4/episode/([1-9]\d*)/screencap/[^/]+|episodes/[1-9]\d*/([1-9]\d*)\.[A-Za-z0-9]+|series/[1-9]\d*/episodes/([1-9]\d*)\.[A-Za-z0-9]+)', u.path)
        if m:
            out['artwork_tvdb_episode_id'] = m[1] or m[2] or m[3]
    if u.scheme == 'https' and u.netloc == 'image.tmdb.org':
        m = re.fullmatch(r'/t/p/(?:original|w[1-9]\d*)/([A-Za-z0-9]{10,80}\.(?:jpg|png|webp))', u.path)
        if m:
            out['artwork_path_shape'] = 'tmdb-still'
            out['artwork_still_sha256'] = hashlib.sha256(('/'+m[1]).encode()).hexdigest()
    return out


def peer_counts(video, rows):
    def timestamp(v):
        raw=v.get('released') or v.get('firstAired') or v.get('air_date')
        if not isinstance(raw,str) or not DATE.fullmatch(raw):return None
        try:
            d=datetime.datetime.fromisoformat(raw.replace('Z','+00:00'))
            if d.tzinfo is None:d=d.replace(tzinfo=datetime.timezone.utc)
            return d.timestamp()
        except ValueError:return None
    stamp=timestamp(video)
    dated=[v for v in rows if stamp is not None and timestamp(v) is not None and abs(timestamp(v)-stamp)<=86400]
    return {'same_id':sum(v.get('id')==video.get('id') for v in rows),
            'release_peers':len(dated),'regular_release_peers':sum(type(v.get('season')) is int and v['season']>0 for v in dated)}


def summarize(meta, selected):
    if not isinstance(meta, dict):
        return {'status': 'missing-meta'}
    identities = {k: value for k in ['id', 'imdb_id', '_imdbId', 'tmdb_id', '_tmdbId', 'moviedb_id', 'tvdb_id', '_tvdbId'] if (value := safe_id(meta.get(k))) is not None}
    rows = [v for v in meta.get('videos', []) if isinstance(v, dict)] if isinstance(meta.get('videos'), list) else []
    seasons = {}
    for v in rows:
        s, e = v.get('season'), v.get('episode')
        if type(s) is int and type(e) is int and 0 <= s <= 1000 and 0 <= e <= 100000:
            seasons.setdefault(s, []).append(e)
    return {'status': 'ok', 'fields': safe_fields(meta), 'identities': identities,
            'provider': meta.get('_metaProvider') if isinstance(meta.get('_metaProvider'), str) and meta['_metaProvider'] in PROVIDERS else 'unknown',
            'video_count': len(rows),
            'seasons': [{'season': s, 'count': len(es), 'first': min(es), 'last': max(es)} for s, es in sorted(seasons.items())],
            'selected': [{'requested': [s, e], 'matches': [{**episode(v),'identity_peer_counts':peer_counts(v,rows)} for v in rows if v.get('season') == s and v.get('episode') == e]} for s, e in selected]}


def fetch(url):
    # No URL/exception logging. Bound response size/time and do not forward credentials.
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}), timeout=45) as r:
        raw = r.read(8 * 1024 * 1024 + 1)
        if len(raw) > 8 * 1024 * 1024:
            raise ValueError('too-large')
        return json.loads(raw)


def adapter(meta, case, origin):
    _, tmdb, imdb, tvdb, selected = case
    # Run the real pure adapter; raw response/URL stays in memory, never a file/log.
    code = '''const I=require('./src/input-metadata');let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{const d=JSON.parse(s);let ids;try{ids=I.identity(d.meta,d.ids)}catch(e){process.stdout.write(JSON.stringify({identity:e.code||'invalid'}));return}const rows=d.selected.map(([season,episode])=>{try{const x=I.select(d.meta,ids,season,episode,d.origin);const ext=I.tvdbEpisode(x.video,x.provider,x.proxyOrigin);return {requested:[season,episode],status:'selected',provider:x.provider,tvdbEpisodeId:ext?.id||null}}catch(e){return {requested:[season,episode],status:e.code||'invalid'}}});process.stdout.write(JSON.stringify({identity:'verified',selected:rows}))});'''
    p = subprocess.run(['node', '-e', code], input=json.dumps({'meta': meta, 'ids': {'tmdbId': tmdb, 'imdbId': imdb, 'tvdbId': tvdb}, 'selected': selected, 'origin': origin}), text=True, capture_output=True, cwd=ROOT, timeout=15)
    if p.returncode:
        return {'status': 'adapter-process-failed'}
    return json.loads(p.stdout)


def catalog_roundtrips(manifest, base):
    """Read bounded search -> actual returned ID -> meta, without private labels."""
    entries=manifest.get('catalogs')
    if not isinstance(entries,list):return []
    catalogs=[c for c in entries if isinstance(c,dict) and c.get('type') in ['series','tv','anime']
        and isinstance(c.get('id'),str) and 0<len(c['id'])<=200
        and isinstance(c.get('extra'),list)
        and any(isinstance(e,dict) and e.get('name')=='search' for e in c['extra'])][:4]
    results=[]
    for slot,catalog in enumerate(catalogs):
        for case_name,term in [('remarried-empress','The Remarried Empress'),('the-body','The Body')]:
            case=next(c for c in CASES if c[0]==case_name)
            name,tmdb,imdb,tvdb,selected=case
            row=dict(catalog_slot=slot,type=catalog['type'],case=name)
            try:
                path=base.path+'/catalog/'+catalog['type']+'/'+urllib.parse.quote(catalog['id'],safe='')+'/search='+urllib.parse.quote(term,safe='')+'.json'
                data=fetch(urllib.parse.urlunsplit(base._replace(path=path)))
                known={imdb,'tmdb:'+tmdb,'tvdb:'+tvdb}
                matches=[m for m in data.get('metas',[]) if isinstance(m,dict) and (str(m.get('id')) in known or str(m.get('imdb_id'))==imdb)]
                row['matching_rows']=len(matches)
                row['catalog_ids']=[safe_id(m.get('id')) for m in matches[:3]]
                if len(matches)==1 and safe_id(matches[0].get('id')):
                    identifier=matches[0]['id']
                    path=base.path+'/meta/'+catalog['type']+'/'+urllib.parse.quote(str(identifier),safe='')+'.json'
                    meta=fetch(urllib.parse.urlunsplit(base._replace(path=path))).get('meta')
                    row['metadata']=summarize(meta,selected)
                    row['current_adapter']=adapter(meta,case,base.scheme+'://'+base.netloc)
            except urllib.error.HTTPError as e:row.update(status='http-error',http_status=e.code)
            except Exception:row.update(status='unavailable-or-invalid')
            results.append(row)
    return results


def run_source(label, secret):
    try:
        base, manifest = base_url(secret)
    except Exception:
        return {'source': label, 'status': 'missing-or-invalid-secret'}
    result = {'source': label, 'status': 'probed', 'cases': []}
    try:
        d = fetch(manifest)
        # Only known enum/resource values, not addon names/descriptions/config.
        result['manifest'] = {'types': [t for t in d.get('types', []) if t in {'movie', 'series', 'anime', 'tv'}],
            'resources': [r if isinstance(r, str) else r.get('name') for r in d.get('resources', []) if (r if isinstance(r, str) else r.get('name') if isinstance(r, dict) else None) in {'catalog', 'meta', 'stream', 'subtitles'}]}
        result['catalog_roundtrips']=catalog_roundtrips(d,base)
    except urllib.error.HTTPError as e:
        result['manifest'] = {'http_status': e.code}
    except Exception:
        result['manifest'] = {'status': 'unavailable-or-invalid'}
    def probe(job):
        case, namespace = job
        name, tmdb, imdb, _, selected = case
        query_id = imdb if namespace == 'imdb' else 'tmdb:' + tmdb
        url = urllib.parse.urlunsplit(base._replace(path=base.path + '/meta/series/' + query_id + '.json'))
        row = {'case': name, 'namespace': namespace}
        try:
            d = fetch(url)
            meta = d.get('meta') if isinstance(d, dict) else None
            row['metadata'] = summarize(meta, selected)
            row['current_adapter'] = adapter(meta, case, base.scheme + '://' + base.netloc)
        except urllib.error.HTTPError as e:
            row.update(status='http-error', http_status=e.code)
        except Exception:
            row.update(status='unavailable-or-invalid')
        return row
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        result['cases'] = list(pool.map(probe, [(c, ns) for c in CASES for ns in ['imdb', 'tmdb']]))
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=Path, default=ROOT / 'reports/xperience/private-probe.json')
    args = p.parse_args()
    report = {'scope': 'Private configured metadata facts and current pure input adapter only; no media/device playback or full translation proof.',
              'results': [run_source('xperience', os.environ.get('NUVIO_XPERIENCE_MANIFEST_URL', '')), run_source('aiometadata-control', os.environ.get('NUVIO_AIOMETADATA_MANIFEST_URL', ''))]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print('Sanitized metadata probe written; private endpoints and bodies omitted.')
    return 0 if report['results'][0]['status'] == 'probed' else 1

if __name__ == '__main__':
    raise SystemExit(main())
