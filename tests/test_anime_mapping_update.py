"""Fallback data stays directional, immutable and independent of EN publication."""
import json,pathlib,sys,tempfile,unittest,subprocess
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
import update_anime_mappings as updater
class AnimeMappingUpdateTests(unittest.TestCase):
    def raw(self,stamp='one'):
        return json.dumps({'$meta':{'schema_version':'3.0','stamp':stamp},'tvdb_show:123:s1':{'anilist:456':{'1-2':'1-2'}},'anilist:456':{'tmdb_show:789:s1':{'1-2':'1-2'}}}).encode()
    def test_direct_missing_explicit_forward_composition_is_preserved_and_immutable(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);idx=updater.generate(self.raw(),root);rev=idx['revision'];file=root/rev/'tvdb_show/59.json'
            row=json.loads(file.read_text())['rows']['tvdb_show:123:s1'];self.assertEqual(row['direct'],{});self.assertEqual(row['via']['anilist:456']['targets'],{'tmdb_show:789:s1':{'1-2':'1-2'}})
            self.assertEqual(len(idx['files']),64);self.assertEqual(updater.generate(self.raw(),root),idx)
            file.write_text('corrupted')
            with self.assertRaises(ValueError):updater.generate(self.raw(),root)
            self.assertEqual(file.read_text(),'corrupted')
    def test_validation_failure_leaves_pointer_and_published_tables_untouched(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);base=root/'plugins/anime-sama-plus/data';base.mkdir(parents=True);pointer=base/'current.json';pointer.write_text('{"revision":"old"}')
            source=root/'source.json';source.write_bytes(self.raw())
            with patch.object(updater,'ROOT',root),patch.object(sys,'argv',['update','--source',str(source),'--publish-current']),patch.object(updater.subprocess,'run',side_effect=subprocess.CalledProcessError(1,'validate')):
                with self.assertRaises(subprocess.CalledProcessError):updater.main()
            self.assertEqual(pointer.read_text(),'{"revision":"old"}');self.assertEqual(list(base.iterdir()),[pointer])
    def test_timestamp_only_updates_do_not_create_new_snapshots_or_move_pointer(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);base=root/'plugins/anime-sama-plus/data';idx=updater.generate(self.raw(),base);rev=idx['revision'];pointer=base/'current.json';original=json.dumps({'revision':rev});pointer.write_text(original)
            source=root/'source.json';source.write_bytes(self.raw('two'))
            with patch.object(updater,'ROOT',root),patch.object(sys,'argv',['update','--source',str(source),'--publish-current']),patch.object(updater.subprocess,'run'):updater.main()
            self.assertEqual(pointer.read_text(),original);self.assertEqual([p.name for p in base.iterdir() if p.is_dir()],[rev])
