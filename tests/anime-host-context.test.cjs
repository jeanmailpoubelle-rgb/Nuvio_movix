const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {nativeFetch}=require('../src/anime-sama/transport');

test('bridge detection uses a native promise, not binary support or a timer API',async()=>{
  const raw=JSON.stringify({ok:true,status:200,body:'page',bodyBase64:'',headers:{}});
  const sync={},async={};
  await nativeFetch(()=>raw,'https://player.example/',{},sync);
  await nativeFetch(()=>Promise.resolve(raw),'https://player.example/',{},async);
  assert.equal(sync.textOnly,false);assert.equal(sync.asynchronous,false);
  assert.equal(async.textOnly,false);assert.equal(async.asynchronous,true);
});

function harness(){
  const clock={now:1000},context=vm.createContext({module:{exports:{}},Date:{now:()=>clock.now}});
  vm.runInContext(fs.readFileSync(__dirname+'/../src/anime-sama/host-context.js','utf8'),context);
  return {clock,hostContext:context.module.exports.hostContext};
}
test('host scopes retain one global request counter, cache and invocation deadline',()=>{
  const {clock,hostContext}=harness(),root={started:0,requests:12,limits:{requests:64,elapsedMs:45000},fetch:async()=>({})};
  const first=hostContext(root,20000);
  first.ctx.requests++;first.ctx.hostResults={cached:true};
  clock.now=30000;const queued=hostContext(root,20000);
  assert.equal(first.ctx.requests,13);assert.equal(queued.ctx.requests,13);
  assert.equal(queued.ctx.hostResults.cached,true);
  queued.ctx.requests+=2;assert.equal(root.requests,15);
  assert.equal(first.ctx.limits.elapsedMs,21000);
  assert.equal(queued.ctx.limits.elapsedMs,45000,'A queued host must not extend the total lookup budget');
  assert.equal(root.started,0);assert.equal(root.limits.elapsedMs,45000);
  assert.equal(first.expired(),true);assert.equal(queued.expired(),false,'A queued host gets its own clock');
});
test('an expired host cannot issue a followup and a pending response must settle before rejection',async()=>{
  const {clock,hostContext}=harness();let release,calls=0,settled=false;
  const root={started:1000,requests:0,limits:{requests:64,elapsedMs:45000},fetch:()=>{
    calls++;return new Promise(resolve=>{release=resolve;});
  }};
  const scope=hostContext(root,20000),running=scope.ctx.fetch('https://player.example/').then(()=>{settled=true;},error=>{settled=true;throw error;});
  clock.now=22000;await Promise.resolve();assert.equal(settled,false);
  release({ok:true});await assert.rejects(running,/host time budget/);
  await assert.rejects(scope.ctx.fetch('https://player.example/next'),/host time budget/);
  assert.equal(calls,1);
});
