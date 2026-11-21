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
BETA = json.loads((ROOT / 'tests/fixtures/sources-en-beta.json').read_text())

def response(provider, url, scenario):
    if url.startswith(CONFIG['baseUrl'] + CONFIG['betaServerPath']):
        return dict(available=False)
    if url.startswith(CONFIG['tmdbApi'] + '/'):
        return dict(id=46298, original_language='ja', external_ids=dict(imdb_id=FIXTURE['imdbId'], tvdb_id=252322))
    if url.startswith('https://input.example/'):
        return dict(meta=dict(id=FIXTURE['imdbId'], _imdbId=FIXTURE['imdbId'], _tmdbId='46298', _tvdbId='252322', _metaProvider='tvdb',
                              videos=[dict(id=v['streamId'], season=v['input'][0], episode=v['input'][1], released=v['released'], _tvdbEpisodeId=v['tvdbEpisodeId']) for v in FIXTURE['episodes']]))
    if url == CONFIG['mappingBaseUrl'] + '/current.json':
        return json.loads((ROOT / 'plugins/sources-en/data/current.json').read_text())
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
    def test_saved_manifests_switch_without_reading_inactive_or_legacy_urls(self):
        for runtime in ['mobile','tv']:
            for adapter in ['aiometadata','xperience']:
                calls=[]
                def changed(provider,url,scenario):
                    calls.append(url)
                    return response(provider,url,scenario)
                settings=dict(aiometadataManifestUrl='https://legacy.example/private/manifest.json',
                    aiometadataSavedManifestUrl='https://input.example/aio-private/manifest.json',
                    xperienceManifestUrl='https://input.example/x-private/manifest.json',inputMetadataAdapter=adapter,inputMetadataProvider='tvdb')
                with self.subTest(runtime=runtime,adapter=adapter),patch.object(bridge,'fixture_response',changed):
                    result,_=bridge.check(ROOT/'plugins/sources-en/providers/sources-en.js',('46298','tv',2,72),runtime=runtime,scenario='en-native',scraper_id='repo:sources-en-anipm',provider_settings=settings,log_sink=io.StringIO())
                    self.assertTrue(result)
                    selected=[u for u in calls if u.startswith('https://input.example/')]
                    self.assertEqual(len(selected),1)
                    self.assertIn('/x-private/' if adapter=='xperience' else '/aio-private/',selected[0])
                    self.assertFalse(any('legacy.example' in u for u in calls))
                    self.assertNotIn('-private',json.dumps(result))

    def test_xperience_tvdb_input_without_aio_stamps_on_both_wrappers(self):
        for runtime in ['mobile','tv']:
            def changed(provider,url,scenario):
                data=response(provider,url,scenario)
                if url.startswith('https://input.example/'):
                    for k in ['_metaProvider','_imdbId','_tmdbId','_tvdbId']:data['meta'].pop(k,None)
                    for v in data['meta']['videos']:
                        if v.get('_tvdbEpisodeId'):
                            v['thumbnail']='https://artworks.thetvdb.com/banners/v4/episode/'+str(v.pop('_tvdbEpisodeId'))+'/screencap/example.jpg'
                return data
            with self.subTest(runtime=runtime),patch.object(bridge,'fixture_response',changed):
                streams,summary=bridge.check(ROOT/'plugins/sources-en/providers/sources-en.js',('46298','tv',2,72),runtime=runtime,scenario='en-native',scraper_id='repo:sources-en-anipm',provider_settings=dict(aiometadataManifestUrl='https://input.example/private-fixture/manifest.json',inputMetadataAdapter='xperience',inputMetadataProvider='tvdb'),log_sink=io.StringIO())
                self.assertEqual(len(streams),1)
                self.assertEqual(streams[0]['type'],'hls')
                self.assertIn('TVDB S2E72 → Ani.pm E130',streams[0]['size'])
                self.assertNotIn('private-fixture',json.dumps(streams))

    def test_optional_episode_check_and_visible_conflicts_on_both_wrappers(self):
        for runtime in ['mobile','tv']:
            for mode in ['missing','partial','unavailable','conflict','no-map']:
                calls=[]
                def changed(provider,url,scenario):
                    calls.append(url)
                    if mode=='no-map' and url.startswith(CONFIG['mappingBaseUrl']+'/') and not url.endswith('/current.json'):
                        return dict(schema=1,revision=CONFIG['mappingRevision'],rows={})
                    if url.startswith(CONFIG['episodeApi']):
                        if mode=='missing':return {'mappings':{'anilist_id':11061},'episodes':{}}
                        if mode=='partial':return {'episodes':{'130':{'tvdbId':None,'tvdbShowId':None}}}
                        if mode=='unavailable':return {'__fixture_response':{'status':503,'body':'private-error-body'}}
                        return {'mappings':{'anilist_id':11061},'episodes':{'130':{'tvdbId':999,'tvdbShowId':252322}}}
                    return response(provider,url,scenario)
                with self.subTest(runtime=runtime,mode=mode),patch.object(bridge,'fixture_response',changed):
                    result,summary=bridge.check(ROOT/'plugins/sources-en/providers/sources-en.js',('46298','tv',2,72),runtime=runtime,scenario='en-native',allow_empty=mode=='no-map',scraper_id='repo:sources-en-anipm',provider_settings=dict(aiometadataManifestUrl='https://input.example/private-fixture/manifest.json'),log_sink=io.StringIO())
                    if mode=='no-map':
                        self.assertEqual(result,[]);self.assertEqual(summary['sources'],0);self.assertEqual(summary['warning_codes'],[])
                    elif mode=='conflict':
                        self.assertEqual(len(result),1);self.assertTrue(result[0]['warning']);self.assertEqual(summary['sources'],0)
                        self.assertEqual(summary['warning_codes'],['EN_MAPPING_EPISODE_CONFLICT'])
                        self.assertFalse(any('playback-bootstrap' in u for u in calls))
                        for key in ['quality','headers','audioLanguage']:self.assertNotIn(key,result[0])
                    else:
                        self.assertEqual(len(result),1);self.assertEqual(result[0]['type'],'hls');self.assertEqual(summary['sources'],1)
                    self.assertNotIn('private-fixture',json.dumps(result));self.assertNotIn('private-error-body',json.dumps(result))

    def test_beta_multi_audio_master_on_both_literal_wrappers(self):
        for runtime in ['mobile', 'tv']:
            calls = []
            def beta_response(provider, url, scenario):
                calls.append(url)
                if url.startswith(CONFIG['baseUrl'] + CONFIG['betaServerPath']):
                    return BETA['grant'] if '/copy?' in url else BETA['availability']
                if '/api/embed/session?t=beta-fixture' in url:
                    return BETA['session']
                if url == BETA['session']['source']:
                    return BETA['master']
                if '/playback-bootstrap/' in url or '/settlar/session?' in url:
                    raise AssertionError('Beta must not depend on standard source requests')
                return response(provider, url, scenario)
            with self.subTest(runtime=runtime), patch.object(bridge, 'fixture_response', beta_response):
                log = io.StringIO()
                streams, summary = bridge.check(ROOT / 'plugins/sources-en/providers/sources-en.js', ('46298', 'tv', 2, 72),
                    runtime=runtime, scenario='en-native', scraper_id='repo:sources-en-anipm-beta',
                    provider_settings=dict(aiometadataManifestUrl='https://input.example/private-fixture/manifest.json', diagnostics=True), log_sink=log)
                self.assertEqual(len(streams), 1)
                self.assertEqual(streams[0]['url'], BETA['session']['source'])
                self.assertEqual(streams[0]['type'], 'hls')
                self.assertEqual(streams[0]['audioLanguages'], ['ja', 'en', 'fr'])
                self.assertEqual(streams[0]['subtitleLanguages'], ['en', 'fr'])
                self.assertEqual(streams[0]['audioLanguage'], 'MULTI')
                self.assertEqual(streams[0]['server'], 'beta')
                self.assertIn('Ani.pm · Beta', streams[0]['size'])
                self.assertEqual(summary['pending_native_timers'], 0)
                self.assertEqual(sum('/copy?ep=130&lang=sub' in u for u in calls), 1)
                self.assertNotIn('beta-fixture', log.getvalue())

    def test_beta_unavailable_and_invalid_grants_stay_empty_on_both_wrappers(self):
        for runtime in ['mobile', 'tv']:
            for state in ['unavailable', 'wrong-episode', 'expired', 'foreign']:
                calls = []
                def beta_response(provider, url, scenario):
                    calls.append(url)
                    if url.startswith(CONFIG['baseUrl'] + CONFIG['betaServerPath']):
                        if '/copy?' in url:
                            return {**BETA['grant'], **({'expires':1} if state == 'expired' else {'player':'https://foreign.example/embed/v1?t=fixture'})}
                        return {'available':False} if state == 'unavailable' else {**BETA['availability'], **({'episodes':[1]} if state == 'wrong-episode' else {})}
                    return response(provider, url, scenario)
                with self.subTest(runtime=runtime, state=state), patch.object(bridge, 'fixture_response', beta_response):
                    streams, _ = bridge.check(ROOT / 'plugins/sources-en/providers/sources-en.js', ('46298', 'tv', 2, 72),
                        runtime=runtime, scenario='en-native', allow_empty=True, scraper_id='repo:sources-en-anipm-beta',
                        provider_settings=dict(aiometadataManifestUrl='https://input.example/private-fixture/manifest.json'), log_sink=io.StringIO())
                    self.assertEqual(streams, [])
                    self.assertFalse(any(u.startswith('https://foreign.example') for u in calls))
                    if state in ['unavailable', 'wrong-episode']:
                        self.assertFalse(any('/copy?' in u for u in calls))

    def test_audio_audit_checks_referenced_preferred_tracks_and_rejects_failed_renditions(self):
        import verify_sources_en as verifier
        class Response(io.BytesIO):
            url = BETA['session']['source']
        stream = dict(url=BETA['session']['source'], headers={}, audioLanguages=['ja', 'en', 'fr'])
        for failed in [False, True]:
            calls = []
            def media(item):
                calls.append(item['url'])
                return {'ok': not (failed and 'audio-fr' in item['url'])}
            with patch.object(verifier.urllib.request, 'urlopen', side_effect=lambda *a, **k:Response(BETA['master'].encode())), patch.object(verifier, 'probe_media', media):
                result = verifier.probe_audio(stream)
            self.assertEqual(result['ok'], not failed)
            self.assertEqual([t['language'] for t in result['tracks']], ['ja', 'en', 'fr'])
            self.assertEqual(len(calls), 3)
            self.assertNotIn('sig=', json.dumps(result))

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
