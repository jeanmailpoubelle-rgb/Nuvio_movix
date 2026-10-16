#!/usr/bin/env python3
"""Exercise live recovery helpers through the real TV/mobile JS fixtures.

Premium discovery is invoked directly in a temporary verification bundle so that
healthy legacy API routes do not prevent testing the new recovery helper. The
installed provider's normal recovery ordering is covered by regression tests.
No live URLs, grants, caption dialogue or HTTP bodies are written to reports.
"""
import argparse
import datetime
import hashlib
import json
import os
import tempfile
from pathlib import Path
from quickjs_check import ROOT, check, probe_media, probe_subtitles, helper_bundle


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    options = parser.parse_args()
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    files = ['common.js', 'extractors.js', 'resolvers.js', 'hls.js', 'selection.js', 'seek.js', 'frembed.js']
    text = helper_bundle(ROOT / 'providers/movix.js', 'function getStreams(id,type,season,episode){return run(id,type,season,episode,frembedPremium);}')
    report = dict(version=manifest['version'], utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  scope='Live recovery helper in a temporary bundle, plus actual catalogue-mode provider; normal API recovery ordering covered by Node tests',
                  source_hashes={name: hashlib.sha256((ROOT / 'src' / name).read_bytes()).hexdigest() for name in files},
                  production_api_bundle_sha256=hashlib.sha256((ROOT / 'providers/movix.js').read_bytes()).hexdigest(),
                  physical_android_tested=False, results=[], failures=[])
    cases = [dict(title='Matrix', args=('603','movie',None,None)),
             dict(title='The Office S1E1', args=('2316','tv',1,1)),
             dict(title='Reacher S1E1', args=('108978','tv',1,1))]
    with tempfile.TemporaryDirectory(prefix='nuvio-resolver-verification-') as directory:
        premium = Path(directory) / 'premium-helper.js'
        premium.write_text(text)
        for runtime in ['tv','mobile']:
            jobs = [(premium, case, {}) for case in cases]
            jobs.append((ROOT / 'providers/nakios.js', dict(title='The Storm catalogue', args=('1623256','movie',None,None)), {'preferCatalogue':True}))
            for provider, case, settings in jobs:
                print('Checking', runtime, case['title'], flush=True)
                result, summary = check(provider, case['args'], live=True, allow_empty=True, runtime=runtime,
                                        provider_settings=settings, metadata_key=os.environ.get('NUVIO_TMDB_API_KEY',''))
                summary['title'] = case['title']
                summary['mode'] = 'catalogue' if settings else 'premium-recovery-helper'
                summary['qualities'] = [item.get('quality','') for item in result]
                summary['media'] = [probe_media(item) for item in result]
                summary['subtitle_checks'] = [probe_subtitles(item) for item in result]
                if not result or any(not item['ok'] for item in summary['media'] + summary['subtitle_checks']):
                    report['failures'].append(dict(title=case['title'], runtime=runtime))
                report['results'].append(summary)
                options.report.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print('Live shared resolver checks complete; failures:', len(report['failures']), flush=True)
    raise SystemExit(bool(report['failures']))


if __name__ == '__main__':
    main()
