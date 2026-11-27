"""Discovery must detect additions, bound untrusted reads and verify real schedules."""
import datetime as dt
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import maintenance_preflight as p

class PreflightTests(unittest.TestCase):
    def fixture(self):
        modules={'index':'import("./registry-a.js")','registry':'import("./WatchMovie-a.js");import("./WatchTv-a.js");import("./HLSPlayer-a.js")',
            'WatchMovie':'import("./vodixService-a.js");"/api/vodix/movie/"','WatchTv':'import("./vodixService-a.js")',
            'HLSPlayer':'import("./vodixService-a.js")','vodixService':'"/api/vodix/tv/"'}
        config={'sites':['https://movix.example'],'max_assets':20,'max_asset_bytes':10000,'known_services':['vodixService'],
            'required_services':['vodixService'],'known_api_prefixes':['vodix'],'required_api_prefixes':['vodix'],'module_sha256':p.facts(modules)['module_sha256']}
        urls={'https://movix.example/':'<script src="/assets/index-a.js"></script>',**{'https://movix.example/assets/'+k+'-a.js':v for k,v in modules.items()}}
        calls=[]
        class Fake:
            def open(self,request,timeout):calls.append(request.full_url);return io.BytesIO(urls[request.full_url].encode())
        return modules,config,urls,calls,Fake()
    def test_actual_dependency_walk_reads_shared_services_once(self):
        _,config,_,calls,fake=self.fixture()
        with patch.object(p.urllib.request,'build_opener',return_value=fake):result=p.web_scan(config)
        self.assertEqual(result['status'],'pass');self.assertEqual(result['facts']['services'],['vodixService'])
        self.assertEqual(len(calls),len(set(calls)))
    def test_new_service_and_route_are_flagged_without_auto_accepting_baseline(self):
        modules,config,*_=self.fixture();before=dict(config['module_sha256'])
        modules['WatchMovie']+='import("./newHostService-b.js");"/api/newhost/movie/"'
        issues=p.compare_web(p.facts(modules),config)
        self.assertIn('new-service:newHostService',issues);self.assertIn('new-api-prefix:newhost',issues)
        self.assertIn('changed-module:WatchMovie',issues);self.assertEqual(config['module_sha256'],before)
    def test_missing_vodix_and_unreadable_graph_do_not_pass(self):
        modules,config,urls,_,fake=self.fixture();modules.pop('vodixService');modules['WatchMovie']='';modules['WatchTv']='';modules['HLSPlayer']=''
        issues=p.compare_web(p.facts(modules),config);self.assertIn('missing-service:vodixService',issues);self.assertIn('missing-api-prefix:vodix',issues)
        urls['https://movix.example/assets/registry-a.js']='<html>challenge</html>'
        with patch.object(p.urllib.request,'build_opener',return_value=fake):result=p.web_scan(config)
        self.assertEqual(result['status'],'attention')
    def test_foreign_redirects_and_read_budgets_are_rejected(self):
        with self.assertRaises(ValueError):p.OwnedRedirect({'https://movix.example'}).redirect_request(None,None,302,'',{},'https://foreign.example/asset.js')
        for key,value in [('max_assets',1),('max_asset_bytes',10)]:
            _,config,_,_,fake=self.fixture();config[key]=value
            with patch.object(p.urllib.request,'build_opener',return_value=fake):result=p.web_scan(config)
            self.assertEqual(result['status'],'attention')
    def test_daily_checks_schedule_execution_not_snapshot_or_manual_success(self):
        now=dt.datetime(2026,11,27,19,tzinfo=dt.timezone.utc)
        def run(age,event='schedule',conclusion='success'):
            return {'id':int(age)+1,'event':event,'status':'completed','conclusion':conclusion,'created_at':(now-dt.timedelta(hours=age)).isoformat()}
        healthy={'workflow_runs':[run(2),run(26),run(50)]}
        self.assertEqual(p.daily_health(healthy,'active',now,36)['status'],'pass')
        for payload,state in [({'workflow_runs':[run(2,'workflow_dispatch')]},'active'),({'workflow_runs':[run(2,conclusion='failure'),run(26)]},'active'),({'workflow_runs':[run(40)]},'active'),(healthy,'disabled_manually')]:
            self.assertEqual(p.daily_health(payload,state,now,36)['status'],'attention')

    def test_daily_success_with_skipped_validation_is_not_execution_proof(self):
        now=dt.datetime(2026,11,27,19,tzinfo=dt.timezone.utc)
        runs={'workflow_runs':[{'id':1,'event':'schedule','status':'completed','conclusion':'success','created_at':'2026-11-27T15:00:00Z'}]}
        jobs={'jobs':[{'status':'completed','conclusion':'success','steps':[{'name':'Validate','conclusion':'skipped'}]}]}
        self.assertIn('daily-validation-steps-unverified',p.daily_health(runs,'active',now,36,jobs,['Validate'])['issues'])
        jobs['jobs'][0]['steps'][0]['conclusion']='success'
        self.assertEqual(p.daily_health(runs,'active',now,36,jobs,['Validate'])['status'],'pass')
