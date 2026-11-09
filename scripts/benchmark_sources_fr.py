#!/usr/bin/env python3
"""Compare real Sources FR catalogue wrappers using synthetic HTTP, never live I/O."""
import argparse,hashlib,io,json,re,statistics,subprocess,tempfile,time,urllib.response
from pathlib import Path
from unittest.mock import patch
from quickjs_check import ROOT,check

def response(req,count):
    u=req.full_url
    if '/api/wiflix/' in u:
        data={'tmdb_id':'603','players':{lang:[{'url':f'https://uqload.vc/embed-{lang}-{i}.html'} for i in range(count)] for lang in ['vf','vostfr']}}
    elif '/api/fstream/' in u:data={'tmdb':{'id':'603'},'players':{}}
    elif '/api/tmdb/' in u:data={'tmdb_details':{'id':'603'},'player_links':[]}
    elif 'uqload.vc/embed-' in u:
        key=u.rsplit('/',1)[-1][:-5];data='sources:[{file:"https://media.example/'+key+'.m3u8"}]'
    elif u.startswith('https://media.example/'):
        lang='ja' if 'vostfr' in u else 'fr'
        data='#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="'+lang+'"\n#EXT-X-STREAM-INF:RESOLUTION=1920x1080,AUDIO="a",BANDWIDTH=1000\nvideo.m3u8'
    else:raise AssertionError('Unexpected benchmark HTTP destination')
    body=(data if isinstance(data,str) else json.dumps(data)).encode()
    r=urllib.response.addinfourl(io.BytesIO(body),{'content-type':'text/plain'},u,200);r.reason='Fixture';return r

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--baseline-ref',default='HEAD');p.add_argument('--candidates',type=int,default=1000);p.add_argument('--repeats',type=int,default=5);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    if not 1<=a.candidates<=2000 or not 1<=a.repeats<=20:p.error('Invalid workload bounds')
    revision=subprocess.check_output(['git','rev-parse','--verify','--end-of-options',a.baseline_ref+'^{commit}'],cwd=ROOT,text=True).strip()
    relative='providers/movix-catalogues.js';old=subprocess.check_output(['git','show',revision+':'+relative],cwd=ROOT);current=ROOT/relative
    report={'baseline_commit':revision,'before_sha256':hashlib.sha256(old).hexdigest(),'after_sha256':hashlib.sha256(current.read_bytes()).hexdigest(),'scope':'Synthetic full installed catalogue worker; no network/device latency guarantee','candidates_per_language':a.candidates,'repeats':a.repeats,'warmups':1,'results':[]}
    with tempfile.TemporaryDirectory() as directory:
        previous=Path(directory)/'movix-catalogues.js';previous.write_bytes(old)
        for runtime in ['tv','mobile']:
            samples={'before':[],'after':[]};reference=None
            for repeat in range(a.repeats+1):
                for label,bundle in [('before',previous),('after',current)]:
                    start=time.process_time()
                    with patch('urllib.request.urlopen',side_effect=lambda req,**kw:response(req,a.candidates)):
                        rows,summary=check(bundle,['603','movie',None,None],live=True,runtime=runtime,concurrent_http=False,scraper_id='french-movix-catalogues',provider_settings={'episodeMetadataSource':'native','movixFailover':False},log_sink=io.StringIO())
                    cpu=time.process_time()-start
                    if reference is None:reference=rows
                    assert rows==reference,'Returned data/order/headers/tracks changed'
                    assert len(rows)==3,'Expected three qualifying language-interleaved alternatives'
                    if repeat:samples[label].append({'cpu_seconds':cpu,'requests':summary['requests'],'sources':len(rows)})
            assert {r['requests'] for r in samples['before']}=={r['requests'] for r in samples['after']}
            row={'runtime':runtime,'playback_data_identical':True,'samples':samples,'median_cpu_seconds':{k:statistics.median(v['cpu_seconds'] for v in values) for k,values in samples.items()}}
            report['results'].append(row);print(runtime,row['median_cpu_seconds'], 'requests',samples['after'][0]['requests'])
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__':main()
