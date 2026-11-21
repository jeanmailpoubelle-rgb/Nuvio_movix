"""Daily publication gates and immutable snapshots; no network or credentials."""
import json, pathlib, sys, tempfile, unittest, subprocess
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
import update_en_mappings as updater

class DailyMappingTests(unittest.TestCase):
    def raw(self, stamp):
        return json.dumps({'$meta':{'schema_version':'3.0','stamp':stamp},'tvdb_show:123:s1':{'anilist:456':{'1-2':'1-2'}}}).encode()
    def test_generation_is_complete_immutable_and_repeatable(self):
        with tempfile.TemporaryDirectory() as d:
            base=pathlib.Path(d);rev,count=updater.generate(self.raw('one'),base)
            self.assertEqual(count,192)
            self.assertEqual(updater.generate(self.raw('one'),base),(rev,192))
            file=base/rev/'tvdb_show/59.json';file.write_text('corrupted')
            with self.assertRaises(ValueError):updater.generate(self.raw('one'),base)
            self.assertEqual(file.read_text(),'corrupted')
    def test_failed_validation_does_not_publish_a_pointer(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);data=root/'plugins/sources-en/data';data.mkdir(parents=True)
            pointer=data/'current.json';pointer.write_text('{"revision":"previous"}')
            source=root/'source.json';source.write_bytes(self.raw('one'))
            with patch.object(updater,'ROOT',root),patch.object(sys,'argv',['update','--source',str(source),'--publish-current']),patch.object(updater.subprocess,'run',side_effect=subprocess.CalledProcessError(1,'validation')):
                with self.assertRaises(subprocess.CalledProcessError):updater.main()
            self.assertEqual(pointer.read_text(),'{"revision":"previous"}')
    def test_metadata_only_refresh_does_not_publish_duplicate_daily_snapshots(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);data=root/'plugins/sources-en/data';rev,_=updater.generate(self.raw('one'),data)
            pointer=data/'current.json';original=json.dumps({'schema':1,'revision':rev,'publishedAt':'unchanged'});pointer.write_text(original)
            source=root/'source.json';source.write_bytes(self.raw('two'))
            with patch.object(updater,'ROOT',root),patch.object(sys,'argv',['update','--source',str(source),'--publish-current']),patch.object(updater.subprocess,'run'):
                updater.main()
            self.assertEqual(pointer.read_text(),original)
            self.assertEqual([p.name for p in data.iterdir() if p.is_dir()],[rev])
