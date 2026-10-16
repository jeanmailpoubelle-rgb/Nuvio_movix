#!/usr/bin/env python3
"""Check real directory -> website -> API discovery without simulating an outage.

A temporary entry point calls the production discovery and primary helpers
directly. Normal failure ordering is covered by Node/native fixture regressions.
Reports exclude grants, media URLs, caption dialogue and HTTP response bodies.
"""
import argparse
import datetime
import hashlib
import json
import tempfile
from pathlib import Path
from quickjs_check import ROOT, check, probe_media, probe_subtitles, helper_bundle


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path, required=True)
    options = parser.parse_args()
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    files = ['common.js', 'extractors.js', 'resolvers.js', 'hls.js', 'selection.js', 'seek.js',
             'movix-domains.js', 'purstream-api.js', 'frembed.js', 'purstream-provider.js']
    bundle = helper_bundle(ROOT / 'providers/movix.js', '''
function getStreams(id,type,season,episode){return run(id,type,season,episode,function(ctx){
    return discoverMovix(ctx).then(function(endpoints){
        if(!endpoints.length)throw new Error('No discovered API');
        ctx.movixEndpoint=endpoints[0];
        return primaryMovix({playbackReferer:ENDPOINTS.purstream.playbackSite+'/'},ctx);
    });
});}
''')
    report = dict(version=manifest['version'], utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  scope='Live directory/website/API discovery helper; production outage ordering tested separately with fixtures',
                  source_hashes={name: hashlib.sha256((ROOT / 'src' / name).read_bytes()).hexdigest() for name in files},
                  production_api_bundle_sha256=hashlib.sha256((ROOT / 'providers/movix.js').read_bytes()).hexdigest(),
                  physical_android_tested=False, results=[], failures=[])
    with tempfile.TemporaryDirectory(prefix='nuvio-movix-discovery-') as directory:
        provider = Path(directory) / 'movix-discovery-helper.js'
        provider.write_text(bundle)
        for runtime in ['tv', 'mobile']:
            result, summary = check(provider, ('603', 'movie', None, None), live=True, allow_empty=True, runtime=runtime)
            summary['media'] = [probe_media(item) for item in result]
            summary['subtitle_checks'] = [probe_subtitles(item) for item in result]
            if not result or any(not item['ok'] for item in summary['media'] + summary['subtitle_checks']):
                report['failures'].append(dict(runtime=runtime))
            report['results'].append(summary)
            options.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print('Movix directory checks complete; failures:', len(report['failures']), flush=True)
    raise SystemExit(bool(report['failures']))


if __name__ == '__main__':
    main()
