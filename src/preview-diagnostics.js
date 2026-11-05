/* Phone-only mapping report. Not a media provider: supportedTypes is empty. */
function previewDiagnosticSettings() {
    return InputMetadata.settingsFields().concat([
        {type:'info',label:'DIAGNOSTIC UNIQUEMENT · Réglages indépendants des deux plugins. Collez le même manifeste ici, puis Enregistrer et Tester le fournisseur. Aucune vidéo n’est lancée.'},
        {type:'select',key:'diagnosticExpectedProvider',label:'Liste attendue',defaultValue:'tvdb',options:[{label:'TVDB — anime (Aired Order)',value:'tvdb'},{label:'TMDB — série classique',value:'tmdb'}]},
        {type:'text',key:'diagnosticTmdbId',label:'ID TMDB de la série',placeholder:'46298 (Hunter × Hunter)'},
        {type:'text',key:'diagnosticSeason',label:'Saison affichée dans Nuvio',placeholder:'2'},
        {type:'text',key:'diagnosticEpisode',label:'Épisode affiché dans Nuvio',placeholder:'72'},
        {type:'info',label:'Champs vides : exemple Hunter × Hunter S2E72. Pour le test initial, configurez aussi API principale et ANSEmbed dans leurs propres roues de réglages.'}
    ]);
}
function diagnosticReason(error) {
    // Never display an upstream message, URL, header or response body.
    var code=error && error.code;
    if(typeof code==='string'&&/^(?:INPUT_METADATA|SOURCE|SEASON|METADATA|AMBIGUOUS|NO_EXACT|MOVIE|INVALID|UNSUPPORTED)_[A-Z0-9_]+$/.test(code))return code;
    return error && /^[1-5]\d\d$/.test(String(error.status))?'HTTP_'+error.status:'METADATA_OR_SOURCE_UNAVAILABLE';
}
async function previewDiagnosticStreams(id,type,season,episode) {
    // Nuvio's built-in Test provider calls TMDB603. The manifest advertises no
    // media types, so this entry cannot enter normal movie/episode searches.
    if(String(id)!=='603'||!['movie','tv','series'].includes(type))return [];
    var config=settings(),rows=[],failed=false;
    function row(title,text) {rows.push({name:title,title:title,url:'diagnostic:'+text,type:'diagnostic'});}
    function problem(stage,error) {failed=true;row(stage,diagnosticReason(error));}
    try {
        if(!InputMetadata.active(config))throw InputMetadata.fail('INPUT_METADATA_CONFIG_REQUIRED');
        InputMetadata.configuration(config);
        if(!['tvdb','tmdb'].includes(config.diagnosticExpectedProvider || 'tvdb'))throw InputMetadata.fail('INPUT_METADATA_CONFIG_REQUIRED');
        row('Configuration','AIOmetadata / manifeste présent / mode actif');
    } catch(error) {problem('Configuration',error);return rows;}
    var ctx;
    try {
        ctx=validateArgs(config.diagnosticTmdbId || '46298','tv',config.diagnosticSeason || '2',config.diagnosticEpisode || '72');
        if(ctx.season<1)throw InputMetadata.fail('INPUT_METADATA_EPISODE_UNAVAILABLE');
        row('Requête de diagnostic','TMDB '+ctx.id+' / S'+ctx.season+'E'+ctx.episode);
    } catch(error) {problem('Requête invalide',InputMetadata.fail('INPUT_METADATA_INVALID_REQUEST'));return rows;}
    try {
        var selected=await inputEpisodeState(ctx),external=InputMetadata.tvdbEpisode(selected.video,selected.provider,selected.proxyOrigin);
        row('Épisode AIO sélectionné',selected.provider+' / S'+selected.video.season+'E'+selected.video.episode+(external?' / TVDB épisode '+external.id:''));
        row('Identifiant du flux',selected.video.id);
        if(selected.provider!==(config.diagnosticExpectedProvider || 'tvdb'))throw InputMetadata.fail('INPUT_METADATA_PROVIDER_MISMATCH');
    } catch(error) {problem('Lecture AIOmetadata',error);return rows;}
    for(var target of ['nuvio-catalog','cinemeta']) {
        try {
            var mapped=await inputEpisodeCoordinates(ctx,target==='cinemeta'?'backup':'primary',target);
            row(target==='cinemeta'?'Cible Cinemeta':'Cible TMDB/Nuvio','S'+mapped.season+'E'+mapped.episode);
        } catch(error) {problem(target==='cinemeta'?'Cible Cinemeta':'Cible TMDB/Nuvio',error);}
    }
    try {
        if((config.diagnosticExpectedProvider || 'tvdb')==='tmdb') {
            row('Position Anime-Sama','HORS PÉRIMÈTRE / série classique TMDB');
            row('Bilan',failed?'INCOMPLET / lire les étapes ci-dessus':'CORRESPONDANCE OK / lecture vidéo à vérifier');
            return rows;
        }
        var key=typeof TMDB_API_KEY==='string'?TMDB_API_KEY.trim():'';
        var provider=AnimeSama.nativeProvider(config,'all');
        // Reuse exact metadata already verified in this lookup. Never persist
        // private responses or signed streams between interpreter calls.
        var cache={};
        cache[InputMetadata.requestUrl(InputMetadata.configuration(config),selected.ids)]=selected.meta;
        for(var catalog of ['nuvio-catalog','cinemeta']) {
            try {
                var value=await inputReference(ctx,catalog);
                cache[catalog==='cinemeta'?ENDPOINTS.episodeMapping.cinemeta+'/meta/series/'+selected.ids.imdbId+'.json':ENDPOINTS.episodeMapping.catalog+'/meta/series/tmdb:'+ctx.id+'.json']=value.meta;
            } catch(_error) { /* Keep independently failed references failed. */ }
        }
        var http=provider.http.request;
        provider.http.request=function(url,options) {
            return Object.prototype.hasOwnProperty.call(cache,url)?Promise.resolve({body:JSON.stringify({meta:cache[url]}),url:url}):http.call(provider.http,url,options);
        };
        var refs=await AnimeSama.resolveSelection(provider,ctx.id,'tv',ctx.season,ctx.episode,config,key);
        if(!refs.length)throw InputMetadata.fail('INPUT_METADATA_SOURCE_SLOT_UNAVAILABLE');
        var positions=[];
        refs.forEach(function(ref){
            var group=ref.path.split('/').filter(Boolean).slice(-2,-1)[0];
            if(!/^saison[1-9]\d*$/.test(group||''))group='groupe';
            var label=group+' / épisode '+(ref.index+1)+' / '+String(ref.language).toUpperCase();
            if(positions.indexOf(label)<0)positions.push(label);
        });
        row('Position Anime-Sama',positions.join(' ; '));
    } catch(error) {problem('Position Anime-Sama',error);}
    row('Bilan',failed?'INCOMPLET / lire les étapes ci-dessus':'CORRESPONDANCE OK / lecture vidéo à vérifier');
    return rows;
}
