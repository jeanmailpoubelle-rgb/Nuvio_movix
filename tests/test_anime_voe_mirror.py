"""Actual compiled native/+ bundles on both native bridges; no live HTTP."""
import base64,codecs,io,json,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from quickjs_check import check,ROOT
class Response(io.BytesIO):
    status=200
    reason='OK'
    def __init__(self,url,body):
        self.url=url;self.headers={'Content-Type':'text/html'}
        super().__init__((json.dumps(body) if isinstance(body,dict) else body).encode())
class VoeMirrorTests(unittest.TestCase):
    def test_owned_link_same_voe_family_and_foreign_guards_on_both_bridges(self):
        payload={'v':1,'track':'vostfr','refs':[{'path':'/catalogue/example/saison1/vostfr/','index':0,'language':'vostfr'}]}
        identifier='as:ep:'+base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
        for runtime in ['mobile','tv']:
            for track in ['anime-sama','anime-sama-plus']:
                for destination in ['caseyseemavoid.com','foreign.example','uqload.to']:
                    with self.subTest(runtime=runtime,track=track,destination=destination):
                        calls=[]
                        def fetch(request,*args,**kwargs):
                            url=request.full_url;calls.append(url)
                            if '/catalogue/example/' in url:return Response(url,'<script>var eps1=["lien:1"];var epsJeton="fixture-token";var epsMeta={"1":["voe.sx"]};</script>')
                            if '/api/lien.php?' in url:return Response(url,{'u':'https://'+destination+'/embed-fixture.html?sig=keep%2F&x=2'})
                            if destination=='caseyseemavoid.com' and url.startswith('https://caseyseemavoid.com/'):
                                inner=base64.b64encode(json.dumps({'source':'https://cdn.example/mirror/master.m3u8?sig=keep%2F&x=2'}).encode()).decode()
                                binary=''.join(chr(ord(c)+3) for c in inner[::-1])
                                encoded=codecs.encode(base64.b64encode(binary.encode('latin1')).decode(),'rot_13')
                                return Response(url,'<script type="application/json">'+json.dumps([encoded])+'</script>')
                            if url.startswith('https://cdn.example/'):
                                return Response(url,'#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1280x720,BANDWIDTH=1000000\nvideo.m3u8' if 'master.m3u8' in url else '#EXTM3U\n#EXTINF:10,\nsegment.ts')
                            raise AssertionError('Unexpected URL')
                        log=io.StringIO()
                        with patch('urllib.request.urlopen',side_effect=fetch):
                            rows,summary=check(ROOT/f'plugins/{track}/providers/anime-sama.js',(identifier,'tv',1,1),live=True,runtime=runtime,allow_empty=True,scraper_id='repo:anime-sama-voe',provider_settings={'episodeMetadataSource':'native'},log_sink=log)
                        self.assertEqual(len(rows),int(destination=='caseyseemavoid.com'),log.getvalue())
                        if rows:self.assertEqual(rows[0]['url'],'https://cdn.example/mirror/master.m3u8?sig=keep%2F&x=2')
                        else:self.assertFalse(any(u.startswith('https://'+destination+'/') for u in calls))
