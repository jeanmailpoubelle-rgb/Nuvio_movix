"""Compiled FR episode proof and Vodix discovery on both literal app bridges."""
import io
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from quickjs_check import check,helper_bundle,ROOT

ENTRY="""function getStreams(id,type,season,episode){return run(id,type,season,episode,async function(ctx){await inputEpisodeCoordinates(ctx,'primary','nuvio-catalog');return [];});}"""

class BatchInputTests(unittest.TestCase):
    def test_batch_proof_and_rejection_on_tv_and_mobile(self):
        for runtime in ['tv','mobile']:
            for family in ['fr-tmdb-batch','vodix-batch']:
                for variant in ['xperience','aio','reused','conflict','tvdb']:
                    with self.subTest(runtime=runtime,family=family,variant=variant),tempfile.TemporaryDirectory() as directory:
                        production=ROOT/('plugins/sources-fr-plus/providers/vodix.js' if family=='vodix-batch' else 'plugins/sources-fr-plus/providers/movix.js')
                        provider=production
                        if family=='fr-tmdb-batch':
                            provider=Path(directory)/'movix.js';provider.write_text(helper_bundle(production,ENTRY))
                        settings={'episodeMetadataSource':'aiometadata','aiometadataManifestUrl':'https://input.example/manifest.json',
                            'inputMetadataAdapter':'aiometadata' if variant in ['aio','tvdb'] else 'xperience','inputMetadataProvider':'auto'}
                        streams,summary=check(provider,('279246','tv',1,1),runtime=runtime,scenario=family+'-'+variant,
                            provider_settings=settings,allow_empty=True,log_sink=io.StringIO())
                        verified=[e for e in summary['resolver_events'] if e['stage'] in ['episode-mapping','vodix-input-verified']]
                        expected=variant in ['xperience','aio']
                        self.assertEqual(bool(verified),expected)
                        if expected:
                            if not (family=='fr-tmdb-batch' and variant=='aio'):
                                self.assertEqual(verified[0]['data']['basis'],'official-unique-tmdb-still-and-release')
                            if family=='vodix-batch':self.assertEqual(len(streams),1)
                        else:self.assertEqual(streams,[])

if __name__=='__main__':unittest.main()
