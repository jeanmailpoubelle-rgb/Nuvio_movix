const {configuration}=require('./config');
const Pages=require('./pages');
const Js=require('./js-data');
const Id=require('./ids');
const U=require('./url');
const {nativeFetch}=require('./transport');
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
      const script=Pages.episodeScript(page.body,this.base+path);if(!script)return null;
      const data=await this.page(script,this.base+path);if(!data)return null;
      const episodes=Pages.episodeSlots(data.body,page.body,this.base+path);
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
        let script=ref.script;
        if(!script){const page=await this.page(ref.path);if(!page)return [];script=Pages.episodeScript(page.body,this.base+ref.path);}
        if(!script)return [];const data=await this.page(script,this.base+ref.path);if(!data)return [];
        return [...new Set(Object.values(Js.arrays(data.body)).map(a=>U.server(a[ref.index],this.base+ref.path)).filter(Boolean))].map(embed=>({embed,ref}));
      }catch(_error){return [];}
    });
    const unique=new Map();for(const value of lists.flat())unique.set(value.ref.language+'|'+value.embed,value);
    const priority=url=>/ansembed/i.test(url)?0:/vidmoly/i.test(url)?1:/smoothpre/i.test(url)?2:3;
    const players=[...unique.values()].sort((a,b)=>priority(a.embed)-priority(b.embed));
    let attempted=0;
    const groups=await mapLimit(players,this.config.limits.hostConcurrency,async({embed,ref})=>{
      if(selectionBudget(this.ctx))return [];
      attempted++;
      const edition=ref.language.toUpperCase(),owner='Anime-Sama'+(/^(?:VF|VOSTFR)$/.test(edition)?'':' / '+edition);
      const link={url:embed,server:HOST_NAMES[hostFamily(embed)]||new U.URL(embed).hostname,
        lang:ref.language==='vostfr'?'VOSTFR':'VF',headers:{'User-Agent':this.config.userAgent},preserveUrl:true,hostHeaders:'embed',validateMedia:true};
      try {
        const values=await resolveHost(link,this.base+ref.path,this.ctx,owner);
        const result=await validateHostMedia(values,this.ctx);
        return result.map(s=>({...s,version:edition}));
      }catch(error){event('anime-host-failure',{host:origin(embed),status:error.status||0});return [];}
    });
    const seen=new Set(),streams=groups.flat().filter(s=>{
      const key=JSON.stringify([s.url,s.version,Object.entries(s.headers||{}).sort()]);
      if(seen.has(key))return false;seen.add(key);return true;
    });
    event('anime-selection',{published:players.length,attempted,returned:streams.length,remaining:players.length-attempted,
      stop:selectionBudget(this.ctx)||'candidates-exhausted',requests:this.ctx.requests,minimum:0,languages:streams.map(s=>s.language)});
    return {streams};
  }
}
module.exports={AnimeSamaProvider,mapLimit};
