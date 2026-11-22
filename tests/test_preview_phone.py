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
        original=json.dumps(fixtures,sort_keys=True)
        selected=selected_fixtures(fixtures,'hunter:2:32,aot:4:16')
        self.assertEqual([(f['name'],v['input']) for f in selected for v in f['episodes']],[('hunter',[2,32]),('aot',[4,16])])
        self.assertEqual(selected_fixtures(fixtures,''),fixtures)
        self.assertEqual(json.dumps(fixtures,sort_keys=True),original)
        with self.assertRaises(ValueError):selected_fixtures(fixtures,'aot:4:999')

    def test_modern_seek_public_header_decodes_on_both_literal_bridges(self):
        entry="function getStreams(id,type,season,episode){return run(id,type,season,episode,function(ctx){return resolveHost({url:'https://neocine.embedseek.com/#abc',lang:'VF'},'https://movix.dog/',ctx,'Seek');});}"
        with tempfile.TemporaryDirectory() as directory:
            bundle=Path(directory)/'movix-extra.js'
            bundle.write_text(helper_bundle(ROOT/'plugins/sources-fr-plus/providers/movix-extra.js',entry))
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
            for bundle in ['plugins/sources-fr-plus/providers/movix.js','plugins/anime-sama-plus/providers/anime-sama.js']:
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
            for bundle in ['plugins/sources-fr-plus/providers/movix.js','plugins/anime-sama-plus/providers/anime-sama.js']:
                rows,summary=check(ROOT/bundle,['1429','tv',4,1],runtime=runtime,scenario='aot-input',provider_settings=settings,metadata_key='fixture-key',log_sink=io.StringIO())
                self.assertTrue(rows)
                self.assertTrue(all('→' not in r.get('size','') for r in rows))
                mappings=[e for e in summary['resolver_events'] if e['stage'] in ['episode-mapping','anime-input-mapping']]
                if bundle.startswith('providers/'):
                    self.assertTrue(any(e['data']['basis'].startswith('imdb-stream-and-unique-release') for e in mappings))

    def test_report_is_not_registered_as_a_playback_provider(self):
        report=json.loads((ROOT/'plugins/episode-diagnostics/manifest.json').read_text())
        self.assertEqual(report['scrapers'][0]['supportedTypes'],[])
        for manifest in ['plugins/sources-fr-plus/manifest.json','plugins/anime-sama-plus/manifest.json']:
            streams=json.loads((ROOT/manifest).read_text())
            self.assertNotIn(report['scrapers'][0]['id'],[s['id'] for s in streams['scrapers']])

    def test_missing_reference_season_recovers_once_on_both_bridges_and_plugins(self):
        settings={'aiometadataManifestUrl':'https://input.example/stremio/private-fixture/manifest.json','episodeMetadataSource':'aiometadata','diagnostics':True}
        for runtime in ['mobile','tv']:
            for bundle,entry in [('plugins/sources-fr-plus/providers/movix.js','movix-tv'),('plugins/anime-sama-plus/providers/anime-sama.js','anime-sama')]:
                summaries=[]
                for scenario in ['input-order','input-order-gap']:
                    rows,summary=check(ROOT/bundle,['46298','tv',2,63],runtime=runtime,scenario=scenario,provider_settings=settings,metadata_key='fixture-key',scraper_id=entry,log_sink=io.StringIO())
                    self.assertTrue(rows)
                    self.assertTrue(all('episode-121.mp4' in r['url'] for r in rows))
                    summaries.append(summary)
                self.assertEqual(summaries[1]['requests'],summaries[0]['requests']+1)
                mappings=[e for e in summaries[1]['resolver_events'] if e['stage'] in ['episode-mapping','anime-input-mapping']]
                self.assertTrue(any(e['data']['basis'].startswith('catalog-imdb-recovery/') for e in mappings))

    def test_xperience_known_tvdb_artwork_maps_on_both_plugins_and_literal_bridges(self):
        import quickjs_check as bridge
        from unittest.mock import patch
        original=bridge.fixture_response
        def xperience(provider,url,scenario):
            value=original(provider,url,scenario)
            if url.startswith('https://input.example/'):
                for key in ['_metaProvider','_imdbId','_tmdbId','_tvdbId']:
                    value['meta'].pop(key,None)
                for video in value['meta']['videos']:
                    if (video['season'],video['episode'])!=(2,72):
                        video['thumbnail']='https://artworks.thetvdb.com/banners/v4/episode/'+str(900000+video['season']*10000+video['episode'])+'/screencap/fixture.jpg'
                    video['thumbnail']=video['thumbnail'].replace('/banners/v4/episode/','/banners/series/252322/episodes/').replace('/screencap/fixture.jpg','.jpg')
            return value
        settings={'aiometadataManifestUrl':'https://input.example/stremio/private-fixture/manifest.json','episodeMetadataSource':'aiometadata','inputMetadataAdapter':'xperience','inputMetadataProvider':'tvdb','diagnostics':True}
        for runtime in ['tv','mobile']:
            for bundle,entry in [('plugins/sources-fr-plus/providers/movix.js','movix-tv'),('plugins/anime-sama-plus/providers/anime-sama.js','anime-sama')]:
                for order in [None,'tvdb','auto']:
                    self._check_xperience_mapping(runtime,bundle,entry,{**settings,'inputMetadataProvider':order},xperience)

    def _check_xperience_mapping(self,runtime,bundle,entry,settings,xperience):
        import quickjs_check as bridge
        from unittest.mock import patch
        with self.subTest(runtime=runtime,entry=entry,order=settings['inputMetadataProvider']),patch.object(bridge,'fixture_response',xperience):
            rows,summary=check(ROOT/bundle,['46298','tv',2,72],runtime=runtime,scenario='input-order-72',provider_settings=settings,metadata_key='fixture-key',scraper_id=entry,log_sink=io.StringIO())
            self.assertTrue(rows)
            self.assertTrue(any('Xperience S2E72' in r.get('size','') for r in rows))
            self.assertNotIn('private-fixture',json.dumps(rows))
            events=[e['data'] for e in summary['resolver_events'] if e['stage'] in ['episode-mapping','anime-input-mapping']]
            self.assertTrue(any(e['to']=={'season':2,'episode':130} for e in events))


    def test_xperience_official_episode_fallback_on_both_literal_bridges(self):
        import quickjs_check as bridge
        from unittest.mock import patch
        entry="async function getStreams(id,type,season,episode){return run(id,type,season,episode,async function(ctx){await inputEpisodeCoordinates(ctx,'primary','nuvio-catalog');return [];});}"
        settings={'episodeMetadataSource':'aiometadata','inputMetadataAdapter':'xperience','inputMetadataProvider':'auto','aiometadataManifestUrl':'https://input.example/private/manifest.json','diagnostics':True}
        for runtime in ['mobile','tv']:
            calls=[]
            def response(provider,url,scenario):
                calls.append(url)
                if url.startswith('https://input.example/'):
                    return {'meta':{'id':'tt0386676','videos':[{'id':'tt0386676:4:1','season':4,'episode':1,'title':'La course','released':'2007-09-28T01:00:00Z'},{'id':'tt0386676:0:1','season':0,'episode':1,'title':'La course','released':'2007-09-28T01:00:00Z'}]}}
                if 'catalog.nuvio.tv' in url:
                    return {'meta':{'id':'tt0386676','moviedb_id':2316,'videos':[{'id':'tt0386676:4:1','season':4,'episode':1,'title':'Fun Run','released':'2007-09-27T00:00:00Z'}]}}
                if '/tv/2316/season/4/episode/1?' in url:
                    return {'id':456,'season_number':4,'episode_number':1,'air_date':'2007-09-27','name':'Fun Run','translations':{'translations':[{'data':{'name':'La course'}}]}}
                raise AssertionError('Unexpected official episode fixture request')
            with tempfile.TemporaryDirectory() as directory,patch.object(bridge,'fixture_response',response):
                bundle=Path(directory)/'movix.js';bundle.write_text(helper_bundle(ROOT/'plugins/sources-fr-plus/providers/movix.js',entry))
                _,summary=check(bundle,['2316','tv',4,1],runtime=runtime,scenario='xperience-official',allow_empty=True,metadata_key='fixture-key',provider_settings=settings,log_sink=io.StringIO())
                self.assertEqual(summary['requests'],3)
                events=[e['data'] for e in summary['resolver_events'] if e['stage']=='episode-mapping']
                self.assertEqual(events[0]['to'],{'season':4,'episode':1})
                self.assertEqual(events[0]['basis'],'xperience-official-episode-translations-and-release')

if __name__=='__main__':unittest.main()
