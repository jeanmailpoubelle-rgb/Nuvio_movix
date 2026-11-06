#!/usr/bin/env python3
"""Partition audits by installed entry; merge with exact coverage accounting."""
import argparse
import collections
import json
from pathlib import Path
import audit

def partitions(registry,endpoints,manifest,profile,runtime):
    expected=audit.make_jobs(registry,endpoints,manifest,profile,runtime)
    matrix=[];seen=[]
    for scraper in manifest['scrapers']:
        if not scraper['enabled']:continue
        provider=audit.provider_name(scraper)
        jobs=audit.make_jobs(registry,endpoints,manifest,profile,runtime,[provider],scraper_ids=[scraper['id']])
        if jobs:
            matrix.append(dict(provider=provider,entry=scraper['id']))
            seen.extend(j['id'] for j in jobs)
    if collections.Counter(seen)!=collections.Counter(j['id'] for j in expected):
        raise ValueError('Audit partition does not match complete plan')
    return matrix

def merged_results(plan,reports):
    expected={j['id'] for j in plan};rows={}
    for report in reports:
        for row in report['results']:
            if row['id'] not in expected or row['id'] in rows:raise ValueError('Foreign or duplicate audit result')
            rows[row['id']]=row
    return [rows.get(j['id'],dict(id=j['id'],status='not-tested',issues=['missing-shard-result'])) for j in plan]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile',choices=['smoke','deep'],default='deep')
    parser.add_argument('--runtime',choices=['tv','mobile','both'],default='both')
    parser.add_argument('--merge',type=Path)
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    registry=audit.read(audit.REGISTRY);endpoints=audit.configuration(registry);manifest=audit.manifests(registry)
    matrix=partitions(registry,endpoints,manifest,args.profile,args.runtime)
    if not args.merge:
        print('matrix='+json.dumps(dict(include=matrix),separators=(',',':')));return 0
    reports=[audit.read(p) for p in sorted(args.merge.glob('*/report.json'))]
    if not reports or not args.output:parser.error('Reports and output directory required')
    for report in reports:
        if any(report[k]!=reports[0][k] for k in ['versions','profile','runtime','config_sha256']):raise ValueError('Mixed audit snapshots')
    if reports[0]['versions']!=manifest['versions'] or reports[0]['profile']!=args.profile or reports[0]['runtime']!=args.runtime or reports[0]['config_sha256']!=audit.digest(audit.ROOT/'config/endpoints.json'):
        raise ValueError('Audit snapshot differs from requested checkout')
    plan=audit.make_jobs(registry,endpoints,manifest,args.profile,args.runtime)
    report={**reports[0], 'plan':audit.safe(plan),'results':merged_results(plan,reports),
            'offline':[dict(check='workflow-plan-job',status='pass')], 'shards':len(reports), 'state':'completed'}
    missing=any('missing-shard-result' in r['issues'] for r in report['results'])
    if missing:report['state']='incomplete'
    args.output.mkdir(parents=True,exist_ok=True);audit.save(report,args.output,endpoints)
    print('Audit results:',len(report['results']),'shards:',len(reports),'missing:',missing)
    return int(missing)

if __name__=='__main__':raise SystemExit(main())
