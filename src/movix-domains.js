/* Independent client for Movix's public API. No website code is executed.
 * Only endpoint metadata is reused; signed media URLs are never cached here. */
var movixHealthy = null;
function movixEndpoint(ctx) {
    if (ctx.movixEndpoint) return ctx.movixEndpoint;
    var s = settings(), cached = !s.apiBase && movixHealthy && Date.now() < movixHealthy.expires ? movixHealthy : null;
    ctx.movixEndpoint = { api: site(s.apiBase || cached && cached.api || ENDPOINTS.purstream.wrapperApi),
        site: site(s.siteBase || cached && cached.site || ENDPOINTS.purstream.wrapperSite) };
    return ctx.movixEndpoint;
}
function movixSite(value) {
    var url = asUrl(value, '', false);
    return url && /^https:\/\/(?:www\.)?movix\.[a-z0-9.-]+\/$/i.test(url) ? origin(url) : '';
}
function discoverMovix(ctx) {
    if (ctx.movixDiscovery) return ctx.movixDiscovery;
    ctx.movixDiscovery = request(ENDPOINTS.movix.directory, '', 'Movix directory', ctx).then(function (page) {
        var pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi, match, target = '';
        while ((match = pattern.exec(page.body)) && !target) target = movixSite(decodeHtml(match[1]));
        if (!target) throw new Error('Movix directory: no official site link');
        return target;
    }).catch(function (error) { log(message(error)); return ''; }).then(function (official) {
        var seen = {}, sites = [official, ENDPOINTS.purstream.wrapperSite].concat(ENDPOINTS.movix.sites).filter(function (value) {
            if (!value || seen[value]) return false; seen[value] = true; return true;
        });
        function nextSite() {
            if (!sites.length) return Promise.resolve([]);
            var target = site(sites.shift());
            return request(target + '/', target + '/', 'Movix website', ctx).then(function (home) {
                if (!movixSite(origin(home.url))) throw new Error('Movix website: unexpected redirect');
                var scripts = /<script\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi, script = '', entry;
                while ((entry = scripts.exec(home.body)) && !script) {
                    var candidate = asUrl(decodeHtml(entry[1]), home.url);
                    if (candidate && origin(candidate) === origin(home.url) && /\/assets\/(?:index|main)[\w.-]*\.js(?:[?#]|$)/.test(candidate) && !/legacy/i.test(candidate)) script = candidate;
                }
                if (!script) throw new Error('Movix website: no first-party application bundle');
                return request(script, home.url, 'Movix API discovery', ctx).then(function (bundle) {
                    var candidates = [], seen = {}, apis = bundle.body.match(/https:\/\/api\.movix\.[a-z0-9.-]+/gi) || [];
                    apis.forEach(function (api) {
                        api = site(api);
                        if (!seen[api] && candidates.length < 2) { seen[api] = true; candidates.push({ api: api, site: origin(home.url) }); }
                    });
                    if (!candidates.length) throw new Error('Movix API discovery: no API origin');
                    event('movix-discovery', { site: origin(home.url), apis: candidates.map(function (candidate) { return candidate.api; }) });
                    return candidates;
                });
            }).catch(function (error) { log(message(error)); return nextSite(); });
        }
        return nextSite();
    }).catch(function (error) { log(message(error)); return []; });
    return ctx.movixDiscovery;
}
function movixJson(path, stage, ctx, accept) {
    if (ctx.movixStoppedError) return Promise.reject(ctx.movixStoppedError);
    var s = settings(), automatic = !s.apiBase && s.movixFailover !== false;
    var first = movixEndpoint(ctx), queue = [first].concat(automatic ? ENDPOINTS.movix.mirrors : []);
    var seen = {}, last, discovered = false;
    ctx.movixDead = ctx.movixDead || {};
    function next() {
        var endpoint;
        while (queue.length) {
            var candidate = queue.shift();
            candidate = { api: site(candidate.api), site: site(candidate.site) };
            if (!seen[candidate.api] && !ctx.movixDead[stage + ':' + candidate.api]) { endpoint = candidate; break; }
        }
        if (!endpoint) {
            if (!automatic || discovered) return Promise.reject(last || new Error('Movix API unavailable'));
            discovered = true;
            return discoverMovix(ctx).then(function (candidates) { queue = candidates; return next(); });
        }
        seen[endpoint.api] = true;
        return requestJson(endpoint.api + path, endpoint.site + '/', stage, ctx).then(function (data) {
            if (!(data.pending === true || accept(data))) throw failure(stage, 'unrecognized API schema', 0);
            ctx.movixEndpoint = endpoint;
            if (automatic) movixHealthy = { api: endpoint.api, site: endpoint.site, expires: Date.now() + 600000 };
            if (data.pending) event('upstream-pending', { source: stage, retry: 'refresh-stream-list' });
            return data;
        }).catch(function (error) {
            if (error.status === 429 || error.status === 401 || error.status === 403 && /\bjson\b/i.test(error.contentType || '')) {
                ctx.movixStoppedError = error; throw error;
            }
            if (!automatic || !endpointFailure(error)) throw error;
            last = error; ctx.movixDead[stage + ':' + endpoint.api] = true;
            if (movixHealthy && movixHealthy.api === endpoint.api) movixHealthy = null;
            event('endpoint-unavailable', { host: endpoint.api, stage: stage, status: error.status || 0 });
            return next();
        });
    }
    return next();
}
