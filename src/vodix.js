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
    var referer=movixEndpoint(ctx).site+'/',headers={Origin:origin(referer),Referer:referer};
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
function movixVodix(ctx){
    if(ctx.type==='tv'&&InputMetadata.active(settings())&&!episodeTarget('vodix')){
        event('input-metadata-backend-unverified',{backend:'vodix'});return Promise.resolve([]);
    }
    // This API exposes coordinates but no episode identity/inventory. Until its
    // layout is verified, never apply TVDB coordinates to it in mapped mode.
    return orderedEpisodeLookup(ctx,'vodix',function(coordinates){
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
