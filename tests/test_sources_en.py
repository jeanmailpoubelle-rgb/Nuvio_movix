"""Dedicated EN entry in the unchanged literal Mobile/TV wrappers.

TV execution is a compatibility fixture, not support for TV settings setup.
"""
import io
import json
from pathlib import Path
import sys
import unittest
import tempfile
from unittest.mock import patch
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import quickjs_check as bridge

CONFIG = json.loads((ROOT / 'config/sources-en.json').read_text())
FIXTURE = json.loads((ROOT / 'tests/fixtures/input-metadata/series.json').read_text())[0]
SIGNED = 'https://media.settlar.io/v1/object/fixture-capability?sig=keep%2F&x=1+2'

def response(provider, url, scenario):
    if url.startswith(CONFIG['tmdbApi'] + '/'):
        return dict(id=46298, original_language='ja', external_ids=dict(imdb_id=FIXTURE['imdbId'], tvdb_id=252322))
    if url.startswith('https://input.example/'):
        return dict(meta=dict(id=FIXTURE['imdbId'], _imdbId=FIXTURE['imdbId'], _tmdbId='46298', _tvdbId='252322', _metaProvider='tvdb',
                              videos=[dict(id=v['streamId'], season=v['input'][0], episode=v['input'][1], released=v['released'], _tvdbEpisodeId=v['tvdbEpisodeId']) for v in FIXTURE['episodes']]))
    if url.startswith(CONFIG['mappingBaseUrl'] + '/'):
        return json.loads((ROOT / 'plugins/sources-en/data' / url.split(CONFIG['mappingBaseUrl'] + '/')[1]).read_text())
    if url.startswith(CONFIG['episodeApi']):
        return dict(mappings=dict(anilist_id=11061), episodes={'130': dict(tvdbId=4884760, tvdbShowId=252322)})
    if '/playback-bootstrap/' in url:
        assert '/11061?' in url and parse_qs(urlsplit(url).query)['ep'] == ['130']
        return dict(core=dict(anilistId=11061), episode=130, settlarSelection='private-grant', anipmPackages=dict(episodes={'130': dict(sub=True, dub=True)}))
    if '/settlar/session?' in url:
        assert parse_qs(urlsplit(url).query)['ep'] == ['130']
        return dict(embedUrl=CONFIG['embedOrigin'] + '/embed/v1?t=fixture-grant')
    if url.startswith(CONFIG['embedOrigin'] + '/api/embed/session?'):
        return dict(source=SIGNED, kind='hls', audioLang='ja', subtitles=[dict(url='https://media.settlar.io/fr.vtt', srclang='fr', label='French')])
    if url == SIGNED:
        return '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="ja",URI="ja.m3u8"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="en",URI="en.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=1,RESOLUTION=640x360,AUDIO="a"\nvideo.m3u8'
    raise AssertionError('Unexpected EN fixture endpoint')

class SourcesENTests(unittest.TestCase):
    def test_settlar_challenge_classification_is_visible_and_private_on_both_wrappers(self):
        def challenged(provider, url, scenario):
            if url.startswith(CONFIG['embedOrigin']):
                return {'__fixture_response': {'status': 403, 'headers': {'cf-mitigated': 'challenge'}, 'body': '<html>private-denial</html>'}}
            return response(provider, url, scenario)
        for runtime in ['mobile', 'tv']:
            with self.subTest(runtime=runtime), patch.object(bridge, 'fixture_response', challenged):
                log = io.StringIO()
                rows, _ = bridge.check(ROOT / 'plugins/sources-en/providers/sources-en.js', ('603','movie',None,None),
                    runtime=runtime, scenario='en-native', scraper_id='repo:sources-en-diagnostic',
                    provider_settings=dict(aiometadataManifestUrl='https://input.example/private-fixture/manifest.json'), log_sink=log)
                self.assertLessEqual(len(rows), 8)
                self.assertIn('EN_SETTLAR_ACCESS_DENIED', rows[1]['url'])
                self.assertIn('[challenge navigateur]', rows[2]['url'])
                self.assertEqual(rows[3]['name'], 'Initialisation Settlar')
                self.assertNotIn('private-denial', json.dumps(rows) + log.getvalue())

    def test_denied_settlar_session_recovery_is_bounded_on_both_literal_wrappers(self):
        for runtime in ['mobile', 'tv']:
            for persistent in [False, True]:
                calls = []
                def denied(provider, url, scenario):
                    calls.append(url)
                    if '/settlar/session?' in url:
                        mode = parse_qs(urlsplit(url).query)['channel'][0]
                        return dict(embedUrl=CONFIG['embedOrigin'] + '/embed/v1?t=fixture-' + mode)
                    if '/api/embed/session?' in url:
                        if persistent or calls.count(url) == 1:
                            return {'__fixture_response': {'status': 403, 'body': 'private-denial'}}
                    if '/embed/v1?' in url:
                        return {'__fixture_response': {'status': 200, 'headers': {'set-cookie': 'binding=fixture; Path=/; Secure'}, 'body': '<html>discarded</html>'}}
                    return response(provider, url, scenario)
                with self.subTest(runtime=runtime, persistent=persistent), patch.object(bridge, 'fixture_response', denied):
                    log = io.StringIO()
                    streams, summary = bridge.check(ROOT / 'plugins/sources-en/providers/sources-en.js', ('46298', 'tv', 2, 72),
                        runtime=runtime, scenario='en-native', allow_empty=persistent, scraper_id='repo:sources-en-anipm',
                        provider_settings=dict(aiometadataManifestUrl='https://input.example/private-fixture/manifest.json', diagnostics=True), log_sink=log)
                    self.assertEqual(len(streams), 0 if persistent else 1)
                    self.assertLessEqual(sum('/api/embed/session?' in u for u in calls), 4)
                    self.assertLessEqual(sum('/embed/v1?' in u for u in calls), 2)
                    self.assertEqual(summary['pending_native_timers'], 0)
                    if persistent:
                        self.assertIn('EN_SETTLAR_ACCESS_DENIED', log.getvalue())
                    for secret in ['private-denial', 'binding=fixture', '<html>discarded']:
                        self.assertNotIn(secret, log.getvalue())

    def test_en_diagnostic_is_settings_only_and_keeps_private_data_out_on_both_wrappers(self):
        def blocked(provider, url, scenario):
            if '/playback-bootstrap/' in url:
                return {'__fixture_response':{'status':403,'body':'private-upstream-body'}}
            return response(provider, url, scenario)
        for runtime in ['mobile','tv']:
            with self.subTest(runtime=runtime), patch.object(bridge, 'fixture_response', blocked):
                rows, summary = bridge.check(ROOT / 'plugins/sources-en/providers/sources-en.js', ('603','movie',None,None),
                    runtime=runtime, scenario='en-native', scraper_id='repo:sources-en-diagnostic',
                    provider_settings=dict(aiometadataManifestUrl='https://input.example/private-fixture/manifest.json'), log_sink=io.StringIO())
                self.assertTrue(any(r['name']=='Ani.pm bootstrap' and r['url']=='diagnostic:HTTP 403' for r in rows))
                self.assertLessEqual(len(rows),8)
                self.assertEqual(rows[0]['name'],'Bilan')
                self.assertEqual(rows[1]['name'],'Cause')
                self.assertEqual(rows[2]['name'],'Ani.pm bootstrap')
                self.assertEqual(summary['sources'], 0)
                for secret in ['private-fixture','private-grant','private-upstream-body','api_key=']:
                    self.assertNotIn(secret, json.dumps(rows))

    def test_live_verifier_handles_caption_report_shape_and_redacts_streams(self):
        import verify_sources_en as verifier
        stream = dict(url=SIGNED, type='hls', format='m3u8', headers={'Referer':'https://embed.settlar.io/'}, quality='360p', audioLanguages=['ja'], subtitleLanguages=['en'])
        import hashlib
        summary = dict(requests=12, seconds=1, http_failures=[], bundle_sha256=hashlib.sha256((ROOT/'plugins/sources-en/providers/sources-en.js').read_bytes()).hexdigest())
        def checked(*args, **kwargs):
            kwargs['log_sink'].write('JS [sources-en] '+json.dumps(dict(code='EN_MAPPED', anilistId=21519, episode=1))+'\n')
            return [stream], summary
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'report.json'
            with patch.object(verifier, 'check', checked), patch.object(verifier, 'probe_media', return_value={'ok':True}), patch.object(verifier, 'probe_subtitles', return_value={'ok':True,'tracks':[{'ok':True,'language':'en'}]}), patch.dict('os.environ', {'NUVIO_TMDB_API_KEY':'private-test-key'}), patch.object(sys, 'argv', ['verify_sources_en.py','--case','your-name','--output',str(output)]):
                self.assertEqual(verifier.main(), 0)
            text = output.read_text()
            self.assertNotIn(SIGNED, text)
            self.assertNotIn('private-test-key', text)
            self.assertEqual(json.loads(text)['results'][0]['status'], 'pass')
            self.assertTrue(json.loads(text)['results'][0]['player_contract_ok'])
            # A readable master and segment do not prove the app will select HLS.
            del stream['type']
            with patch.object(verifier, 'check', checked), patch.object(verifier, 'probe_media', return_value={'ok':True}), patch.object(verifier, 'probe_subtitles', return_value={'ok':True}), patch.dict('os.environ', {'NUVIO_TMDB_API_KEY':'private-test-key'}), patch.object(sys, 'argv', ['verify_sources_en.py','--case','your-name','--output',str(output)]):
                self.assertEqual(verifier.main(), 1)
            row = json.loads(output.read_text())['results'][0]
            self.assertEqual(row['status'], 'attention')
            self.assertFalse(row['player_contract_ok'])

    def test_native_entry_mapping_tracks_signed_bytes_and_low_resolution(self):
        for runtime in ['mobile', 'tv']:
            with self.subTest(runtime=runtime), patch.object(bridge, 'fixture_response', response):
                streams, summary = bridge.check(ROOT / 'plugins/sources-en/providers/sources-en.js', ('46298', 'tv', 2, 72),
                    runtime=runtime, scenario='en-native', scraper_id='repo:sources-en-anipm',
                    provider_settings=dict(aiometadataManifestUrl='https://input.example/private-fixture/manifest.json', diagnostics=True), log_sink=io.StringIO())
                self.assertEqual(len(streams), 1)
                self.assertEqual(streams[0]['url'], SIGNED)
                self.assertEqual(streams[0]['type'], 'hls')
                self.assertEqual(streams[0]['quality'], '360p')
                self.assertEqual(streams[0]['audioLanguages'], ['ja', 'en'])
                self.assertIn('TVDB S2E72 → Ani.pm E130', streams[0]['size'])
                self.assertEqual(summary['pending_native_timers'], 0)

    def test_unconfigured_entry_has_no_requests(self):
        for runtime in ['mobile', 'tv']:
            with self.subTest(runtime=runtime):
                streams, summary = bridge.check(ROOT / 'plugins/sources-en/providers/sources-en.js', ('46298', 'tv', 2, 72),
                    runtime=runtime, scenario='en-native', scraper_id='repo:sources-en-anipm', provider_settings={}, allow_empty=True, log_sink=io.StringIO())
                self.assertEqual(streams, [])
                self.assertEqual(summary['requests'], 0)

if __name__ == '__main__':
    unittest.main()
