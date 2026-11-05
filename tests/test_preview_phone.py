"""Phone diagnostic transport and preview setup using literal native wrappers."""
import io
import json
from pathlib import Path
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from quickjs_check import check

class PreviewPhoneTests(unittest.TestCase):
    def test_settings_only_diagnostic_displays_missing_configuration_on_both_bridges(self):
        for runtime in ['mobile','tv']:
            rows,summary=check(ROOT/'plugins/episode-diagnostics/providers/diagnostics.js',['603','tv',1,1],runtime=runtime,provider_settings={},log_sink=io.StringIO())
            self.assertEqual(summary['requests'],0)
            self.assertEqual(summary['sources'],0)
            self.assertEqual(summary['report_rows'],1)
            self.assertIn('INPUT_METADATA_CONFIG_REQUIRED',rows[0]['url'])

    def test_unconfigured_installed_playback_entries_do_not_silently_use_native_numbering(self):
        for runtime in ['mobile','tv']:
            for bundle in ['providers/movix.js','plugins/anime-sama/providers/anime-sama.js']:
                rows,summary=check(ROOT/bundle,['46298','tv',2,72],runtime=runtime,scenario='preview-missing',allow_empty=True,provider_settings={},log_sink=io.StringIO())
                self.assertEqual(rows,[])
                self.assertEqual(summary['requests'],0)

    def test_configured_phone_report_uses_the_actual_bundle_and_never_opens_media(self):
        settings={'aiometadataManifestUrl':'https://input.example/stremio/private-fixture/manifest.json','episodeMetadataSource':'aiometadata'}
        for runtime in ['mobile','tv']:
            rows,summary=check(ROOT/'plugins/episode-diagnostics/providers/diagnostics.js',['603','tv',1,1],runtime=runtime,scenario='input-order-72',provider_settings=settings,metadata_key='fixture-key',log_sink=io.StringIO())
            text=json.dumps(rows,ensure_ascii=False)
            self.assertIn('S2E130',text)
            self.assertIn('épisode 130',text)
            self.assertIn('CORRESPONDANCE OK',text)
            self.assertNotIn('private-fixture',text)
            self.assertTrue(all(r['type']=='diagnostic' and r['url'].startswith('diagnostic:') for r in rows))
            self.assertEqual(summary['sources'],0)

    def test_report_is_not_registered_as_a_playback_provider(self):
        report=json.loads((ROOT/'plugins/episode-diagnostics/manifest.json').read_text())
        self.assertEqual(report['scrapers'][0]['supportedTypes'],[])
        for manifest in ['manifest.json','plugins/anime-sama/manifest.json']:
            streams=json.loads((ROOT/manifest).read_text())
            self.assertNotIn(report['scrapers'][0]['id'],[s['id'] for s in streams['scrapers']])

if __name__=='__main__':unittest.main()
