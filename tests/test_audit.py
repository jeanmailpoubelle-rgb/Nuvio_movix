"""Deterministic audit coverage, classification, privacy and process-bound checks."""
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('audit', ROOT / 'scripts/audit.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.registry = audit.read(audit.REGISTRY)
        self.endpoints = audit.read(ROOT / 'config/endpoints.json')
        self.manifest = audit.read(ROOT / 'manifest.json')

    def jobs(self, **kwargs):
        return audit.make_jobs(self.registry, self.endpoints, self.manifest, **dict(profile='deep', runtime='both', **kwargs))

    def test_inventory_covers_every_active_provider_and_existing_sources(self):
        active = {Path(p['filename']).stem for p in self.manifest['scrapers'] if p['enabled']}
        self.assertEqual(active, {i['provider'] for i in self.registry['integrations']})
        for item in self.registry['integrations']:
            for key in item['config']:
                audit.lookup(self.endpoints, key)
            for source in item['source']:
                self.assertTrue((ROOT / source).is_file(), source)

    def test_ids_unique_and_movies_only_provider_excludes_series(self):
        jobs = self.jobs()
        self.assertEqual(len(jobs), len({j['id'] for j in jobs}))
        self.assertFalse(any(j['args'][1] != 'movie' for j in jobs if j['provider'] == 'yablom'))
        self.assertFalse(any(j['provider'] == 'purstream' for j in jobs))

    def test_mirror_and_host_inventory_expands_configuration(self):
        self.endpoints['catalogue']['mirrors'].append('https://new.example')
        jobs = self.jobs(integrations=['catalogue-mirrors', 'shared-hosts'])
        self.assertEqual(8, sum(j['helper'] == 'catalogue-mirror' for j in jobs))
        self.assertEqual(set(self.endpoints['hosts']) | {'lulu'}, {j['value'] for j in jobs if j['helper'] == 'host'})

    def test_focus_does_not_include_normal_or_other_integrations(self):
        jobs = self.jobs(providers=['nakios'], cases=['office'], integrations=['vidzy'])
        self.assertEqual(2, len(jobs))
        self.assertEqual({'vidzy'}, {j['helper'] for j in jobs})
        self.assertEqual({'2316'}, {j['args'][0] for j in jobs})

    def test_host_filter_avoids_repeating_other_families(self):
        jobs = self.jobs(integrations=['shared-hosts'], hosts=['lulu'])
        self.assertEqual(2, len(jobs))
        self.assertEqual({'lulu'}, {j['value'] for j in jobs})

    def test_every_generated_helper_is_valid_javascript(self):
        import quickjs
        for job in self.jobs():
            if job['helper']:
                quickjs.Context().eval('(' + audit.entry(job['helper'], job['value']) + ')')

    def test_helper_does_not_replace_production_bundle(self):
        sys.path.insert(0, str(ROOT / 'scripts'))
        from quickjs_check import helper_bundle
        provider = ROOT / 'providers/movix.js'
        before = provider.read_bytes()
        changed = helper_bundle(provider, audit.entry('backup', None))
        self.assertIn('return backupMovix({},ctx)', changed)
        self.assertEqual(before, provider.read_bytes())
        self.assertNotEqual(changed.encode(), before)

    def classify(self, sources=1, **kwargs):
        summary = dict(sources=sources, filtered_sources=0, http_failures=[], resolver_events=[])
        summary.update(kwargs)
        return audit.classify(summary, [{'ok': True}], [{'ok': True, 'tracks': []}], set())

    def test_healthy_sample_is_not_an_empty_pass(self):
        self.assertEqual(('pass', []), self.classify())
        self.assertEqual(('attention', ['empty-result']), self.classify(sources=0))
        self.assertEqual(('attention', ['filtered-only']), self.classify(sources=0, filtered_sources=1))

    def test_successful_fallback_does_not_hide_failed_endpoint(self):
        status, issues = self.classify(http_failures=[{'host': 'example.com', 'status': 503}])
        self.assertEqual('attention', status)
        self.assertIn('upstream-http-failure', issues)

    def test_playable_alternative_does_not_hide_failed_host_or_exhausted_budget(self):
        status, issues = self.classify(resolver_events=[
            {'stage':'host-result','data':{'family':'lulu','sources':0}},
            {'stage':'selection','data':{'failed':1,'stop':'request-budget'}},
        ])
        self.assertEqual('attention', status)
        self.assertEqual({'resolver-returned-no-media','candidate-failure','lookup-budget'},set(issues))

    def test_rejected_identity_pending_or_gated_source_needs_review(self):
        for stage, issue in [('source-rejected', 'identity-rejected'), ('upstream-pending', 'upstream-pending'), ('host-unavailable', 'unavailable-or-gated-source')]:
            status, issues = self.classify(resolver_events=[{'stage': stage, 'data': {}}])
            self.assertEqual('attention', status)
            self.assertIn(issue, issues)

    def test_media_caption_and_unsupported_dash_failures_not_hidden(self):
        summary = dict(sources=1)
        status, issues = audit.classify(summary, [{'ok': False, 'reason': 'DASH playback probe is not implemented'}], [{'ok': False}], set())
        self.assertEqual('attention', status)
        self.assertIn('dash-probe-unimplemented', issues)
        self.assertIn('subtitle-check-failed', issues)

    def test_absent_host_is_untested_and_cannot_count_as_healthy(self):
        status, issues = audit.classify(dict(sources=0), [], [], {'host-not-advertised'})
        self.assertEqual('not-tested', status)
        self.assertNotIn('empty-result', issues)
        coverage = audit.coverage({'results': []}, self.endpoints)
        self.assertTrue(all(v['status'] == 'not-tested-live' for v in coverage.values()))

    def test_diagnostics_classify_without_copying_raw_error(self):
        log = audit.DiagnosticLog(io.StringIO())
        log.write('HTTP invalid response schema https://example.com/player/signed?token=private')
        log.write('Browser challenge-required')
        self.assertEqual({'parser-or-schema', 'browser-challenge'}, log.codes)

    def test_zero_invalid_selection_count_is_not_a_parser_failure(self):
        log = audit.DiagnosticLog(io.StringIO())
        log.write('[provider 1.0] {"stage":"selection","data":{"invalid":0,"duplicateResults":0}}')
        self.assertEqual(set(), log.codes)

    def test_report_redacts_credentials_paths_and_headers_recursively(self):
        result = audit.safe({'url': 'https://user:pass@cdn.example/private/file?token=secret', 'headers': {'Cookie': 'private'},
                             'nested': [{'api_key': 'private', 'note': 'See https://host.example/grant/secret?sig=private'}]})
        text = json.dumps(result)
        for secret in ['secret', 'private', 'user:', 'pass@', 'Cookie', 'headers', 'api_key', 'token=']:
            self.assertNotIn(secret, text)
        self.assertEqual('https://cdn.example', result['url'])

    def test_baseline_changes_are_observations(self):
        before = {'results': [{'id': 'same', 'discovery': {'sources': 2, 'languages': ['VF', 'VOSTFR']}}]}
        now = {'results': [{'id': 'same', 'discovery': {'sources': 1, 'languages': ['MULTI']}}]}
        changes = audit.compare(now, before)
        self.assertEqual({'sources', 'languages'}, {c['field'] for c in changes})
        self.assertNotIn('failures', now)

    def run_main(self, directory, *extra):
        args = ['audit.py', '--skip-offline', '--runtime', 'tv', '--case', 'matrix', '--output', str(directory), *extra]
        with patch.object(sys, 'argv', args), contextlib_redirect():
            return audit.main()

    def test_missing_key_is_blocked_with_report_and_nonzero_exit(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {'NUVIO_TMDB_API_KEY': ''}):
            output = Path(tmp) / 'audit'
            code = self.run_main(output, '--provider', 'yablom')
            report = audit.read(output / 'report.json')
            self.assertEqual(1, code)
            self.assertEqual('blocked', report['results'][0]['status'])
            self.assertEqual('needs-review', report['state'])

    def test_timeout_preserves_checkpoint_and_does_not_pass(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(audit.subprocess, 'run', side_effect=subprocess.TimeoutExpired('worker', 1)):
            output = Path(tmp) / 'audit'
            code = self.run_main(output, '--provider', 'movix')
            report = audit.read(output / 'report.json')
            self.assertEqual(1, code)
            self.assertEqual('not-tested', report['results'][0]['status'])
            self.assertEqual(['probe-timeout'], report['results'][0]['issues'])
            self.assertFalse(list(output.glob('*.job.json')))

    def test_worker_failure_cannot_disappear_from_report(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(audit.subprocess, 'run', return_value=types.SimpleNamespace(returncode=1)):
            output = Path(tmp) / 'audit'
            self.assertEqual(1, self.run_main(output, '--provider', 'movix'))
            self.assertEqual('error', audit.read(output / 'report.json')['results'][0]['status'])

    def test_offline_failure_blocks_live_and_preserves_all_planned_checks(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(audit.subprocess, 'run', return_value=types.SimpleNamespace(returncode=1)) as run:
            output = Path(tmp) / 'audit'
            args = ['audit.py', '--provider', 'movix', '--case', 'matrix', '--output', str(output)]
            with patch.object(sys, 'argv', args), contextlib_redirect():
                self.assertEqual(1, audit.main())
            report = audit.read(output / 'report.json')
            self.assertEqual('offline-failed', report['state'])
            self.assertEqual(3, run.call_count)
            self.assertEqual(2, len(report['results']))
            self.assertTrue(all(r['status'] == 'not-tested' for r in report['results']))
            self.assertIn('node=fail', (output / 'report.md').read_text())

    def test_exhausted_audit_budget_keeps_unfinished_checks_explicit(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(audit.time, 'monotonic', side_effect=[0, 2]), patch.object(audit.subprocess, 'run') as run:
            output = Path(tmp) / 'audit'
            self.assertEqual(1, self.run_main(output, '--provider', 'movix', '--max-seconds', '1'))
            report = audit.read(output / 'report.json')
            self.assertEqual(['audit-budget-exhausted'], report['results'][0]['issues'])
            run.assert_not_called()

    def test_partial_report_and_public_files_omit_private_log_text(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp)
            report = dict(state='running', version='test', plan=[{'id':'pending'}], offline=[], results=[])
            (output / 'raw.private.log').write_text('secret caption and signed media')
            audit.save(report, output, self.endpoints)
            self.assertEqual('running', audit.read(output / 'report.json')['state'])
            self.assertIn('0/1', (output / 'report.md').read_text())
            for name in ['report.json','report.md']:
                self.assertNotIn('secret caption', (output / name).read_text())
            self.assertFalse(list(output.glob('*.tmp')))


def contextlib_redirect():
    from contextlib import redirect_stdout
    return redirect_stdout(io.StringIO())


if __name__ == '__main__':
    unittest.main()
