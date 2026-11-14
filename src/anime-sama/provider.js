const {configuration}=require('./config');
const Pages=require('./pages');
const Js=require('./js-data');
const Id=require('./ids');
const U=require('./url');
const {nativeFetch}=require('./transport');
const {hostContext}=require('./host-context');
const {assignedScope,presentEntryStreams}=require('./host-groups');
async function mapLimit(items,limit,fn) {
  const result=new Array(items.length);let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){const i=next++;result[i]=await fn(items[i],i);}
  }));return result;
}
class AnimeSamaProvider {
  constructor(overrides={}) {
    this.config=configuration(overrides);this.pages=new Map();this.versionsCache=new Map();
    const transport={};
    this.ctx={started:Date.now(),requests:0,limits:this.config.limits,minimumResolution:0,userAgent:this.config.userAgent,transport};
    if(typeof __native_fetch==='function')this.ctx.fetch=(url,options)=>nativeFetch(__native_fetch,url,options,transport);
    this.http={request:(url,options={})=>request(url,options.headers?.Referer||'', 'Anime '+(options.category||'metadata'),this.ctx,options.headers)};
  }
  get base(){return this.config.animeSamaBaseUrl;}
  async page(path,referer=this.base+'/') {
    // Invocation-local reuse only; a new provider is made for each getStreams.
    if(!this.pages.has(path))this.pages.set(path,request(this.base+path,referer,'Anime site',this.ctx).catch(error=>{
      if([404,410].includes(error.status))return null;throw error;
    }));return this.pages.get(path);
  }
  async details(path) {
    path=U.rootPath(path);const page=await this.page(path);
    if(!page)throw new Error('Title unavailable.');
    return Pages.detail(page.body,this.base+path);
  }
  async search(query) {
    const path='/catalogue/?type%5B%5D=Anime&search='+encodeURIComponent(query.trim())+'&page=1';
    const page=await this.page(path);return {items:page?Pages.cards(page.body,this.base+path):[]};
  }
  async version(group,language) {
    const path=group.path+language+'/';
    if(!this.versionsCache.has(path))this.versionsCache.set(path,(async()=>{
      const page=await this.page(path);if(!page)return null;
      const parsed=Pages.episodePage(page.body,this.base+path),script=parsed.data?undefined:parsed.script;
      if(!parsed.data&&!script)return null;
      const data=parsed.data?{body:parsed.data}:await this.page(script,this.base+path);if(!data)return null;
      const episodes=Pages.episodeSlotsFromPage(data.body,parsed,this.base+path);
      return episodes.length?{group,language,path,script,episodes}:null;
    })());return this.versionsCache.get(path);
  }
  async versions(group,track='all') {
    const languages=[...new Set(['vostfr','vf',...group.languages])].filter(l=>Id.accepts(track,l));
    const attempt=async l=>{try{return await this.version(group,l);}catch(_error){return null;}};
    const result=(await mapLimit(languages,2,attempt)).filter(Boolean);
    if(track!=='vostfr'&&!result.some(v=>v.language.startsWith('vf')))
      result.push(...(await mapLimit(['vf1','vf2'].filter(l=>!languages.includes(l)),2,attempt)).filter(Boolean));
    return result;
  }
  async streams(id) {
    const refs=(typeof id==='string'?Id.decodeEpisode(id):id.map(Id.validateRef)).filter(r=>Id.accepts(this.config.version,r.language));
    const lists=await mapLimit(refs,3,async ref=>{
      try {
        // Mapping already parsed these exact edition slots. Reuse that verified
        // result only for the same script (including its query), within this
        // invocation. External references still fetch/parse fresh source data.
        const cached=this.versionsCache.get(ref.path);
        if(cached){
          const version=await cached.catch(()=>null);
          if(version&&ref.script===version.script)
            return (version.episodes[ref.index]?.servers||[]).map(embed=>({embed,ref}));
        }
        let script=ref.script;
        if(!script){
          const page=await this.page(ref.path);if(!page)return [];
          const parsed=Pages.episodePage(page.body,this.base+ref.path);
          if(parsed.data)return (Pages.episodeSlotsFromPage(parsed.data,parsed,this.base+ref.path)[ref.index]?.servers||[]).map(embed=>({embed,ref}));
          script=parsed.script;
        }
        if(!script)return [];const data=await this.page(script,this.base+ref.path);
        if(!data){
          // Previously encoded/source-map references may still name the removed
          // episodes.js. Recover only the same validated page and array slot.
          const page=await this.page(ref.path);if(!page)return [];
          const parsed=Pages.episodePage(page.body,this.base+ref.path);
          return parsed.data?(Pages.episodeSlotsFromPage(parsed.data,parsed,this.base+ref.path)[ref.index]?.servers||[]).map(embed=>({embed,ref})):[];
        }
        return [...new Set(Object.values(Js.arrays(data.body)).map(a=>U.server(a[ref.index],this.base+ref.path)).filter(Boolean))].map(embed=>({embed,ref}));
      }catch(_error){return [];}
    });
    const unique=new Map();for(const value of lists.flat()){
      const indirect=typeof value.embed==='object'?value.embed:null;
      unique.set(value.ref.language+'|'+(indirect?'lien:'+indirect.id:value.embed),{...value,...(indirect?{indirect,embed:indirect.url}:{})});
    }
    const priority=url=>/ansembed/i.test(url)?0:/vidmoly/i.test(url)?1:/smoothpre/i.test(url)?2:3;
    const discovered=[...unique.values()].sort((a,b)=>priority(a.embed)-priority(b.embed));
    const scope=this.config.hostScope;
    const players=scope==='all'?discovered:discovered.filter(p=>assignedScope(p.embed)===scope);
    const mobile=this.ctx.transport.asynchronous===true;
    const workers=mobile?this.config.limits.mobileHostConcurrency:this.config.limits.hostConcurrency;
    const hostBudgetMs=mobile?this.config.limits.mobileHostBudgetMs:0;
    let attempted=0,transportSkipped=0,hostBudgetStops=0;
    const groups=await mapLimit(players,workers,async(player)=>{
      let {embed}=player;const {ref,indirect}=player;
      if(selectionBudget(this.ctx))return [];
      attempted++;
      // The text-only TV bridge cannot validate Sendvid's binary placeholder.
      // An earlier metadata/source response establishes this capability; avoid
      // fetching a player that must subsequently be rejected on this runtime.
      if(this.ctx.transport.textOnly&&hostFamily(embed)==='sendvid'){
        transportSkipped++;
        event('host-unavailable',{family:'Sendvid',reason:'binary-bridge-unavailable'});
        return [];
      }
      const edition=ref.language.toUpperCase(),owner='Anime-Sama'+(/^(?:VF|VOSTFR)$/.test(edition)?'':' / '+edition);
      const hostAttempt=mobile?hostContext(this.ctx,hostBudgetMs):null,ctx=hostAttempt?hostAttempt.ctx:this.ctx;
      try {
        if(indirect){
          const response=await request(this.base+'/api/lien.php?j='+encodeURIComponent(indirect.token)+'&l='+indirect.id,
            this.base+ref.path,'Anime player link',ctx,undefined,{sensitive:true});
          const data=JSON.parse(response.body),resolved=data&&typeof data.u==='string'&&/^https:\/\//i.test(data.u)?U.server(data.u,this.base+ref.path,true):null;
          if(!resolved||new U.URL(resolved).hostname.replace(/^www\./,'')!==new U.URL(indirect.url).hostname.replace(/^www\./,'')){
            event('anime-link-unavailable',{reason:data?.erreur==='expire'?'expired':data?.erreur==='absent'?'absent':'invalid-response'});return [];
          }
          embed=resolved;
        }
        const link={url:embed,server:HOST_NAMES[hostFamily(embed)]||new U.URL(embed).hostname,
          lang:ref.language==='vostfr'?'VOSTFR':'VF',headers:{'User-Agent':this.config.userAgent},preserveUrl:true,hostHeaders:'embed',validateMedia:true};
        const values=await resolveHost(link,this.base+ref.path,ctx,owner);
        const result=await validateHostMedia(values,ctx);
        return result.map(s=>({...s,version:edition,...(scope==='all'?{}:{_entryPosition:discovered.indexOf(player)})}));
      }catch(error){event('anime-host-failure',{host:origin(embed),status:error.status||0});return [];}
      finally {
        if(hostAttempt&&hostAttempt.expired()){
          hostBudgetStops++;
          event('anime-host-budget',{host:origin(embed),edition,budgetMs:hostBudgetMs,cooperative:true});
        }
      }
    });
    const seen=new Set(),present=scope==='all'?presentStreams:presentEntryStreams,streams=present(groups.flat().filter(s=>{
      const key=JSON.stringify([s.url,s.version,Object.entries(s.headers||{}).sort()]);
      if(seen.has(key))return false;seen.add(key);return true;
    }));
    event('anime-selection',{scope,discovered:discovered.length,excluded:discovered.length-players.length,published:players.length,attempted,transportSkipped,hostWorkers:workers,hostBudgetMs,hostBudgetStops,returned:streams.length,remaining:players.length-attempted,
      stop:selectionBudget(this.ctx)||(hostBudgetStops?'host-budget':'candidates-exhausted'),requests:this.ctx.requests,minimum:0,languages:streams.map(s=>s.language)});
    return {streams};
  }
}
module.exports={AnimeSamaProvider,mapLimit};
