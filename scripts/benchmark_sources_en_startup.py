#!/usr/bin/env python3
"""Bounded Ani.pm startup diagnosis. Fresh capabilities stay in memory only."""
import argparse,contextlib,ctypes,hashlib,io,json,os,re,subprocess,sys,time,urllib.parse,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def mpv_worker():
    source=json.load(sys.stdin);result={'scope':'Headless desktop libmpv; null outputs; no disk cache; not physical Android'}
    class Event(ctypes.Structure):_fields_=[('event_id',ctypes.c_int),('error',ctypes.c_int),('reply_userdata',ctypes.c_uint64),('data',ctypes.c_void_p)]
    class LogMessage(ctypes.Structure):_fields_=[('prefix',ctypes.c_char_p),('level',ctypes.c_char_p),('text',ctypes.c_char_p),('log_level',ctypes.c_int)]
    try:
        lib=ctypes.CDLL(os.environ.get('ANIPM_MPV_LIBRARY','libmpv.so.2'))
        lib.mpv_create.restype=ctypes.c_void_p;lib.mpv_initialize.argtypes=[ctypes.c_void_p];lib.mpv_set_option_string.argtypes=[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_char_p];lib.mpv_set_property_string.argtypes=[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_char_p];lib.mpv_command.argtypes=[ctypes.c_void_p,ctypes.POINTER(ctypes.c_char_p)];lib.mpv_wait_event.argtypes=[ctypes.c_void_p,ctypes.c_double];lib.mpv_wait_event.restype=ctypes.POINTER(Event);lib.mpv_terminate_destroy.argtypes=[ctypes.c_void_p];lib.mpv_get_property.argtypes=[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_int,ctypes.c_void_p];lib.mpv_get_property_string.argtypes=[ctypes.c_void_p,ctypes.c_char_p];lib.mpv_get_property_string.restype=ctypes.c_void_p;lib.mpv_free.argtypes=[ctypes.c_void_p]
        h=lib.mpv_create();assert h
        try:
            for k,v in {'config':'no','load-scripts':'no','terminal':'no','vo':'null','ao':'null','hwdec':'no','idle':'yes','tls-verify':'yes','tls-ca-file':'/etc/ssl/certs/ca-certificates.crt','cache-on-disk':'no','network-timeout':'10'}.items():
                if lib.mpv_set_option_string(h,k.encode(),v.encode())<0:result.setdefault('option_errors',[]).append(k)
            for k,v in source.get('options',{}).items():
                if k not in ['demuxer-lavf-probe-info','demuxer-lavf-analyzeduration']:raise ValueError('unsupported option')
                result.setdefault('diagnostic_options',{})[k]=v
                result.setdefault('diagnostic_option_status',{})[k]=lib.mpv_set_option_string(h,k.encode(),v.encode())
            if lib.mpv_initialize(h)<0:raise RuntimeError('init')
            if source.get('trace'):
                lib.mpv_request_log_messages.argtypes=[ctypes.c_void_p,ctypes.c_char_p];lib.mpv_request_log_messages(h,b'debug')
            opens={'playlists':0,'other_media':0};loaded=False
            headers=source['stream']['headers'];fields=','.join(k+': '+v.replace(',','\\,') for k,v in headers.items() if k.lower()!='user-agent')
            result['header_setters']=[lib.mpv_set_property_string(h,b'user-agent',headers.get('User-Agent','').encode()),lib.mpv_set_property_string(h,b'http-header-fields',fields.encode())]
            def command(*args):
                encoded=[x.encode() for x in args];return lib.mpv_command(h,(ctypes.c_char_p*(len(encoded)+1))(*encoded,None))
            def prop(name):
                raw=lib.mpv_get_property_string(h,name.encode())
                if not raw:return None
                try:return ctypes.string_at(raw).decode('utf-8',errors='replace')
                finally:lib.mpv_free(raw)
            def tracks():
                count=ctypes.c_int64();lib.mpv_get_property(h,b'track-list/count',4,ctypes.byref(count));inventory=[]
                for i in range(min(count.value,80)):
                    kind=prop('track-list/'+str(i)+'/type');lang=prop('track-list/'+str(i)+'/lang')
                    inventory.append({'type':kind if kind in ['audio','video','sub'] else 'other','language':lang if lang and re.fullmatch('[a-zA-Z0-9-]{1,15}',lang) else 'unknown','codec':prop('track-list/'+str(i)+'/codec')})
                return inventory
            result['mpv_version']=prop('mpv-version');result['ffmpeg_version']=prop('ffmpeg-version')
            lib.mpv_set_property_string(h,b'aid',b'auto');start=time.monotonic();result['load_command']=command('loadfile',source['stream']['url'],'replace');end=start+32
            while time.monotonic()<end:
                event=lib.mpv_wait_event(h,.2).contents;elapsed=round(time.monotonic()-start,3)
                if event.event_id==2 and source.get('trace') and event.data and not loaded:
                    message=ctypes.cast(event.data,ctypes.POINTER(LogMessage)).contents
                    text=(message.text or b'').decode('utf-8',errors='replace')
                    match=re.search(r"Opening ['\"](https?://[^'\"]+)",text)
                    if match:
                        path=urllib.parse.urlsplit(match[1]).path
                        opens['playlists' if path.endswith('.m3u8') else 'other_media']+=1
                        result['last_open_before_loaded_seconds']=elapsed
                if event.event_id==8:
                    loaded=True;result['opens_before_loaded']=dict(opens) if source.get('trace') else None
                    result['file_loaded_seconds']=elapsed
                    if source.get('sidecars'):
                        if len(source['stream'].get('subtitles',[]))>32:raise ValueError('sidecar bound')
                        added=time.monotonic();times=[]
                        for n,t in enumerate(source['stream'].get('subtitles',[])):
                            at=time.monotonic();code=command('sub-add',t['url'],'auto' if n==0 else 'cached',t.get('name',''),t.get('language',''));times.append({'seconds':round(time.monotonic()-at,3),'code':code})
                        result['sidecar_attach_seconds']=round(time.monotonic()-added,3);result['sidecars']=times
                if event.event_id==21:
                    result['playback_restart_seconds']=elapsed;result['track_inventory']=tracks();result['audio_codec']=prop('audio-codec-name');result['audio_samplerate']=prop('audio-params/samplerate');break
                if event.event_id==7:result['ended_before_playback']=True;result['end_event_error']=event.error;break
            result['total_seconds']=round(time.monotonic()-start,3);result['started']='playback_restart_seconds' in result
        finally:lib.mpv_terminate_destroy(h)
    except Exception as e:result={'started':False,'error_type':type(e).__name__}
    print(json.dumps(result));return 0

def request(url,headers,cap=2*1024*1024,partial=False):
    start=time.monotonic();meta={}
    try:
        h=dict(headers)
        if partial:h['Range']='bytes=0-'+str(cap-1)
        with urllib.request.urlopen(urllib.request.Request(url,headers=h),timeout=12) as r:
            meta={'status':r.status,'ttfb_seconds':round(time.monotonic()-start,3)};body=r.read(cap)
        meta.update(seconds=round(time.monotonic()-start,3),bytes=len(body));return body,meta
    except Exception as e:meta.update(status=getattr(e,'code',0),seconds=round(time.monotonic()-start,3),error_type=type(e).__name__);return b'',meta

def attrs(s):return {m[0]:m[1] if m[1] else m[2] for m in re.findall(r'([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))(?:,|$)',s)}
def media_path(url,headers):
    out=[]
    for depth in range(3):
        raw,m=request(url,headers);m['stage']='playlist';out.append(m)
        text=raw.decode('utf-8-sig',errors='replace')
        if not text.lstrip().startswith('#EXTM3U'):m['hls']=False;return out
        lines=text.splitlines()
        child=next((lines[n+1] for n,l in enumerate(lines[:-1]) if l.startswith('#EXT-X-STREAM-INF:')),None)
        if child:url=urllib.parse.urljoin(url,child);continue
        init=next((attrs(l[11:]).get('URI') for l in lines if l.startswith('#EXT-X-MAP:')),None)
        if init:
            _,m=request(urllib.parse.urljoin(url,init),headers,128*1024,True);m['stage']='init';out.append(m)
        segment=next((l for l in lines if l and not l.startswith('#')),None)
        if segment:
            _,m=request(urllib.parse.urljoin(url,segment),headers,128*1024,True);m['stage']='segment_first_128KiB';out.append(m)
        return out
    return out

def paths(stream):
    raw,master=request(stream['url'],stream['headers']);text=raw.decode('utf-8-sig',errors='replace');lines=text.splitlines();variants=[];tracks=[]
    for n,l in enumerate(lines):
        if l.startswith('#EXT-X-STREAM-INF:') and n+1<len(lines):variants.append({**attrs(l[18:]),'uri':urllib.parse.urljoin(stream['url'],lines[n+1])})
        if l.startswith('#EXT-X-MEDIA:'):tracks.append(attrs(l[13:]))
    row={'master':master,'variant_count':len(variants),'master_audio_tracks':sum(t.get('TYPE')=='AUDIO' for t in tracks),'master_subtitle_tracks':sum(t.get('TYPE')=='SUBTITLES' for t in tracks),'native_sidecar_count':len(stream.get('subtitles',[]))}
    row['default_audio']=[t.get('LANGUAGE','unknown') for t in tracks if t.get('TYPE')=='AUDIO' and t.get('DEFAULT')=='YES']
    if not text.lstrip().startswith('#EXTM3U'):row['code']='PLAYLIST_INVALID';return row
    selected=max(variants,key=lambda v:int(v.get('BANDWIDTH','0'))) if variants else None
    row['video']=media_path(selected['uri'] if selected else stream['url'],stream['headers'])
    row['audio']=[]
    for language in ['ja','en','fr']:
        match=next((t for t in tracks if t.get('TYPE')=='AUDIO' and t.get('LANGUAGE','').lower().split('-')[0] in {'ja':'ja jpn japanese','en':'en eng english','fr':'fr fre fra french'}[language].split() and t.get('URI') and (not selected or t.get('GROUP-ID')==selected.get('AUDIO'))),None)
        if match:row['audio'].append({'language':language,'path':media_path(urllib.parse.urljoin(stream['url'],match['URI']),stream['headers'])})
    row['sidecars']=[]
    for t in stream.get('subtitles',[])[:3]:
        _,m=request(t['url'],t.get('headers',stream['headers']),128*1024);row['sidecars'].append(m)
    return row

def network_ok(value):
    if isinstance(value,dict):
        if 'status' in value and isinstance(value['status'],int) and not 200<=value['status']<300:return False
        return all(network_ok(v) for v in value.values())
    return all(network_ok(v) for v in value) if isinstance(value,list) else True

def player(stream,sidecars,options=None,trace=False):
    try:
        r=subprocess.run([sys.executable,__file__,'--mpv-worker'],input=json.dumps({'stream':stream,'sidecars':sidecars,'options':options or {},'trace':trace}),text=True,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=45)
        return json.loads(r.stdout) if r.returncode==0 else {'started':False,'worker_exit':r.returncode}
    except subprocess.TimeoutExpired:return {'started':False,'timeout_seconds':45}
    except Exception as e:return {'started':False,'error_type':type(e).__name__}

def main():
    from quickjs_check import check
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--rounds',type=int,default=2,choices=[1,2,3]);p.add_argument('--trace',action='store_true');p.add_argument('--probe-options',action='store_true');p.add_argument('--case',choices=['apothecary','hunter','both'],default='both');a=p.parse_args()
    jobs=[('apothecary','220542',2,1),('hunter','46298',2,72)];jobs=[j for j in jobs if a.case in ['both',j[0]]]
    report={'scope':'Fresh genuine Ani.pm grants. Only TMDB/private input replaced with explicit public metadata controls. Cloud partial HTTP samples and headless desktop libmpv, null outputs, TLS enabled; not physical Android latency. Raw URLs/headers/media/caption bodies are never persisted.','plugin_version':json.loads((ROOT/'plugins/sources-en/manifest.json').read_text())['version'],'bundle_sha256':hashlib.sha256((ROOT/'plugins/sources-en/providers/sources-en.js').read_bytes()).hexdigest(),'results':[]};dest=ROOT/('reports/anipm-startup/probe-options-repeat.json' if a.probe_options else 'reports/anipm-startup/timing-trace.json' if a.trace else 'reports/anipm-startup/timing.json');dest.parent.mkdir(parents=True,exist_ok=True)
    for case,id,s,e in jobs:
        for round_ in range(a.rounds):
            for server in (['standard','beta'] if round_%2==0 else ['beta','standard']):
                if a.probe_options and server!='beta':continue
                logs=io.StringIO();row={'case':case,'server':server,'round':round_+1}
                try:
                    with contextlib.redirect_stdout(io.StringIO()),patch_urlopen():
                        streams,summary=check(ROOT/'plugins/sources-en/providers/sources-en.js',[id,'tv',s,e],live=True,allow_empty=True,runtime='mobile',scraper_id='repo:sources-en-anipm'+('-beta' if server=='beta' else ''),metadata_key='public-control',provider_settings={'aiometadataManifestUrl':'https://input.example/control/manifest.json','diagnostics':True},log_sink=logs)
                    if summary['bundle_sha256']!=report['bundle_sha256']:raise RuntimeError('bundle changed')
                    streams=[s for s in streams if not s.get('warning')];row.update(discovery_seconds=summary['seconds'],discovery_requests=summary['requests'],sources=len(streams))
                    stream=next((s for s in streams if s.get('audioLanguage') in ['ja','MULTI']),streams[0] if streams else None)
                    if stream:
                        row['http']=paths(stream);row['player_profiles']=[]
                        profiles=[(False,{}),(True,{})] if round_%2==0 else [(True,{}),(False,{})]
                        if a.probe_options:profiles=[(True,{}),(True,{'demuxer-lavf-probe-info':'no'}),(True,{'demuxer-lavf-analyzeduration':'1'}),(True,{'demuxer-lavf-probe-info':'no'}),(True,{})]
                        for sidecars,options in profiles:row['player_profiles'].append({'attach_native_sidecars':sidecars,**player(stream,sidecars,options,a.trace)})
                except Exception as error:row['error_type']=type(error).__name__
                row['status']='complete' if row.get('sources') and row.get('player_profiles') and network_ok(row.get('http',{})) and all(p.get('started') for p in row['player_profiles']) else 'attention'
                report['results'].append(row);report['status']='complete' if all(r['status']=='complete' for r in report['results']) else 'attention';dest.write_text(json.dumps(report,indent=2)+'\n');print(case,server,round_+1,'sources',row.get('sources'),'playback_seconds',[r.get('playback_restart_seconds',r.get('error_type','failed')) for r in row.get('player_profiles',[])],flush=True)
    return int(report.get('status')!='complete')

def patch_urlopen():
    from unittest.mock import patch
    from verify_sources_en import public_control_open
    return patch('urllib.request.urlopen',public_control_open(urllib.request.urlopen))
if __name__=='__main__':raise SystemExit(mpv_worker() if '--mpv-worker' in sys.argv else main())
