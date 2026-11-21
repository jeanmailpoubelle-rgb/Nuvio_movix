#!/usr/bin/env python3
"""Pin and shard a reviewed AniBridge v3 release; never run in plugin lookups.

Run the EN fixture/native/live checks before committing updated data. The old
revision stays available: installed older bundles keep their matching shard URLs.
"""
import argparse, hashlib, json, pathlib, urllib.request, subprocess, datetime, shutil

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
    if (base / 'index.json').exists() and json.loads((base / 'index.json').read_text())['source_sha256'] != digest:
        raise ValueError('Revision collision')
    for family in ('tvdb_show', 'tmdb_show', 'tmdb_movie'):
        for bucket in range(64):
            groups.setdefault((family, bucket), {})
    files = {}
    for (provider, bucket), rows in sorted(groups.items()):
        name = f'{provider}/{bucket:02d}.json'
        payload = (json.dumps({'schema': 1, 'revision': revision, 'rows': rows}, separators=(',', ':'), sort_keys=True) + '\n').encode()
        dest = base / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists() and dest.read_bytes() != payload:
            raise ValueError('Refusing to overwrite immutable shard')
        dest.write_bytes(payload)
        files[name] = hashlib.sha256(payload).hexdigest()
    manifest = {'schema': 1, 'revision': revision, 'source_url': SOURCE, 'source_sha256': digest,
                'source_meta': data['$meta'], 'attribution': 'AniBridge mappings contributors; MIT. See LICENSE-AniBridge.txt and upstream data-source notices.',
                'buckets': 64, 'files': files}
    base.mkdir(parents=True, exist_ok=True)
    index_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
    index_path = base / 'index.json'
    if index_path.exists() and index_path.read_bytes() != index_bytes:
        raise ValueError('Refusing to overwrite immutable index')
    index_path.write_bytes(index_bytes)
    return revision, len(files)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=pathlib.Path, help='Previously downloaded reviewed mappings.min.json')
    parser.add_argument('--publish-current', action='store_true', help='Validate and publish daily pointer; keep bundled baseline and provider bytes unchanged')
    args = parser.parse_args()
    raw = args.source.read_bytes() if args.source else urllib.request.urlopen(SOURCE, timeout=30).read()
    output = ROOT / 'plugins/sources-en/data'
    candidate_existed = (output / hashlib.sha256(raw).hexdigest()[:16]).exists()
    revision, count = generate(raw, output)
    if args.publish_current:
        pointer_path = ROOT / 'plugins/sources-en/data/current.json'
        previous = json.loads(pointer_path.read_text()) if pointer_path.exists() else None
        subprocess.run(['node', str(ROOT / 'scripts/validate_en_mappings.cjs'), revision, previous['revision'] if previous else ''], check=True)
        if previous and previous['revision'] != revision:
            old_base = output / previous['revision']
            index = json.loads((output / revision / 'index.json').read_text())
            unchanged = all((old_base / name).exists() and json.loads((old_base / name).read_text())['rows'] == json.loads((output / revision / name).read_text())['rows'] for name in index['files'])
            if unchanged:
                if not candidate_existed:
                    shutil.rmtree(output / revision)
                print('Upstream checked: mapping rows unchanged; no redundant snapshot published.')
                return
        if not previous or previous['revision'] != revision:
            value = {'schema':1, 'revision':revision, 'source_sha256':hashlib.sha256(raw).hexdigest(),
                     'publishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
            temporary = pointer_path.with_suffix('.tmp')
            temporary.write_text(json.dumps(value, indent=2) + '\n')
            temporary.replace(pointer_path)
        print(f'Validated daily revision {revision}; bundled baseline unchanged.')
        return
    path = ROOT / 'config/sources-en.json'
    config = json.loads(path.read_text())
    config['mappingRevision'] = revision
    path.write_text(json.dumps(config, indent=2) + '\n')
    print(f'Pinned revision {revision}; {count} shards. Run EN regressions before publishing.')

if __name__ == '__main__':
    main()
