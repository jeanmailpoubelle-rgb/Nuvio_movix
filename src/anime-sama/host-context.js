// No timer races: Mobile's runtime drains native jobs, and its fetch cannot be
// cancelled by AbortSignal. This is a cooperative budget, not an HTTP timeout.
function hostContext(parent,budgetMs) {
  const deadline=Date.now()+budgetMs,ctx=Object.create(parent);
  const expired=()=>Date.now()>deadline;
  // Keep the invocation's original start/request budget. The host's clock
  // starts when a worker takes it, not while it is still queued.
  ctx.limits={...parent.limits,elapsedMs:Math.min(parent.limits.elapsedMs,deadline-parent.started)};
  // Preserve invocation-local memoization and a single shared request counter.
  for(const key of ['requests','hostResults','mediaValidation','hlsMetadata'])
    Object.defineProperty(ctx,key,{get:()=>parent[key],set:value=>{parent[key]=value;}});
  const check=()=>{if(expired())throw new Error('Anime host time budget reached');};
  ctx.fetch=async(url,options)=>{
    check();
    const response=await parent.fetch(url,options);
    // The current native call must settle; discard an over-budget response
    // before parsing it or issuing redirects, playlist reads or retries.
    check();return response;
  };
  return {ctx,expired};
}
module.exports={hostContext};
