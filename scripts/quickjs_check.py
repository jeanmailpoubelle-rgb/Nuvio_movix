#!/usr/bin/env python3
"""Run providers in QuickJS with the actual Nuvio Android TV 1.0.0 JS polyfill.

The native HTTP callback is Python urllib, not Android OkHttp. Native playback,
Android DNS/TLS and the exact device QuickJS build still need a television test.
"""
import argparse
import base64
import json
import hashlib
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
try:
    import quickjs
except ImportError:
    raise SystemExit('Install the test dependency: python3 -m pip install -r tests/requirements.txt')

ROOT = Path(__file__).resolve().parents[1]
POLYFILL = (ROOT / 'tests/fixtures/nuvio-tv-1.0.0-polyfill.js').read_text()
CALL = (ROOT / 'tests/fixtures/nuvio-tv-1.0.0-call.js').read_text()
MOBILE_POLYFILL = (ROOT / 'tests/fixtures/nuvio-mobile-2026-10-15-polyfill.js').read_text()
MOBILE_CALL = (ROOT / 'tests/fixtures/nuvio-mobile-2026-10-15-call.js').read_text()

def helper_bundle(provider, entry):
    """Override only the entry point inside an exact generated production bundle."""
    text = provider.read_text()
    marker = '\nif (typeof module !== "undefined" && module.exports)'
    assert text.count(marker) == 1
    return text.replace(marker, '\n' + entry + marker, 1)


def fixture_response(provider, url, scenario):
    media = 'https://cdn.example/master.m3u8'
    multi_audio = '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="fr",NAME="Français"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en",NAME="English"\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,AUDIO="audio"\nvideo.m3u8'
    if scenario == 'lulu-alias':
        if 'api.themoviedb.org/3/movie/603?' in url:
            return {'title': 'Matrix', 'release_date': '1999-03-31'}
        if '/search/Matrix' in url:
            return '<a href="https://nakios.live/movie/matrix"><img alt="Matrix"></a><span>1999</span><h3>Matrix</h3>'
        if url == 'https://nakios.live/movie/matrix':
            return 'const videos = ' + json.dumps([{'link': 'https://luluvid.com/e/fixture', 'server_name': 'Premium ' + str(i), 'version': 'VF'} for i in [1, 2]]) + ';'
        if url == 'https://luluvid.com/e/fixture':
            body = "eval(function(p,a,c,k,e,d){}('0(\"vplayer\").1({2:[{3:\"https://cdn.example/master.m3u8\"}]});',10,4,'jwplayer|setup|sources|file'.split('|')))"
            return {'__fixture_response': {'url': 'https://luluvdo.com/e/fixture', 'body': body}}
        if url == media:
            return multi_audio.replace('BANDWIDTH=1000000', 'BANDWIDTH=1000000,RESOLUTION=1920x800')
        raise AssertionError('Unexpected Lulu alias fixture request')
    if scenario.startswith('episode-'):
        direct = 'https://cdn.example/recovered.mp4?b=%2F&a=1&a=2'
        missing = {'__fixture_response': {'status': 404, 'body': '{"error":"Episode not found"}', 'headers': {'content-type': 'application/json'}}}
        if 'catalog.nuvio.tv/meta/' in url:
            return {'meta': {'id': 'tt8765432', 'genres': ['Animation'], 'videos': [{'season': 1, 'episode': 14, 'title': 'Second Horizon', 'released': '2024-07-04T00:00:00Z'}]}}
        if 'v3-cinemeta.strem.io/meta/' in url:
            return {'meta': {'id': 'tt8765432', 'moviedb_id': 777777, 'genres': ['Animation'], 'videos': [{'season': 2, 'episode': 1, 'title': 'Second Horizon', 'released': '2024-07-03T15:30:00Z'}]}}
        if scenario == 'episode-primary':
            if '/api/purstream/' in url:
                return missing if 'season=2&episode=1' in url else {'tmdb_id': 777777, 'season': 1, 'episode': 14, 'sources': [{'url': direct}]}
            if '/api/cpasmal/' in url: return {'links': {}}
        if scenario == 'episode-backup':
            if '/api/purstream/' in url: return {'sources': []}
            if '/api/cpasmal/' in url:
                return missing if url.endswith('/1/14') else {'links': {'vostfr': [{'url': direct}]}}
        if scenario == 'episode-vidzy':
            if '/serie/777777/1/14/' in url: return missing
            if '/serie/777777/2/1/' in url: return '<iframe id="pf" src="https://vidzy.cc/embed-recovered.html"></iframe>'
            if '/embed-recovered.html' in url: return 'file:"' + direct + '"'
            if 'api.themoviedb.org/3/' in url: return {}  # Original HTML fallback lacks confirmed title metadata.
        if scenario == 'episode-frembed' and '/api/series?' in url:
            return missing if 'sa=2&epi=1' in url else {'tmdb': 777777, 'sa': 1, 'epi': 14, 'links': [{'url': direct, 'lang': 'vf'}]}
        if scenario == 'episode-swiftflow':
            if '/api/links/' in url: return {'success': False}
            if 'api.themoviedb.org/3/' in url: return {'name': 'Fixture', 'external_ids': {'imdb_id': 'tt8765432'}}
            if '/api/imdb/' in url: return {'series': []}
            if '/api/swiftflow/' in url:
                return {'success': False, 'tmdb_id': 777777, 'error': 'Saison 2 non disponible'} if '/season/2?' in url else {'success': True, 'tmdb_id': 777777, 'season': 1, 'episodes': {'14': {'vf': [{'url': direct}]}}}
        raise AssertionError('Unexpected shared episode fixture request')
    if provider=='movix' and scenario in ['unreachable-master','unavailable-master']:
        if '/api/purstream/' in url:
            return {'sources':[{'url':'https://unreachable.example/one.m3u8','name':'1080p MULTI'}, {'url':'https://unreachable.example/two.m3u8','name':'720p VF'}]}
        if url.startswith('https://unreachable.example/'):
            return {'__fixture_response':{'status':0 if scenario=='unreachable-master' else 503,'body':''}}
        if '/api/cpasmal/' in url:
            return {'links':{'vf':[{'url':media,'server':'720p'}]}}
    if provider == 'anime-sama':
        layout_case = scenario in ['anime-seasonal', 'anime-flattened', 'anime-seasonal-primary']
        if 'catalog.nuvio.tv/meta/' in url:
            movie = '/movie/' in url
            if layout_case:
                counts = [24, 23, 12] if scenario == 'anime-seasonal-primary' else [59]
                return {'meta':{'id':'tt12343534','name':'Jujutsu Kaisen','genres':['Animation'],'released':'2020-01-01',
                                'videos':[{'season':s+1,'episode':e+1} for s,n in enumerate(counts) for e in range(n)]}}
            return {'meta':{'name':'Your Name' if movie else 'Jujutsu Kaisen','genres':['Animation'], 'released':'2016-01-01' if movie else '2020-01-01',
                            'videos':[] if movie else [{'season':1,'episode':1,'title':'Episode 1'}]}}
        if layout_case and url == 'https://v3-cinemeta.strem.io/meta/series/tt12343534.json':
            return {'meta':{'id':'tt12343534','name':'Jujutsu Kaisen','genres':['Animation'],'released':'2020-01-01',
                            'videos':[{'season':s+1,'episode':e+1} for s,n in enumerate([24,23,12]) for e in range(n)]}}
        if url == 'https://anime-sama.to/catalogue/jujutsu-kaisen/':
            if layout_case:
                return '<h1>Jujutsu Kaisen</h1><script>'+''.join('panneauAnime("Saison '+str(s)+'","saison'+str(s)+'/vostfr/");' for s in [1,2,3])+'panneauAnime("Film","film/vostfr/");</script>'
            return '<h1>Jujutsu Kaisen</h1><script>panneauAnime("Saison 1","saison1/vostfr/");panneauAnime("Saison 1","saison1/vf/");</script>'
        if url == 'https://anime-sama.to/catalogue/your-name/':
            return '<h1>Your Name</h1><script>panneauAnime("Film","film/vostfr/");panneauAnime("Film","film/vf/");</script>'
        if url.startswith('https://anime-sama.to/catalogue/') and 'episodes.js' in url:
            edition='vostfr' if '/vostfr/' in url else 'vf'
            hosts=['ansembed.net','smoothpre.com','vidmoly.biz','uqload.to','sendvid.com']
            if scenario=='anime-voe':hosts.append('rotation-entry.example')
            if layout_case:
                season=int(re.search(r'/saison(\d+)/',url)[1])
                return '\n'.join('var eps'+str(i+1)+'='+json.dumps(['https://'+host+'/embed-'+edition+'-s'+str(season)+'-e'+str(e+1)+'.html' for e in range([24,23,12][season-1])])+';' for i,host in enumerate(hosts))
            return '\n'.join('var eps'+str(i+1)+'=["https://'+host+'/embed-'+edition+'.html"];' for i,host in enumerate(hosts))
        if url.startswith('https://anime-sama.to/catalogue/') and url.endswith(('/vostfr/','/vf/')):
            return '<script src="episodes.js"></script><script>resetListe();finirListe(1);</script>'
        if '/embed-' in url:
            host=urllib.parse.urlsplit(url).hostname
            edition='vostfr' if 'vostfr' in url else 'vf'
            if host=='rotation-entry.example':
                return '<title>Redirecting...</title><script>window.location.href="https://rotation-final.example/embed-'+edition+'.html";</script>'
            if host=='rotation-final.example':
                return '<title>Watch Example_S01E01.mp4 - VOE | Content Delivery Network</title><script type="application/json">'+json.dumps([(ROOT / 'tests/fixtures/hosts/voe-f7.txt').read_text().strip()])+'</script>'
            target='https://cdn.example/'+host+'/'+edition+'/master.m3u8'
            if host=='sendvid.com':target='https://binary.example/movie.mp4'
            return '<script>sources:[{file:"'+target+'"}];</script>'
        if url=='https://binary.example/movie.mp4':
            import struct
            raw=bytearray(44);struct.pack_into('>I',raw,0,44);raw[4:8]=b'moov';struct.pack_into('>I',raw,8,36);raw[12:16]=b'mvhd';struct.pack_into('>II',raw,28,1000,30000)
            return {'__fixture_response':{'body':'','bodyBase64':base64.b64encode(raw).decode(),'headers':{'content-type':'video/mp4'}}}
        if url.startswith('https://cdn.example/'):
            return '#EXTM3U\n#EXTINF:10,\nsegment.ts' if 'video.m3u8' in url else '#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION='+('640x360' if 'smoothpre' in url else '1280x720')+',BANDWIDTH=1000000\nvideo.m3u8'
        raise AssertionError('Unexpected Anime-Sama fixture request')
    if provider == 'yablom':
        root = 'https://xatobam.com'
        folder = 'newentry' if scenario == 'yablom-recovery' else '1564e60'
        search = root + '/' + folder + '/home/xatobam'
        if 'api.themoviedb.org' in url: return {'title':'Matrix','original_title':'Matrix','release_date':'1999-03-31'}
        if scenario == 'yablom-recovery':
            if url == root + '/1564e60/home/xatobam': return {'__fixture_response':{'status':410,'body':'Entry moved'}}
            if url == root + '/': return '<a href="/newentry">Enter</a>'
            if url == root + '/newentry': return {'__fixture_response':{'url':search,'body':'<form method="post" action="'+search+'"><input name="searchword" value=""></form>'}}
        if url == search:
            return '<form method="post" action="'+search+'"><input name="searchword" value="Matrix"></form><a class="film-card" href="/'+folder+'/b/xatobam/12"><div class="film-card-title">Matrix</div><span class="trend-card-date">1999</span></a>'
        if url == root + '/'+folder+'/b/xatobam/12':
            return '<div id="film-player"><iframe src="https://sharecloudy.com/iframe/fixture"></iframe></div><div class="film-detail-header"><div class="film-detail-title">Matrix (1999)</div></div>'
        if url == 'https://sharecloudy.com/iframe/fixture':
            return 'globalThis.playerExecuted=true; jwplayer("v").setup({playlist:[{sources:[{file:"https://share123.sharecloudy.com/master.m3u8?token=fixture",label:"HD"}],tracks:[{kind:"captions",file:"/fr.vtt",label:"Français"}]}]});'
        if url == 'https://share123.sharecloudy.com/master.m3u8?token=fixture':
            if scenario == 'yablom-unknown': return '#EXTM3U\n#EXTINF:10,\nsegment.ts'
            return multi_audio.replace('BANDWIDTH=1000000','BANDWIDTH=1000000,RESOLUTION='+('640x360' if scenario == 'yablom-low' else '1280x720'))
        raise AssertionError('Unexpected Yablom fixture request')
    if scenario == 'quality-recovery':
        if '/api/purstream/' in url: return {'sources':[{'url':'https://cdn.example/low.m3u8','quality':'1080p'}]}
        if '/api/cpasmal/' in url: return {'links':{'vf':[{'url':'https://cdn.example/good.m3u8'}]}}
        if url == 'https://cdn.example/low.m3u8': return '#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=640x360,BANDWIDTH=1000000\nvideo.m3u8'
        if url == 'https://cdn.example/good.m3u8': return '#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1280x720,BANDWIDTH=1000000\nvideo.m3u8'
    if scenario in ['selection-continue','selection-budget','selection-languages']:
        if '/api/wiflix/' in url:
            links=[{'url':'https://uqload.vc/embed-'+str(i)+'.html'} for i in range(40 if scenario=='selection-budget' else 9)]
            if scenario=='selection-languages':links=[{'url':'https://cdn.example/fr'+str(i)+'.mp4'} for i in range(10)]
            return {'tmdb_id':'603','players':{'vf':links,'vostfr':[{'url':'https://cdn.example/sub.mp4'}] if scenario=='selection-languages' else []}}
        if '/api/fstream/' in url: return {'success':False}
        if '/api/tmdb/' in url: return {'message':'Not available'}
        if 'uqload.vc/embed-' in url:
            index=int(re.search(r'embed-(\d+)',url)[1])
            if index<6 or scenario=='selection-budget':return {'__fixture_response':{'status':404,'body':'Deleted'}}
            return 'sources:[{file:"https://cdn.example/selection'+str(index)+'.m3u8"}]'
        if '/selection' in url:return '#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1280x720,BANDWIDTH=1000000\nvideo.m3u8'
    if provider == 'movix-extra':
        if scenario in ['custom-seasonal', 'custom-continuous']:
            if '/api/links/' in url:
                if 'season=2&episode=1' in url:
                    return {'__fixture_response': {'status': 404, 'body': '{"success":false}'}}
                assert 'season=1&episode=14' in url, 'Only the verified episode coordinate may be retried'
                return {'success': True, 'type': 'tv', 'data': [{'series_id': '777777', 'season_number': 1, 'episode_number': 14, 'links': ['https://neocine.embedseek.com/#fixture']}]}
            if 'catalog.nuvio.tv/' in url:
                return {'meta': {'id': 'tt8765432', 'genres': ['Animation'], 'videos': [{'season': 1, 'episode': 14, 'title': 'Second Horizon', 'released': '2024-07-04T00:00:00.000Z'}]}}
            if 'v3-cinemeta.strem.io/' in url:
                return {'meta': {'id': 'tt8765432', 'moviedb_id': 777777, 'genres': ['Animation'], 'videos': [{'season': 2, 'episode': 1, 'name': 'Second Horizon', 'released': '2024-07-03T15:30:00.000Z'}]}}
            if '/api/imdb/' in url: return {'series': []}
            if '/api/swiftflow/' in url:
                expected = '/season/2?episode=1' if scenario == 'custom-seasonal' else '/season/1?episode=14'
                assert expected in url, 'Custom recovery must not rewrite another adapter'
                return {'success': False}
        if '/api/links/' in url:
            identifier=re.search(r'/api/links/(?:movie|tv)/(\d+)',url)[1]
            links=['https://neocine.embedseek.com/#fixture',{'url':'https://cdn.example/direct.mp4','language':'VF','quality':'720p'}]
            return {'success':True,'type':'tv','data':[{'series_id':identifier,'season_number':0,'episode_number':3,'links':links}]} if '/tv/' in url else {'success':True,'type':'movie','data':{'id':identifier,'links':links}}
        if 'api.themoviedb.org' in url:return {'title':'Fixture','external_ids':{'imdb_id':'tt1234567'}}
        if '/api/swiftflow/' in url:return {'success':True,'tmdb_id':603,'players':{},'mp4':{'available':True,'entries':[{'index':0}]}} if scenario=='swiftflux-gated' else {'success':False}
        if '/api/imdb/' in url:
            player={'link':'https://cdn.example/omega.mp4','language':'VOSTFR'}
            return {'series':[{'tmdb_data':{'id':99 if scenario=='wrong-omega-show' else 108978},'seasons':[{'number':0,'episodes':[{'number':'3','versions':{'vostfr':[player]}}]}]}]} if '/tv/' in url else {'player_links':[player]}
        if '/api/v1/video?' in url:return (ROOT/'tests/fixtures/hosts/seek-aes-cbc.txt').read_text().strip()
        if url=='https://cdn.example/seek/master.m3u8':return multi_audio.replace('BANDWIDTH=1000000','BANDWIDTH=1000000,RESOLUTION=1280x720')+'\n#EXT-X-MEDIA:TYPE=SUBTITLES,LANGUAGE="fr",URI="fr.vtt"'
    if scenario == 'movix-domain':
        if url.startswith(('https://api.movix.dog/', 'https://api.movix.cash/')): return None
        if url == 'https://movix.online/': return '<a href="https://movix.next-example/">Site</a>'
        if url == 'https://movix.next-example/': return '<script src="/assets/index-demo.js"></script>'
        if url.endswith('/assets/index-demo.js'): return 'globalThis.scriptExecuted=true;var API="https://api.movix.next-example";'
        if url.startswith('https://api.movix.next-example/'): return {'sources':[{'url':'https://cdn.example/fresh.mp4','quality':'720p'}]}
    if provider == 'movix-catalogues':
        route = re.search(r'/api/(wiflix|fstream|tmdb)/(movie|tv)/(\d+)',url)
        if route:
            source, kind, identifier = route.groups()
            query = urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
            season = int(query.get('season',[url.split('?')[0].split('/')[-1]])[0]) if kind=='tv' else None
            episode = int(query.get('episode',['1'])[0])
            if scenario == 'rate-limited': return {'__fixture_response':{'status':429,'body':'{"error":"rate limited"}'}}
            if scenario == 'catalogue-pending':
                return {'__fixture_response':{'status':202,'body':'{"pending":true}'}} if source=='wiflix' else {'success':False,'tmdb_id':identifier}
            vf = {'url':'https://cdn.example/catalogue/master.m3u8','quality':'480p','type':'embed'}
            sub = {'url':'https://cdn.example/sub.mp4','type':'VOSTFR'}
            if source == 'wiflix':
                groups={'vf':[vf],'vostfr':[sub]}
                return {'tmdb_id':identifier,'season':season,'episodes':{str(episode):groups}} if kind=='tv' else {'tmdb_id':identifier,'players':groups}
            if source == 'fstream':
                groups={'VFQ':[vf],'VOSTFR':[sub]}
                return {'tmdb':{'id':identifier},'metadata':{'season':season},'episodes':{str(episode):{'number':episode,'languages':groups}}} if kind=='tv' else {'tmdb':{'id':identifier},'players':groups}
            tracks=[{'decoded_url':'https://cdn.example/vo.mp4','language':'English'}]
            return {'tmdb_details':{'id':identifier},'current_episode':{'episode':episode,'player_links':tracks}} if kind=='tv' else {'tmdb_details':{'id':identifier},'player_links':tracks}
        if url == 'https://cdn.example/catalogue/master.m3u8':
            return multi_audio.replace('BANDWIDTH=1000000','BANDWIDTH=1000000,RESOLUTION=1280x720')+'\n#EXT-X-MEDIA:TYPE=SUBTITLES,LANGUAGE="fr",URI="fr.vtt"'
    if scenario == 'quality-filter':
        sources = [dict(url='https://cdn.example/' + str(i) + '.mp4', quality=quality, lang='vf')
                   for i, quality in enumerate(['480p', '720p', '1080p', ''])]
        if '/api/purstream/' in url: return {'sources': sources}
        if '/api/films?' in url: return {'links': sources}
    if scenario in ['frembed-recovery', 'recovery-denied']:
        if '/api/purstream/' in url: return {'sources': []}
        if '/api/cpasmal/' in url: return {'links': {}}
        if '/api/player/resolve' in url:
            return {'__fixture_response': {'status': 403, 'body': '{}'}} if scenario == 'recovery-denied' else {'url': '/player?grant=fixture'}
        if '/api/streaming/player?' in url: return {'sources': [{'url': 'https://cdn.example/master.m3u8?fresh=fixture', 'mime': 'application/x-mpegurl', 'tracks':[{'url':'/captions/fr.vtt','language':'fr'}]}]}
    if provider == 'frembed-hosts':
        if '/api/films?' in url or '/api/series?' in url:
            label = {'voe':'Voe', 'dood':'Dood', 'vidara':'Vidara', 'mixdrop':'MixDrop', 'packed-base62':'StreamWish', 'upload-mono':'LuluStream', 'upload-multi':'LuluStream'}.get(scenario, 'Uqload')
            return {'links': [{'url': '/api/stream/fixture', 'host': {'name': label}, 'lang': 'vf'}]}
        if '/api/stream/fixture' in url:
            if scenario in ['upload-mono','upload-multi']:
                final, body = 'https://livavid.sbs/e/fixture', '<title>Fixture.MULTI.(VFF+VFQ).1080p.mp4</title>sources:[{file:"'+media+'"}]'
            elif scenario == 'voe':
                final, body = 'https://voe.sx/e/fixture', 'window.location.href="https://voe-mirror.example/e/fixture";'
            elif scenario == 'dood':
                final, body = 'https://playmogo.com/e/fixture', '<title>Fixture MULTI 1080p</title>$.get("/pass_md5/key/fixture")'
            elif scenario == 'vidara':
                final, body = 'https://vidara.to/e/fixture', '<title>Fixture MULTI</title>'
            elif scenario == 'mixdrop':
                final, body = 'https://mixdrop.co/e/fixture', 'MDCore.wurl="//cdn.example/file.mp4";'
            elif scenario == 'packed-base62':
                table = [''] * 61 + [media]
                final = 'https://streamwish.to/e/fixture'
                body = "eval(function(p,a,c,k,e,d){}('sources:[{file:\"Z\"}]',62,62,'" + '|'.join(table) + "'.split('|')))"
            else:
                final, body = 'https://uqload.vc/embed-fixture.html', 'sources:[{file:"' + media + '"}]'
            return {'__fixture_response': {'url': final, 'body': body}}
        if url == 'https://voe-mirror.example/e/fixture':
            return '<script type="application/json">' + json.dumps([(ROOT / 'tests/fixtures/hosts/voe-f7.txt').read_text().strip()]) + '</script>'
        if '/pass_md5/' in url: return 'https://cdn.example/video/'
        if url == 'https://vidara.to/api/stream': return {'streaming_url':media, 'subtitles':None}
    if url.startswith(media + '?'):
        return multi_audio
    if provider == 'nakios' and scenario == 'lulu':
        if url.startswith('https://vidzy.org/movie/810693/'):
            return '<html>No player</html>'
        if 'api.themoviedb.org' in url:
            return {'title': 'Jujutsu Kaisen 0', 'release_date': '2021-12-24'}
        if '/search/' in url:
            return '<a href="https://nakios.live/movie/jujutsu-kaisen-0"><img alt="Jujutsu Kaisen 0"></a><span>2021</span><h3>Jujutsu Kaisen 0</h3>'
        if '/movie/jujutsu-kaisen-0' in url:
            return 'const videos = ' + json.dumps([dict(link='https://livavid.sbs/e/fixture', version='VF')] * 2) + ';'
        if url == 'https://livavid.sbs/e/fixture':
            return "eval(function(p,a,c,k,e,d){}('0(\"vplayer\").1({2:[{3:\"https://cdn.example/lulu/master.m3u8\"}],4:[{3:\"/srt/empty.srt\",5:\"Upload captions\",6:\"captions\"}]});',10,7,'jwplayer|setup|sources|file|tracks|label|kind'.split('|')))"
        if url == 'https://cdn.example/lulu/master.m3u8':
            return '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x800\nvideo.m3u8'
    if url.startswith('https://vidzy.org/movie/810693/'):
        return '<iframe id="pf" src="https://vidzy.cc/embed-jujutsu.html"></iframe><script>var CFG={"version":"vf"}</script>'
    if '/embed-jujutsu.html' in url:
        return 'file:"https://cdn.example/jujutsu-vf/master.m3u8";'
    if url == 'https://cdn.example/jujutsu-vf/master.m3u8':
        return '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=537000,RESOLUTION=864x360\nvideo.m3u8'
    if '/api/purstream/movie/810693/' in url:
        return {'sources': [{'url': 'https://cdn.example/jujutsu-api/master.m3u8', 'name': '720p MULTI'}]}
    if url == 'https://cdn.example/jujutsu-api/master.m3u8':
        return multi_audio.replace('LANGUAGE="en"', 'LANGUAGE="ja"').replace('BANDWIDTH=1000000', 'BANDWIDTH=2000000,RESOLUTION=1920x800')
    if url == media:
        if scenario in ['upload-mono','upload-multi']:
            return '#EXTM3U\n'+('#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="fr"\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en"\n' if scenario=='upload-multi' else '')+'#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=1728x720'+(',AUDIO="audio"' if scenario=='upload-multi' else '')+'\nvideo.m3u8'
        if provider == 'nakios':
            return multi_audio
        return '#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="fr",NAME="Français",URI="fr.vtt"\n#EXT-X-STREAM-INF:BANDWIDTH=1000000\nvideo.m3u8'
    if url == 'https://backup.example/master.m3u8' or '/reacher/' in url and url.endswith('/master.m3u8'):
        return '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000\nvideo.m3u8'
    if '/movie/129/' in url:
        return '<iframe id="pf" src="https://vidzy.cc/embed-opaque.html"></iframe><script>var CFG={"version":"vf"}</script>'
    if '/embed-opaque.html' in url:
        return 'metaTitle:"6qgg2uyibz7y_n.mp4";file:"https://cdn.example/chihiro/master.m3u8";'
    if url == 'https://cdn.example/chihiro/master.m3u8':
        return multi_audio.replace('LANGUAGE="en",NAME="English"', 'LANGUAGE="ja",NAME="日本語"')
    if '/movie/155/' in url:
        return '<iframe id="pf" src="https://vidzy.cc/embed-darkknight.html"></iframe><script>var CFG={"version":"vf"}</script>'
    if '/embed-darkknight.html' in url:
        return 'metaTitle:"The_Dark_Knight_2008_Multi_1080p_fixture.mkv.mp4";file:"' + media + '";'
    if '/serie/2316/1/1/' in url:
        return '<iframe id="pf" src="https://vidzy.cc/embed-office.html"></iframe><script>var CFG={"version":"vf"}</script>'
    if '/embed-office.html' in url:
        tracks = ','.join("{kind:'subtitles',srclang:'" + lang + "',label:'" + label + "',src:(function(u){var j=u.indexOf('/',8);return location.protocol+'//'+location.host+u.slice(j);})('https://vidzy.org/srtproxy/fixture_" + lang + ".vtt')}" for lang, label in [('eng', 'English'), ('fre', 'French')])
        return 'metaTitle:"The.Office.MULTI.1080p.mkv";file:"' + media + '";player.loadTracks([' + tracks + ']);'
    if '/serie/108978/4/1/' in url:
        lang = url.rsplit('/', 1)[-1]
        return '<iframe id="pf" src="https://vidzy.cc/embed-reacher' + lang + '.html"></iframe><script>var CFG={"version":"' + lang + '"};</script>'
    if '/embed-reacher' in url:
        lang = 'vostfr' if 'vostfr' in url else 'vf'
        return 'sources:[{file:"https://cdn.example/reacher/' + lang + '/master.m3u8"}]'
    if '/api/purstream/' in url:
        if scenario == 'network-error':
            return None
        return {'sources': [] if scenario == 'empty' else [{'url': media, 'name': 'pulse | 1440p | MULTI'}]}
    if '/api/cpasmal/' in url:
        return {'links': {'vf': [{'url': 'https://backup.example/master.m3u8' if scenario == 'missing-playlist' else media}]}}
    if 'api.themoviedb.org' in url:
        return {'title': 'Matrix', 'original_title': 'Matrix', 'release_date': '1999-03-31'}
    if '/search-bar/search/' in url:
        return {'data': {'items': {'movies': {'items': [{'id': 2633, 'type': 'movie', 'title': 'Matrix', 'release_date': '1999-03-31'}]}}}}
    if '/media/2633/sheet' in url:
        return {'data': {'items': {'tmdbId': 603, 'type': 'movie', 'urls': [{'url': media, 'name': '1440p MULTI'}]}}}
    if '/movie/603' in url or '/serie/1399/0/2' in url:
        return '<iframe id="pf" src="https://vidzy.cc/embed-fixture.html"></iframe><script>var CFG={"version":"vf"};</script>'
    if provider == 'nakios' and '/search/' in url:
        return '<div class="search-component"></div>'
    if url == 'https://vidzy.cc/embed-fixture.html':
        host_sum = sum(map(ord, 'vidzy.cc')) & 255
        encoded = base64.b64encode(bytes(ord(ch) ^ ((0x3d + i * 89 + host_sum + 198) & 255) for i, ch in enumerate(media))[::-1]).decode()
        return 'sources:[{src:(function(s){var p="width:calc(1in + 145px)",c="width:calc(100% - 43px)";var kk=(0x3d+i*89+H+BC)&255;return s;})("' + encoded + '")}];'
    raise AssertionError('Unexpected fixture request: ' + urllib.parse.urlsplit(url).path)


def check(provider, args, live=False, scenario='direct', metadata_key='', provider_settings=None, allow_empty=False, runtime='tv'):
    context = quickjs.Context()
    context.set_memory_limit(32 * 1024 * 1024)
    calls, captured, native_sleeps, http_failures, hls_metadata, resolver_events = [], [], [], [], [], []
    started_all = time.monotonic()
    name = provider.stem

    def native_fetch(url, method, headers_json, *body_args):
        body = body_args[0] if len(body_args) == 1 else body_args[1] if len(body_args) > 1 else ''
        calls.append(url)
        if live:
            started = time.monotonic()
            try:
                req = urllib.request.Request(url, headers=json.loads(headers_json), method=method, data=body.encode() if body else None)
                try:
                    response = urllib.request.urlopen(req, timeout=15)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    data = dict(ok=200 <= response.status < 300, status=response.status, statusText=str(response.reason),
                                url=response.url, headers={k.lower(): v for k, v in response.headers.items()},
                                body='')
                    raw_bytes = response.read(1024 * 1024)
                    data['body'] = raw_bytes.decode('utf-8', errors='replace')
                parsed = urllib.parse.urlsplit(url)
                print(f"HTTP {data['status']} {parsed.netloc}{parsed.path} ({time.monotonic()-started:.1f}s)", flush=True)
            except Exception as error:
                data = dict(ok=False, status=0, statusText=type(error).__name__, url=url, headers={}, body='')
                print('Network error: ' + type(error).__name__, flush=True)
            if runtime != 'tv':
                data['bodyBase64'] = base64.b64encode(raw_bytes if 'raw_bytes' in locals() else b'').decode()
            if not data['ok']:
                parsed = urllib.parse.urlsplit(url)
                http_failures.append(dict(host=parsed.netloc, status=data['status'], playlist=parsed.path.endswith('.m3u8')))
            return json.dumps(data)
        result = fixture_response(name, url, scenario)
        override = result.get('__fixture_response', {}) if isinstance(result, dict) else {}
        if override: result = override['body']
        if name == 'yablom' and '/home/' in url:
            assert method == 'POST' and body == 'searchword=Matrix'
            assert json.loads(headers_json)['Content-Type'] == 'application/x-www-form-urlencoded'
        if not live and (url.endswith('/api/player/resolve') or url == 'https://vidara.to/api/stream'):
            assert method == 'POST'
            payload = json.loads(body)
            if url.endswith('/api/player/resolve'): assert payload['turnstileToken'] == '' and payload['tmdbId'] == args[0]
            else: assert payload == {'filecode':'fixture', 'device':'web', 'codecs':[]}
        status = override.get('status', 404 if scenario == 'missing-playlist' and url == 'https://cdn.example/master.m3u8' else 200 if result is not None else 0)
        data = dict(ok=200 <= status < 300, status=status, statusText='fixture', url=override.get('url', url), headers=override.get('headers',{}),
                    body=result if isinstance(result, str) else json.dumps(result) if result is not None else '')
        if runtime != 'tv':
            data['bodyBase64'] = override.get('bodyBase64', base64.b64encode(data['body'].encode()).decode())
        return json.dumps(data)

    def log(*items):
        print('JS', *items, flush=True)
        for item in items:
            match = re.match(r'^\[[^\]]+\] (\{.*\})$', str(item))
            if match:
                event = json.loads(match[1])
                if event.get('stage') == 'hls-tracks':
                    hls_metadata.append(event['data'])
                if event.get('stage') in ['host-result', 'host-unavailable', 'host-limit', 'frembed-inventory', 'catalogue-inventory', 'fallback', 'resolution-filter', 'movix-catalogue', 'movix-discovery', 'endpoint-unavailable', 'upstream-pending', 'selection', 'extra-inventory', 'source-unavailable', 'source-rejected', 'missing-playlist', 'yablom-search', 'yablom-inventory', 'audio-hint', 'anime-catalog', 'anime-source', 'anime-episode', 'anime-selection', 'anime-host-failure', 'episode-mapping', 'episode-mapping-unavailable']:
                    resolver_events.append(event)

    context.add_callable('__native_fetch', native_fetch)
    context.add_callable('__test_btoa', lambda value: base64.b64encode(value.encode('latin-1')).decode())
    context.add_callable('__test_atob', lambda value: base64.b64decode(value).decode('latin-1'))
    context.add_callable('__log', log)
    context.add_callable('__get_scraper_id', lambda: name + '-tv')
    effective_settings = {} if live else {'movixFailover':False}
    effective_settings.update(provider_settings or {})
    context.add_callable('__get_scraper_settings', lambda: json.dumps(effective_settings))
    context.add_callable('__get_tmdb_api_key', lambda: metadata_key or ('test-key' if not live else ''))
    context.add_callable('__get_call_args', lambda: json.dumps(dict(tmdbId=args[0], mediaType=args[1], season=args[2], episode=args[3])))
    context.add_callable('__capture_result', lambda value: captured.append(value))
    context.add_callable('__native_sleep_started', lambda delay: native_sleeps.append(delay))
    context.eval('var console={log:__log,warn:__log,error:__log};')
    # A coroutine-backed sleep remains an active native job after the timer's
    # JS callback is cleared. Model that pending job without actually sleeping.
    context.eval('function __plugin_sleep(delay){ __native_sleep_started(delay); return new Promise(function(){}); }')
    context.eval(MOBILE_POLYFILL if runtime == 'mobile' else POLYFILL)
    # These functions are registered by the app's host bindings, separately from
    # its static JS polyfill. Reproduce their binary-string contract faithfully.
    context.eval('if(typeof btoa!=="function")globalThis.btoa=__test_btoa;if(typeof atob!=="function")globalThis.atob=__test_atob;')
    assert context.eval('typeof setTimeout') == ('function' if runtime == 'mobile' else 'undefined')
    assert context.eval('typeof document') == 'undefined'
    context.eval('var module={exports:{}};var exports=module.exports;(function(){\n' + provider.read_text() + '\n})();')
    context.eval(MOBILE_CALL if runtime == 'mobile' else CALL)
    jobs = 0
    while context.execute_pending_job():
        jobs += 1
        if jobs > 10000:
            raise RuntimeError('Provider failed to settle')
    if not captured:
        raise RuntimeError('Provider did not produce a result')
    assert not native_sleeps, 'Provider created pending native timer jobs: ' + str(native_sleeps)
    result = json.loads(captured[-1])
    filtered_sources = sum(event['data']['removed'] for event in resolver_events if event['stage'] == 'resolution-filter')
    print(f'Result: {len(result)} source(s), {len(calls)} request(s)', flush=True)
    if not result and not allow_empty and name != 'purstream' and not filtered_sources:
        raise RuntimeError('Expected at least one source')
    if not live and name == 'anime-sama':
        assert len(result) == (8 if runtime == 'tv' else 10)+(4 if scenario=='anime-voe' else 0), (runtime, len(result))
        assert sum(item.get('quality')=='360p' for item in result)==2
        assert {'VF','VOSTFR'}=={item['language'] for item in result}
        assert all(re.match(r'^\d+\. Anime-Sama / ', item['name']) for item in result)
        if scenario in ['anime-seasonal','anime-flattened','anime-seasonal-primary']:
            metadata_calls=[url for url in calls if '/meta/series/' in url]
            assert len(metadata_calls)==(2 if scenario=='anime-seasonal' else 1)
            embeds=[url for url in calls if '/embed-' in url]
            assert len(embeds)==10 and all('-s2-e1.html' in url for url in embeds), 'The requested layout must resolve the same exact source episode'
            mapping=[e['data'] for e in resolver_events if e['stage']=='anime-episode']
            assert len(mapping)==1 and len(mapping[0]['refs'])==2
            assert all('/saison2/' in ref['path'] and ref['index']==0 for ref in mapping[0]['refs'])
    elif not live and name == 'yablom':
        assert len(calls) == (8 if scenario == 'yablom-recovery' else 5 if args[1] == 'movie' else 0)
        assert context.eval('typeof globalThis.playerExecuted') == 'undefined'
    elif not live and scenario in ['unreachable-master','unavailable-master']:
        assert len(calls)==5 and len(result)==1
        assert result[0]['url']=='https://cdn.example/master.m3u8'
        assert sum(e['stage']=='missing-playlist' for e in resolver_events)==2
    elif not live and scenario in ['selection-continue','selection-budget','selection-languages','quality-recovery']:
        assert len(calls)=={'selection-continue':15,'selection-budget':24,'selection-languages':3,'quality-recovery':4}[scenario]
    elif not live and scenario == 'lulu-alias':
        assert len(calls) == 5 and len(result) == 1
        assert result[0]['url'] == 'https://cdn.example/master.m3u8'
        assert result[0]['quality'] == '1080p' and result[0]['language'] == 'MULTI'
        assert result[0]['headers']['Referer'] == 'https://luluvdo.com/e/fixture'
        assert calls.count('https://luluvid.com/e/fixture') == 1
    elif not live and scenario.startswith('episode-'):
        expected = {'episode-primary': 5, 'episode-backup': 5, 'episode-vidzy': 8, 'episode-frembed': 4, 'episode-swiftflow': 7}
        assert len(calls) == expected[scenario], (scenario, len(calls))
        assert len(result) == 1 and result[0]['url'] == 'https://cdn.example/recovered.mp4?b=%2F&a=1&a=2'
        backend = scenario.removeprefix('episode-')
        mappings = [e['data'] for e in resolver_events if e['stage'] == 'episode-mapping']
        assert len(mappings) == 1 and mappings[0]['backend'] == backend
        assert mappings[0]['to'] == ({'season': 2, 'episode': 1} if backend in ['backup', 'vidzy'] else {'season': 1, 'episode': 14})
    elif not live and name == 'movix-extra':
        assert len(calls) == (9 if scenario == 'custom-seasonal' else 6)
        if scenario in ['custom-seasonal', 'custom-continuous']:
            assert len(result) == 1
            mappings = [e['data'] for e in resolver_events if e['stage'] == 'episode-mapping']
            assert (len(mappings) == 1 and mappings[0]['to'] == {'season': 1, 'episode': 14}) if scenario == 'custom-seasonal' else not mappings
    elif not live and scenario == 'movix-domain':
        assert len(calls) == 6
        assert context.eval('typeof globalThis.scriptExecuted') == 'undefined'
    elif not live and name == 'movix-catalogues':
        assert len(calls) == (1 if scenario=='rate-limited' else 3 if scenario=='catalogue-pending' else 4)
    elif not live and scenario == 'quality-filter':
        assert len(calls) == 1
    elif not live:
        expected = 0 if name == 'purstream' else 5 if scenario == 'frembed-recovery' else 3 if scenario == 'recovery-denied' else {'voe':4,'vidara':4,'mixdrop':2}.get(scenario,3) if name == 'frembed-hosts' else 7 if scenario == 'lulu' else 8 if name == 'nakios' and args[0]=='810693' else 6 if name == 'nakios' and args[0] == '108978' else 4 if name == 'nakios' or scenario == 'missing-playlist' else 2 if scenario == 'direct' else 5 if scenario == 'network-error' else 3
        assert len(calls) == expected, (name, len(calls), expected)
    for item in result:
        assert isinstance(item.get('url'), str) and item['url'].startswith('https://')
        assert isinstance(item.get('headers'), dict)
        assert '/troll/' not in item['url']
    minimum = json.loads((ROOT / 'config/anime-sama.json').read_text())['minimumResolution'] if name=='anime-sama' else json.loads((ROOT / 'config/endpoints.json').read_text())['streams']['minimumResolution']
    assert all(not item.get('quality') or int(item['quality'][:-1]) >= minimum for item in result)
    summary = dict(provider=name, bundle_sha256=hashlib.sha256(provider.read_bytes()).hexdigest(), runtime=runtime, args=args, sources=len(result), filtered_sources=filtered_sources, languages=[item.get('language', '') for item in result], subtitles=sum(len(item.get('subtitles', [])) for item in result), hls_metadata=hls_metadata, resolver_events=resolver_events, requests=len(calls), http_failures=http_failures, pending_native_timers=len(native_sleeps), seconds=round(time.monotonic()-started_all, 2))
    return result, summary


def probe_media(item):
    """Read HLS manifests and a small range of one segment; never print signed URLs."""
    if item.get('format') == 'mpd':
        return dict(ok=False, reason='DASH playback probe is not implemented')
    url, headers = item['url'], item['headers']
    for depth in range(4):
        try:
            request_headers = {**headers, 'Range': 'bytes=0-1023'} if depth else headers
            req = urllib.request.Request(url, headers=request_headers)
            try:
                response = urllib.request.urlopen(req, timeout=12)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                status = response.status
                body = response.read(65536 if depth < 3 else 1024)
                final_url = response.url
            if status not in (200, 206):
                return dict(ok=False, stage=depth, status=status)
            if body.lstrip().startswith(b'#EXTM3U'):
                links = [line.strip() for line in body.decode('utf-8').splitlines() if line.strip() and not line.startswith('#')]
                if not links:
                    return dict(ok=False, stage=depth, reason='HLS has no media entries')
                url = urllib.parse.urljoin(final_url, links[0])
            else:
                if depth == 0 and item['format'] == 'm3u8':
                    return dict(ok=False, stage=depth, reason='Not an HLS playlist')
                if not body or body.lstrip().lower().startswith((b'<!doctype', b'<html')):
                    return dict(ok=False, stage=depth, reason='Empty or HTML body')
                return dict(ok=True, stage=depth, status=status, sample_bytes=len(body))
        except Exception as error:
            return dict(ok=False, stage=depth, reason=type(error).__name__)
    return dict(ok=False, reason='Manifest nesting limit')


def probe_subtitles(item):
    """Validate sidecars and HLS subtitle renditions, without modifying the stream.

    No track is not evidence that a VOSTFR label has burned-in subtitles. That
    requires separate visual inspection of decoded dialogue frames.
    """
    def read(url, headers):
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=12) as response:
            return response.read(262144).decode('utf-8-sig'), response.url

    tracks = [(track['url'], track.get('headers', item['headers']), track.get('language', track.get('lang', '')))
              for track in item.get('subtitles', [])]
    try:
        if item.get('format') == 'm3u8':
            body, base = read(item['url'], item['headers'])
            for line in body.splitlines():
                if line.startswith('#EXT-X-MEDIA:') and 'TYPE=SUBTITLES' in line:
                    uri, language = re.search(r'URI="([^"]+)"', line), re.search(r'LANGUAGE="([^"]+)"', line)
                    if uri:
                        tracks.append((urllib.parse.urljoin(base, uri[1]), item['headers'], language[1] if language else ''))
        results = []
        seen = set()
        for url, headers, language in tracks:
            identity = (url, json.dumps(headers, sort_keys=True))
            if identity in seen:
                continue
            seen.add(identity)
            body, base = read(url, headers)
            if body.lstrip().startswith('#EXTM3U'):
                links = [line.strip() for line in body.splitlines() if line.strip() and not line.startswith('#')]
                if not links:
                    raise ValueError('Empty subtitle playlist')
                # Initial subtitle segments can contain only a WEBVTT header.
                has_cues = False
                for link in links[:3]:
                    segment, _ = read(urllib.parse.urljoin(base, link), headers)
                    has_cues = has_cues or bool(re.search(r'\d\d:\d\d[.,]\d{3}\s+-->', segment))
                results.append(dict(language=language, ok=has_cues, type='hls-vtt'))
            else:
                results.append(dict(language=language, ok=bool(re.search(r'\d\d:\d\d[.,]\d{3}\s+-->', body)), type='sidecar'))
        return dict(ok=all(track['ok'] for track in results), tracks=results,
                    note='No separate subtitle track advertised' if not results else '')
    except Exception as error:
        return dict(ok=False, reason=type(error).__name__)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--all', action='store_true', help='Check every provider in manifest.json')
    parser.add_argument('--provider', type=Path, default=ROOT / 'providers/movix.js')
    parser.add_argument('--tmdb-key-env', default='NUVIO_TMDB_API_KEY', help='Environment variable used to emulate the app-injected TMDB key')
    parser.add_argument('--probe-media', action='store_true', help='Also check playlists and a small sample of one media segment')
    parser.add_argument('--report', type=Path, help='Write a summary without signed URLs or credentials')
    parser.add_argument('--runtime', choices=['tv', 'mobile', 'both'], default='tv')
    options = parser.parse_args()
    providers = [ROOT / entry['filename'] for entry in json.loads((ROOT / 'manifest.json').read_text())['scrapers']] + [ROOT / 'plugins/anime-sama/providers/anime-sama.js'] if options.all else [options.provider]
    report = []
    for runtime in ['tv', 'mobile'] if options.runtime == 'both' else [options.runtime]:
        for provider in providers:
            cases = [('603', 'movie', None, None), ('550', 'movie', None, None), ('1399', 'tv', 1, 1)] if options.live else [('603', 'movie', None, None)]
            if provider.stem == 'anime-sama': cases=[('95479','tv',1,1),('372058','movie',None,None)]
            if provider.stem == 'yablom' and options.live: cases = [case for case in cases if case[1] == 'movie']
            for args in cases:
                print('Checking', runtime, provider.name, args, flush=True)
                result, summary = check(provider, args, live=options.live, metadata_key=os.environ.get(options.tmdb_key_env, ''), runtime=runtime)
                if options.live and options.probe_media:
                    summary['media_probes'] = [{'language': source.get('language'), **probe_media(source)} for source in result]
                    print('Media probes:', summary['media_probes'], flush=True)
                report.append(summary)
            if not options.live and provider.stem == 'anime-sama':
                result, _ = check(provider, cases[0], scenario='anime-voe', runtime=runtime)
                voe=[s for s in result if s['source']=='Voe']
                assert len(voe)==4 and {s['version']+':'+s['format'] for s in voe}=={'VF:m3u8','VF:mp4','VOSTFR:m3u8','VOSTFR:mp4'}
                assert all(s['size']=='Voe' and s['headers']['Origin']=='https://rotation-final.example' for s in voe)
                for scenario,args in [('anime-seasonal',('95479','tv',2,1)),('anime-flattened',('95479','tv',1,25)),('anime-seasonal-primary',('95479','tv',2,1))]:
                    check(provider,args,scenario=scenario,runtime=runtime,provider_settings={'diagnostics':True})
            if not options.live and provider.stem == 'movix':
                check(provider, ('777777','tv',2,1), scenario='episode-primary', runtime=runtime, provider_settings={'frembedRecovery':False})
                check(provider, ('777777','tv',1,14), scenario='episode-backup', runtime=runtime, provider_settings={'frembedRecovery':False})
                for scenario in ['unreachable-master','unavailable-master']:
                    check(provider, ('95479','tv',1,20), scenario=scenario, runtime=runtime)
                result, _ = check(provider,cases[0],scenario='quality-recovery',runtime=runtime)
                assert len(result)==1 and result[0]['quality']=='720p'
                result, _ = check(provider,cases[0],scenario='movix-domain',runtime=runtime,provider_settings={'movixFailover':True})
                assert result[0]['quality']=='720p'
                for scenario in ['empty', 'network-error', 'missing-playlist']:
                    check(provider, cases[0], scenario=scenario, runtime=runtime)
                result, _ = check(provider, ('810693', 'movie', None, None), runtime=runtime)
                assert result[0]['quality'] == '1080p' and result[0]['language'] == 'MULTI'
                result, _ = check(provider, cases[0], scenario='frembed-recovery', runtime=runtime)
                assert result[0]['language'] == 'MULTI' and 'Referer' not in result[0]['headers']
                assert any(track['url']=='https://frembed.bar/captions/fr.vtt' and track['name']=='Français' for track in result[0]['subtitles'])
                result, _ = check(provider, cases[0], scenario='recovery-denied', runtime=runtime, allow_empty=True)
                assert not result
            if not options.live and provider.stem == 'yablom':
                result, _ = check(provider,cases[0],runtime=runtime)
                assert result[0]['quality']=='720p' and result[0]['language']=='MULTI'
                assert result[0]['subtitles'][0]['name']=='Français'
                result, _ = check(provider,cases[0],scenario='yablom-unknown',runtime=runtime)
                assert 'quality' not in result[0] and result[0]['name']=='Yablom / ShareCloudy | VF' and result[0]['language']=='VF'
                result, _ = check(provider,cases[0],scenario='yablom-low',runtime=runtime,allow_empty=True)
                assert not result
                result, _ = check(provider,cases[0],scenario='yablom-recovery',runtime=runtime)
                assert result[0]['quality']=='720p'
                result, summary = check(provider,('108978','tv',4,1),runtime=runtime,allow_empty=True)
                assert not result and summary['requests']==0
            if not options.live and provider.stem == 'movix-catalogues':
                for scenario in ['selection-continue','selection-budget','selection-languages']:
                    result, summary = check(provider,cases[0],scenario=scenario,runtime=runtime,allow_empty=scenario=='selection-budget')
                    if scenario=='selection-budget':assert not result and summary['resolver_events'][-1]['data']['stop']=='request-budget'
                    else:assert len(result)==3
                    if scenario=='selection-languages':assert any(item['language']=='VOSTFR' for item in result)
                for args in [cases[0],('108978','tv',0,3)]:
                    result, _ = check(provider,args,runtime=runtime)
                    assert sorted(item['language'] for item in result) == ['MULTI','VO','VOSTFR']
                    assert result[0]['quality']=='720p' and result[0]['subtitles'][0]['name']=='Français'
                for scenario in ['catalogue-pending','rate-limited']:
                    result, _ = check(provider,cases[0],scenario=scenario,runtime=runtime,allow_empty=True)
                    assert not result
            if not options.live and provider.stem == 'movix-extra':
                check(provider, ('777777','tv',2,1), scenario='episode-swiftflow', runtime=runtime)
                for scenario, coords in [('custom-seasonal', (2, 1)), ('custom-continuous', (1, 14))]:
                    check(provider, ('777777', 'tv', *coords), runtime=runtime, scenario=scenario)
                result, summary=check(provider,('108978','tv',0,3),runtime=runtime)
                assert len(result)==3 and any(item['language']=='VOSTFR' for item in result)
                result, summary=check(provider,('108978','tv',0,3),runtime=runtime,scenario='wrong-omega-show')
                assert len(result)==2 and any(event['stage']=='source-rejected' for event in summary['resolver_events'])
                result, summary=check(provider,cases[0],runtime=runtime,scenario='swiftflux-gated')
                assert len(result)==3 and any(event['stage']=='source-unavailable' for event in summary['resolver_events'])
                assert any(item.get('subtitles',[{}])[0].get('name')=='Français' for item in result)
            if not options.live and provider.stem in ['movix', 'frembed-hosts']:
                result, _ = check(provider, cases[0], scenario='quality-filter', runtime=runtime)
                assert [item.get('quality') for item in result] == ['1080p', '720p', None]
                assert 'quality' not in result[-1] and 'Unknown' not in result[-1]['name']
            if not options.live and provider.stem == 'frembed-hosts':
                check(provider, ('777777','tv',2,1), scenario='episode-frembed', runtime=runtime)
                check(provider, ('108978', 'tv', 0, 2), runtime=runtime)
                for scenario in ['voe','dood','vidara','mixdrop','packed-base62','upload-mono','upload-multi']:
                    result, _ = check(provider, cases[0], scenario=scenario, runtime=runtime)
                    if scenario == 'voe':
                        assert len(result) == 2 and result[1]['format'] == 'mp4'
                        assert 'quality' not in result[1] and result[1]['name'] == '02. Frembed / Voe | VF'
                    if scenario == 'dood':
                        assert result[0]['language']=='VF' and result[0]['quality']=='1080p'
                    if scenario in ['upload-mono','upload-multi']:
                        assert result[0]['quality']=='720p' and result[0]['language']==('VF' if scenario=='upload-mono' else 'MULTI')
                        assert result[0]['url']=='https://cdn.example/master.m3u8'
            if not options.live and provider.stem == 'nakios':
                check(provider, ('603','movie',None,None), scenario='lulu-alias', runtime=runtime, provider_settings={'preferCatalogue':True})
                check(provider, ('777777','tv',1,14), scenario='episode-vidzy', runtime=runtime)
                check(provider, ('1399', 'series', 0, 2), runtime=runtime)
                result, _ = check(provider, ('108978', 'tv', 4, 1), runtime=runtime)
                assert [item['language'] for item in result] == ['VF', 'VOSTFR']
                result, _ = check(provider, ('2316', 'tv', 1, 1), runtime=runtime)
                assert result[0]['language'] == 'MULTI'
                assert [track['language'] for track in result[0]['subtitles']] == ['en', 'fr']
                result, _ = check(provider, ('155', 'movie', None, None), runtime=runtime)
                assert result[0]['language'] == 'MULTI' and result[0]['quality'] == '1080p'
                assert not result[0].get('subtitles')
                result, _ = check(provider, ('129', 'movie', None, None), runtime=runtime)
                assert result[0]['language'] == 'MULTI' and 'quality' not in result[0]
                assert not result[0].get('subtitles')
                result, summary = check(provider, ('810693', 'movie', None, None), runtime=runtime, allow_empty=True)
                assert not result and any(event['stage'] == 'resolution-filter' for event in summary['resolver_events'])
                result, _ = check(provider, ('810693', 'movie', None, None), scenario='lulu', runtime=runtime)
                assert result[0]['quality'] == '1080p' and not result[0].get('subtitles')
    if options.report:
        options.report.write_text(json.dumps(report, indent=2) + '\n')
    print('PASS: JavaScript/source discovery; physical TV playback remains unverified')


if __name__ == '__main__':
    main()
