# Nuvio French Providers

Version **1.5.1** supplies three active providers for Nuvio Android TV **1.0.0**
and Nuvio Mobile, using one shared host-resolver registry.

| Provider | Normal lookup | Recovery |
| --- | --- | --- |
| French Catalogue / Vidzy | VF and VOSTFR player routes using the TMDB ID | Strict catalogue matching on Nakios Live, Purestream CC or Movix ZIP; shared host resolvers |
| Purstream API / Cpasmal | Fast TMDB-to-stream API | Verified direct API on wrapper failure; Cpasmal hosts; ordinary Frembed premium grant if no working stream remains |
| Frembed / Hosts | Frembed film/episode API using the TMDB ID | Shared host resolvers for its returned player links |

## Install or update

Refresh the existing repository until the providers display **1.5.1**. The new
**Frembed / Hosts** entry is enabled in the manifest; check its switch after refreshing.
For a new installation, add this same stable URL:

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/refs/heads/main/manifest.json
```

Disable equivalent All-in-One providers and the separate Nuvio_frembed repository
while comparing results, to avoid duplicate requests/results. Reopen or refresh
the movie/episode stream list after updating.

Existing `movix-tv` and `nakios-tv` IDs remain unchanged. The new provider uses
`french-frembed-hosts`, avoiding a collision with the separate Frembed repository.
The old `purstream-tv` remains disabled and inert: TV 1.0.0 retains removed entries,
so this migration marker performs no requests even when called. There are three
active providers plus that retirement entry.

Frembed's premium path is a recovery route within the API provider. A live Matrix
check returned the exact same media URL through both discovery APIs; exposing
both as normal premium providers would duplicate that result. Its host discovery
runs independently, so slow mirrors do not hold up the existing fast providers.

## Matching and fallback

Nuvio supplies a numeric **TMDB ID**, media type and explicit season/episode.
No IMDb search or guessed anime episode conversion is performed. Frembed queries
use `id/idType=tmdb` and exact `sa/epi` coordinates. Season zero is preserved.

Catalogue recovery uses the app-injected `TMDB_API_KEY`, searches French/original
titles, checks type/year/title or poster, and rejects ambiguous matches. Direct
Purstream recovery also verifies the returned sheet's TMDB ID and type. No
provider substitutes another episode when the requested one is unavailable.

The catalogue provider requests both Vidzy language routes and deduplicates an
embed if a missing VOSTFR route selects the VF player. **Only zero supported
Vidzy streams triggers catalogue recovery.** One working source keeps the fast
path, including low-resolution sources; it does not scrape every mirror to hunt
for a better copy. A playback failure after selection does not call the plugin
again automatically.

An explicit missing-title/episode HTTP 404 skips a repeated direct Purstream
backend query. Empty primary results try Cpasmal. Confirmed missing HLS masters
(404/410) are removed; working alternatives are preserved. If no working primary
or backup remains, the ordinary Frembed premium grant/source API is tried. Grant
denials or empty source responses return no fabricated player or browser fallback.

For host lists, identical player URLs are resolved once. A page advertising VF
and VOSTFR for the same URL does not prove two different copies. Declared HLS
audio languages can identify the actual file as MULTI.

## Shared host coverage

All provider families use **[src/resolvers.js](src/resolvers.js)**:

| Resolver | Protocol handled |
| --- | --- |
| Vidzy | Known public player encoding and literal media data |
| LuluStream / Livavid | Packed JWPlayer sources |
| Uqload | Literal or packed JWPlayer sources, including multiple media entries |
| VOE | Literal player redirect and F7 JSON data; HLS and optional direct MP4 |
| Dood | Public pass_md5 flow on pages that expose it |
| Vidmoly | Public player paths and JWPlayer data |
| StreamWish | Packed/literal JWPlayer data and host-specific playback headers |
| MixDrop | Public file/embed path conversion and packed wurl data |
| Vidara | Public stream API with baseline codec negotiation |

The registry selects hosts by centrally configured domains or a Frembed-provided
host label for rotating mirrors. Automatic redirects reuse their final body;
redirects that already return an HLS master seed metadata inspection without
another GET. Known literal player data is parsed; downloaded scripts are never
executed. No DOM, WebView, cookie fabrication or challenge solver is used.

Host failures are isolated. A host family being implemented does not establish
that every current player works. For example, The Storm's Dood page currently
requires an interactive CAPTCHA and returns no stream. See
[VERIFICATION.md](VERIFICATION.md) for live results and exact coverage.

## Audio, quality and subtitles

Each distinct HLS source is inspected once per lookup using its playback headers.
Declared distinct audio languages determine MULTI; repeated codec groups and
regional aliases do not inflate the count. Known French-only audio corrects a
misleading MULTI hint to VF. Single foreign audio is VO, preserving upstream
VOSTFR where supplied. Missing/unknown HLS audio metadata and MP4/DASH sources
retain upstream language hints; those hints are not a measured track inventory.

The same master read determines the highest advertised video tier. Cropped
cinema uses familiar width-based tiers: 1920×800 is labelled 1080p and 864×360
480p. Exact dimensions are logged. Iframe-only variants are excluded. Original
adaptive masters and all their audio/subtitle renditions remain intact; playback
can select a lower rendition. Missing resolution metadata retains the upstream
quality hint.

If no numeric resolution is available, the label is **Unknown**. The former
generic HD default was misleading for unmeasured direct MP4 sources, including
VOE. Discovery does not download MP4 files to measure their resolution. A VOE
MP4 can be a different encode from its HLS alternative, so it does not inherit
the HLS resolution. Nuvio's playback information shows the decoded dimensions.

Real API/HTML/JWPlayer subtitles and raw caption-file URLs in HLS masters are
passed to Nuvio with language and playback headers. Proper segmented subtitle
playlists remain native HLS tracks. Wrapped Vidzy loadTracks URLs are handled;
thumbnail tracks and the JWPlayer Upload captions menu placeholder are excluded.
Duplicate streams merge their caption files. Labels such as **Français** remain
unchanged, without provider prefixes. Discovery never downloads caption bodies
or video segments to make labels.

Integrated subtitles are not rewritten. Jujutsu Kaisen 0's original French file
contains 264 duplicate timed cues, including the reported line at 12:28.289; that
is an upstream content defect. Some VOSTFR copies instead have burned-in French
subtitles and provide no selectable caption file. MULTI describes audio languages,
not subtitle availability. File accessibility/timed-cue validation does not
certify subtitle content or synchronization.

## Speed and native runtime

Healthy API discovery remains **two requests** including its HLS master. Vidzy
normally uses **four** for one shared embed or **six** for two distinct embeds.
Frembed host discovery adds one source-list request plus bounded extraction and
metadata reads. Premium recovery needs a fresh ordinary grant, one source API
request and, for HLS, one master read. No availability/configuration preflight is
added to healthy paths. Premium playback uses a browser User-Agent without
inventing a site Referer/Origin; exact signed URL bytes are retained.

At most **six distinct host links** are attempted per list, with **three workers**
on asynchronous transports. API backup attempts remain capped at three. Frembed
language groups are interleaved before the cap. A 24-request/45-second elapsed
budget is checked between requests. **No timers are created**: Nuvio Mobile can
keep coroutine-backed sleeps alive after clearTimeout. Native HTTP timeouts remain
authoritative; the plugin cannot cancel an in-progress native call.

TV 1.0.0's fetch bridge is synchronous, so host HTTP calls inside one scraper
serialize. Separate provider workers keep Frembed hosts independent from fast
API/Vidzy results. Media URLs, premium grants and subtitle URLs are never cached
across lookups. Request-local extraction/metadata reuse avoids duplicate work.

## Domains and diagnostics

Edit **[config/endpoints.json](config/endpoints.json)**, run `npm run build`, and
publish the rebuilt providers. It contains Vidzy/Lulu origins, catalogue mirrors
and directories, API origins, `frembed.base`, host-family domain patterns and
request limits. Host patterns are explicit domains or domain stems ending in `.*`.
The build validates HTTPS endpoints and rejects stale generated bundles in CI.

Catalogue directories are lazy recovery: after a site failure, inspect the
labelled catalogue link on `nakios.org`, then the site button on `purstream.org`,
then remaining configured mirrors. Candidate content must pass normal parsing.
A missing title or unsupported player does not trigger every mirror. Vidzy has
no verified directory; Frembed's configured origin is not polled for domain hints
on each lookup. Domain changes belong in configuration, not title-specific rules.

Optional host-supplied `SCRAPER_SETTINGS` overrides include existing API/catalogue
settings, `frembedBaseUrl`, `frembedRecovery: false` to disable the last recovery
route, and `inspectHls: false` to skip audio/quality/caption-file inspection. No
custom settings UI is assumed on TV 1.0.0.

Logs include provider ID/version, stage, HTTP host/status/time, host family/result,
challenge-required status, catalogue advertised/supported/distinct counts, audio
languages, exact resolutions and final result counts. Provider diagnostics omit
query strings, grants, keys and signed media URLs. The native app may log URLs:

```sh
adb logcat -d | rg 'movix-tv|nakios-tv|french-frembed-hosts|PluginRuntime'
```

## Develop and verify

Source files are bundled into standalone files; edit `src/`, not `providers/`.
No Node imports or npm runtime dependencies are shipped to Nuvio.

```sh
npm run build
npm test
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
.venv/bin/python scripts/quickjs_check.py --all --runtime both
```

CI uses literal JavaScript runtime fixtures from NuvioTV tag **1.0.0** and Nuvio
Mobile commit `808272dcec4be02397282600b70a07111576e0c7`, including POST bodies,
redirects, source headers, serialization and zero pending native timer jobs.

For live checks, supply your own `NUVIO_TMDB_API_KEY` to emulate app injection for
catalogue matching. Normal direct APIs need no metadata key:

```sh
.venv/bin/python scripts/verify_live.py --runtime both --report live-report.json
.venv/bin/python scripts/verify_live.py --case 1623256 --case 2316 --report live-report.json
.venv/bin/python scripts/verify_shared_resolvers.py --report shared-report.json
```

The last command directly exercises the shared premium recovery helper in a
**temporary verification bundle**, plus the actual catalogue-mode provider.
This tests recovery without making working API routes artificially fail. Normal
recovery ordering is separately covered by regression tests. Reports contain
hashes and sanitized counts, not signed URLs or caption dialogue.

QuickJS and Python HTTP are development stand-ins. **Physical TV playback remains
unverified**: Android networking, hardware decoding, selection UI and continuous
playback need a device test. HLS/MP4 samples are probed; DASH is accepted from
explicit source metadata but its live media probe is not implemented.

## License and attribution

**GPL-3.0-only**, selecting GPL version 3 for earlier GPL-3.0-or-later components.
See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
Frembed provider/host protocols were adapted from
[Nuvio_frembed](https://github.com/jeanmailpoubelle-rgb/Nuvio_frembed) at `ace5453`
and its documented CloudStream references. Original authors retain their rights.
The original repository was reviewed without modification.
