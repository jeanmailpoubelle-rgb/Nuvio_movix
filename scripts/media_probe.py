"""Bounded HLS byte-range verification; preserve URLs/headers, never log bodies."""
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import urllib.parse
import urllib.request

LIMIT=262144

def attrs(line):
    return {k:a or b for k,a,b in re.findall(r'([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))',line)}

def byte_range(value):
    match=re.fullmatch(r'([1-9]\d*)@([0-9]+)',value or '')
    if not match:raise ValueError('explicit-byte-range-required')
    length,start=map(int,match.groups())
    if length>2**53 or start>2**53:raise ValueError('byte-range-too-large')
    return start,length

def read_range(url,headers,start,length):
    size=min(length,LIMIT);end=start+size-1
    with urllib.request.urlopen(urllib.request.Request(url,headers={**headers,'Range':f'bytes={start}-{end}'}),timeout=12) as response:
        raw=response.read(size+1);status=response.status
        content=response.headers.get('Content-Range','')
    match=re.fullmatch(r'bytes (\d+)-(\d+)/(?:\d+|\*)',content,re.I)
    if status!=206 or not match or int(match[1])!=start or int(match[2])!=end or len(raw)!=size:
        raise ValueError('byte-range-not-honored')
    return raw

def boxes(data):
    names=[];offset=0
    while offset+8<=len(data):
        size=int.from_bytes(data[offset:offset+4],'big');kind=data[offset+4:offset+8]
        if kind not in [b'ftyp',b'moov',b'mdat',b'moof',b'styp',b'sidx',b'free',b'skip',b'wide',b'prft',b'emsg']:break
        names.append(kind.decode())
        if size<8 or size>len(data)-offset:break
        offset+=size
    return names

def probe_ranged_hls(body,base,headers):
    try:
        initialization=None;pending=None;segment=None
        for line in body.splitlines():
            line=line.strip()
            if line.startswith('#EXT-X-MAP:'):
                a=attrs(line);start,length=byte_range(a.get('BYTERANGE'))
                if length>LIMIT:raise ValueError('initialization-too-large')
                initialization=(urllib.parse.urljoin(base,a['URI']),start,length)
            elif line.startswith('#EXT-X-BYTERANGE:'):pending=line.partition(':')[2]
            elif line and not line.startswith('#'):
                start,length=byte_range(pending);segment=(urllib.parse.urljoin(base,line),start,length);break
        if not initialization or not segment:raise ValueError('byte-range-layout-unverified')
        init=read_range(initialization[0],headers,*initialization[1:]);fragment=read_range(segment[0],headers,*segment[1:])
        encrypted=bool(re.search(r'^#EXT-X-KEY:.*METHOD=(?!NONE\b)',body,re.M))
        result=dict(ok=True,byte_range=True,initialization_bytes=len(init),sample_bytes=len(fragment),codec_checked=False)
        if encrypted:return {**result,'encrypted':True}
        ib,sb=boxes(init),boxes(fragment)
        if not any(x in ib for x in ['ftyp','moov']) or not any(x in sb for x in ['moof','mdat','styp','sidx']):raise ValueError('not-fmp4-byte-ranges')
        result.update(initialization_boxes=ib,media_boxes=sb)
        executable=shutil.which('ffprobe')
        if executable:
            with tempfile.TemporaryDirectory(prefix='nuvio-range-probe-') as directory:
                media=Path(directory)/'sample.mp4';media.write_bytes(init+fragment)
                proc=subprocess.run([executable,'-v','quiet','-protocol_whitelist','file,pipe','-show_entries',
                    'stream=codec_name,codec_type,profile,width,height,pix_fmt,color_transfer,color_primaries,channels,sample_rate',
                    '-of','json',str(media)],capture_output=True,timeout=8)
                streams=json.loads(proc.stdout or b'{}').get('streams',[])
            if not streams:raise ValueError('fmp4-codec-unverified')
            allowed={'codec_name','codec_type','profile','width','height','pix_fmt','color_transfer','color_primaries','channels','sample_rate'}
            result.update(codec_checked=True,streams=[{k:v for k,v in s.items() if k in allowed} for s in streams])
        return result
    except Exception as error:
        safe={'explicit-byte-range-required','byte-range-too-large','byte-range-not-honored','initialization-too-large','byte-range-layout-unverified','not-fmp4-byte-ranges','fmp4-codec-unverified'}
        return dict(ok=False,byte_range=True,reason=str(error) if isinstance(error,ValueError) and str(error) in safe else type(error).__name__,status=getattr(error,'code',None))
