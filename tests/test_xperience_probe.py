"""Keep private metadata discovery useful without publishing raw profile facts."""
import importlib.util
import json
import unittest
from unittest.mock import patch
from pathlib import Path

spec = importlib.util.spec_from_file_location('xperience_probe', Path(__file__).resolve().parents[1] / 'scripts/probe_xperience.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

class ProbeTests(unittest.TestCase):
    def test_redacts_urls_titles_unknown_values_but_preserves_episode_identity(self):
        private = 'PRIVATE_PROFILE_SENTINEL'
        meta = {'id': 'tt2098220', '_metaProvider': 'tvdb', 'description': private,
                private: private, 'videos': [{'id': 'tt2098220:2:72', 'season': 2, 'episode': 72,
                'title': private, 'thumbnail': 'https://private.example/' + private,
                '_tvdbEpisodeId': '4884760', 'released': '2014-05-21T00:00:00Z', 'raw': private}]}
        result = p.summarize(meta, [(2, 72)])
        self.assertNotIn(private, json.dumps(result))
        self.assertEqual(result['selected'][0]['matches'][0]['_tvdbEpisodeId'], '4884760')
        self.assertEqual(result['seasons'], [{'season': 2, 'count': 1, 'first': 72, 'last': 72}])

    def test_retains_ambiguous_rows_and_distinct_stream_suffixes(self):
        r = p.summarize({'videos': [{'season': 2, 'episode': 1, 'id': 'tt2098220:1:59'},
                                    {'season': 2, 'episode': 1, 'id': 'tt2098220:2:1'}]}, [(2, 1)])
        self.assertEqual(len(r['selected'][0]['matches']), 2)
        self.assertEqual(r['selected'][0]['matches'][0]['id'], 'tt2098220:1:59')

    def test_only_extracts_exact_public_artwork_identity(self):
        good = p.episode({'thumbnail': 'https://artworks.thetvdb.com/banners/v4/episode/4884760/screencap/example.jpg?secret=PRIVATE'})
        self.assertEqual(good['artwork_tvdb_episode_id'], '4884760')
        self.assertNotIn('PRIVATE', json.dumps(good))
        series=p.episode({'thumbnail':'https://artworks.thetvdb.com/banners/series/359274/episodes/7152184.jpg'})
        self.assertEqual(series['artwork_tvdb_episode_id'],'7152184')
        self.assertEqual(series['artwork_path_shape'],'series-episode')
        foreign = p.episode({'thumbnail': 'https://artworks.thetvdb.com.evil.example/banners/v4/episode/4884760/screencap/example.jpg'})
        self.assertNotIn('artwork_tvdb_episode_id', foreign)
        still=p.episode({'thumbnail':'https://image.tmdb.org/t/p/w500/9wAmryTiNyosAe9doSibzCaAqQw.jpg?private=TOKEN_SENTINEL'})
        self.assertEqual(still['artwork_path_shape'],'tmdb-still')
        self.assertEqual(len(still['artwork_still_sha256']),64)
        self.assertNotIn('TOKEN_SENTINEL',json.dumps(still))
        self.assertNotIn('artwork_still_sha256',p.episode({'thumbnail':'https://image.tmdb.org.evil.test/t/p/w500/9wAmryTiNyosAe9doSibzCaAqQw.jpg'}))

    def test_real_adapter_does_not_infer_provider_from_imdb_or_coordinates(self):
        meta = {'id': 'tt2098220', 'videos': [{'season': 2, 'episode': 72, 'id': 'tt2098220:2:72'}]}
        result = p.adapter(meta, p.CASES[0], 'https://fixture.example')
        selected = next(x for x in result['selected'] if x['requested'] == [2, 72])
        self.assertEqual(selected['provider'], 'unknown')
        self.assertIsNone(selected['tvdbEpisodeId'])
        meta['_tvdbId'] = '999999'
        self.assertEqual(p.adapter(meta, p.CASES[0], 'https://fixture.example')['identity'], 'INPUT_METADATA_IDENTITY_CONFLICT')

    def test_network_exception_never_leaks_private_url(self):
        with patch.object(p, 'fetch', side_effect=ValueError('https://private.example/TOKEN_SENTINEL')):
            result = p.run_source('xperience', 'https://private.example/TOKEN_SENTINEL/manifest.json')
        self.assertNotIn('TOKEN_SENTINEL', json.dumps(result))
        self.assertTrue(all(x['status'] == 'unavailable-or-invalid' for x in result['cases']))

    def test_manifest_keeps_query_without_accepting_credentials_or_fragments(self):
        base, _ = p.base_url('stremio://example.test/manifest/private/manifest.json?signature=private')
        self.assertEqual(base.path, '/manifest/private')
        self.assertEqual(base.query, 'signature=private')
        for u in ['https://user:pass@example.test/manifest.json', 'http://example.test/manifest.json', 'https://example.test/manifest.json#private']:
            with self.assertRaises(ValueError):
                p.base_url(u)
