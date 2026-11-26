#!/usr/bin/env python3
"""Publish separate immutable Anime-Sama fallback tables from the same v3 snapshot."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.request
from update_en_mappings import SOURCE
ROOT=Path(__file__).resolve().parents[1]

def generate(raw,output):
    source=json.loads(raw)
    if not str(source.get('$meta',{}).get('schema_version','')).startswith('3.'):raise ValueError('AniBridge v3 required')
    digest=hashlib.sha256(raw).hexdigest();revision=digest[:16];groups={i:{} for i in range(64)}
    for key,links in source.items():
        m=re.fullmatch(r'tvdb_show:([1-9]\d*):s([1-9]\d*)',key)
        if not m:continue
        direct={k:v for k,v in links.items() if re.fullmatch(r'tmdb_show:[1-9]\d*:s\d+',k) and v}
        via={}
        for al,ranges in links.items():
            if re.fullmatch(r'anilist:[1-9]\d*',al) and ranges:
                targets={k:v for k,v in source.get(al,{}).items() if re.fullmatch(r'tmdb_show:[1-9]\d*:s\d+',k) and v}
                if targets:via[al]={'input':ranges,'targets':targets}
        if direct or via:groups[int(m[1])%64][key]={'direct':direct,'via':via}
    if not any(groups.values()):raise ValueError('No mapping rows')
    files={};base=output/revision
    def write(name,raw):
        path=base/name;path.parent.mkdir(parents=True,exist_ok=True)
        if path.exists() and path.read_bytes()!=raw:raise ValueError('Immutable table changed')
        path.write_bytes(raw)
    for bucket,rows in groups.items():
        name=f'tvdb_show/{bucket:02d}.json';b=(json.dumps({'schema':1,'revision':revision,'rows':rows},sort_keys=True,separators=(',',':'))+'\n').encode()
        if len(b)>1024*1024:raise ValueError('Shard exceeds bound')
        write(name,b);files[name]=hashlib.sha256(b).hexdigest()
    index={'schema':1,'revision':revision,'source_sha256':digest,'source_url':SOURCE,'source_meta':source['$meta'],'buckets':64,'rows':sum(map(len,groups.values())),'files':files,'attribution':'AniBridge contributors, MIT; see LICENSE-AniBridge.txt'}
    write('index.json',(json.dumps(index,indent=2)+'\n').encode());return index

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path);p.add_argument('--publish-current',action='store_true');a=p.parse_args()
    raw=a.source.read_bytes() if a.source else urllib.request.urlopen(SOURCE,timeout=30).read()
    output=ROOT/'plugins/anime-sama-plus/data';previous=json.loads((output/'current.json').read_text()) if (output/'current.json').exists() else None
    # Stage off-tree; validation failure never publishes partial revision/pointer.
    with tempfile.TemporaryDirectory() as t:
        staged=Path(t);index=generate(raw,staged)
        subprocess.run(['node',str(ROOT/'scripts/validate_anime_mappings.cjs'),str(staged/index['revision'])],check=True)
        if previous:
            old=json.loads((output/previous['revision']/'index.json').read_text())
            if index['rows']<old['rows']*.9:raise ValueError('Coverage drop exceeds 10%')
            if all(json.loads((output/previous['revision']/f).read_text())['rows']==json.loads((staged/index['revision']/f).read_text())['rows'] for f in index['files']):
                print('Anime fallback rows unchanged; no duplicate snapshot');return
        import shutil
        dest=output/index['revision']
        if dest.exists():
            if any((dest/f).read_bytes()!=(staged/index['revision']/f).read_bytes() for f in [*index['files'],'index.json']):raise ValueError('Immutable revision collision')
        else:shutil.copytree(staged/index['revision'],dest)
    if a.publish_current:
        import datetime
        pointer={'schema':1,'revision':index['revision'],'source_sha256':index['source_sha256'],'publishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
        tmp=output/'current.tmp';tmp.write_text(json.dumps(pointer,indent=2)+'\n');tmp.replace(output/'current.json')
    else:
        cfg=ROOT/'config/anime-mapping.json';d=json.loads(cfg.read_text());d['mappingRevision']=index['revision'];cfg.write_text(json.dumps(d,indent=2)+'\n')
    print('Validated Anime-Sama fallback revision',index['revision'])
if __name__=='__main__':main()
