/* Shared, timer-free selection. Count qualifying results, not attempted players.
 * Only request-local metadata is reused; budgets belong to each provider worker. */
function qualifyStreams(values, ctx, detail) {
    values = unique(values);
    return enrichHlsStreams(values, ctx).then(function (inspected) {
        var result = filterResolution(unique(inspected), ctx);
        if (detail) { detail.filtered = inspected.length - result.length; detail.unavailable = values.length - inspected.length; }
        return result;
    });
}
function selectionBudget(ctx) {
    var limits = ctx.limits || ENDPOINTS.limits;
    if (ctx.requests >= limits.requests) return 'request-budget';
    if (Date.now() - ctx.started > limits.elapsedMs) return 'time-budget';
    return '';
}
function selectionLane(value) {
    value = String(value || '').toUpperCase();
    return /VOST/.test(value) ? 'vostfr' : /^(?:VF|FR|MULTI|DUAL)/.test(value) ? 'french' : /^(?:VO|EN|J[AP])/.test(value) ? 'vo' : 'unknown';
}
function candidateKey(link, referer) {
    var url = asUrl(link.url, referer, link.preserveUrl ? false : undefined);
    return url ? JSON.stringify([url, Object.keys(link.headers || {}).map(function (key) { return [key.toLowerCase(), link.headers[key]]; }).sort()]) : '';
}
function candidatePriority(link, referer) {
    if (formatOf(asUrl(link.url, referer) || '', link.format)) return 0;
    var family = hostFamily(asUrl(link.url, referer) || '', link.server), index = ENDPOINTS.selection.hostPriority.indexOf(family);
    return index < 0 ? 100 : index + 1;
}
function selectLinks(links, referer, ctx, owner, options) {
    options = options || {};
    var seen = {}, candidates = [], results = [], startRequests = ctx.requests;
    var target = options.target || ENDPOINTS.selection.targetSources;
    var stats = { source: owner || PROVIDER_NAME, advertised: links.length, invalid: 0, unsupported: 0, duplicates: 0,
        attempted: 0, failed: 0, resolved: 0, filtered: 0, unavailable: 0, duplicateResults: 0, target: target };
    links.forEach(function (link, index) {
        if (!link || typeof link !== 'object') { stats.invalid++; return; }
        var key = candidateKey(link, referer), url = asUrl(link.url, referer, link.preserveUrl ? false : undefined);
        if (!key) { stats.invalid++; return; }
        if (!options.allowGeneric && !supportsHost(url, link.server) && !formatOf(url, link.format)) { stats.unsupported++; return; }
        if (seen[key]) {
            seen[key].link.subtitles = [].concat(seen[key].link.subtitles || [], link.subtitles || []); stats.duplicates++; return;
        }
        var item = { link: Object.assign({}, link), index: index, lane: selectionLane(link.lang), priority: candidatePriority(link, referer), attempted: false };
        seen[key] = item; candidates.push(item);
    });
    candidates.sort(function (a, b) { return a.priority - b.priority || a.index - b.index; });
    var wanted = ['french', 'vostfr'].filter(function (lane) { return candidates.some(function (item) { return item.lane === lane; }); });
    function missing() {
        return wanted.filter(function (lane) {
            return !results.some(function (item) { return selectionLane(item.language) === lane; }) &&
                candidates.some(function (item) { return !item.attempted && item.lane === lane; });
        });
    }
    function finish(reason) {
        results = unique(results);
        stats.candidates = candidates.length; stats.remaining = candidates.filter(function (item) { return !item.attempted; }).length;
        stats.returned = results.length; stats.stop = reason; stats.requests = ctx.requests - startRequests;
        stats.languages = results.map(function (item) { return item.language; });
        event('selection', stats); return results;
    }
    function next() {
        var budget = selectionBudget(ctx), needs = missing();
        if (results.length >= target && !needs.length) return Promise.resolve(finish('target-reached'));
        if (!candidates.some(function (item) { return !item.attempted; })) return Promise.resolve(finish('candidates-exhausted'));
        if (budget) return Promise.resolve(finish(budget));
        var batch = [], reserved = {};
        for (var n = 0; n < ENDPOINTS.limits.hostConcurrency; n++) {
            var required = needs.filter(function (lane) { return !reserved[lane]; }), candidate = null;
            if (required.length) candidate = candidates.filter(function (item) { return !item.attempted && item.lane === required[0]; })[0];
            if (!candidate && results.length < target) candidate = candidates.filter(function (item) { return !item.attempted; })[0];
            if (!candidate) break;
            candidate.attempted = true; reserved[candidate.lane] = true; batch.push(candidate);
        }
        if (!batch.length) return Promise.resolve(finish('target-reached'));
        return Promise.all(batch.map(function (candidate) {
            if (selectionBudget(ctx)) { candidate.attempted = false; return []; }
            stats.attempted++;
            var name = typeof options.owner === 'function' ? options.owner(candidate.link) : owner;
            return resolveHost(candidate.link, referer, ctx, name).then(function (raw) {
                stats.resolved += raw.length;
                var detail = {};
                return qualifyStreams(raw, ctx, detail).then(function (good) {
                    stats.filtered += detail.filtered; stats.unavailable += detail.unavailable;
                    if (!raw.length || !good.length && !detail.filtered) stats.failed++;
                    return good;
                });
            }).catch(function (error) { stats.failed++; log(message(error)); return []; });
        })).then(function (groups) {
            var combined = results.concat([].concat.apply([], groups)), distinct = unique(combined);
            stats.duplicateResults += combined.length - distinct.length; results = distinct;
            return next();
        });
    }
    return next();
}
