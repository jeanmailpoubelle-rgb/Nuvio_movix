"""Execute the actual FR+ bundle through literal TV and Mobile bridges."""
import io
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from quickjs_check import check,ROOT

class VodixInputTests(unittest.TestCase):
    def test_tmdb_input_and_tvdb_conflict_guards_on_both_bridges(self):
        for runtime in ['tv','mobile']:
            for scenario in ['vodix-tmdb-aio','vodix-tmdb-xperience','vodix-tvdb','vodix-conflict']:
                with self.subTest(runtime=runtime,scenario=scenario):
                    settings={'episodeMetadataSource':'aiometadata','aiometadataManifestUrl':'https://input.example/manifest.json',
                        'inputMetadataAdapter':'xperience' if scenario.endswith('xperience') else 'aiometadata','inputMetadataProvider':'auto'}
                    rows,summary=check(ROOT/'plugins/sources-fr-plus/providers/vodix.js',('1399','tv',2,3),runtime=runtime,
                        provider_settings=settings,scenario=scenario,allow_empty=True,log_sink=io.StringIO())
                    self.assertEqual(len(rows),0 if scenario in ['vodix-tvdb','vodix-conflict'] else 1)
                    if rows:
                        self.assertEqual(len([e for e in summary['resolver_events'] if e['stage']=='vodix-input-verified']),1)
                        self.assertEqual(rows[0]['url'],'https://vodix.top/hls/grant/master.m3u8?sig=x%2Fy&k=1')
                        self.assertEqual(rows[0]['quality'],'2160p')
