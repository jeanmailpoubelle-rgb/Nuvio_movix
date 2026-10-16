# Verification — 1.6.0, 2026-10-16

## Movix identity and public protocols

`https://movix.online/` currently links **https://movix.dog/**. College and Cash
serve identical frontend HTML/application bundles; that application references
`https://api.movix.dog`. The known Cash API also serves the existing primary
protocol. Movix ZIP remains a different HTML-catalogue family.

MovixOpenSource was reviewed at `f4542cee8a6870d44e741db83f83255d85308217`.
The new clients independently implement its public Wiflix, FStream and Coflix
response protocols. No implementation code or assets were copied from that
CC BY-NC repository. VIP server-side extraction routes are not used.

The existing fast API provider now selects the current API. An independent
**Movix / Catalogues** worker queries the three additional public lists, requires
the requested TMDB identity and exact episode, then shares the existing host
resolvers, HLS inspection, subtitle handling and final 720p policy. Language and
catalogue interleaving share a six-player cap; duplicates merge caption metadata
before selection. Unknown resolution remains unlabelled and included.

## Domain recovery and runtime regressions

**136 Node tests passed**, plus both literal Android TV **1.0.0** and Mobile JS
fixture suites, with zero native timer jobs. New regressions cover known-mirror
recovery, official-directory/first-party-bundle parsing, directory outages,
College recovery, malformed responses, fresh media URLs after endpoint reuse,
custom API overrides, missing titles, pending retrievals and rate limits.
Catalogue tests cover duplicate captions, VF/VOSTFR/VO, season zero, exact episode
selection, wrong TMDB IDs and mismatched Coflix season/episode numbers.

## Live films, episodes and speed

The focused production-bundle run covers **six film/episode cases, two providers
and both runtime fixtures**: 24 calls, 48 returned sources and 24 filtered sources.
All calls returned at least one source and created zero native timer jobs.
All returned numeric qualities meet the 720p minimum; unknown-resolution MP4s
remain included. Every advertised subtitle-file check passed. Matrix and The
Office retain their working French/English captions; Reacher S4E1's existing
API-family backup still returns separate VF and VOSTFR copies.

| Case | Fast API/backup count, both runtimes | Movix catalogues count, TV / mobile |
| --- | --- | --- |
| Matrix | 1 | 4 / 4 |
| Reacher S4E1 | 2 | 2 / 3 initially; 2 / 2 after metadata recheck |
| The Office S1E1 | 1 | 1 / 1 |
| Spirited Away | 1 | 5 / 6 initially; 5 / 5 after metadata recheck |
| Jujutsu Kaisen 0 | 1 | 2 / 2 |
| Reacher S1E1 | 1 | 2 / 2 |

**47 of 48 initial media samples passed**. One Spirited Away TV HLS segment probe
returned HTTP 403; both fresh runtime rechecks passed all media samples. Separate
metadata HTTP 503s on the mobile Reacher/Spirited Away lookups retained upstream
quality hints, allowing an additional link through the minimum filter. Focused
rechecks measured those links below the minimum and restored matching counts.
The original failures/results remain recorded. Independent missing VOE/Vidmoly
players and unresolvable Lulu pages are skipped without hiding working hosts.
No retry loops, title-specific rules or production changes were added for rechecks.

Healthy primary lookups still use **two requests**, observed at **0.30–1.00s**.
Reacher S4E1's existing backup uses seven requests, observed at **3.43–5.72s**.
The independent catalogue worker uses **13–16 requests**, observed at
**6.63–14.96s**, including host resolution and HLS inspection. It adds more links
without placing that work inside the fast provider. These are Python HTTP
observations, not device benchmarks. The original adaptive masters, audio tracks
and subtitles remain intact; discovery does not download video or caption bodies.

## Recovery evidence

Healthy paths have no domain-discovery preflight. Structured missing-title and
upstream-error responses do not retry domain aliases. Pending responses are
logged without polling; rate limits stop further calls to the same API. Only
endpoint metadata is reused for ten minutes. The direct API's separately
configured status fallback is tested with a failed origin, a changed domain and
strict TMDB validation while reusing one metadata lookup.

The real official-directory helper passed on both runtime fixtures: directory,
website, first-party bundle, primary API and HLS metadata used **five requests**
per call. Both returned Matrix as MULTI with accessible French/English captions;
media samples and subtitle checks passed. The helper invokes production discovery
directly without breaking a healthy live API. Normal outage/recovery ordering is
tested separately by deterministic Node and native JS fixtures.

Reports retain bundle/source hashes, counts and sanitized diagnostics. They omit
signed media URLs, credentials, response bodies and subtitle dialogue. Python
HTTP/QuickJS does not certify physical Android networking, hardware decoding,
subtitle UI or continuous playback. No physical TV was available.

Reports: [film/episode checks](tests/live-movix-1.6.0-2026-10-16.json),
[focused upstream-error rechecks](tests/live-movix-recheck-1.6.0-2026-10-16.json),
[live official-directory discovery](tests/live-movix-directory-1.6.0-2026-10-16.json).
Repeat with `scripts/verify_live.py --provider movix --provider movix-catalogues`
and `scripts/verify_movix_discovery.py`; each accepts `--report`.

---

# Historical verification — 1.5.3, 2026-10-16

All active providers now apply `streams.minimumResolution: 720` from the shared
`config/endpoints.json`. Known numeric quality tiers below 720p are removed after
HLS metadata inspection; exactly 720p and above remain. Unknown resolution remains
without a quality field or placeholder. Numeric filename/API hints are used when
playlist resolution metadata is unavailable, as before.

This is a final result-list filter. It does not add requests, probe MP4 metadata,
or start another catalogue search because a low-resolution stream was removed.
Normal extraction failures still use the existing recovery order. An adaptive
master with a qualifying highest rendition retains all its original variants,
audio and subtitle tracks; playback adaptation itself is not constrained.

**121 Node tests passed**, including all three provider paths, misleading quality
hints corrected both upward and downward, exact 720p inclusion, unknown HLS/MP4,
adaptive variants, subtitle/audio preservation and configurable player domains.
Both literal TV **1.0.0** and Mobile JS suites passed with zero native timers;
the serialized API/Frembed fixtures return 720p, 1080p and unlabelled unknown MP4
while excluding 480p in the same single-request lookup.

The live run covers Matrix, Reacher S4E1, The Office S1E1, Jujutsu Kaisen 0 and
Reacher S1E1 through all three providers and both runtime fixtures: **30 calls**,
**28 returned sources** and **20 filtered sources**. Every returned numeric
quality is at least 720p. Ten lookups intentionally return an empty list because
all discovered sources are below the minimum; those are distinguished from
upstream availability failures. Both runtimes return matching qualities/counts,
with unchanged request counts and zero native timers. The Office retains its
unknown-resolution VOE MP4 while removing the two known low-resolution host links.

All advertised caption checks passed. **26 of 28 initial media probes passed**;
the two Reacher S1E1 TV VOE HLS segment probes returned HTTP 403 while the mobile
copies passed. Those original failures remain recorded. Frembed's Jujutsu Kaisen 0
hosts still resolve to zero sources on both runtimes, as in the 1.5.0 audit; its
existing API-family 1080p source remains available. Physical Android networking,
decoding and continuous playback are not certified by Python HTTP/QuickJS.

Report: [720p minimum live checks](tests/live-minimum-720-1.5.3-2026-10-16.json).
The [focused TV HLS recheck](tests/live-minimum-720-recheck-1.5.3-2026-10-16.json)
passed both previously failing media probes with fresh source resolution and
unchanged provider code.

Vidzy player domains now join the existing host registry. The shared matcher is
also used by Uqload detection. Tests change only the configuration and verify new
player domains are recognized while obsolete/lookalike domains are rejected.
The new [configuration guide](config/README.md) maps the domain fields and documents
the rebuild/publish steps. The policy is bundled into the providers, so it applies
on phone and TV independently of account-settings sync or a settings gear.

---

# Historical verification — 1.5.2, 2026-10-16

Unknown resolution now produces no quality field and no placeholder in the
plugin's stream name: **Frembed / Voe | VF**. Measured HLS labels remain numeric,
including when metadata adds a resolution to an initially unlabelled result.
This changes formatting only and adds no requests.

All **115 Node tests** and both native JS fixture suites passed. The existing VOE
fixture verifies a numeric HLS label alongside a direct MP4 with no quality field,
both before and after TV/mobile JSON serialization. It also confirms the MP4 is
not fetched during discovery. Existing HLS audio and quality regressions pass.
The media protocols are unchanged from 1.5.1; no new media probes were needed.

The Android TV **1.0.0** app itself adds a localized Unknown suffix in
`LocalScraperResult.toPluginStream` when quality is missing. This native UI behavior
is outside the plugin runtime fixtures and remains in the app; no invisible
placeholder or invented quality is sent to work around it. Reference:
[TV 1.0.0 StreamRepositoryImpl](https://github.com/NuvioMedia/NuvioTV/blob/1.0.0/app/src/main/java/com/nuvio/tv/data/repository/StreamRepositoryImpl.kt#L494).
Physical Android playback was not tested.

---

# Historical verification — 1.5.1, 2026-10-16

The Office S1E1 screenshot shows the direct VOE MP4 playing at **720×404** while
the list says HD. The provider's generic fallback supplied HD when no numeric
resolution was available. Direct MP4s have no HLS master to inspect, and the VOE
MP4 may differ from its HLS encode. This was a provider label defect; the screenshot
does not describe HD playback.

The shared fallback is now **Unknown**. Explicit numeric hints remain available,
and existing HLS inspection replaces Unknown with its measured resolution tier.
No MP4 probing, extra discovery requests, copied HLS-to-MP4 resolution or
title-specific exception was added.

All **115 Node tests** and TV **1.0.0** / mobile runtime fixtures passed. The VOE
fixture now verifies both the measured HLS label and Unknown MP4 label, including
the absence of MP4 discovery requests. Fresh live Office lookups through both
runtimes returned **three sources each**, **seven requests each** and **zero
native timers**. All six media samples passed. VOE HLS reports 640×360; its direct
MP4 remains Unknown. Uqload HLS reports 720×404 and keeps the existing 360p tier
mapping. Exact dimensions are retained in diagnostics; Nuvio's player shows the
decoded dimensions during playback. Physical Android playback was not tested.

Report: [Office quality checks](tests/live-office-quality-1.5.1-2026-10-16.json).

---

# Historical verification — 1.5.0, 2026-10-16

## Frembed review and integration

Reviewed `jeanmailpoubelle-rgb/Nuvio_frembed` at **ace5453** (1.0.3). Its original
repository remains unmodified. The port uses this project's request handling,
stream format, HLS audio/quality inspection, subtitle labels and diagnostics.
Original timer-based deadlines, browser fallbacks, presentation sentinels and
cross-invocation caches were not copied.

The shared registry now serves Vidzy lookup, HTML catalogue fallback, API backups
and the new **Frembed / Hosts** provider. It covers Vidzy, LuluStream, Uqload, VOE,
Dood's public pass_md5 flow, Vidmoly, StreamWish, MixDrop and Vidara. The last
adapter was verified separately against the current public player API.

Frembed's premium branch returned the **exact same Matrix media URL** as the
existing API family. It is integrated as a recovery route after working primary
and backup paths are exhausted, rather than a duplicate normal provider. Host
discovery is a separate scraper worker, preserving the existing fast providers.
The normal API path remains two requests; ordinary premium recovery takes a
grant, a source request and one HLS metadata read. Source URLs and grants are
never cached between invocations.

Premium playback keeps exact signed URL bytes and no invented site Referer or
Origin. Its browser User-Agent is retained: a live comparison accepted browser
and Media3 agents while an OkHttp agent received HTTP 403. The minimum header
also keeps sidecar subtitle requests consistent. No browser session is fabricated.

## The Storm / TMDB 1623256

The catalogue page advertises **ten buttons pointing to five unique players**;
each VF/VOSTFR pair repeats the same embed URL. Both TV and mobile catalogue-mode
checks resolved **five native streams from four working host families**:

| Host | Live results through both runtime fixtures |
| --- | --- |
| Vidzy | One 480p MULTI source |
| Uqload | One 1080p MULTI source |
| Dood | Interactive CAPTCHA page; zero sources; no challenge requests |
| VOE | One 1080p HLS source and one MP4 source with unknown resolution; VF is the upstream hint |
| Vidara | One 1080p MULTI source |

Each catalogue-mode lookup used **14 discovery requests**, with identical embeds
fetched once. All five media samples and advertised caption-file checks passed
through each runtime fixture. The returned master/audio tracks remain intact.
No new selectable-caption claim is inferred from MULTI or VOSTFR alone.

These are **catalogue-mode tests**, enabled with `preferCatalogue: true` in the
harness. Normal Vidzy discovery still returns its working source without scraping
the catalogue. Frembed's own source API currently returns HTTP 404 for The Storm,
and the API-family routes also return no source. The normal user flow therefore
does not suddenly display all five catalogue streams when Vidzy already works.
The port adds shared extraction coverage; it does not change that fast-path rule.

## Regression and live evidence

**115 Node regressions passed**, including source-header isolation, modern empty
lists, legacy numbered languages, exact episode coordinates, normal grant denial,
fresh signed URLs, automatic redirect reuse, base62 packing, host failure isolation,
bounded concurrency and catalogue Uqload support. The literal TV **1.0.0** and
mobile JS fixture suites passed, including VOE, Dood, Vidara and MixDrop, HTTP POST
payloads, subtitle serialization and zero pending native timer jobs.

The complete production-path live run covers **seven films/episodes × three
providers × two runtimes**: **42 provider calls**, **60 returned sources**, and
zero native timer jobs. Targets are Matrix, Reacher S4E1, Reacher S1E1, The Office
S1E1, Chihiro, Jujutsu Kaisen 0 and The Storm. **59 of 60 initial media probes
passed**; The Office's TV VOE HLS segment returned HTTP 403. Its focused recheck
passed with the same code and fresh source resolution. The initial failure remains
in the report. Caption availability/timestamp checks passed for returned sources.

Frembed's Jujutsu Kaisen 0 host records currently resolve to no playable sources
through either runtime, and its The Storm lookup returns HTTP 404. The Storm API
family also returns no stream after ordinary premium recovery is tried. These
availability failures are recorded; no wrong movie/episode or HTML player page
is substituted. Existing API/Vidzy results for Jujutsu Kaisen 0 remain available,
and their quality/audio labels are unchanged. Reacher S4E1 keeps both VF and
VOSTFR on the original two providers; the new Frembed host list currently resolves
only its VF VOE alternatives for that episode.

The separate helper run makes **eight live calls**: Matrix, Office S1E1 and
Reacher S1E1 premium recovery, plus The Storm catalogue mode, through both JS
runtimes. All **16 returned media samples** and advertised caption checks passed.
Premium recovery is called directly in a **temporary verification bundle** built
from the same shared source files, whose hashes are recorded. This avoids faking
failures of healthy API routes to reach the helper. Normal recovery ordering is
covered separately in the installed provider's regression tests.

The combined evidence is **50 calls / 76 returned sources**, before the focused
recheck. Genuine subtitle labels, including **Français**, remain unchanged.
Integrated subtitle data is not rewritten. Python HTTP/QuickJS is a development
stand-in: physical Android networking, decoding, subtitle selection and continuous
playback remain unverified. DASH URLs are accepted from explicit metadata, with
an explicit unimplemented result in the live DASH media probe.

Reports: [production-path checks](tests/live-1.5.0-2026-10-16.json),
[shared recovery/catalogue checks](tests/live-shared-resolvers-1.5.0-2026-10-16.json),
[focused Office recheck](tests/live-1.5.0-recheck-2026-10-16.json).
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for port attribution.

---

# Historical verification — 1.4.4, 2026-10-16

## Jujutsu Kaisen 0 / TMDB 810693

Vidzy's direct TMDB route supplies a working **864×360** stream. The normal
provider therefore did not enter catalogue fallback. Both inspected movix.zip
catalogue buttons currently point to the identical LuluStream/Livavid embed,
also serving **864×360**. The other API source serves **1920×800**, despite its
upstream 720p label. FFprobe on bounded video-segment samples independently
confirmed 864×360 for Vidzy and 1920×800 for the API source.

Version 1.4.4 derives quality tiers from the HLS metadata already being read,
without additional requests. Width-based tiers preserve common cropped-cinema
labels: 864×360 → **480p**, 1920×800 → **1080p**. Masters remain intact, including
adaptive variants and audio tracks; iframe-only variants are excluded from video
quality selection. HLS metadata failures or missing resolutions retain upstream
hints. This measures available dimensions, not subjective encoding quality.

| Lookup | Result on both JS runtimes | Discovery requests |
| --- | --- | --- |
| Normal Vidzy lookup | 1 VF, 480p | 4 |
| API lookup | 1 MULTI, 1080p; French/Japanese audio | 2 |
| Forced catalogue lookup | 1 LuluStream VF, 480p; duplicate buttons fetched once | 5 |

The healthy fast path is unchanged. LuluStream support is now available during
actual catalogue fallback, `preferCatalogue` lookups and API backups. Its player
origins are configured centrally. The existing bounded literal-string unpacker
reads public media data without executing the player's scripts. JWPlayer's
caption-upload menu placeholder is excluded from captions. Both forced-catalogue
runtime checks returned a working playlist and media sample, with no native timers.

## Subtitle diagnosis

The original upstream French WebVTT contains **1,640 cues**, of which **264 are
exact duplicate timed payloads**. Cues 173 and 174 both cover
**12:28.289–12:30.458** with identical text, reproducing the user's stacked line.
The copies already exist in the original file: this is an upstream subtitle
content defect. The plugin passes the original master to Nuvio and does not
rewrite those cues. Subtitle playback and genuine subtitle labels were left
unchanged, as requested. Selecting an independent external subtitle track is
an available workaround; no claim is made that a specific external release is
perfectly synchronized.

The audit records counts, a file hash and timestamps, with no subtitle dialogue
or full caption file committed. Availability/timestamp probes alone do not
certify subtitle content quality. Physical Android rendering remains unverified.

## Regression coverage

**93 Node regressions** passed, together with the TV 1.0.0/mobile QuickJS fixtures.
The complete live run covers **11 films/episodes, 44 provider calls and 52 returned
sources**. Both runtimes returned matching source counts and languages for every
case. All provider calls created zero native timer jobs. The two
additional forced-catalogue checks also passed.

**51 of 52 initial media probes passed**. One Game of Thrones mobile media probe
received HTTP 503; its focused recheck passed. The original failure is preserved.
The Office's mobile Vidzy metadata read also received HTTP 503, so that call kept
the upstream 1080p hint; the TV read detected 864×488 and labelled it 480p. Its
media probe and subtitle files still passed. Missing metadata is logged and does
not prevent listing a source that may play successfully.
Its focused recheck detected 480p again and retained both working subtitle files.
The Dark Knight's API master still returns HTTP 404 and has no backup, resulting
in zero API streams on both runtimes; these are recorded as availability failures.
No production retry loop or title blacklist was introduced. Chihiro's MULTI audio,
The Office's subtitle files and Reacher's separate VF/VOSTFR results remain intact.
These checks exercise the actual JS runtime fixtures with Python HTTP. They do
not certify physical Android networking, decoding or subtitle rendering.

Reports: [complete live run](tests/live-1.4.4-2026-10-16.json),
[focused 503 rechecks](tests/live-1.4.4-recheck-2026-10-16.json),
[LuluStream catalogue checks](tests/live-jujutsu-lulu-1.4.4-2026-10-16.json),
[upstream subtitle audit](tests/jujutsu-source-audit-2026-10-16.json).

---

# Historical verification — 1.4.3, 2026-10-16

## Spirited Away / Le Voyage de Chihiro / TMDB 129

The VF mislabel was reproduced on 1.4.2. Vidzy's player names the file with an
opaque ID, so there is no MULTI token for the filename parser to find. The old
rule was generic, with no title IDs or hardcoded title exceptions, but it was
insufficient. Its HLS master declares **French and Japanese audio**. The API
source also declares **Japanese and French audio**.

Version 1.4.3 applies a shared HLS metadata inspector to every result path,
including Vidzy, catalogue recovery and backup players. Explicit subtitle files
no longer bypass audio inspection. Actual declared languages override filename
and category hints; language aliases, duplicate codec groups and unused groups
cannot inflate the language count. Missing/unknown metadata retains the upstream
hint and is visible in diagnostics. There are no title-specific production rules.

Both Chihiro results now display **MULTI** through the TV 1.0.0 and mobile JS
fixtures. Both media samples passed. Neither master advertises subtitle tracks,
Vidzy's player HTML supplies no caption files, and the API response supplies no
caption metadata. The lack of selectable captions is upstream for these two
sources. French/Japanese audio does not establish subtitle availability.

## Broader regressions and speed

The live run covers **ten films/episodes × two providers × two runtime fixtures**:
40 provider calls, 48 returned sources and zero native timer jobs. TV and mobile
returned matching source/language counts for every case. **82 Node regressions**
and offline QuickJS checks passed. The regression fixtures use an unrelated TMDB
ID for the opaque-filename case, and cover existing captions, three returned HLS
sources, misleading MULTI hints, header-sensitive inspection reuse, catalogue
fallback and backup players.

| Case | Vidzy | API / backup |
| --- | --- | --- |
| Matrix | MULTI, French/English | MULTI; subtitle files validate |
| Fight Club | MULTI, French/English | MULTI; subtitle files validate |
| Spider-Man: Brand New Day | MULTI + VOSTFR; available caption files validate | MULTI; subtitle files validate |
| Game of Thrones S1E1 | VF + VOSTFR | MULTI; subtitle files validate |
| Reacher S4E1 | VF + VOSTFR | VF + VOSTFR via backup |
| Breaking Bad S1E1 | VF + VOSTFR | MULTI; subtitle files validate |
| The Office S1E1 | MULTI; English/French caption files validate | MULTI; English/French caption files validate |
| The Dark Knight | MULTI, French/English; no advertised captions | Missing master, no backup; zero streams |
| Spirited Away | MULTI, French/Japanese; no advertised captions | MULTI, Japanese/French; no advertised captions |
| The Simpsons S1E1 | VF; no advertised captions | MULTI; English/full French/forced French files validate |

In the initial run, **46 of 48 media probes passed**. Fight Club's TV probe and
Breaking Bad's mobile VOSTFR probe received HTTP 503. Focused rechecks of those
cases passed; the initial failures are preserved. The Dark Knight's API master
still returns HTTP 404 and has no backup, recorded as an availability failure
for both runtimes. One Spider-Man VF master inspection also returned HTTP 503;
discovery retained the upstream MULTI hint, its playback probe passed, and the
mobile inspection confirmed the declared audio languages. These outages were
not hidden by production retries or by excluding failures from reports.

Normal API discovery remains **two requests**. Vidzy now uses **four** when both
routes select one embed, or **six** for two distinct embeds: one additional small
master read per distinct HLS source. Backup HLS sources use the same inspection.
Metadata is reused within each lookup, with no signed-URL cache across lookups.
Audio paths run concurrently on asynchronous hosts. Discovery never reads media
segments or subtitle bodies and creates no timers. These checks use Python HTTP;
observed durations are not Android device benchmarks.

Subtitle labels, including **Français**, were not changed. Original HLS masters
are retained, so Nuvio's embedded/external subtitle selection behavior is unchanged.
Physical TV playback remains unverified; the checks exercise the actual TV 1.0.0
and mobile JavaScript polyfill/call wrappers, not Android networking or decoding.

Reports: [complete run](tests/live-1.4.3-2026-10-16.json),
[focused 503 rechecks](tests/live-1.4.3-recheck-2026-10-16.json).

---

# Historical verification — 1.4.2, 2026-10-16

## The Dark Knight / TMDB 155

The user's 1.4.1 symptoms were reproduced. Vidzy's filename is underscore
separated (`The_Dark_Knight_2008_Multi_1080p_...`). JavaScript word boundaries
consider underscores part of a word, so the old parser missed both tokens and
displayed VF/HD. Version 1.4.2 normalizes those separators for metadata parsing.
No extra lookup is needed. The original HLS master remains unchanged.

Vidzy's master advertises **French and English audio**, with no subtitle
renditions. Its inspected player HTML also advertises no subtitle files. A
working playlist and a media-segment sample were retrieved. This is different
from The Office, whose subtitle files were present but missed by our parser.
The plugin cannot expose captions the host does not advertise.

Purstream's supplied master returns **HTTP 404** with its playback headers.
The direct Purstream API confirms TMDB 155 and returns the identical missing
URL. Cpasmal's VF/VOSTFR backup lists are empty. Version 1.4.1 caught the 404
as an optional metadata error and kept the broken video entry. Version 1.4.2
removes confirmed 404/410 masters, preserves other working primaries and tries
the existing backup path. With no backup, zero API streams is the correct
result. Upstream media availability has not been restored by this change.

The live availability report records the missing API source as a failure,
rather than presenting that absence as a successful media probe. Vidzy playback
probes and MULTI labels pass through both runtime fixtures. The Office caption
regression also passed live through both fixtures. **69 Node regressions** and
offline TV 1.0.0/mobile QuickJS checks passed, including fallback on a missing
master, empty-backup behavior and underscore metadata. Physical TV playback
remains unverified.

Report: [The Dark Knight 1.4.2](tests/live-dark-knight-1.4.2-2026-10-16.json).

---

# Historical verification — 1.4.1, 2026-10-16

## The Office S1E1 / TMDB 2316

Both source masters advertise **French and English audio**. Vidzy's catalogue
selects a VF bucket, but the file's title explicitly declares MULTI. Version
1.4.1 preserves that declaration instead of overriding it with the bucket.

Both hosts also provide **English and French WebVTT subtitle files**. They were
fetched successfully: English has 564 timestamped cues and French has 349.
Vidzy loads them through `player.loadTracks` with a same-origin rewrite function;
1.4.0 missed that form. Purstream references raw WebVTT files in its HLS master
instead of HLS subtitle playlists. The previous native-only assumption did not
work on the user's phone. Version 1.4.1 exposes these URLs as explicit Nuvio
subtitle results with their playback headers.

| Provider | TV and mobile results | Discovery requests | Observed discovery time |
| --- | --- | --- | --- |
| French Catalogue / Vidzy | 1 MULTI; English + French subtitle files | 3, unchanged | 3.74–4.10 seconds |
| Purstream API / Cpasmal | 1 MULTI; English + French subtitle files | 2, including master metadata | 2.10–2.42 seconds |

The API metadata read adds one request only when needed; it never downloads
subtitle bodies or video segments during discovery. It preserves the original
master and both audio tracks, and its failure cannot discard the video. The
test harness separately fetched subtitle files and media samples. These are
development-environment timings, not device timings.

**64 Node regressions passed**, along with TV 1.0.0 and mobile QuickJS fixtures,
including the wrapped Vidzy subtitles and explicit HLS caption files. Live
Matrix and Reacher checks also passed through both runtime fixtures. Reacher
keeps its separate VF/VOSTFR sources and burned-in French subtitles. Matrix's
Vidzy file also declares MULTI and is now labelled accordingly.

Report: [The Office 1.4.1](tests/live-office-1.4.1-2026-10-16.json).
Office verification targets the TMDB provider routes; its HTML-catalogue
inventory comparison is skipped. Vidzy's inspected player implements an Audio
menu and defaults to French; Nuvio reads the master independently of that UI.
Physical TV playback and subtitle selection still need a device test.

---

# Historical verification — 1.4.0, 2026-10-16

The six-title run exercised **24 provider calls**: two active providers, six
film/episode cases, and both runtime fixtures. Every call returned sources and
created **zero native timer jobs**. Bundle SHA-256 values in the report identify
the exact generated files tested.

Targets: the literal JavaScript polyfill/call wrappers from NuvioTV **tag 1.0.0**
and Nuvio Mobile commit `808272dcec4be02397282600b70a07111576e0c7`. Native HTTP in
this harness is Python urllib. **No physical TV was available**: Android
networking, hardware decoding, subtitle selection UI and continuous playback
still require a device check.

## Sources and languages

TV and mobile discovery returned the same counts/languages in every case.

| Title / TMDB | French Catalogue / Vidzy | Purstream API / Cpasmal | Discovery requests, catalogue / API |
| --- | --- | --- | --- |
| Matrix / 603 | 1 VF | 1 MULTI | 3 / 1 |
| Fight Club / 550 | 1 VF | 1 MULTI | 3 / 1 |
| Spider-Man: Brand New Day / 969681 | 2: VF + VOSTFR | 1, language unspecified by API | 4 / 1 |
| Game of Thrones S1E1 / 1399 | 2: VF + VOSTFR | 1 MULTI | 4 / 1 |
| Reacher S4E1 / 108978 | 2: VF + VOSTFR | 2: VF + VOSTFR via Cpasmal/Uqload | 4 / 4 |
| Breaking Bad S1E1 / 1396 | 2: VF + VOSTFR | 1 MULTI | 4 / 1 |

A missing VOSTFR route for Matrix/Fight Club selects the same VF embed. It is
fetched once and returned once, with its actual VF language. An unspecified
API language stays unspecified rather than being guessed from subtitle presence.

Reacher's primary Purstream endpoint returns HTTP 404 for S4E1. The consolidated
provider goes straight to Cpasmal instead of repeating the same failed lookup
through the direct Purstream API. Both Uqload language versions resolve. The
retired standalone Purstream ID does no work.

## Website counts are not native-player counts

Each cell below is **advertised buttons / supported native-player candidates**.
These inventory checks are separate from the faster Vidzy TMDB route.

| Catalogue page | Nakios Live | Purestream CC | Movix ZIP |
| --- | --- | --- | --- |
| Matrix | 2 / 0 | 2 / 0 | 2 / 0 |
| Fight Club | 2 / 0 | 2 / 0 | 2 / 0 |
| Spider-Man: Brand New Day | 2 / 2 | 1 / 1 | 2 / 2 |
| Game of Thrones S1E1 | 4 / 1 | 3 / 0 | 4 / 1 |
| Reacher S4E1 | 6 / 2 | 6 / 2 | 6 / 2 |
| Breaking Bad S1E1 | 4 / 1 | 4 / 1 | 4 / 1 |

Reacher's three pages have identical six-link inventories: three VF and three
VOSTFR buttons. Two are Vidzy; four are Kokoflix wrappers for other hosts that
this implementation does not resolve. The provider therefore does **not** match
all six buttons. It returns the two supported Vidzy versions. These limits are
also logged by catalogue fallback.

The catalogue replicas differ for Spider-Man and Game of Thrones, so they must
not be described as having identical content everywhere. Vidzy's TMDB index
also supplies working versions absent from a catalogue page. For example, the
Matrix page lists unsupported Dood/Lulu players, while Vidzy's separate index
provides a playable VF version. This is why the HTML pages are recovery paths,
not a mandatory preflight or a replacement for Vidzy's TMDB index.

## Media and subtitles

The complete run made **34 media probes**, following HLS playlists and reading
a 1,024-byte media-segment sample. One Breaking Bad VF child-playlist request
returned HTTP 503; its mobile check passed. The targeted TV recheck is recorded
separately. An earlier run also saw a Fight Club HTTP 503, followed by successful
checks. Upstream availability is intermittent; no artificial delay or blind
retry loop was added to provider discovery.

Purstream's advertised French/English caption files were fetched and checked
for timestamped cues. Version 1.4.0 left them referenced by the original HLS
master and relied on native handling. **The Office report above corrects this
assumption for raw caption-file URLs**; 1.4.1 exposes those files explicitly.
Explicit API/HTML/JWPlayer tracks are preserved when supplied,
including their playback headers; fixtures cover this path and merging captions
when media URLs are duplicates.

Decoded **VOSTFR dialogue frames** were inspected separately:

| Stream | French burned-in subtitles observed |
| --- | --- |
| Reacher S4E1, Vidzy | Approximately 360, 600 and 1,200 seconds |
| Reacher S4E1, Cpasmal/Uqload | Approximately 600 seconds |
| Game of Thrones S1E1, Vidzy | Approximately 600 seconds |
| Breaking Bad S1E1, Vidzy | Approximately 900 and 1,200 seconds |
| Spider-Man: Brand New Day, Vidzy | Approximately 900 and 1,200 seconds |

These sources advertise no separate caption track. The subtitles are already
in the video and require no subtitle-selection action in Nuvio. This checks
sampled dialogue, not every line or whole-program synchronization. Media samples
and decoded frames are not committed to the repository. Upstream filenames can
claim a higher resolution than the HLS rendition actually served; labels are
upstream metadata, not a measured-resolution guarantee.

## Speed and recovery

For the complete recorded run, healthy one-request API lookups took about
**0.29–1.31 seconds**, Reacher's API/backup path **2.69–3.45 seconds**, and Vidzy
lookups **2.59–4.73 seconds**. These are development-environment observations,
not Android device benchmarks. Python supplies synchronous native HTTP even
when the mobile JS fixture is selected; actual mobile networking can overlap.
Media and subtitle validation is excluded from discovery time and is performed
only by the test tools.

- No separate Purstream provider repeats the API family's work.
- No configuration, directory or availability request precedes healthy lookups.
- Domain-directory parsing was checked against the live reference HTML:
  `nakios.org` resolved to `nakios.live`; `purstream.org` to `purestream.cc`.
- Regressions exercise changed directory addresses, parked candidates, directory
  outages and recovery through a known mirror.
- The one-request fast path, strict TMDB identity checks, VF/VOSTFR preservation,
  no native timers, subtitle headers and inert legacy migration are covered by
  **59 passing Node regressions** and both offline QuickJS runtime fixtures.

Reports: [complete run](tests/live-1.4.0-2026-10-16.json),
[targeted TV recheck](tests/live-1.4.0-recheck-2026-10-16.json).
Repeat with `scripts/verify_live.py`; use `--case 1396 --runtime tv` to isolate
Breaking Bad. Historical reports remain in `tests/live-reacher-2026-10-16.json`
and `tests/live-verification-2026-10-15.json`.
