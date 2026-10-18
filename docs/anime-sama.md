# Dedicated Anime-Sama plugin

Anime-Sama **1.1.3** is a separate native Nuvio plugin in this repository. Its
manifest is `plugins/anime-sama/manifest.json`, independently installable from
Sources FR. No Anime-Sama scraper is added to Sources FR's root manifest.

Install this repository URL in Nuvio's **Plugins** settings:

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/refs/heads/main/plugins/anime-sama/manifest.json
```

Disable the original repository's Anime-Sama entry when using this copy. Both
retain the `anime-sama` plugin ID so source IDs/settings remain recognizable;
do not assume that Nuvio migrates or synchronizes settings across repositories.
Refresh the new repository on TV and phone, then reopen the episode's streams.
The optional companion catalogue addon remains in the original repository. This
port supplies the native stream plugin; it needs no hosted helper or server.

## Result policy and presentation

There is **no minimum resolution**. Known 360p, 480p, 576p and higher sources
remain eligible; unknown resolution stays without a guessed HD/quality label.
Sources FR's separate 720p setting does not affect this plugin.

The heading follows the shared `Anime-Sama / Host | resolution | edition` format,
with a padded position prefix when multiple results are returned. Results sort
by resolution descending first, then MULTI/VF/VOSTFR/other at each resolution;
unknown resolution goes last. Nuvio Mobile alphabetizes plugin labels, so the
prefix preserves that order in the app. Equal entries retain discovery order.
This final presentation step adds no requests or source filtering.
The secondary line also retains the actual video host (ANSEmbed, Smoothpre,
Voe, etc.), as requested. The native adapter uses Nuvio's supported string caption
slot for the host; it does not invent a file size. VF1/VF2/VQC choices retain their
edition identity. HLS audio evidence can correct an upstream language hint.
VOSTFR identifies the source's subtitle edition and does not prove Japanese audio
or a downloadable caption track. Actual advertised captions use the shared
subtitle parser; burned-in captions are not invented as sidecar files.

Every published distinct host/edition candidate gets an opportunity within the
plugin's own budget. There is **no three-source target**, first-host-per-language
stop or mobile success-grace cutoff. Equivalent media mirrors within one host
and format remain fallback routes rather than duplicate UI choices. Different
editions or playback headers remain distinct. Deleted, unsupported, gated,
placeholder or inaccessible streams are not presented as working links.

Default bounds are **64 requests**, **45 seconds checked between requests**, and
**four host workers**. There are no JS timers. Native TV HTTP is synchronous, so
its calls still serialize and cannot be interrupted by JavaScript. Completing
all host alternatives can take longer than the old TV first-success mode or
mobile grace window, particularly when a host is slow. Diagnostics distinguish
exhausted candidates from a budget stop, including the number left unattempted.

## Matching retained from the original plugin

The native mapping/parser logic is adapted from
[`Nuvio_anime_sama`](https://github.com/jeanmailpoubelle-rgb/Nuvio_anime_sama)
commit **f8605f146b1fb3118f04b36149239f0aa4de3e53**, version **1.0.6**.
It keeps TMDB/IMDb/Kitsu identities and episode suffixes, exact source title/alias
and year checks, sparse `epsN` positions, declared saga ranges and named specials.
Flattened catalogue seasons use actual canonical VOSTFR episode counts, so a
lagging VF dub or an intervening film cannot shift subsequent episodes. Missing
selected-language slots remain unavailable. Relative `as:ep:` IDs remain valid.

Metadata uses Nuvio Catalog first, then verified TMDB/Cinemeta/Kitsu paths as
appropriate. An app TMDB key is optional. Direct slug lookup remains a fast path
only after title/alias/year verification, with source search as fallback. Source
scripts are parsed as literals; downloaded JavaScript is never executed.

Continuous and seasonal requests can coexist for the same title. A complete
single-season catalogue establishes continuous numbering; its offsets use the
actual canonical source episode counts. A request for another season must have
metadata for that season. If Nuvio Catalog supplies only the flattened season,
its explicit IMDb ID is retained and Cinemeta is checked for the requested season,
including when Nuvio supplied a numeric TMDB ID. Valid primary metadata still
costs one request; this recovery adds one metadata request only when necessary.
Existing TMDB API/public-page fallback remains available for numeric IDs.

For Jujutsu Kaisen, continuous S1E25 and seasonal S2E1 now select the same source
slot; likewise S1E48 and S3E1. These are test observations, not production title
rules. No Jujutsu ID, 24/23-episode lengths or fixed season offsets are shipped
in the mapping code. Missing source seasons/episodes and selected-edition gaps
remain unavailable. See [the investigation and limitations](investigations/anime-season-layouts.md).

This recovery cannot identify every metadata layout when both expose the same
season/episode pair with different meanings (observed on Bleach and One Piece).
It does not change Sources FR's backend coordinates or the app's metadata-page
artwork. See the [Cinemeta follow-up diagnosis](investigations/cinemeta-anime.md)
before treating a missing image or unavailable primary video as a mapping bug.

The imported selectors use a bounded local HTML reader. There is no dependency
on Nuvio's DOM/Cheerio bridge, a browser, WebView or Node runtime packages.
Title, season and script reuse is confined to one `getStreams` invocation. A new
invocation fetches fresh player data; signed media URLs are not cached across calls.

## Shared resolvers and validation

`src/resolvers.js`, `src/extractors.js`, `src/hls.js`, `src/media-validation.js`
and `src/mp4.js` are shared with Sources FR. ANSEmbed, Smoothpre, Sendvid and
compatible generic players join the existing VOE, Vidmoly, StreamWish and other
host families. The port does not keep a second independent VOE/JWPlayer resolver.
Host domains are edited in `config/endpoints.json` for both plugins. Unknown VOE
aliases are also recognized from the final page's host branding, including
`Watch filename - VOE | ...`; a filename merely mentioning VOE is insufficient.
The shared F7 decoder still has to parse the actual supported player payload.
Do not solve alias rotation by hardcoding one redirected media domain.

Anime-Sama retains HLS master plus healthy-variant validation, DASH validation,
host playback Referer/Origin/User-Agent and Sendvid's bounded MP4 placeholder
check. HLS masters with external audio/subtitle groups stay intact. A denied top
variant can use a validated lower child directly only when no external groups
would be discarded. Headers and signed query bytes are preserved. These reads
validate availability; they do not impose a resolution threshold.

TV **1.0.0** cannot supply binary response bytes. Sendvid's MP4 placeholder check
therefore remains unavailable on that app version; it is explicitly diagnosed
and skipped. The plugin neither reconstructs binary from corrupted text nor
omits that safety check to make a fake source appear playable. Binary-capable
mobile transports can validate Sendvid, rejecting known clips of ten seconds or
less. Discovery does not download full video files or segments.

## Configuration and build

Edit [config/anime-sama.json](../config/anime-sama.json):

| Field | Purpose |
| --- | --- |
| `baseUrl` | Current Anime-Sama home origin |
| `version` | Default edition: `all`, `vf` or `vostfr` |
| `minimumResolution` | Must remain `0`; no resolution filtering |
| `targetSources` | Must remain `0`; no source-count target |
| `limits` | Dedicated request/time/concurrency bounds |
| `metadata.*` | Public metadata service endpoints |
| `userAgent` | Original plugin's browser User-Agent, preserved on host and media requests |

The plugin retains the original optional settings for site address, edition,
explicit source mappings and diagnostics. TV settings availability and account
synchronization depend on Nuvio; the compiled defaults work without the gear.
`sourceMap` retains the original JSON shape: keys such as `tv:12345` map to
`{"seasons":{"1":{"path":"/catalogue/example/saison1/","indexOffset":0,"languages":["vostfr","vf"]}}}`.
Movie keys use `{"group":"/catalogue/example/film/","index":0}`. These are
illustrative coordinates, not shipped mappings. Verify the actual source path,
array index and requested catalogue identity before adding an override.

Run `npm run build` to generate **both** plugins from this checkout. The small
local CommonJS bundler accepts repository-local modules/JSON only; no external
runtime imports are shipped. Never hand-edit either generated provider file.
Update each affected plugin's own manifest version and verification evidence
when publishing changes; a shared resolver change can affect both plugins.

## What can break and how to debug it

| Boundary and symptoms | Repair locations | Focused verification |
| --- | --- | --- |
| Domain/entry changes; site or catalogue HTML fails | `config/anime-sama.json:baseUrl`; settings override | Fetch a known title and actual episode script from the verified new origin |
| Metadata endpoints/schema/IDs or disagreement on season layout; S1 works but S2 returns no sources | `metadata.*`; `src/anime-sama/catalog-context.js` | Both numeric/IMDb requests, primary continuous versus secondary seasonal lists, explicit IMDb correspondence, unavailable/mismatched alternate metadata and long/truncated responses |
| Source HTML title/alias/group selectors change; empty/wrong season inventory | `src/anime-sama/pages.js`, `html.js` | Reduced real HTML fixture; aliases/year and website group order |
| Episode DSL/script route changes; sparse slots or recap positions shift | `pages.js`, `js-data.js`, `url.js` | Safe literal arrays/calls, exact script/ref index, comments/holes and foreign-path rejection |
| Flattened seasons/saga ranges change; wrong episode or missing VF | `episode-mapping.js` | Jujutsu E24/25 and E47/48; One Piece E1155/1156/1180; a delayed dub must not change offsets |
| Host domains/redirects/player encoding or title branding change; embed has no playable media | `config/endpoints.json:hosts`; shared resolvers/extractors | Isolate a fresh source embed; inspect the final title/VOE F7 payload and compare every host/edition result |
| Manifest/variant/header changes; buffering, missing captions/audio or wrong quality | Shared HLS/media validation; native transport | Original master/groups, each relevant variant and actual sidecars; preserve signed bytes/headers |
| Sendvid returns a placeholder or bridge lacks binary bytes | `src/mp4.js`, media validation, `src/anime-sama/transport.js` | Synthetic short/long MP4 prefix tests; TV must reject unavailable binary validation |
| Missing links after a successful host | `provider.js`; dedicated limits | Check published/attempted/returned/remaining counts and budget stop; never inherit Sources FR's result target |
| Host caption disappears | `src/anime-sama/streams.js` | Native serialized caption field, heading and quality/language fields on both runtimes |
| Wrong order or numbered labels stop preserving order in the app | `src/common.js:presentStreams`; provider's final return; Nuvio label mapping | Verify descending final resolution before audio groups, unknowns last, numeric padding, stable ties and unchanged host captions |

Domain changes must be validated against actual expected content, not a matching
name or HTTP 200. This port has no verified permanent Anime-Sama current-domain
status service; update the central default after first-party confirmation. A
metadata outage, absent edition, expired/deleted file, denied CDN or ambiguous
mapping is not automatically a parser bug. Keep these distinctions in reports.

The maintenance runner discovers both manifests through `config/maintenance.json`.
Its Anime-Sama cases use real anime instead of Nuvio's default Matrix test:

```sh
.venv/bin/python scripts/audit.py --provider anime-sama
.venv/bin/python scripts/audit.py --profile deep --provider anime-sama
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --case one-piece
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --case bleach
.venv/bin/python scripts/verify_anime.py --case bleach --runtime both --report reports/bleach.json
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --case jjk-seasonal
.venv/bin/python scripts/verify_anime.py --case jjk-25 --case jjk-s2e1 --case jjk-48 --case jjk-s3e1 --runtime both --report reports/season-layouts.json
```

Run Node tests, both literal native wrapper suites and maintenance tests after
shared changes. Record the original-plugin comparison, selected relative episode
paths/positions, source counts by host/edition, media/caption probes and request
impact. A passing sample does not certify every host/file or physical TV decoding.

## Season-layout recovery — 1.1.3

The missing-season metadata path now retains its explicit IMDb correspondence
and can resolve numeric TMDB requests through Cinemeta's seasonal episode list.
238 Node regressions, both native wrapper suites and 27 maintenance tests passed.
See [the release evidence](../tests/live-anime-season-layouts-1.1.3-2026-10-17.json)
and [verification notes](../VERIFICATION.md), including upstream media failures.

## Historical shared HLS update — 1.1.2

The common inspector now excludes unreadable playlists after network failures
and HTTP 5xx as well as earlier missing/invalid-playlist cases. This prevents
unverified links from blocking fallback. Anime-Sama already validates most host
playlists before this step; its separate budget, all-edition/no-minimum policy
and host captions remain unchanged. Both native fixture suites and 229 Node
tests passed. See the [shared failure investigation](investigations/jjk20-buffering.md)
and [verification](../VERIFICATION.md).

## Historical release verification — 1.1.1

Bleach S1E1 exposed a port regression: an unknown redirected VOE alias used a
filename-first page title, while the detector required VOE at the start. The
shared branding detector now recognizes both layouts. Both wrappers return
eight links instead of four, restoring VF/VOSTFR VOE HLS and direct MP4 choices;
all four VOE media samples passed per runtime. Bleach's ANSEmbed VOSTFR segment
returned HTTP 403 in the cloud checks and remains a recorded failure.

214 Node tests, both native fixture suites and 24 maintenance tests passed.
Final live checks also covered Your Name and Suzume, verified resolution-first
ordering/audio ties and preserved host captions. See [the release evidence](../tests/live-stream-order-1.1.1-2026-10-17.json).
No physical TV playback or burned-in dialogue certification is implied.

## Historical release verification — 1.1.0

The 17 October 2026 port passed **209 Node regressions**, both literal native
wrapper fixture suites and **24 maintenance tests**. Live samples covered Jujutsu
S1E1 and the flattened S1E25 boundary, One Piece S23E1180, Cowboy Bebop S1E1,
Your Name and Suzume. Successful lookups returned 10, 10, 4, 3, 4 and 2 links
respectively, preserving the original plugin's observed host/edition choices.
All six mobile-wrapper cases passed their media/caption probes. A TV boundary
lookup was interrupted by a metadata-service 503 and passed on a focused recheck;
TV probes also observed a VOE segment 503 and Smoothpre segment 403. The latter
recurred in Cowboy Bebop's recheck, although fresh original-resolver/Node and
Python samples succeeded. These failures remain recorded, not converted into
passes. No live sidecars were advertised in these samples; VOSTFR/burned-in
dialogue and physical Android decoding have not been independently certified.

Evidence: [native checks](../tests/live-anime-sama-1.1.0-2026-10-17.json),
[focused TV recheck](../tests/live-anime-sama-recheck-1.1.0-2026-10-17.json),
[original comparison and shared-provider checks](../tests/live-anime-port-shared-1.8.3-2026-10-17.json).
Collecting all alternatives changes the work compared with the original plugin's
first-success/grace stop: the Node HTTP sample used 12–36 requests and about
1.9–16.8 seconds. Those measurements are not phone/TV timings or a speed guarantee.
