#!/usr/bin/env python3
"""Exercise the provider in QuickJS with Nuvio TV 1.0.0 fetch semantics.

This checks JavaScript and source discovery, not Android networking or playback.
The fetch adapter follows NuvioMedia/NuvioTV tag 1.0.0, PluginRuntime.kt
(GPL-3.0): synchronous native HTTP, Promise response methods, null on bad JSON.
"""
import argparse
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

try:
    import quickjs
except ImportError:
    raise SystemExit("Install the test dependency: python3 -m pip install -r tests/requirements.txt")

ROOT = Path(__file__).resolve().parents[1]
FETCH_ADAPTER = r"""
var fetch = async function(url, options) {
    options = options || {};
    var method = (options.method || 'GET').toUpperCase();
    var headers = options.headers || {};
    var body = options.body || '';
    if (!headers['User-Agent']) {
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }
    var parsed = JSON.parse(__native_fetch(url, method, JSON.stringify(headers), body));
    return {
        ok: parsed.ok, status: parsed.status, statusText: parsed.statusText, url: parsed.url,
        headers: { get: function(name) { return parsed.headers[name.toLowerCase()] || null; } },
        text: function() { return Promise.resolve(parsed.body); },
        json: function() {
            try {
                if (parsed.body === null || parsed.body === undefined || parsed.body === '') {
                    return Promise.resolve(null);
                }
                return Promise.resolve(JSON.parse(parsed.body));
            } catch (_) { return Promise.resolve(null); }
        }
    };
};
"""


def check(provider, args, live=False, scenario="direct"):
    context = quickjs.Context()
    context.set_memory_limit(32 * 1024 * 1024)
    calls = []

    def native_fetch(url, method, headers_json, body):
        calls.append(url)
        if live:
            started = time.monotonic()
            try:
                request = urllib.request.Request(
                    url, headers=json.loads(headers_json), method=method,
                    data=body.encode() if body else None,
                )
                try:
                    response = urllib.request.urlopen(request, timeout=20)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    data = dict(
                        ok=200 <= response.status < 300,
                        status=response.status, statusText=str(response.reason),
                        url=response.url, headers={k.lower(): v for k, v in response.headers.items()},
                        body=response.read(1024 * 1024).decode("utf-8", errors="replace"),
                    )
                parsed = urllib.parse.urlsplit(url)
                print(f"HTTP {data['status']} {parsed.netloc}{parsed.path} ({time.monotonic()-started:.1f}s)")
            except Exception as error:
                data = dict(ok=False, status=0, statusText=type(error).__name__, url=url, headers={}, body="")
                print(f"Network error: {type(error).__name__}")
            return json.dumps(data)

        assert "/api/" in url, "Discovery must not request metadata, domain lists, embeds or media in these fixtures"
        if "/purstream/" in url:
            if scenario == "direct":
                result = {"sources": [{"url": "https://cdn.example/master.m3u8", "name": "pulse | 1440p | MULTI"}]}
            elif scenario == "empty":
                result = {"sources": []}
            else:
                return json.dumps(dict(ok=False, status=0, statusText="network error", url=url, headers={}, body=""))
        else:
            result = {"links": {"vf": [{"url": "https://cdn.example/backup.mp4"}]}}
        return json.dumps(dict(ok=True, status=200, statusText="OK", url=url, headers={}, body=json.dumps(result)))

    context.add_callable("__native_fetch", native_fetch)
    context.add_callable("__log", lambda *items: print("JS", *items))
    context.eval("var console={log:__log,warn:__log,error:__log};var global=globalThis;var module={exports:{}};")
    context.eval(FETCH_ADAPTER)
    # Nuvio TV isolates provider declarations in an IIFE and invokes module.exports.
    context.eval("(function(){\n" + provider.read_text() + "\n})();")
    context.eval("var __result; module.exports.getStreams.apply(null," + json.dumps(args) + ").then(function(r){__result=JSON.stringify(r);});")
    jobs = 0
    while context.execute_pending_job():
        jobs += 1
        if jobs > 10000:
            raise RuntimeError("Provider failed to settle")
    encoded = context.eval("__result")
    if encoded is None:
        raise RuntimeError("Provider did not produce a result")
    result = json.loads(encoded)
    print(f"Result: {len(result)} source(s), {len(calls)} request(s)")
    if not result:
        raise RuntimeError("Expected at least one source")
    if not live:
        assert len(calls) == (1 if scenario == "direct" else 2)
        if args[1] == "series":
            assert "?season=0&episode=2" in calls[0]
    for item in result:
        assert isinstance(item.get("url"), str) and item["url"].startswith("https://")
        assert isinstance(item.get("headers"), dict)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", help="Use real network requests for source discovery")
    parser.add_argument("--provider", type=Path, default=ROOT / "providers/movix.js")
    options = parser.parse_args()
    if options.live:
        for arguments in [("603", "movie", None, None), ("550", "movie", None, None), ("1399", "tv", 1, 1)]:
            print("Checking", arguments)
            check(options.provider, arguments, live=True)
    else:
        for fixture in ["direct", "empty", "network-error"]:
            print("Fixture:", fixture)
            check(options.provider, ("603", "movie", None, None), scenario=fixture)
        check(options.provider, ("1399", "series", 0, 2))
    print("PASS: source discovery only; physical TV playback is not verified")
