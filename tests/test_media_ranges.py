import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import media_probe as p

class MediaRangeTests(unittest.TestCase):
    def test_declared_offsets_skip_cover_prefix_and_preserve_headers(self):
        init=(12).to_bytes(4,'big')+b'ftypisom';segment=(12).to_bytes(4,'big')+b'stypisom'
        shared=b'\xff\xd8JPEG-COVER'+init+segment;offset=len(shared)-len(init)-len(segment)
        playlist=f'#EXTM3U\n#EXT-X-MAP:URI="file.mp4?sig=keep%2F",BYTERANGE="12@{offset}"\n#EXTINF:10,\n#EXT-X-BYTERANGE:12@{offset+12}\nfile.mp4?sig=keep%2F'
        calls=[]
        class Response(io.BytesIO):
            status=206
        def read(req,timeout):
            self.assertTrue(req.full_url.endswith('?sig=keep%2F'));self.assertEqual(req.headers['Referer'],'https://site.example/')
            start,end=map(int,req.headers['Range'].removeprefix('bytes=').split('-'));calls.append((start,end))
            r=Response(shared[start:end+1]);r.headers={'Content-Range':f'bytes {start}-{end}/{len(shared)}'};return r
        with patch.object(p.urllib.request,'urlopen',read),patch.object(p.shutil,'which',return_value=None):r=p.probe_ranged_hls(playlist,'https://media.example/list.m3u8',{'Referer':'https://site.example/'})
        self.assertTrue(r['ok']);self.assertFalse(r['codec_checked']);self.assertEqual(calls,[(offset,offset+11),(offset+12,offset+23)])
        self.assertEqual(r['initialization_boxes'],['ftyp']);self.assertEqual(r['media_boxes'],['styp'])
    def test_range_ignored_or_cover_bytes_are_not_a_media_pass(self):
        class Response(io.BytesIO):
            def __init__(self,status):super().__init__(b'\xff\xd8COVER!!');self.status=status;self.headers={'Content-Range':'bytes 20-28/100'}
        body='#EXTM3U\n#EXT-X-MAP:URI="shared",BYTERANGE="9@20"\n#EXT-X-BYTERANGE:9@20\nshared'
        for status in [200,206]:
            with patch.object(p.urllib.request,'urlopen',side_effect=lambda *a,**k:Response(status)),patch.object(p.shutil,'which',return_value=None):r=p.probe_ranged_hls(body,'https://media.example/list',{})
            self.assertFalse(r['ok'])
    def test_implicit_initial_offsets_and_oversized_initialization_are_unverified(self):
        for raw in ['12','-1@0','0@0','12@-1','9007199254740993@0']:
            with self.assertRaises(ValueError):p.byte_range(raw)
        body='#EXTM3U\n#EXT-X-MAP:URI="x",BYTERANGE="262145@0"\n#EXT-X-BYTERANGE:12@300000\nx'
        with patch.object(p.urllib.request,'urlopen') as read:r=p.probe_ranged_hls(body,'https://media.example/list',{})
        self.assertFalse(r['ok']);read.assert_not_called()
