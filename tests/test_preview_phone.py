"""Phone diagnostic transport and preview setup using literal native wrappers."""
import io
import json
from pathlib import Path
import sys
import unittest
import tempfile
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from quickjs_check import check,helper_bundle
from verify_input_metadata import selected_fixtures

class PreviewPhoneTests(unittest.TestCase):
    def test_focused_live_retry_keeps_exact_public_cases_and_rejects_unknown_keys(self):
        fixtures=json.loads((ROOT/'tests/fixtures/input-metadata/series.json').read_text())
        selected=selected_fixtures(fixtures,'hunter:2:32,aot:4:16')
        self.assertEqual([(f['name'],v['input']) for f in selected for v in f['episodes']],[('hunter',[2,32]),('aot',[4,16])])
        self.assertEqual(selected_fixtures(fixtures,''),fixtures)
        self.assertEqual(len(fixtures),5)
        with self.assertRaises(ValueError):selected_fixtures(fixtures,'aot:4:999')

    def test_modern_seek_public_header_decodes_on_both_literal_bridges(self):
        entry="function getStreams(id,type,season,episode){return run(id,type,season,episode,function(ctx){return resolveHost({url:'https://neocine.embedseek.com/#abc',lang:'VF'},'https://movix.dog/',ctx,'Seek');});}"
        with tempfile.TemporaryDirectory() as directory:
            bundle=Path(directory)/'movix-extra.js'
            bundle.write_text(helper_bundle(ROOT/'providers/movix-extra.js',entry))
            for runtime in ['tv','mobile']:
                rows,summary=check(bundle,['603','movie',None,None],runtime=runtime,scenario='seek-modern',provider_settings={'episodeMetadataSource':'native'},log_sink=io.StringIO())
                self.assertEqual(len(rows),1)
                self.assertEqual(rows[0]['url'],'https://cdn.example/modern/master.m3u8')
                self.assertEqual(rows[0]['headers']['Origin'],'https://turboembed.com')
                self.assertEqual(summary['pending_native_timers'],0)

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

    def test_aot_missing_episode_id_returns_real_mapped_entries_on_both_bridges(self):
        settings={'aiometadataManifestUrl':'https://input.example/stremio/private-fixture/manifest.json','episodeMetadataSource':'aiometadata'}
        for runtime in ['mobile','tv']:
            for bundle in ['providers/movix.js','plugins/anime-sama/providers/anime-sama.js']:
                rows,summary=check(ROOT/bundle,['1429','tv',4,1],runtime=runtime,scenario='aot-input',provider_settings=settings,metadata_key='fixture-key',log_sink=io.StringIO())
                self.assertTrue(rows)
                self.assertTrue(all('[AIO S4E1 → S4E1]' in r['name'] for r in rows))
                mappings=[e for e in summary['resolver_events'] if e['stage'] in ['episode-mapping','anime-input-mapping']]
                if bundle.startswith('providers/'):
                    self.assertTrue(any(e['data']['basis'].startswith('imdb-stream-and-unique-release') for e in mappings))

    def test_report_is_not_registered_as_a_playback_provider(self):
        report=json.loads((ROOT/'plugins/episode-diagnostics/manifest.json').read_text())
        self.assertEqual(report['scrapers'][0]['supportedTypes'],[])
        for manifest in ['manifest.json','plugins/anime-sama/manifest.json']:
            streams=json.loads((ROOT/manifest).read_text())
            self.assertNotIn(report['scrapers'][0]['id'],[s['id'] for s in streams['scrapers']])

if __name__=='__main__':unittest.main()
