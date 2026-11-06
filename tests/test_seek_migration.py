import io
import sys
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from quickjs_check import check,helper_bundle

class SeekMigrationTests(unittest.TestCase):
    def test_public_header_204_on_both_literal_bridges(self):
        entry="function getStreams(id,type,season,episode){return run(id,type,season,episode,function(ctx){return resolveHost({url:'https://neocine.embedseek.com/#abc',lang:'VF'},'https://movix.dog/',ctx,'Seek');});}"
        with tempfile.TemporaryDirectory() as directory:
            bundle=Path(directory)/'movix-extra.js';bundle.write_text(helper_bundle(ROOT/'providers/movix-extra.js',entry))
            for runtime in ['tv','mobile']:
                rows,summary=check(bundle,['603','movie',None,None],runtime=runtime,scenario='seek-modern',log_sink=io.StringIO())
                self.assertEqual(rows[0]['url'],'https://cdn.example/modern/master.m3u8')
                self.assertEqual(summary['pending_native_timers'],0)
