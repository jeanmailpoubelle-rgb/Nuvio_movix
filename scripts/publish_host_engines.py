#!/usr/bin/env python3
"""Sign exact tested bundles. Private key path is supplied only by the release job."""
import argparse
import base64
import json
import pathlib
import re
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--revision', required=True)
    parser.add_argument('--sequence', required=True, type=int)
    parser.add_argument('--key', required=True, type=pathlib.Path)
    parser.add_argument('--output', default=ROOT / 'hosted-engines/stable.json', type=pathlib.Path)
    args = parser.parse_args()
    if not re.fullmatch(r'[a-f0-9]{40}', args.revision) or args.sequence <= 0:
        raise SystemExit('Invalid release coordinates')
    manifest = json.loads((ROOT / 'hosted-engines/bundled.json').read_text())
    manifest.update(sequence=args.sequence, revision=args.revision)
    for spec in manifest['files'].values():
        path = spec.pop('path')
        spec['url'] = f'https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/{args.revision}/{path}'
    if args.output.exists():
        previous = json.loads(base64.b64decode(json.loads(args.output.read_text())['payload']))
        # Do not issue a new engine release just because the UI/docs or a CI run changed.
        old = {k: previous.get(k) for k in ('api', 'minApp', 'engines')}
        new = {k: manifest.get(k) for k in ('api', 'minApp', 'engines')}
        old_hashes = {k: v['sha256'] for k, v in previous['files'].items()}
        new_hashes = {k: v['sha256'] for k, v in manifest['files'].items()}
        if old == new and old_hashes == new_hashes:
            print('Hosted engine code unchanged; no new release')
            return
        if previous['sequence'] >= args.sequence:
            raise SystemExit('Release sequence must increase')
    payload = json.dumps(manifest, separators=(',', ':'), sort_keys=True).encode()
    with tempfile.TemporaryDirectory(prefix='host-engine-sign-') as temp:
        data = pathlib.Path(temp) / 'payload'; data.write_bytes(payload)
        signature = subprocess.check_output(['openssl', 'dgst', '-sha256', '-sign', str(args.key), str(data)])
        # Verify against the public key pinned into this APK before publishing anything.
        sig = pathlib.Path(temp) / 'signature'; sig.write_bytes(signature)
        subprocess.run(['openssl', 'dgst', '-sha256', '-verify', str(ROOT / 'hosted-engines/release-public.pem'), '-signature', str(sig), str(data)], check=True, stdout=subprocess.DEVNULL)
    args.output.write_text(json.dumps({'payload': base64.b64encode(payload).decode(), 'signature': base64.b64encode(signature).decode()}, indent=2) + '\n')
    print(f'Authenticated hosted engine release {args.sequence} prepared')


if __name__ == '__main__':
    main()
