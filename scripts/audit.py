#!/usr/bin/env python3
"""Bounded maintenance audit. Network findings are evidence for Codex, not automatic fixes."""
import argparse
import collections
import contextlib
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import traceback
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'config/maintenance.json'


def read(path):
    return json.loads(path.read_text())


def manifests(registry):
    combined = dict(version=read(ROOT / 'manifest.json')['version'], scrapers=[], versions={})
    for name in registry.get('manifests', ['manifest.json']):
        path = ROOT / name
        manifest = read(path)
        combined['versions'][manifest['name']] = manifest['version']
        for scraper in manifest['scrapers']:
            combined['scrapers'].append({**scraper, 'filename': str((path.parent / scraper['filename']).relative_to(ROOT))})
    return combined


def configuration(registry):
    config = read(ROOT / 'config/endpoints.json')
    for key, path in registry.get('configs', {}).items():
        config[key] = read(ROOT / path)
    return config


def lookup(data, key):
    for part in key.split('.'):
        data = data[part]
    return data


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def safe(value):
    """Reports retain URL origins only; raw harness output stays in private local logs."""
    if isinstance(value, dict):
        return {k: safe(v) for k, v in value.items() if not re.search(r'key|token|grant|cookie|authorization|headers|body', k, re.I)}
    if isinstance(value, (list, tuple)):
        return [safe(v) for v in value]
    if isinstance(value, str):
        def origin(match):
            parsed = urllib.parse.urlsplit(match[0])
            return parsed.scheme + '://' + (parsed.hostname or 'redacted')
        return re.sub(r'https?://[^\s"<>]+', origin, value)
    return value


def entry(helper, value):
    """Only reviewed production helpers; overrides exist exclusively in a temporary bundle."""
    if helper == 'anime':
        return 'function getStreams(id,type,season,episode){return AnimeSama.getStreams(id,type,season,episode);}'
    val = json.dumps(value, ensure_ascii=True)
    primary = "primaryMovix({playbackReferer:ENDPOINTS.purstream.playbackSite+'/'},ctx)"
    expressions = {
        'primary': primary,
        'backup': "backupMovix({},ctx)",
        'direct': 'directPurstream(ctx)',
        'premium': 'frembedPremium(ctx)',
        'vidzy': 'vidzyLookup(ctx)',
        'hosts': 'frembedHosts(ctx)',
        'discovery': "discoverMovix(ctx).then(function(items){if(!items.length)throw new Error('No API discovered');ctx.movixEndpoint=items[0];return " + primary + ';})',
        'movix-mirror': primary,
        'catalogue-mirror': 'tmdbDetails(ctx).then(function(meta){return nakiosCatalogue(ctx,' + val + ',meta);})',
        'catalogue-directory': 'request(' + val + ".url,'','Audit directory',ctx).then(function(page){var target=directoryCandidate(page.body," + val + ");if(!target)throw new Error('Directory parser failed');return tmdbDetails(ctx).then(function(meta){return nakiosCatalogue(ctx,target,meta);});})",
        'catalogues': 'movixCatalogues(ctx)',
        'host': "Promise.all(ENDPOINTS.movix.catalogues.map(function(name){return movixJson(movixCataloguePath(name,ctx),'Audit '+name,ctx,function(data){return !!catalogueId(data)||data.success===false||typeof data.message==='string'||typeof data.error==='string';}).then(function(data){return data.pending||data.success===false?[]:catalogueLinks(name,data,ctx);}).catch(function(error){log(message(error));return [];});})).then(function(groups){var links=[].concat.apply([],groups).filter(function(link){return hostFamily(link.url,link.server)===" + val + ";});if(!links.length){log('Audit host not advertised');return [];}return resolveLinks(links,movixEndpoint(ctx).site+'/',ctx,'Audit host');})",
        'extra': 'movixExtra(ctx)',
        'yablom-mirror': 'yablomLookup(ctx)',
        'yablom-directory': 'request(' + val + ".url,'','Audit directory',ctx).then(function(page){var target=yablomDirectory(page," + val + ".parser);if(!target)throw new Error('Directory parser failed');SCRAPER_SETTINGS.yablomMirrors=[{site:target}];return yablomLookup(ctx);})",
    }
    setup = ''
    if helper == 'catalogues':
        setup = 'ENDPOINTS.movix.catalogues=[' + val + '];'
    elif helper == 'extra':
        setup = 'ENDPOINTS.movix.extra=[' + val + '];'
    elif helper.startswith('yablom-'):
        setup = 'ENDPOINTS.yablom.directories=[];'
    return 'function getStreams(id,type,season,episode){' + setup + 'return run(id,type,season,episode,function(ctx){return ' + expressions[helper] + ';});}'


def make_jobs(registry, endpoints, manifest, profile, runtime, providers=None, cases=None, integrations=None, hosts=None):
    runtimes = ['tv', 'mobile'] if runtime == 'both' else [runtime]
    active = {Path(p['filename']).stem: p for p in manifest['scrapers'] if p['enabled']}
    selected = {k: v for k, v in active.items() if not providers or k in providers}
    references = [c for c in registry['cases'] if (not cases and profile in c['profiles']) or cases and c['id'] in cases]
    jobs = []
    def accepts(provider, case):
        choices = registry.get('provider_cases', {}).get(provider)
        return (not choices or case['id'] in choices) and (not case.get('providers') or provider in case['providers'])
    def add(provider, case, integration='production', helper=None, value=None, needs_key=False, config=None, source=None):
        if not accepts(provider, case) or case['args'][1] not in selected[provider]['supportedTypes']:
            return
        for rt in runtimes:
            jobs.append(dict(id=f'{provider}/{integration}/{case["id"]}/{rt}', provider=provider,
                             filename=selected[provider]['filename'], integration=integration,
                             title=case['title'], args=case['args'], runtime=rt, helper=helper,
                             episode_reference=case.get('episode_reference'),
                             value=value, needs_key=needs_key, config=config or [], source=source or []))
    for provider in selected:
        if integrations:
            continue
        for case in references:
            add(provider, case, needs_key=provider == 'yablom')
    if profile == 'deep' or integrations:
        for item in registry['integrations']:
            if item['provider'] not in selected or integrations and item['id'] not in integrations:
                continue
            values = sorted(set(endpoints['hosts']) | {'lulu'}) if item['helper'] == 'host' else lookup(endpoints, item['expand']) if item.get('expand') else [None]
            for index, value in enumerate(values):
                if item['helper'] == 'host' and hosts and value not in hosts:
                    continue
                for case in [c for c in references if accepts(item['provider'], c)][:1]:
                    suffix = '-' + value if item['helper'] == 'host' else f'-{index}' if item.get('expand') else ''
                    add(item['provider'], case, integration=item['id'] + suffix,
                        helper=item['helper'], value=value, needs_key=item.get('needs_key', False) or value == 'omega',
                        config=item['config'], source=item['source'])
    return jobs


def classify(summary, media, captions, diagnostics, episode_reference=None):
    issues = []
    if summary['sources'] == 0:
        issues.append('filtered-only' if summary.get('filtered_sources') else 'empty-result')
    if any(not p['ok'] and p.get('reason') != 'DASH playback probe is not implemented' for p in media):
        issues.append('media-unreachable')
    if any(p.get('reason') == 'DASH playback probe is not implemented' for p in media):
        issues.append('dash-probe-unimplemented')
    if any(not p['ok'] for p in captions):
        issues.append('subtitle-check-failed')
    events = summary.get('resolver_events', [])
    if episode_reference:
        mappings = [e['data'] for e in events if e['stage'] == 'anime-episode']
        if len(mappings) != 1 or not mappings[0].get('refs') or any(
                not ref.get('path', '').startswith(episode_reference['group']) or ref.get('index') != episode_reference['index']
                for ref in mappings[0].get('refs', [])):
            issues.append('episode-mapping-differs')
    if summary.get('http_failures') or any(e['stage'] == 'endpoint-unavailable' for e in events):
        issues.append('upstream-http-failure')
    if any(e['stage'] == 'upstream-pending' for e in events):
        issues.append('upstream-pending')
    if any(e['stage'] == 'source-rejected' for e in events):
        issues.append('identity-rejected')
    if any(e['stage'] == 'source-unavailable' or e['stage'] == 'host-unavailable' for e in events):
        issues.append('unavailable-or-gated-source')
    if any(e['stage'] == 'host-result' and e['data'].get('sources') == 0 for e in events):
        issues.append('resolver-returned-no-media')
    if any(e['stage'] == 'anime-host-failure' or e['stage'] == 'selection' and (e['data'].get('failed', 0) or e['data'].get('unavailable', 0)) for e in events):
        issues.append('candidate-failure')
    if any(e['stage'] in ['selection', 'anime-selection'] and 'budget' in e['data'].get('stop', '') for e in events):
        issues.append('lookup-budget')
    issues.extend(diagnostics)
    if 'host-not-advertised' in diagnostics:
        return 'not-tested', sorted(set(issues) - {'empty-result'})
    return ('attention' if issues else 'pass'), sorted(set(issues))


class DiagnosticLog:
    """Capture exception categories, not the possibly signed URLs in exception messages."""
    def __init__(self, stream):
        self.stream, self.codes = stream, set()

    def write(self, text):
        self.stream.write(text)
        # Structured events are classified from the summary. Scanning their
        # field names would mistake "invalid":0 ... "duplicateResults" for
        # an "invalid result" error and flag healthy host selection.
        # Request paths can contain .json or other diagnostic words; HTTP status
        # failures are already recorded in the structured summary.
        if re.search(r'\{\s*"stage"\s*:', text) or re.match(r'^HTTP \d{3} ', text):
            return len(text)
        for pattern, code in [(r'JSON|unrecognized.*schema|invalid.*(?:result|response)|parser failed|expected.*missing|video data missing|unconfirmed search|no .* (?:link|bundle|origin)', 'parser-or-schema'),
                              (r'captcha|challenge-required|turnstile', 'browser-challenge'),
                              (r'mismatch|unambiguous|ambiguous', 'identity-or-match'),
                              (r'request budget|elapsed budget', 'lookup-budget'),
                              (r'Audit host not advertised', 'host-not-advertised')]:
            if re.search(pattern, text, re.I):
                self.codes.add(code)
        return len(text)

    def flush(self):
        self.stream.flush()


def worker(job, result_path):
    # Imported only inside an isolated worker, so --list and offline planning need no QuickJS.
    from quickjs_check import check, helper_bundle, probe_media, probe_subtitles
    settings = {}
    if job['provider'] == 'anime-sama':
        settings['diagnostics'] = True
    if job['helper'] == 'movix-mirror':
        settings = {'apiBase': job['value']['api'], 'siteBase': job['value']['site']}
    if job['helper'] == 'yablom-mirror':
        settings = {'yablomMirrors': [job['value']]}
    output = dict(id=job['id'], status='error', issues=['worker-exception'])
    try:
        production = ROOT / job['filename']
        with tempfile.TemporaryDirectory(prefix='sources-fr-audit-') as directory:
            bundle = production
            if job['helper']:
                bundle = Path(directory) / production.name
                bundle.write_text(helper_bundle(production, entry(job['helper'], job['value'])))
            with result_path.with_suffix('.private.log').open('w') as log:
                os.chmod(log.name, 0o600)
                capture = DiagnosticLog(log)
                with contextlib.redirect_stdout(capture), contextlib.redirect_stderr(capture):
                    streams, summary = check(bundle, job['args'], live=True, allow_empty=True, runtime=job['runtime'],
                                             metadata_key=os.environ.get('NUVIO_TMDB_API_KEY', ''), provider_settings=settings)
                    media = [probe_media(s) for s in streams]
                    captions = [probe_subtitles(s) for s in streams]
            status, issues = classify(summary, media, captions, capture.codes, job.get('episode_reference'))
            output = dict(id=job['id'], status=status, issues=issues, discovery=summary,
                          media=media, subtitles=captions,
                          qualities=[s.get('quality', '') for s in streams],
                          production_bundle_sha256=digest(production),
                          scope='temporary-production-helper' if job['helper'] else 'production-entry-point')
    except Exception as error:
        output['error_type'] = type(error).__name__
        with result_path.with_suffix('.private.log').open('a') as log:
            os.chmod(log.name, 0o600)
            traceback.print_exc(file=log)
    result_path.write_text(json.dumps(safe(output), indent=2) + '\n')


def coverage(report, endpoints):
    observed = collections.Counter()
    for result in report['results']:
        for event in result.get('discovery', {}).get('resolver_events', []):
            if event['stage'] == 'host-result' and event['data'].get('sources', 0):
                observed[event['data']['family'].lower()] += 1
    return {family: {'extractions_observed': observed[family],
                     'status': 'observed' if observed[family] else 'not-tested-live'}
            for family in sorted(set(endpoints['hosts']) | {'lulu'})}


def compare(report, previous):
    before = {r['id']: r for r in previous.get('results', [])}
    changes = []
    for r in report['results']:
        old = before.get(r['id'])
        if not old:
            continue
        for field in ['sources', 'languages', 'subtitles', 'requests']:
            a, b = old.get('discovery', {}).get(field), r.get('discovery', {}).get(field)
            if a != b:
                changes.append(dict(id=r['id'], field=field, before=a, after=b))
    return changes


def save(report, directory, endpoints):
    report['host_coverage'] = coverage(report, endpoints)
    clean = safe(report)
    temporary = directory / 'report.json.tmp'
    temporary.write_text(json.dumps(clean, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(directory / 'report.json')
    lines = ['# Sources FR maintenance audit', '', f"State: **{report['state']}**. Version: {report['version']}.", '',
             f"Finished probes: {len(report['results'])}/{len(report.get('plan', []))}.", '',
             'Offline: ' + (', '.join(r['check'] + '=' + r['status'] for r in report['offline']) or 'not run (--skip-offline).'), '',
             'Python HTTP + TV 1.0.0/mobile JS wrappers; no physical Android playback test.', '',
             '| Probe | Status | Findings |', '| --- | --- | --- |']
    lines += [f"| {r['id']} | {r['status']} | {', '.join(r['issues'] + r.get('observations', [])) or 'Sample passed'} |" for r in report['results']]
    if report.get('baseline_changes'):
        lines += ['', '## Changes since baseline', '']
        lines += [f"- {c['id']}: {c['field']} changed from {c['before']} to {c['after']}." for c in report['baseline_changes']]
    lines += ['', '## Coverage gaps', '', 'Host families without a successful live extraction: ' +
              ', '.join(k for k, v in report['host_coverage'].items() if v['status'] == 'not-tested-live') + '.', '',
              'An empty result needs upstream comparison; it is not automatically a code bug. '
              'A passing result certifies only this sample, not the whole integration. '
              'Review HTTP failures even when a fallback played. See docs/maintenance.md for the repair procedure.']
    temporary = directory / 'report.md.tmp'
    temporary.write_text(safe('\n'.join(lines)) + '\n')
    temporary.replace(directory / 'report.md')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    registry = read(REGISTRY)
    endpoints, manifest = configuration(registry), manifests(registry)
    parser.add_argument('--profile', choices=['smoke', 'deep'], default='smoke')
    parser.add_argument('--runtime', choices=['tv', 'mobile', 'both'], default='both')
    parser.add_argument('--provider', action='append', choices=[Path(p['filename']).stem for p in manifest['scrapers'] if p['enabled']])
    parser.add_argument('--case', action='append', choices=[c['id'] for c in registry['cases']])
    parser.add_argument('--integration', action='append', choices=[i['id'] for i in registry['integrations']])
    parser.add_argument('--host', action='append', choices=sorted(set(endpoints['hosts']) | {'lulu'}), help='Focus shared-host probes on these families')
    parser.add_argument('--list', action='store_true', help='List planned probes without network access')
    parser.add_argument('--skip-offline', action='store_true', help='Focused recheck after offline tests have passed')
    parser.add_argument('--output', type=Path, help='Fresh output directory; default reports/audit-<UTC timestamp>')
    parser.add_argument('--baseline', type=Path, help='Previous report.json; differences are observations, not fixed catalogue assertions')
    parser.add_argument('--timeout', type=int, default=180, help='Hard timeout per isolated live probe, seconds')
    parser.add_argument('--max-seconds', type=int, default=3600, help='Total live budget; unfinished probes remain explicit')
    parser.add_argument('--worker', type=Path, help=argparse.SUPPRESS)
    parser.add_argument('--result', type=Path, help=argparse.SUPPRESS)
    options = parser.parse_args()
    if options.worker:
        worker(read(options.worker), options.result)
        return 0
    if options.timeout < 1 or options.max_seconds < 1:
        parser.error('Timeouts must be positive')
    jobs = make_jobs(registry, endpoints, manifest, options.profile, options.runtime, options.provider, options.case,
                     options.integration or (['shared-hosts'] if options.host else None), options.host)
    if not jobs:
        parser.error('No probes match; choose a supported movie/episode and provider')
    if options.list:
        for job in jobs:
            print(job['id'], '(metadata key required)' if job['needs_key'] else '')
        return 0
    stamp = datetime.datetime.now(datetime.timezone.utc)
    directory = options.output or ROOT / 'reports' / ('audit-' + stamp.strftime('%Y%m%dT%H%M%S%fZ'))
    directory.mkdir(parents=True, exist_ok=False)
    os.chmod(directory, 0o700)
    previous = read(options.baseline) if options.baseline else None
    report = dict(schema=1, version=manifest['version'], utc=stamp.isoformat(), state='running',
                  versions=manifest['versions'],
                  profile=options.profile, runtime=options.runtime, physical_android_tested=False,
                  config_sha256=digest(ROOT / 'config/endpoints.json'), plan=safe(jobs), offline=[], results=[])
    save(report, directory, endpoints)
    if not options.skip_offline:
        for label, command in [('node', ['npm', 'test']), ('native', [sys.executable, 'scripts/quickjs_check.py', '--all', '--runtime', 'both']),
                               ('audit', [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_audit.py'])]:
            print('Offline:', label, flush=True)
            try:
                with (directory / (label + '.private.log')).open('w') as log:
                    code = subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, timeout=180).returncode
                report['offline'].append(dict(check=label, status='pass' if code == 0 else 'fail'))
            except (subprocess.TimeoutExpired, OSError) as error:
                report['offline'].append(dict(check=label, status='fail', error_type=type(error).__name__))
            save(report, directory, endpoints)
        if any(r['status'] != 'pass' for r in report['offline']):
            report['state'] = 'offline-failed'
            report['results'] = [dict(id=j['id'], status='not-tested', issues=['offline-checks-failed']) for j in jobs]
            save(report, directory, endpoints)
            print('Offline failures; repair before live checks. Report:', directory / 'report.md')
            return 1
    start = time.monotonic()
    for number, job in enumerate(jobs):
        print(f"[{number+1}/{len(jobs)}] {job['id']}", flush=True)
        remaining = options.max_seconds - (time.monotonic() - start)
        result = dict(id=job['id'], status='not-tested', issues=['audit-budget-exhausted'])
        if job['needs_key'] and not os.environ.get('NUVIO_TMDB_API_KEY'):
            result.update(status='blocked', issues=['metadata-key-missing'])
        elif remaining > 0:
            job_path, result_path = directory / f'{number}.job.json', directory / f'{number}.result.json'
            job_path.write_text(json.dumps(job))
            try:
                with (directory / f'{number}.worker.private.log').open('w') as log:
                    completed = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--worker', str(job_path.resolve()), '--result', str(result_path.resolve())],
                                               cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, timeout=min(options.timeout, remaining))
                result = read(result_path) if completed.returncode == 0 and result_path.exists() else dict(id=job['id'], status='error', issues=['worker-failed'])
            except subprocess.TimeoutExpired:
                result.update(status='not-tested', issues=['probe-timeout'])
            except (OSError, ValueError) as error:
                result.update(status='error', issues=['worker-failed'], error_type=type(error).__name__)
            finally:
                job_path.unlink(missing_ok=True)
            summary = result.get('discovery', {})
            hint = registry['request_hints'].get(job['provider']) if not job['helper'] else None
            if hint and summary.get('requests', 0) > hint:
                result.setdefault('observations', []).append('more-requests-than-healthy-fast-path')
        report['results'].append(result)
        if previous:
            report['baseline_changes'] = compare(report, previous)
        save(report, directory, endpoints)
        print(' ', result['status'], ', '.join(result['issues']), flush=True)
    report['state'] = 'complete' if all(r['status'] == 'pass' for r in report['results']) else 'needs-review'
    save(report, directory, endpoints)
    print('Report:', directory / 'report.md', flush=True)
    return int(report['state'] != 'complete')


if __name__ == '__main__':
    raise SystemExit(main())
