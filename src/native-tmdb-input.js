/* Same-coordinate native controls for explicitly opted-in TMDB backends.
 * No provider-layout inference or TVDB translation; native/movie paths bypass. */
function verifiedNativeTmdbCoordinates(ctx,backend){
    if(backend!=='vodix'&&backend!=='coflix')return Promise.reject(InputMetadata.fail('INPUT_METADATA_BACKEND_UNVERIFIED'));
    var orderError='INPUT_METADATA_'+backend.toUpperCase()+'_ORDER_UNVERIFIED';
    if(ctx.type!=='tv'||!InputMetadata.active(settings()))return Promise.resolve(ctx);
    if(ctx.season===0)return Promise.reject(InputMetadata.fail(orderError));
    return inputEpisodeState(ctx).then(function(state){
        var automatic=state.adapter==='xperience'&&state.provider==='unknown';
        if((state.provider!=='tmdb'&&!automatic) || (automatic&&InputMetadata.tvdbEpisode(state.video,state.provider,state.proxyOrigin))){
            event(backend+'-input-skipped',{provider:state.provider,basis:automatic?'tvdb-identity':'unsupported-provider'});
            throw InputMetadata.fail(orderError);
        }
        return inputEpisodeDetails(ctx,ctx.season,ctx.episode).then(function(details){
            if(!details||!/^[1-9]\d*$/.test(String(details.id))||!Number.isSafeInteger(Number(details.id))||Number(details.id)<=0||
                Number(details.season_number)!==ctx.season||Number(details.episode_number)!==ctx.episode||
                details.show_id!=null&&String(details.show_id)!==ctx.id||
                !/^\d{4}-\d{2}-\d{2}$/.test(details.air_date||''))
                throw InputMetadata.fail('INPUT_METADATA_OFFICIAL_EPISODE_CONFLICT');
            var day=Date.parse(details.air_date+'T00:00:00Z');
            if(!Number.isFinite(day)||new Date(day).toISOString().slice(0,10)!==details.air_date)
                throw InputMetadata.fail('INPUT_METADATA_OFFICIAL_EPISODE_CONFLICT');
            var signature=InputMetadata.signature(state.video),rows=state.meta.videos;
            var names=[details.name].concat(Array.isArray(details.translations&&details.translations.translations)?
                details.translations.translations.map(function(t){return t&&t.data&&t.data.name;}):[]);
            var official=names.map(function(name){return InputMetadata.signature({title:name,released:details.air_date,season:ctx.season,episode:ctx.episode});}).filter(Boolean);
            function officialMatch(video){
                var candidate=InputMetadata.signature(video);
                if(!candidate)return false;
                // Xperience returns broadcast airtimes (observed +25h), whereas
                // TMDB supplies a date. Scope this to an official title match;
                // do not widen shared mapping/date rules or infer a provider.
                var delta=candidate.date-day;
                var dateMatches=Math.abs(delta)<=86400000 || state.adapter==='xperience'&&delta>=0&&delta<172800000;
                return dateMatches&&official.some(function(item){return item.title===candidate.title;});
            }
            var matches=officialMatch(state.video),streamCount=rows.filter(function(row){return row&&row.id===state.video.id;}).length;
            var matchCount=rows.filter(officialMatch).length;
            event(backend+'-input-proof',{provider:state.provider,
                titleMatch:!!signature&&official.some(function(item){return item.title===signature.title;}),
                dateDeltaHours:signature?Math.round((signature.date-day)/3600000):null,
                streamIdentityCount:streamCount,officialMatchCount:matchCount});
            if(!matches||streamCount!==1||matchCount!==1) {
                // Batch drops and generic titles need a distinct official still,
                // not a relaxed name/date or same-coordinate assumption.
                return inputReference(ctx,'nuvio-catalog').then(function(reference){
                    if(!InputMetadata.tmdbStillAnchor(state,reference.meta,details))
                        throw InputMetadata.fail(orderError);
                    event(backend+'-input-verified',{provider:state.provider,basis:'official-unique-tmdb-still-and-release',season:ctx.season,episode:ctx.episode});
                    return {season:ctx.season,episode:ctx.episode};
                });
            }
            event(backend+'-input-verified',{provider:state.provider,basis:automatic?'official-episode-and-translations':'tmdb-provider-and-official-episode',
                season:ctx.season,episode:ctx.episode});
            return {season:ctx.season,episode:ctx.episode};
        });
    });
}
