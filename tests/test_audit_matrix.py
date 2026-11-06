import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import audit
from audit_matrix import partitions,merged_results

class AuditMatrixTests(unittest.TestCase):
    def test_partitions_preserve_exact_complete_plan_for_each_scope_and_runtime(self):
        registry=audit.read(audit.REGISTRY);endpoints=audit.configuration(registry);manifest=audit.manifests(registry)
        for profile in ['smoke','deep']:
            for runtime in ['tv','mobile','both']:
                shards=partitions(registry,endpoints,manifest,profile,runtime)
                self.assertEqual(len(shards),12)
                rows=[]
                for s in shards:rows+=audit.make_jobs(registry,endpoints,manifest,profile,runtime,[s['provider']],scraper_ids=[s['entry']])
                expected=audit.make_jobs(registry,endpoints,manifest,profile,runtime)
                self.assertEqual(sorted(j['id'] for j in rows),sorted(j['id'] for j in expected))
                self.assertEqual(len(rows),len({j['id'] for j in rows}))
    def test_merge_keeps_failures_and_missing_rows_and_rejects_duplicate_or_foreign_results(self):
        plan=[dict(id='a'),dict(id='b')];bad=dict(id='a',status='attention',issues=['media-unreachable'])
        rows=merged_results(plan,[dict(results=[bad])])
        self.assertEqual(rows[0],bad);self.assertEqual(rows[1]['issues'],['missing-shard-result'])
        for reports in [[dict(results=[bad,bad])],[dict(results=[dict(id='foreign')])]]:
            with self.assertRaises(ValueError):merged_results(plan,reports)
