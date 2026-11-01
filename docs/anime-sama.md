# Dedicated Anime-Sama plugin

Anime-Sama **1.2.0** is a separate native Nuvio plugin in this repository. Its
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
Enable all **six entries** for full source coverage. The legacy `anime-sama` ID
now selects ANSEmbed; added entries select Smoothpre, VOE, Uqload, Vidmoly and
other hosts/new aliases. One host entry can finish while another remains pending.
All entries use the same generated file; it dispatches on the native entry ID.
TV supplies `repository-UUID:entry-id`; Mobile supplies `manifest-URL:entry-id`.
Unknown nonempty IDs fail closed. An absent ID is a development-only aggregate
comparison; tests must also exercise every actual installed ID on both wrappers.

Entry names intentionally remain **Anime-Sama**: Mobile sorts `scraper.name`
before labels, so host-specific names would override quality-first ordering.
Descriptions and the settings information identify the host; stream captions
retain the actual video host. Keep **group by repository** enabled for a single
Anime-Sama filter. TV's compact entry list may show identical names; defaults
work without opening settings. Settings belong to each entry individually:
copy a custom site URL, edition preference or source map to each added entry.
Neither account sync nor the shared bundle makes those settings shared.
The optional companion catalogue addon remains in the original repository. This
port supplies the native stream plugin; it needs no hosted helper or server.

## Result policy and presentation

There is **no minimum resolution**. Known 360p, 480p, 576p and higher sources
remain eligible; unknown resolution stays without a guessed HD/quality label.
Sources FR's separate 720p setting does not affect this plugin.

The heading follows the shared `Anime-Sama / Host | resolution | edition` format,
with a composable priority prefix. Results sort
by resolution descending first, then MULTI/VF/VOSTFR/other at each resolution;
unknown resolution goes last. Nuvio Mobile alphabetizes plugin labels, so the
prefix preserves that order across independently completed entries. Its first
part ranks actual quality/audio and its second part is the original published
candidate ordinal. These are stable sort keys, not consecutive positions in a
completed list. Unknown resolution remains last without a quality label;
nonstandard qualities also retain exact descending order. Equal entries retain discovery order.
This final presentation step adds no requests or source filtering.
The secondary line also retains the actual video host (ANSEmbed, Smoothpre,
Voe, etc.), as requested. The native adapter uses Nuvio's supported string caption
slot for the host; it does not invent a file size. VF1/VF2/VQC choices retain their
edition identity. HLS audio evidence can correct an upstream language hint.
VOSTFR identifies the source's subtitle edition and does not prove Japanese audio
or a downloadable caption track. Actual advertised captions use the shared
subtitle parser; burned-in captions are not invented as sidecar files.

Every published distinct host/edition candidate gets an opportunity in exactly
one installed entry, within that entry's own budget. Unassigned families and
rotating aliases join the fallback entry and use normal shared resolvers;
unknown VOE aliases still get branding/F7 detection. There is **no three-source target**, first-host-per-language
stop or mobile success-grace cutoff. Equivalent media mirrors within one host
and format remain fallback routes rather than duplicate UI choices. Different
editions or playback headers remain distinct. Deleted, unsupported, gated,
placeholder or inaccessible streams are not presented as working links.

Default bounds per entry are **64 requests** and **45 seconds checked between requests**.
The plugin uses **six host workers** after an ordinary native request returns a
promise, currently Mobile; synchronous/unknown bridges retain **four**. This is
capability detection without a preflight, not a binary-support or timer heuristic.
Native TV 1.0.0 HTTP still serializes and cannot be interrupted by JavaScript.

Mobile also has a **20-second cooperative per-host budget**, starting when that
candidate is dequeued. Further requests stop at that deadline, and an over-budget
native response is rejected before redirects, playlist reads or retries. Valid
results already completed by that host or other hosts remain eligible. The
entry's invocation still shares one request counter, original deadline and local caches.
Queued candidates continue when a worker is freed; no first-success/result-count
stop is added. Lowering this setting can omit otherwise playable slow hosts.

This is **not a hard HTTP timeout**. There are no JS timers or detached resolver
tasks. Mobile's native fetch cannot be cancelled through AbortSignal, and native
jobs can outlive a JavaScript timer race. An already-running call must settle;
an unresponsive host can still delay its own entry or hit Nuvio's own timeout.
Hard cancellation/early delivery needs an app-side bridge/runtime change.

`anime-selection` includes `scope`, `discovered`, `excluded`, `hostWorkers`, `hostBudgetMs` (zero for TV), and
`hostBudgetStops`. `anime-host-budget` records only host origin, edition and the
configured budget, never a signed URL. Host-budget stops and remaining unvisited
candidates are separate coverage gaps; neither is certified complete by the
verifier simply because another link plays.

Independent native contexts repeat metadata/title/edition discovery. There is
no hidden cross-context cache or new helper service. This costs more requests
than one aggregate lookup, especially when a title publishes only one host.
Media extraction is partitioned rather than repeated. First results can arrive
without waiting for another entry, but shared metadata/site failures can still
affect all entries. The fallback entry pools rare/unrecognized host families;
its candidates can still delay one another. Do not claim universal timeout
cancellation or physical Android latency from the development harness.

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

Edition discovery now parses each HTML page once for both its actual script URL
and episode-label instructions. Matching's already parsed slots are reused for
extraction only when the edition path and complete script URL, including its
query, agree. Changed/absent scripts, failed cache entries and external `as:ep:`
references retain fresh script extraction. Sparse positions, named specials,
canonical VOSTFR counts and edition gaps follow the same mapping code as before.
No parsed catalogue or playback data is shared between separate lookups.

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
and skipped before fetching the Sendvid player. Capability is learned from an
earlier metadata/source response, without a new preflight. `transportSkipped`
in `anime-selection` counts these already-visited, ineligible candidates; it is
a subset of `attempted`, and does not hide remaining unvisited hosts. The plugin
neither reconstructs binary from corrupted text nor
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
| `hostEntries` | Stable manifest IDs mapped to disjoint known host families and one `other` fallback |
| `limits.requests`, `limits.elapsedMs` | Request and elapsed bounds per entry's invocation |
| `limits.hostConcurrency` | Workers for synchronous/unknown bridges; default `4` |
| `limits.mobileHostConcurrency` | Workers for a promise-returning native bridge; default `6`, maximum `8` |
| `limits.mobileHostBudgetMs` | Cooperative budget per active mobile host; default `20000`, bounded by `elapsedMs`; not a native HTTP timeout |
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

## Measuring speed without dropping links

Use the deterministic comparison before committing an optimization:

```sh
.venv/bin/python scripts/benchmark_anime.py --baseline-ref HEAD --episodes 1000 --repeats 7 --output reports/anime-benchmark.json
```

`HEAD` means the committed baseline against the current generated bundle. Supply
an older commit explicitly after publication. The benchmark runs both literal
native wrappers with synthetic HTTP responses, no network access or credentials.
It checks exact equality of returned playback data, headers, captions, ordering
and host/edition choices, plus complete selection and non-increasing request
counts. It includes one warm-up and reports wall time and process CPU separately;
timings are observations, not test thresholds or phone/TV speed guarantees.
Use `--episodes 1` for small scripts and `1000` for long catalogues. Follow with
fresh live episode/movie checks: this benchmark cannot measure host latency,
current media availability, physical decoding or real subtitle rendering.
The Mobile native callback now returns a promise as the app's `asyncFunction`
does. Live Mobile HTTP uses a bounded worker pool; only the interpreter thread
settles its promises. The harness drains pending native requests even if the
plugin returns early. TV stays synchronous. The local CPU benchmark explicitly
keeps deterministic synchronous HTTP; it does not measure scheduling speed.
Controlled Node bridge tests and a six-party HTTP barrier regression independently
verify host overlap, queued progress and bounded followups after a late response.
Python networking and scheduling are still not a physical Android benchmark.
The processing benchmark deliberately uses an empty native ID to compare the
unscoped engine. It does not certify installed dispatch by itself. Both literal
fixture suites also run every prefixed installed ID and compare their union to
the unscoped results, allowing only composable presentation prefixes to differ.
The live verifier runs all six entries independently, retaining each context's
logs, bundle snapshot/hash, completion time, selection and HTTP evidence. It
requires a complete partition and flags an entry failure even if other links play.

## What can break and how to debug it

| Boundary and symptoms | Repair locations | Focused verification |
| --- | --- | --- |
| Domain/entry changes; site or catalogue HTML fails | `config/anime-sama.json:baseUrl`; settings override | Fetch a known title and actual episode script from the verified new origin |
| Metadata endpoints/schema/IDs or disagreement on season layout; S1 works but S2 returns no sources | `metadata.*`; `src/anime-sama/catalog-context.js` | Both numeric/IMDb requests, primary continuous versus secondary seasonal lists, explicit IMDb correspondence, unavailable/mismatched alternate metadata and long/truncated responses |
| Source HTML title/alias/group selectors change; empty/wrong season inventory | `src/anime-sama/pages.js`, `html.js` | Reduced real HTML fixture; aliases/year and website group order |
| Episode DSL/script route changes; sparse slots or recap positions shift | `pages.js`, `js-data.js`, `url.js` | Safe literal arrays/calls, exact script/ref index, comments/holes and foreign-path rejection |
| Parsed discovery reuse selects stale/wrong data | `provider.js:version`, `streams`; `pages.js:episodePage`, `episodeSlotsFromPage` | Same path plus exact script query; changed/rejected cache and external-reference fallback; new lookups fetch fresh scripts/players |
| Flattened seasons/saga ranges change; wrong episode or missing VF | `episode-mapping.js` | Jujutsu E24/25 and E47/48; One Piece E1155/1156/1180; a delayed dub must not change offsets |
| Host domains/redirects/player encoding or title branding change; embed has no playable media | `config/endpoints.json:hosts`, `catalogue.lulu`; shared resolvers/extractors | Isolate a fresh source embed; inspect the final title/VOE F7 payload and compare every host/edition result |
| Manifest/variant/header changes; buffering, missing captions/audio or wrong quality | Shared HLS/media validation; native transport | Original master/groups, each relevant variant and actual sidecars; preserve signed bytes/headers |
| Sendvid returns a placeholder or bridge lacks binary bytes | `src/mp4.js`, media validation, `src/anime-sama/transport.js` | Synthetic short/long MP4 prefix tests; TV must reject unavailable binary validation |
| Known text-only hosts waste lookup time | `provider.js:streams`; transport capability | TV skips only Sendvid's unusable player request; Mobile still validates/returns it. Check `transportSkipped` and published/attempted/remaining counts |
| Mobile stays at four workers or a synchronous TV is misclassified | `transport.js:nativeFetch`, `provider.js:streams`; `limits.mobileHostConcurrency` | Observe the actual native promise contract, `hostWorkers`, all healthy returned data and no new capability request; binary support alone is insufficient |
| A slow host retries too long, valid slow links disappear, or budgets multiply | `host-context.js`, `limits.mobileHostBudgetMs`; provider diagnostics | Hold one asynchronous request, finish the other candidates, advance its clock and settle it; assert no followup, fresh retry next lookup, shared 64-request/45-second limits and retained healthy choices. Pending native requests remain app-owned |
| Missing links after a successful host | `provider.js`; dedicated limits | Check published/attempted/returned/remaining counts and budget stop; never inherit Sources FR's result target |
| An entry resolves every host, duplicates streams, or resolves none after refresh | `host-groups.js:entryScope`, `config/anime-sama.json:hostEntries`; manifest IDs | Actual TV UUID/mobile URL prefixes, unknown-ID rejection, each entry's `scope/discovered/excluded/published`, and full union/partition on both wrappers |
| One entry's timeout hides unrelated links | Dedicated manifest; app's per-scraper collector | Hold ANSEmbed while other entries complete; confirm app merges their results even while the group is loading. Shared metadata/site outages remain a separate failure |
| Links group by host before quality, or ties jump when another entry arrives | Identical manifest names; `host-groups.js:entryRank`, `presentEntryStreams` | Merged app comparator: name then label; quality/audio priority plus original candidate ordinal, nonstandard and unknown qualities, stable ties and no leaked internal fields |
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
.venv/bin/python scripts/verify_anime.py --case jjk-s2e22 --case jjk-s2e23 --runtime both --report reports/jjk-late-season.json
```

Run Node tests, both literal native wrapper suites and maintenance tests after
shared changes. Record the original-plugin comparison, selected relative episode
paths/positions, source counts by host/edition, media/caption probes and request
impact. A passing sample does not certify every host/file or physical TV decoding.

The dedicated verifier rejects a budget stop or unattempted published candidates,
even if its returned subset plays. Inspect `anime-selection`'s published,
attempted, remaining and `hostBudgetStops` counts; missing or inconsistent selection evidence also
fails verification. Slow hosts can exhaust the existing time budget without a
parser defect. Recheck that title and distinguish incomplete discovery from a
returned stream's separate media failure; do not increase limits just to obtain
a passing report.

## Independent host entries — 1.2.0

Six native entries in the same dedicated repository share one generated bundle
and route disjoint host families by their real prefixed IDs. Nuvio can display
completed entries while another remains pending. Preserve all healthy choices,
composable quality/audio ordering, host captions, no resolution minimum and
per-entry limits. Settings are independent and prerequisites repeat. Sources FR
remains 1.8.10. See [the migration, timeout investigation, measurements and limits](investigations/jjk-s2e22-intermittent.md).

## Historical mobile scheduling — 1.1.8

Six workers on a verified asynchronous native bridge, with a configurable
20-second cooperative per-host budget and explicit host-budget diagnostics.
No timer race, native HTTP cancellation or guaranteed early return is claimed.
Synchronous TV retains four workers and no per-host budget. Healthy fixtures
preserve complete playback data. Sources FR remains **1.8.10** with byte-identical
provider bundles. See [verification and limitations](investigations/anime-mobile-2026-11-01.md).
The later [S2E22 intermittent-empty investigation](investigations/jjk-s2e22-intermittent.md)
distinguishes correct episode mapping and recovered CDN failures from a Mobile
lookup that reaches the app's own timeout. Its exact on-device failure remains
unreproduced; a passing cloud lookup does not establish that it is fixed.

## Discovery performance — 1.1.7

This dedicated-only release reduces repeated page/script parsing and avoids
known-incompatible Sendvid player requests on text-only TV. It keeps all source
choices, no quality minimum, existing validation, four workers and the original
budgets. Sources FR remains **1.8.10**, with byte-identical provider bundles.
See [benchmarks, live comparisons and limits](investigations/anime-speed-2026-11-01.md).

## Shared endpoint configuration — 1.1.6

The shared configuration replaces the retired Yablom/Pirvab backup shortcut with
the verified Dokimov site/search pair. Anime-Sama does not use Yablom discovery;
its independent mapping, host captions, all-host selection, limits and absence
of a resolution minimum are unchanged. The version keeps both distributed
copies of the shared configuration current. See the
[31 October maintenance check](investigations/maintenance-2026-10-31.md).

## Shared endpoint configuration — 1.1.5

The shared compiled configuration now contains Frembed's verified `.uno` origin.
Anime-Sama does not use that discovery API; its source mapping, all-host policy,
host captions, limits and absence of a quality minimum are unchanged. The version
keeps both distributed copies of shared configuration current. See the
[24 October maintenance check](investigations/maintenance-2026-10-24.md).

## Shared host configuration — 1.1.4

This release includes the verified `luluvid.com` entry alias in the shared
configuration. Dedicated episode mapping, all-host selection, host captions and
the absence of a resolution minimum are unchanged. See the
[full maintenance check](investigations/full-maintenance-2026-10-18.md) for live
coverage, the verifier correction and remaining limitations.

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
