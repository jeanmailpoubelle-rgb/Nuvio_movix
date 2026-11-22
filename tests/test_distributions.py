"""Native and configured products share playback code, never implicit settings."""
import io
import json
import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from quickjs_check import check

class DistributionTests(unittest.TestCase):
    def test_native_and_plus_native_controls_keep_exact_playback_and_requests(self):
        manifests = [(ROOT / 'manifest.json', ROOT / 'plugins/sources-fr-plus/manifest.json'),
                     (ROOT / 'plugins/anime-sama/manifest.json', ROOT / 'plugins/anime-sama-plus/manifest.json')]
        for native_path, plus_path in manifests:
            native = json.loads(native_path.read_text())
            plus = json.loads(plus_path.read_text())
            self.assertEqual([(s['id'], s['enabled']) for s in native['scrapers']],
                             [(s['id'], s['enabled']) for s in plus['scrapers']])
            for entry in native['scrapers']:
                if not entry['enabled']: continue
                args = ('95479', 'tv', 1, 1) if entry['id'].startswith('anime-sama') else ('603', 'movie', None, None)
                for runtime in ['mobile', 'tv']:
                    with self.subTest(entry=entry['id'], runtime=runtime):
                        common = dict(runtime=runtime, scraper_id='repo:' + entry['id'], allow_empty=True, log_sink=io.StringIO())
                        control, a = check(plus_path.parent / entry['filename'], args, provider_settings={'episodeMetadataSource':'native'}, **common)
                        # A native distribution cannot be switched into private
                        # metadata mode even if stale settings are injected.
                        actual, b = check(native_path.parent / entry['filename'], args,
                                          provider_settings={'episodeMetadataSource':'aiometadata', 'inputMetadataAdapter':'xperience'}, **common)
                        self.assertEqual(actual, control)
                        self.assertEqual(b['requests'], a['requests'])
                        self.assertFalse(b['http_failures'])
