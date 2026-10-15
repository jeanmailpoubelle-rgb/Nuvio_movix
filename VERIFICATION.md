# Verification — 2026-10-15

Target: Nuvio **Android TV** 1.0.0 plugin interface. The user's exact TV
platform/app version was not yet confirmed when this implementation was saved.

| Check | Result |
| --- | --- |
| Node regression suite | 19 passed |
| QuickJS fixtures using TV-style synchronous HTTP adapter | Direct result, empty primary → backup, HTTP 0 → backup, series alias and season zero passed |
| QuickJS live movie 603 (The Matrix) | HTTP 200, 1 source, 1 API request, 1.8 seconds for HTTP |
| QuickJS live movie 550 (Fight Club) | HTTP 200, 1 source, 1 API request, 1.3 seconds for HTTP |
| QuickJS live TV 1399 S01E01 (Game of Thrones) | HTTP 200, 1 source, 1 API request, 0.8 seconds for HTTP |
| JavaScript/Python syntax checks and whitespace check | Passed |
| Original provider in QuickJS with TV 1.0.0 fetch code | Matrix returned 1 source after 4 HTTP requests; reported 720p even though the API label was 1440p MULTI |
| Original external domain-list URL | HTTP 404; original fallback domain still responded |
| Matrix CDN playlist from this environment | Cloudflare HTTP 403 |
| Physical television playback | Not tested |

These tests establish source discovery and compatibility with the exercised
JavaScript/fetch behavior. They do not reproduce Android's TLS stack, DNS,
network identity, the exact on-device QuickJS build, Nuvio's player, or the
original device's zero-stream failure. The CDN restriction remains outside this
provider's control. Successful live API responses can change later.

No claim is made that the physical TV issue is resolved until the replacement
is installed and tested there. See README.md for installation and logs.
