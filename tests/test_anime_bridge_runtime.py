"""Actual generated installed entries: historical gap, healthy update and fail-closed guards."""
import contextlib,io,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
import quickjs_check as q
class AnimeBridgeRuntimeTests(unittest.TestCase):
    def run_case(self,runtime,scenario,track='plus'):
        calls=[];real=q.fixture_response
        def observed(provider,url,kind):calls.append(url);return real(provider,url,kind)
        conf={'episodeMetadataSource':'native' if track=='native' else 'aiometadata','aiometadataManifestUrl':'https://input.example/private/manifest.json','diagnostics':True}
        with patch.object(q,'fixture_response',observed),contextlib.redirect_stdout(io.StringIO()):
            result,summary=q.check(q.ROOT/('plugins/anime-sama/providers/anime-sama.js' if track=='native' else 'plugins/anime-sama-plus/providers/anime-sama.js'),['321518','tv',1,8],scenario=scenario,allow_empty=True,runtime=runtime,scraper_id='repository:anime-sama',provider_settings=conf,log_sink=io.StringIO())
        return result,summary,calls
    def test_historical_gap_and_updated_metadata_produce_same_source_on_both_wrappers(self):
        for runtime in ['mobile','tv']:
            old,s,calls=self.run_case(runtime,'anime-bridge');new,t,healthy=self.run_case(runtime,'anime-bridge-healthy')
            self.assertEqual(len(old),1);self.assertEqual(old,new)
            self.assertEqual(sum('/data/' in u or 'ani.zip' in u for u in calls),3)
            self.assertFalse(any('/data/' in u or 'ani.zip' in u for u in healthy))
            mapping=[e['data'] for e in s['resolver_events'] if e['stage']=='anime-input-mapping'];self.assertTrue(mapping[0]['basis'].startswith('anibridge/'))
            refs=[r for e in s['resolver_events'] if e['stage']=='anime-episode' for r in e['data']['refs']];self.assertEqual(refs[0]['index'],7)
    def test_foreign_associations_and_known_contradictions_return_no_streams(self):
        for runtime in ['mobile','tv']:
            for scenario in ['anime-bridge-foreign','anime-bridge-contradiction']:
                result,_,calls=self.run_case(runtime,scenario);self.assertEqual(result,[])
                if scenario.endswith('foreign'):self.assertFalse(any('/data/' in u for u in calls))
    def test_native_never_reads_private_or_bridge_data_and_media_failure_does_not_remap(self):
        for runtime in ['mobile','tv']:
            result,_,calls=self.run_case(runtime,'anime-bridge','native');self.assertEqual(len(result),1)
            self.assertFalse(any('input.example' in u or '/data/' in u or 'ani.zip' in u for u in calls))
            result,_,calls=self.run_case(runtime,'anime-bridge-hostfail');self.assertEqual(result,[])
            self.assertFalse(any('/data/' in u or 'ani.zip' in u for u in calls))
