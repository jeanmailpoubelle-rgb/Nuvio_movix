#!/usr/bin/env python3
"""Read-only maintenance: deployed Movix integrations and actual daily-job health.
No Movix repository access, downloaded-code execution or baseline auto-acceptance.
"""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
ASSET=re.compile(r'(?<![\w-])([A-Za-z][A-Za-z0-9_-]*\.js)')
SERVICE=re.compile(r'^([a-z][A-Za-z0-9]*Service)-[A-Za-z0-9_-]+\.js$')
API=re.compile(r'/api/([A-Za-z][A-Za-z0-9_-]*)')

def module_name(filename):
    return re.sub(r'-[A-Za-z0-9_-]+\.js$','',filename)

def facts(modules):
    services=set();prefixes=set()
    for text in modules.values():
        services.update(m.group(1) for name in ASSET.findall(text) if (m:=SERVICE.fullmatch(name)))
        prefixes.update(API.findall(text))
    return dict(services=sorted(services),api_prefixes=sorted(prefixes),
        module_sha256={name:hashlib.sha256(text.encode()).hexdigest() for name,text in sorted(modules.items())})

def compare_web(current,config):
    issues=[]
    for label,key in [('service','services'),('api-prefix','api_prefixes')]:
        for value in sorted(set(current[key])-set(config['known_'+key])):issues.append('new-'+label+':'+value)
        for value in sorted(set(config['required_'+key])-set(current[key])):issues.append('missing-'+label+':'+value)
    baseline=config['module_sha256']
    for name,digest in current['module_sha256'].items():
        if name in baseline and digest!=baseline[name]:issues.append('changed-module:'+name)
        elif name not in baseline:issues.append('unreviewed-module:'+name)
    for name in set(baseline)-set(current['module_sha256']):issues.append('missing-module:'+name)
    return sorted(issues)

class OwnedRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self,origins):self.origins=origins
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        if origin(newurl) not in self.origins:raise ValueError('foreign-redirect')
        return super().redirect_request(req,fp,code,msg,headers,newurl)

def origin(url):
    p=urllib.parse.urlsplit(url)
    if p.scheme!='https' or p.username or p.password or p.port not in (None,443):raise ValueError('unexpected-origin')
    return 'https://'+p.hostname

def error_code(error):
    safe={'foreign-redirect','unexpected-origin','foreign-origin','oversized-asset','not-javascript','entry-unavailable','asset-budget','ambiguous-module','required-modules-unavailable'}
    return str(error) if isinstance(error,ValueError) and str(error) in safe else None

def web_scan(config):
    origins=set(config['sites']);opener=urllib.request.build_opener(OwnedRedirect(origins))
    def read(url):
        if origin(url) not in origins:raise ValueError('foreign-origin')
        with opener.open(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=15) as response:
            data=response.read(config['max_asset_bytes']+1)
        if len(data)>config['max_asset_bytes']:raise ValueError('oversized-asset')
        text=data.decode('utf-8')
        if urllib.parse.urlsplit(url).path.endswith('.js') and text.lstrip().startswith('<'):raise ValueError('not-javascript')
        return text
    failures=[]
    for site in config['sites']:
        try:
            page=read(site+'/')
            scripts=re.findall(r'<script\b[^>]*src=["\x27]([^"\x27]+)',page,re.I)
            entries=[urllib.parse.urljoin(site+'/',s) for s in scripts if re.search(r'/(?:index|main)-[\w-]+\.js$',s) and 'legacy' not in s]
            if len(entries)!=1:raise ValueError('entry-unavailable')
            entry=entries[0];base=entry.rsplit('/',1)[0]+'/'
            raw={};pending={entry.rsplit('/',1)[1]};seen=set();errors=[]
            while pending:
                if len(seen)+len(pending)>config['max_assets']:raise ValueError('asset-budget')
                batch=sorted(pending);pending=set()
                def load(name):
                    try:return name,read(base+name),None
                    except Exception as e:return name,None,dict(module=module_name(name),error=type(e).__name__,code=error_code(e),status=getattr(e,'code',None))
                with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                    results=list(pool.map(load,batch))
                for name,text,error in results:
                    seen.add(name)
                    if error:errors.append(error);continue
                    logical=module_name(name)
                    if logical in raw:raise ValueError('ambiguous-module')
                    raw[logical]=text
                    for candidate in ASSET.findall(text):
                        wanted=re.match(r'^(?:registry|WatchMovie|WatchTv|HLSPlayer|tvmazeEpisodes)-',candidate) or SERVICE.fullmatch(candidate)
                        if wanted and candidate not in seen:pending.add(candidate)
                pending.difference_update(seen)
            if not all(name in raw for name in ['registry','WatchMovie','WatchTv','HLSPlayer']):raise ValueError('required-modules-unavailable')
            current=facts(raw);issues=compare_web(current,config)
            if errors:issues.append('assets-unavailable')
            if failures:issues.append('site-fallback-used')
            return dict(status='attention' if issues else 'pass',site=site,assets=len(seen),facts=current,issues=issues,errors=errors,site_failures=failures,coverage_notes=config.get('coverage_notes',[]))
        except Exception as e:failures.append(dict(site=site,error=type(e).__name__,code=error_code(e),status=getattr(e,'code',None)))
    return dict(status='attention',issues=['deployed-frontend-unavailable'],errors=failures)

def daily_health(payload,state,now,max_hours):
    runs=payload.get('workflow_runs')
    if not isinstance(runs,list):raise ValueError('workflow-schema')
    scheduled=sorted([r for r in runs if r.get('event')=='schedule'],key=lambda r:r.get('created_at',''),reverse=True)
    success=next((r for r in scheduled if r.get('status')=='completed' and r.get('conclusion')=='success'),None)
    latest=scheduled[0] if scheduled else None
    age=None
    if success:
        stamp=dt.datetime.fromisoformat(success['created_at'].replace('Z','+00:00'))
        age=(now-stamp).total_seconds()/3600
    issues=[]
    if state!='active':issues.append('daily-workflow-not-active')
    if not success:issues.append('no-successful-scheduled-run')
    elif age<0 or age>max_hours:issues.append('daily-scheduled-run-stale')
    if latest and latest.get('status')=='completed' and latest.get('conclusion')!='success':issues.append('latest-scheduled-run-failed')
    safe=lambda r:{k:r.get(k) for k in ['id','event','created_at','status','conclusion']} if r else None
    return dict(status='attention' if issues else 'pass',issues=issues,last_scheduled=safe(latest),last_success=safe(success),successful_age_hours=round(age,2) if age is not None else None)

def mapping_scan(config):
    repo=config['daily_mapping_repository'];workflow=config['daily_mapping_workflow']
    if not re.fullmatch(r'[\w.-]+/[\w.-]+',repo) or not re.fullmatch(r'[\w.-]+\.yml',workflow):raise ValueError('workflow-config')
    base='https://api.github.com/repos/'+repo+'/actions/workflows/'+workflow
    def read(url):
        headers={'Accept':'application/vnd.github+json','User-Agent':'Nuvio-maintenance'}
        token=os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
        if token:headers['Authorization']='Bearer '+token
        with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=15) as r:data=r.read(1000000)
        return json.loads(data)
    try:
        state=read(base)['state'];runs=read(base+'/runs?event=schedule&per_page=10')
        return daily_health(runs,state,dt.datetime.now(dt.timezone.utc),config['maximum_scheduled_age_hours'])
    except Exception as e:return dict(status='attention',issues=['daily-workflow-check-unavailable'],error=type(e).__name__,http_status=getattr(e,'code',None))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'reports/maintenance-preflight/report.json')
    args=parser.parse_args();config=json.loads((ROOT/'config/maintenance-preflight.json').read_text())
    report=dict(scope='Deployed website integration discovery and own scheduled mapping job; no Movix repository check or media playback',
        utc=dt.datetime.now(dt.timezone.utc).isoformat(),web=web_scan(config),daily_mapping=mapping_scan(config))
    report['status']='pass' if all(report[k]['status']=='pass' for k in ['web','daily_mapping']) else 'attention'
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2));return int(report['status']!='pass')

if __name__=='__main__':raise SystemExit(main())
