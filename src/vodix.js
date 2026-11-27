/* Public Movix Vodix protocol; fresh proof/grant per lookup. */
function vodixOwned(value,base){
    var url=asUrl(value,base+'/',false);
    if(!url||origin(url)!==base||!/^https:\/\/[^/?#@]+\//.test(url)||/[\\\r\n]/.test(url))throw new Error('Vodix: unexpected origin');
    return url;
}
function vodixJson(url,base,referer,stage,ctx,headers,transport){
    return request(url,referer,stage,ctx,headers,transport).then(function(response){
        if(origin(response.url)!==base)throw new Error('Vodix: JSON redirect');
        var data=JSON.parse(response.body);
        if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Vodix: JSON schema');
        return data;
    });
}
function vodixCaptions(url,base,headers,ctx){
    return Promise.all(['subtitles.json','external-subtitles'].map(function(suffix){
        var endpoint=vodixOwned(asUrl(suffix,url,false),base);
        // Caption endpoints are siblings, never forward a media capability query.
        return request(endpoint,'','Vodix captions',ctx,headers).then(function(response){
            if(origin(response.url)!==base)throw new Error('Vodix captions: redirect');
            var rows=JSON.parse(response.body);
            if(!Array.isArray(rows)||rows.length>64)throw new Error('Vodix captions: schema');
            return rows.filter(function(row){return row&&row.format==='text'&&typeof row.url==='string';}).map(function(row){
                var lang=String(row.language||'').toLowerCase(),name=String(row.label||'').slice(0,160);
                return {url:vodixOwned(asUrl(row.url,url,false),base),language:lang==='fre'||lang==='fra'?'fr':lang==='eng'?'en':lang,name:name+(row.forced?' (forced)':'')};
            });
        }).catch(function(){return [];});
    })).then(function(groups){return normalizeSubtitles([].concat.apply([],groups),url,headers,true);});
}
function vodixResolve(row,base,ctx){
    var code=row&&row.code;
    if(typeof code!=='string'||!/^[-A-Za-z0-9_]{1,80}$/.test(code))return Promise.resolve([]);
    var referer=movixEndpoint(ctx).site+'/',headers={'User-Agent':ctx.userAgent||USER_AGENT,Origin:origin(referer),Referer:referer};
    return vodixJson(base+'/e/'+code+'/challenge',base,referer,'Vodix challenge',ctx,headers).then(function(ch){
        var endpoint=vodixOwned(ch.url,base),nonce=vodixProof(ch.challenge,ch.bits,ctx);
        return vodixJson(endpoint,base,referer,'Vodix exchange',ctx,mergeHeaders(headers,{'Content-Type':'application/json'}),{method:'POST',body:JSON.stringify({challenge:ch.challenge,nonce:nonce})});
    }).then(function(grant){
        var url=vodixOwned(grant.url,base);
        return request(url,referer,'Vodix master',ctx,headers).then(function(response){
            if(origin(response.url)!==base)throw new Error('Vodix: master redirect');
            var tracks=hlsTracks(response.body,response.url,headers);
            var language=tracks.audioLanguages.length>1?'MULTI':tracks.audioLanguages[0]==='fr'?'VF':tracks.audioLanguages.length===1?'VO':'';
            var item={url:url,type:'hls',format:'m3u8',headers:headers,quality:tracks.quality,language:language,name:streamName('Movix / Vodix',tracks.quality,language)};
            primeHlsMetadata(item,response,ctx);
            return vodixCaptions(url,base,headers,ctx).then(function(captions){if(captions.length)item.subtitles=captions;return [item];});
        });
    }).catch(function(error){event('source-unavailable',{source:'Vodix',status:error.status||0,reason:'exchange-or-media-unavailable'});return [];});
}
// This is a same-coordinate TMDB input check, not a new Vodix TVDB mapping.
// Keep the proof request-local; a series-level setting cannot prove all episodes.
function vodixCoordinates(ctx){
    if(ctx.type!=='tv'||!InputMetadata.active(settings()))return Promise.resolve(ctx);
    if(ctx.season===0)return Promise.reject(InputMetadata.fail('INPUT_METADATA_VODIX_ORDER_UNVERIFIED'));
    return inputEpisodeState(ctx).then(function(state){
        var automatic=state.adapter==='xperience'&&state.provider==='unknown';
        if((state.provider!=='tmdb'&&!automatic) || (automatic&&InputMetadata.tvdbEpisode(state.video,state.provider,state.proxyOrigin))){
            event('vodix-input-skipped',{provider:state.provider,basis:automatic?'tvdb-identity':'unsupported-provider'});
            throw InputMetadata.fail('INPUT_METADATA_VODIX_ORDER_UNVERIFIED');
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
            event('vodix-input-proof',{provider:state.provider,
                titleMatch:!!signature&&official.some(function(item){return item.title===signature.title;}),
                dateDeltaHours:signature?Math.round((signature.date-day)/3600000):null,
                streamIdentityCount:streamCount,officialMatchCount:matchCount});
            if(!matches||streamCount!==1||matchCount!==1) {
                // Batch drops and generic titles need a distinct official still,
                // not a relaxed name/date or same-coordinate assumption.
                return inputReference(ctx,'nuvio-catalog').then(function(reference){
                    if(!InputMetadata.tmdbStillAnchor(state,reference.meta,details))
                        throw InputMetadata.fail('INPUT_METADATA_VODIX_ORDER_UNVERIFIED');
                    event('vodix-input-verified',{provider:state.provider,basis:'official-unique-tmdb-still-and-release',season:ctx.season,episode:ctx.episode});
                    return {season:ctx.season,episode:ctx.episode};
                });
            }
            event('vodix-input-verified',{provider:state.provider,basis:automatic?'official-episode-and-translations':'tmdb-provider-and-official-episode',
                season:ctx.season,episode:ctx.episode});
            return {season:ctx.season,episode:ctx.episode};
        });
    });
}
function movixVodix(ctx){
    return vodixCoordinates(ctx).then(function(coordinates){
        var path='/api/vodix/'+ctx.type+'/'+ctx.id+(ctx.type==='tv'?'/'+coordinates.season+'/'+coordinates.episode:'');
        return movixJson(path,'Movix Vodix',ctx,function(data){return typeof data.success==='boolean'&&Array.isArray(data.sources);}).then(function(data){
            if(!data.success||data.pending)return [];
            if(ENDPOINTS.vodix.origins.indexOf(data.base)<0||data.sources.length>8)throw new Error('Vodix: invalid discovery');
            // Sequential exchanges bound CPU and request costs; independent from
            // other providers' three-link targets. No grants survive this lookup.
            var streams=[],queue=data.sources.slice(0,3);
            function next(){if(!queue.length||selectionBudget(ctx))return streams;return vodixResolve(queue.shift(),data.base,ctx).then(function(items){streams=streams.concat(items);return next();});}
            return next();
        });
    });
}
function getStreams(id,type,season,episode){return run(id,type,season,episode,movixVodix);}
