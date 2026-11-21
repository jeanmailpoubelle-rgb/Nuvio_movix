#!/usr/bin/env python3
"""Pin and shard a reviewed AniBridge v3 release; never run in plugin lookups.

Run the EN fixture/native/live checks before committing updated data. The old
revision stays available: installed older bundles keep their matching shard URLs.
"""
import argparse, hashlib, json, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = 'https://github.com/anibridge/anibridge-mappings/releases/download/v3/mappings.min.json'

def generate(raw, output):
    data = json.loads(raw)
    if not isinstance(data, dict) or not str(data.get('$meta', {}).get('schema_version', '')).startswith('3.'):
        raise ValueError('Expected AniBridge schema v3')
    digest = hashlib.sha256(raw).hexdigest()
    groups = {}
    for source, targets in data.items():
        parts = source.split(':')
        if parts[0] not in ('tvdb_show', 'tmdb_show', 'tmdb_movie'):
            continue
        if len(parts) not in (2, 3) or not parts[1].isdigit():
            raise ValueError('Invalid source descriptor')
        selected = {k: v for k, v in targets.items() if k.startswith('anilist:') and v}
        if selected:
            bucket = int(parts[1]) % 64
            groups.setdefault((parts[0], bucket), {})[source] = selected
    if not groups:
        raise ValueError('No episode mappings')
    revision = digest[:16]
    base = output / revision
    files = {}
    for (provider, bucket), rows in sorted(groups.items()):
        name = f'{provider}/{bucket:02d}.json'
        payload = (json.dumps({'schema': 1, 'revision': revision, 'rows': rows}, separators=(',', ':'), sort_keys=True) + '\n').encode()
        dest = base / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(payload)
        files[name] = hashlib.sha256(payload).hexdigest()
    manifest = {'schema': 1, 'revision': revision, 'source_url': SOURCE, 'source_sha256': digest,
                'source_meta': data['$meta'], 'attribution': 'AniBridge mappings contributors; MIT. See LICENSE-AniBridge.txt and upstream data-source notices.',
                'buckets': 64, 'files': files}
    base.mkdir(parents=True, exist_ok=True)
    (base / 'index.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return revision, len(files)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=pathlib.Path, help='Previously downloaded reviewed mappings.min.json')
    args = parser.parse_args()
    raw = args.source.read_bytes() if args.source else urllib.request.urlopen(SOURCE, timeout=30).read()
    revision, count = generate(raw, ROOT / 'plugins/sources-en/data')
    path = ROOT / 'config/sources-en.json'
    config = json.loads(path.read_text())
    config['mappingRevision'] = revision
    path.write_text(json.dumps(config, indent=2) + '\n')
    print(f'Pinned revision {revision}; {count} shards. Run EN regressions before publishing.')

if __name__ == '__main__':
    main()
