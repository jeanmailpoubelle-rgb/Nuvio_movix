# Verification — Sources FR 1.8.9 / Anime-Sama 1.1.5, 2026-10-24

**294 Node regressions, 34 maintenance tests and both complete literal TV 1.0.0
and Mobile suites pass.** The two new movie/episode regressions and the native
migration fixture fail against the old bundles. Generated artifacts are current
and differ only in version and Frembed's configured base; no resolver/mapping
algorithm, budget, quality policy or healthy-path preflight changes.

Frembed's retired `.bar` origin redirects to `.uno`. Inventory requests through
the old origin retain an invalid Referer and return 403; the isolated ordinary
premium baseline returns 405. Direct current-origin API calls return matching
movie/episode inventories. Temporary new-origin bundles restore Dark Knight's
two VOE alternatives and Office's MP4 on both wrappers; one TV HLS media probe
fails, while its MP4 and the mobile alternatives pass. Matrix's host inventory
is readable but its candidates remain unavailable/filtered. Ordinary premium
Matrix, Hunger Games and Office checks each return a 720p MULTI source in three
requests; all six media and advertised-caption probes pass.

The full baseline completed **232 jobs: 33 pass, 149 attention, 34 blocked and
16 not-tested**. Returned fallbacks with failed candidates remain attention;
these are not 149 proven code defects. The user chose to proceed without a
TMDB key. Known-title helpers exercise downstream protocols without establishing
the normal app-key/metadata HTTP step. Healthy sampled fast APIs retain two
requests. Dedicated Anime-Sama mapping, all-host/no-minimum policy and host
captions are unchanged; its version follows the shared configuration rebuild.

The baseline's late phase and all 42 final compiled-release recheck attempts
encounter a cloud-wide tunnel outage: independent GitHub, metadata, Movix and
Frembed requests return identical 503 transport errors. Final live results remain
environment-blocked, not proof of empty inventories or broken correspondence.
Successful final-artifact live checks, key-dependent paths, gated/untested hosts
and physical Android playback remain gaps. No proxy or TLS bypass was used.

See [sanitized evidence](tests/live-maintenance-2026-10-24.json) and
[failure/repair notes](docs/investigations/maintenance-2026-10-24.md).
Earlier live candidate checks and native fixtures support the domain fix;
they do not certify uninterrupted playback, every track or caption content.

---

# Historical verification — Sources FR 1.8.8 / Anime-Sama 1.1.4, 2026-10-18

**292 Node regressions, both full literal TV 1.0.0/mobile suites and 34
maintenance tests passed.** Generated bundles are current. A new alias regression
fails against 1.8.7; a full-verifier regression fails against the old dedicated
anime verification script. The release fixes the demonstrated eligibility gap
for first-party `luluvid.com` player buttons and prevents incomplete anime host
coverage from receiving a false verification pass.

The full deep baseline completed **220 jobs: 34 pass, 138 attention, 32 blocked
and 16 not-tested**. Attention includes usable fallbacks with failed candidates;
these are not all code defects. The user chose to proceed without the runtime
TMDB key. Supplemental known-title helpers exercise downstream protocols but
do not replace normal key-dependent metadata/matching coverage.

Fresh rebuilt-release catalogue checks recover Matrix **1080p VF** and Chihiro
**720p VF** in five requests on both native wrappers; all four bounded media
samples pass. They use the compiled default endpoints and directly supplied
known-title metadata. Healthy production Matrix and Office remain two requests,
with passing media and advertised caption probes on both wrappers. Directory,
configured API mirror and ordinary premium checks pass for Matrix. No lookup
preflight, resolver algorithm, matching policy or production budget changed.

The baseline's late phase met a cloud tunnel outage across unrelated origins.
Independent controls recovered and affected episode paths were rechecked.
Custom's verified S2E1 mapping plays in six requests; pending backup data,
filtered Vidzy copies, gated SwiftFlow media and Frembed transport errors remain
explicit findings. Dedicated anime boundary rechecks retain complete host
selection alongside an upstream TV Smoothpre segment failure. Dood/MixDrop have
no playable result from selected gated/unavailable files; Dropload/StreamWish
lack a fresh advertised candidate. Some primary/premium cached media is still
unavailable upstream. Do not treat these gaps as proof of a new domain change.
Further rebuilt Anime-Sama Jujutsu/Your Name checks retain budget stops, gates
and media/master request failures; complete host coverage varies between calls.

Evidence and repair locations: [sanitized full audit and focused checks](tests/live-full-maintenance-2026-10-18.json),
[investigation/failure notes](docs/investigations/full-maintenance-2026-10-18.md),
and [maintenance runbook](docs/maintenance.md). The release retains Sources FR's
720p minimum/unknown-quality policy and Anime-Sama's separate all-host/no-minimum
policy. No physical Android playback or subtitle content/synchronization
certification is implied by native wrapper and bounded HTTP checks.

---

# Historical verification — Sources FR 1.8.7 / Anime-Sama 1.1.3, 2026-10-18

**291 Node regressions, both literal TV 1.0.0/mobile fixture suites and 31
maintenance tests passed.** The 26 new shared-engine cases pass on the release;
15 fail against the actual 1.8.6 generated bundles. Cases use an unrelated anime
with S2E1 → E14, not a Jujutsu override. They cover every backend hook, reverse
mapping, original backup priority, shared metadata/budgets, strict identities,
ambiguity, unchanged coordinates, disabled/native policies, pending/rate limits,
fresh grants, deleted embeds and unaffected movies. Existing Custom and dedicated
Anime-Sama regressions remain included.

The live release checks include 54 normal lookups across all five series workers,
14 isolated recovery jobs (two blocked by absent metadata credentials), and eight
additional Custom boundary lookups, using both native wrappers. Twelve separate
1.8.6 comparisons have identical source counts and request counts to the release.
All live reports retain upstream errors, empty/filtered results and blocked paths;
these are not all passing health audits.

The normal fast API remains two requests for Matrix, The Office, Hunger Games,
Attack on Titan S2E1 and Demon Slayer S2E1. Working Jujutsu S2E1 backups remain
19 requests, without a new primary mapping preflight. Custom's original E26/E48
lookups remain three requests and mapped S2E2/S3E1 use six; all eight boundary
media samples pass, as do the two isolated S2E1 mapping samples. Fresh metadata
also confirms equivalent seasonal coordinates for Attack on Titan and Demon
Slayer, rather than applying an anime-wide offset.

Verified missing-episode recovery now uses each backend's configured layout and
can translate either direction. Automatic input detection refuses overlapping
coordinates identifying different episodes. Existing working backups precede
new late retries. Six backend policies remain `native` because these checks did
not establish an alternate layout; their hooks have synthetic coverage, not live
alternate-layout validation. Movies and dedicated Anime-Sama behaviour remain
unchanged. The generated Anime-Sama bundle contains the unused root configuration
change, without including this recovery engine or changing its 1.1.3 version.

Mapping does not make unavailable upstream files work. The primary still advertises
dead cached media; the mapped Frembed record has no host links; SwiftFlow exposes
gated media; the mapped Vidzy stream is below 720p. Pending backup data is never
converted and does not exercise recovery. Direct search/recovery, Omega IMDb
correspondence and HTML title fallback need the app's TMDB key; that key was not
available in this cloud environment. Native runtime regressions cover those
protocols without claiming live coverage.

Across the recorded current lookups, 59 of 60 returned-media samples pass. The
remaining normal Jujutsu TV VOE HLS segment returns 403, as in prior checks;
its MP4 and both mobile samples pass. Normal host errors and empty results also
reproduce on 1.8.6. Caption checks preserve reported availability; no advertised
track is not proof of translated captions. No playback headers, signed bytes,
HLS rendition groups or caption processing changed.

Evidence: [sanitized release checks and baseline comparisons](tests/live-shared-episode-recovery-1.8.7-2026-10-18.json);
[configuration, target policies and failure map](docs/episode-mapping.md).
Raw bodies, signed paths and logs stay ignored locally. These runtime and bounded
HTTP checks do not certify physical Android networking/decoding, continuous
playback, every audio track, or subtitle content/synchronization. Metadata matching
still fails closed on incomplete/ambiguous evidence and the existing 1 MiB limit.

---

# Historical verification — Sources FR 1.8.6 / Anime-Sama 1.1.3, 2026-10-18

**265 Node regressions, both literal TV 1.0.0/mobile fixture suites and 29
maintenance tests passed.** The new positive regression fails against 1.8.5.
It uses an unrelated anime's unique episode title/release time to recover S2E1
at E14, without a series override, fixed season length or global context rewrite.
Negative cases cover series IDs, missing/duplicate/generic episodes, title/date
disagreement, pending/auth/rate-limit/transport failures, specials/movies, disabled
recovery, cache invalidation, shared request budgets and unaffected backups.

The user's playing **Movix / Custom / SeekStreaming | 1080p** entry clarified
that the previous unavailable Pulse uploads belong to a different API provider.
Before this correction, Custom S1E25 returned one working 1080p stream while
the Cinemeta S2E1 lookup returned zero after one request on both wrappers.

The final live Custom matrix tested direct E25/E26/E48 and seasonal S2E1/S2E2/S3E1,
plus Matrix and Hunger Games on each runtime. All 16 lookups returned one 1080p
SeekStreaming result, and all 16 bounded media samples passed. All three verified
seasonal mappings agree with the target catalogue's episode title and release.
Direct Jujutsu lookups remain three requests. Recovery uses six on a fresh
context, about 1.3–3.2 seconds in these cloud samples. Matrix used four and Hunger
Games three, without episode metadata requests. Fresh signed URLs vary between
lookups; exact URL equality is not used as episode identity evidence.

The normal Extra worker also returned the expected 1080p source on both wrappers.
Its audit retains the original Custom 404 and missing Omega metadata credentials
as attention findings. The new isolated Custom helper and owned references make
this recovery independently testable, asserting the expected source coordinates.
Source/catalogue bodies remain subject to the native/common 1 MiB bound; large
or incomplete metadata and ambiguous episode identity fail closed.

Only Custom recovers a confirmed missing regular episode. The configured incoming
catalogue is Cinemeta; other metadata layouts must be configured explicitly rather
than inferred from a series ID. All other adapters retain the original coordinates.
Healthy Custom requests and movies add no mapping requests. Only correspondence
is cached, never streams, players, grants or captions. The existing resolution,
audio, subtitle, sorting and shared resolver policies remain intact. Dedicated
Anime-Sama stays 1.1.3; its generated endpoint constant includes the unused new
root setting, without changing its extraction or episode mapping.

Evidence: [sanitized before/after checks](tests/live-custom-episode-recovery-1.8.6-2026-10-18.json);
[protocol, configuration and failure map](docs/custom-episode-recovery.md).
Python HTTP samples and literal runtime compatibility do not establish physical
Android networking/decoding, continuous playback, all audio tracks or subtitle
content/synchronization. No separate captions were advertised by the checked
SeekStreaming sources; this change preserves their original metadata.

---

# Historical verification — Sources FR 1.8.5 / Anime-Sama 1.1.3, 2026-10-18

Read-only ID-conversion recheck: [fresh evidence](tests/live-jjk-id-conversion-2026-10-18.json)
verifies Cinemeta's explicit IMDb/TMDB pair and reproduces the primary failure
with numeric TMDB input on both wrappers. S2E1 is missing; cached S1E25 links
use an NXDOMAIN host. Normal seasonal backups return two VOSTFR alternatives;
both mobile samples and TV's MP4 pass, while TV's HLS segment returns 403.
The app's live ID conversion and physical playback were not executed. No
production change or additional discovery work was introduced.

Read-only Frembed follow-up: [Jujutsu S1E1 diagnosis](docs/investigations/frembed-jjk-first-episode.md)
and [sanitized checks](tests/live-frembed-jjk-first-2026-10-18.json) reproduce an
empty host inventory on both wrappers. Its separate premium path and the normal
fast API return the exact same 1080p MULTI media; media samples and both French
caption tracks pass. The normal fast API remains two requests. No production
change or plugin release is needed for that observation.

Read-only follow-up: [Cinemeta anime diagnosis](docs/investigations/cinemeta-anime.md)
and [sanitized evidence](tests/live-cinemeta-coordinate-diagnosis-2026-10-18.json)
separate missing episode images, backend coordinate disagreements and dead media.
They do not change production versions or claim a replacement primary upload.

**238 Node regressions, both literal TV 1.0.0/mobile fixture suites and 27
maintenance tests passed.** New regressions reproduce a continuous primary
catalogue versus seasonal app requests, retain the primary's explicit IMDb
correspondence, and verify continuous/seasonal source positions at both Jujutsu
boundaries. An unrelated fixture with 13/8-episode seasons proves that no
Jujutsu identity, fixed episode count or season offset is required. Missing
seasons/episodes, contradictory identities, unavailable alternate metadata,
healthy primary request counts and public TMDB recovery are covered.

Before this correction, numeric TMDB 95479 S2E1 returned zero streams after
four requests on both wrappers. Nuvio Catalog exposed 59 episodes under S1;
Cinemeta exposed separate seasons. The code discarded the explicit IMDb
correspondence when it rejected the missing primary season, so numeric requests
could not reach the existing Cinemeta path. The earlier continuous mapping was
generic; this was a missing metadata recovery case rather than a title override.

The corrected dedicated plugin supports both layouts. Continuous S1E25 and
seasonal S2E1 select source `saison2`, index 0; S1E48 and S3E1 select `saison3`,
index 0. Valid primary metadata remains one request. Only a missing season
requires the alternate catalogue read; there are no new player/media preflights
or persistent signed-stream caches. All-host coverage, no anime quality minimum,
host captions, final ordering and playback data remain intact. Sources FR stays
at 1.8.5 with byte-identical generated providers.

The final live matrix ran six cases on each wrapper: continuous E25/E48,
seasonal S2E1/S2E23/S3E1, and Cowboy Bebop S1E1. All ten Jujutsu lookups returned
ten links; Bebop returned three. Both continuous/seasonal pairs had identical
source references and host/edition/format choices on both runtimes. All source
positions and presentation checks passed. S2E1 used 36 discovery requests and
about 24–27 seconds in this cloud sample; continuous E25 used 36–37. Later-season
samples took longer because of upstream host reads; these are not device timings.

98 of 106 final media samples passed. Eight failures remained: seven HTTP 403
responses across Smoothpre and an alternate host, and one Smoothpre timeout.
No separate subtitle files were advertised; caption probes also recorded denied
master reads. These failures remain in the report. The final focused S2E1 TV
maintenance audit separately passed all ten media samples and the expected
source-position check (35 requests). The earlier audit's upstream failures and
diagnostic false positive are preserved alongside that recheck.

The maintenance inventory now includes both layouts and the second boundary.
Its expected source group/index checks every mapped edition; missing evidence or
a wrong episode emits `episode-mapping-differs`, even if that episode plays.
The audit also stops treating `.json` in ordinary HTTP request paths as a JSON
parser failure. Real parse errors and failed HTTP requests remain classified.

Live media availability is independent of the mapping. The dated report retains
upstream failures alongside successful samples; a readable player/master is not
proof that every later segment will remain available. Native fixtures and Python
HTTP probes do not certify physical Android networking, continuous playback or
all audio/subtitle tracks.

Evidence: [season-layout release checks](tests/live-anime-season-layouts-1.1.3-2026-10-17.json);
[cause, recovery and failure map](docs/investigations/anime-season-layouts.md).

---

## Historical Sources FR 1.8.5 / Anime-Sama 1.1.2 verification

**229 Node regressions, both literal TV 1.0.0/mobile fixture suites and 24
maintenance tests passed.** New cases exercise thrown native/network errors,
status zero, timeouts/rate limits/server errors, two stale primaries, a healthy
sibling, backup selection and readable playlists with unknown optional metadata.
The stale-primary regression failed against 1.8.4 before the correction.

Jujutsu Kaisen **TMDB 95479, S1E20** returned two cached Pulse HLS URLs through
the wrapper. Their shared `zebi.xalaflix.design` hostname returned NXDOMAIN from
both Google DNS and Cloudflare DNS. The transport could not read either playlist.
The wrapper's ID 3816 was identity-checked against the direct sheet; its direct
episode route returned 404 on both `.id` and the advertised `.sh` API. No verified
replacement stream came from that backend. The plugin had retained failed HLS
requests as inconclusive metadata and therefore blocked existing recovery.

The final provider excludes those sources and an unavailable Netu backup (503),
then returns two **VOE VF** alternatives, direct MP4 and HLS. Fresh lookups and
media/caption probes passed on both wrappers. The original MULTI upload is not
restored by this change. Its discovery now uses **12 requests** versus three
requests that previously returned only the unusable originals. Healthy Matrix,
Fight Club and Office checks on both wrappers retained their **two-request** path.
No DNS/media probes, alias rewrites, timers or permanent blacklist enter production.

One initial mobile VOE HLS segment sample returned 403. Repeated range/plain
reads of the same signed stream later returned 206/200, and both fresh runtime
rechecks passed. The initial failure remains in the report; its intermittent
cause is unproven. Dark Knight's API and premium recovery exposed an HLS source
returning 404 with no Cpasmal alternatives. Those two empty-case failures are
also retained. The focused maintenance audit reports `attention` for observed
upstream failures, even though its returned Jujutsu backups passed media probes.

Quality-first ordering, host captions, signed URLs/headers, full HLS groups and
both plugins' resolution policies remain intact. Readable playlists without
optional track/quality declarations still qualify. The explicit `inspectHls:
false` opt-out still skips inspection. Tests validate discovery/HTTP samples;
continuous playback, all audio tracks and physical Android networking/decoding
remain unverified.

Evidence: [live checks, failures and fresh rechecks](tests/live-hls-recovery-1.8.5-2026-10-17.json);
[cause and maintenance procedure](docs/investigations/jjk20-buffering.md).
Reports contain measured bundle hashes and sanitized metadata, without signed
media URLs, credentials or caption dialogue.

---

# Historical verification — Anime-Sama 1.1.1 / Sources FR 1.8.4, 2026-10-17

**214 Node regressions, both literal TV 1.0.0/mobile fixture suites and 24
maintenance tests passed.** New cases reproduce a rotating VOE alias with a
`Watch filename - VOE | ...` title, retain both editions and HLS/MP4 formats,
reject an incidental VOE filename mention, and verify final presentation order.
The alias regression failed against 1.1.0 before the detector correction.

Bleach S1E1's website publishes six host/edition candidates: ANSEmbed, Uqload
and a rotating VOE alias in VF and VOSTFR. Before the fix, the alias pages were
fetched but classified as generic players, yielding **four links and no VOE**
on both wrappers. The final bundle returns **eight links**, including VOE's HLS
and direct MP4 in each edition. All four VOE media samples passed on both
runtimes. All six candidates were attempted; source mapping and earlier host
choices were preserved. No alias domain or movie/episode-specific rule was added.

Results now sort by **resolution descending first**, then **MULTI → VF → VOSTFR
→ other** at equal resolution. Unknown resolution goes last; ties remain stable.
Multiple-result titles have padded ranks, keeping this order through Mobile's
alphabetical label sorting. Fixtures cover measured metadata overriding earlier
hints, mixed/unknown qualities, audio groups, more than 99 results, unchanged
playback data and the native host caption. Sorting adds no network requests or
source filtering. Provider sections remain controlled by Nuvio.

Six final live checks covered Bleach S1E1, Your Name and Suzume on both wrappers.
All passed the presentation checks. Both films passed their media checks.
Bleach's ANSEmbed VOSTFR first-segment sample returned **HTTP 403** on both cloud
runtimes; those two whole-case failures remain in the report. They do not mean
the restored VOE samples failed. No separate captions were advertised, so these
checks do not certify burned-in dialogue or all audio tracks. Physical Android
networking and decoding remain untested.

Bleach discovery uses **28 requests**, versus 22 before: the six additional
reads validate the recovered VOE HLS/variant and MP4 headers, with no extra
domain-discovery call. Four shared-provider live checks (Matrix and Office on
both wrappers) also passed, preserving the ordinary two-request API path.

Evidence: [VOE recovery, final order and shared-provider checks](tests/live-stream-order-1.1.1-2026-10-17.json).
The report records measured bundle hashes and sanitized metadata, without signed
media URLs, credentials or caption dialogue.

---

# Historical verification — Anime-Sama 1.1.0 / Sources FR 1.8.3, 2026-10-17

**209 Node regressions, both literal TV 1.0.0/mobile fixture suites and 24
maintenance tests passed.** Anime-Sama is independently installed through its
own manifest, absent from the Sources FR provider list. Fixtures verify host
captions, both editions, more than 24 requests, retained 360p sources, all-host
selection, sparse/combined/saga episode mapping, headers/signed bytes, HLS groups,
player redirects and binary-safe Sendvid validation. TV fixtures safely omit
Sendvid where its text-only bridge cannot validate the MP4 placeholder.

Live comparison used the original 1.0.6 source at `f8605f1`, with its mobile-style
success grace, and the generated 1.1.0 bundle. Counts are observations, not fixed
inventories or guarantees that every advertised source works:

| Sample | Original Node links | Port links in successful native-wrapper lookups |
| --- | --- | --- |
| Jujutsu Kaisen S1E1 | 3 | 10 |
| Jujutsu combined catalogue S1E25 | 2 | 10 |
| One Piece S23E1180 | 3 | 4 |
| Cowboy Bebop S1E1 | 2 | 3 |
| Your Name | 3 | 4 |
| Suzume | 2 | 2 |

All six mobile-wrapper checks passed their media and advertised-caption probes.
Successful mappings matched the original selected source paths/episode indices,
and preserved all its observed host/edition/format choices. In the first TV pass,
Jujutsu E25 hit Nuvio Catalog HTTP 503 and safely returned no guessed episode;
its focused recheck returned ten sources and passed. TV media probes also saw a
VOE segment 503 and Smoothpre segment 403. Smoothpre's Cowboy Bebop segment denial
recurred in the focused recheck. Fresh original-resolver/Node and Python samples
worked; this does not establish the cause of the intermittent failures. They are
retained in the reports as failures, not claimed as verified playback.

The live streams advertised no separate caption tracks. VOSTFR is the website's
edition hint; these checks do not prove burned-in dialogue, spoken language,
every audio rendition or full-video playback. The original browser User-Agent,
Referer/Origin, observed redirect targets and complete HLS groups are retained.
There are no title-specific resolver fixes or anime resolution filters.

Collecting alternatives used **12–36 requests** and **1.9–16.8 seconds** in the
development Node HTTP sample. The original's early stop used 12–25 requests and
3.4–6.9 seconds. This is a coverage/speed tradeoff, not a device benchmark.
The native-wrapper Python callbacks serialize HTTP even for mobile, so their
elapsed times must not be treated as real phone concurrency measurements.
The existing Sources FR numeric-ID provider passed Matrix and Office S1E1 on
both wrappers, preserving its ordinary **two-request** path and media checks.

Evidence: [native sample matrix](tests/live-anime-sama-1.1.0-2026-10-17.json),
[focused TV recheck](tests/live-anime-sama-recheck-1.1.0-2026-10-17.json),
[original comparison/shared checks](tests/live-anime-port-shared-1.8.3-2026-10-17.json).
Reports omit signed media URLs, credentials and caption dialogue. Physical
Android networking, decoding and remote-control interaction remain untested.

---

# Historical verification — 1.8.2, 2026-10-17

**185 Node regressions and all TV 1.0.0/mobile QuickJS fixtures passed.** The
shared host resolver no longer lets copied MULTI/DUAL-AUDIO upload titles
override catalogue language hints. Actual HLS audio declarations still establish
MULTI; complete masters, signed URLs and playback headers remain preserved. No
movie-specific rules, additional discovery requests or production video probes
were added. Explicit structured API language metadata remains an upstream hint
when HLS audio metadata is inconclusive, not a measured track inventory.

The Dark Knight's reported Wiflix/Lulu stream was inspected independently with
ffprobe: **1728×720 video, one AAC audio stream**, and no alternate audio group
in its supplied master. Its original upload name retains `Multi (VFF+VFQ)`;
that describes French dub variants in the upload name, not the audio inventory
of the served transcode. The final resolver returns VF from the catalogue hint;
the probe did not identify the spoken language. No second track was removed by
the plugin or available to restore from this master.

The current Dood embed requires browser verification in this workspace, so a
fresh MP4 track inventory could not be obtained. Its copied upload title has the
same MULTI marker. The shared correction is verified with direct Dood MP4
fixtures on both native runtimes, preserving the playback URL and three-request
lookup without downloading the MP4. This does not independently prove Dood's
current audio-track count.

Six final live checks passed: both runtimes returned VF for the isolated
Wiflix/Lulu path (three requests), MULTI for The Office S1E1 with French/English
HLS audio (two requests), and MULTI for Chihiro with Japanese/French HLS audio
(two requests). All returned media samples and advertised subtitle checks
passed. The Lulu audit used the generated catalogue bundle with a temporary
entry point selecting only Wiflix Lulu, rather than a full catalogue lookup;
the other four checks used the unchanged generated API provider entry point.
The report records generated-bundle hashes and omits signed media URLs,
credentials and caption dialogue.

Report: [upload audio label checks](tests/live-upload-audio-1.8.2-2026-10-16.json).
These checks use the app's actual JavaScript wrappers with Python HTTP, not a
physical Android device. Hardware decoding and device networking remain
unverified. The live audit began on October 16 UTC; release verification finished
on October 17.

---

# Historical verification — 1.8.1, 2026-10-16

**180 Node regressions and all TV 1.0.0/mobile QuickJS fixtures passed.** Yablom
now uses the requested VF catalogue default. Explicit VOSTFR, MULTI release
metadata and actual HLS audio retain priority. The default is configurable and
does not constitute a measured audio-track inventory. Other providers receive
no new default language.

The reported Hunger Games (2012), TMDB 70160, was checked through the generated
bundle on both runtimes: one `Yablom / ShareCloudy | VF` result, **five requests**,
no resolution field, and passing media samples. Its media playlist declares no
dimensions or audio groups; no HD tier is guessed. The change adds no network
requests or media probing to production discovery.

Report: [Hunger Games default-language check](tests/live-yablom-1.8.1-2026-10-16.json).
The report omits signed media URLs and credentials. Physical Android networking
and decoding remain unverified; these are app-wrapper/HTTP/media-sample checks.

---

# Historical verification — 1.8.0, 2026-10-16

## Yablom, rotating domains and native playback discovery

**178 Node regressions passed**, together with all literal Android TV **1.0.0**
and Mobile QuickJS fixture checks. New cases cover five-request healthy lookup,
POST body/encoding, exact release selection, ambiguous/wrong-page rejection,
poster correspondence on both pages, recommendation exclusion, changed entry
paths, explicit migration notices, branded-address/FMHY recovery, loop rejection
and reuse of verified addresses without reusing media. TV/series requests make
zero HTTP requests. No native timer jobs, DOM, WebView or player-script execution
are used. ShareCloudy also passes through the existing independent Frembed worker.

The final generated bundle was tested live with both runtimes:

| Film | TV / mobile sources | Requests per lookup | Media sample |
| --- | --- | --- | --- |
| Dragons (2010) | 1 / 1 | 5 | Both passed |
| Matrix (1999) | 1 / 1 | 5 | Both passed |
| Fight Club | 1 / 1 | 5 | Both passed |
| The Dark Knight | 1 / 1 | 5 | Both passed |
| Le Voyage de Chihiro | 1 / 1 | 5 | Both passed |
| Jujutsu Kaisen 0 | 0 / 0 | 3 | No upstream search match |

Each available film exposed one supported player and returned that player.
Healthy lookup duration was **3.09–5.31 seconds** in this environment. There are
no landing-page, directory, availability or media-segment probes in production
discovery. Metadata inspection is one HLS playlist read. A valid missing film
does not fan out across equivalent mirrors: Jujutsu Kaisen 0's French and
original-title queries both returned no matches. Separate manual website queries
for Jujutsu, Kaisen and Jujutsu Kaisen 0 also returned no cards. Both empty results
remain recorded as availability failures; no unrelated copy is substituted.

All ten returned live streams passed playlist and 1 KiB media-sample checks.
The tested ShareCloudy players expose media playlists without dimensions, audio
groups or separate captions. Results therefore have no invented HD/VF/MULTI
label. They remain eligible under the requested unknown-resolution policy.
No advertised subtitle files were available for live validation; this does not
establish whether captions/audio tracks are embedded in the media. Synthetic
player and HLS fixtures verify Français sidecars, their playback headers, measured
720p inclusion, measured 360p rejection and MULTI from actual audio declarations.

Two additional live runs deliberately configured an obsolete Xatobam search
route. Both recovered through the real landing page, entry redirect and search
form in **eight requests**, with media samples passing. Two more runs used the
known Pirvab mirror directly: **five requests**, media samples passing. This is
**14 successful media samples across 16 lookups**, with the two unavailable-film
lookups kept in the main report. The current branded `yablom.com` page and FMHY's
French entry were parsed with the generated provider's helpers; both point to
Pirvab. They are recovery hints, not a guaranteed permanent official status API.

Reports: [final movie checks](tests/live-yablom-1.8.0-2026-10-16.json) and
[entry recovery / known mirror](tests/live-yablom-recovery-1.8.0-2026-10-16.json).
Reports record the generated bundle's SHA-256 and omit credentials, media URLs,
response bodies and caption dialogue. Existing source protocols remain covered
by the full regression/runtime suites; their previous live evidence follows.
No physical TV was available. These checks verify source discovery with the
app's actual JS wrappers and Python HTTP, not Android networking, hardware
decoding, continuous playback or device timing.

---

# Historical verification — 1.7.0, 2026-10-16

## Selection, fallback and native compatibility

**158 Node regressions passed**, together with the literal Android TV **1.0.0**
and Mobile JavaScript fixture suites. The runtime checks include continuation
after six failed players, replacement of below-minimum results, VOSTFR coverage,
the 24-request cutoff, zero native timer jobs and local SeekStreaming AES decoding.
The AES payload fixture is encrypted independently using Node's AES-128-CBC,
then decoded through the generated production providers; no WebCrypto is present.

The shared selector aims for three qualifying alternatives and respects the
720p/unknown policy before checking its target. Failed players and discarded
resolutions cause later attempts. Direct media and configured host families
receive priority; VF/MULTI and VOSTFR candidates receive opportunities before the
target stops discovery. Completed batches/multiple host outputs can exceed three.
The request/time budget can stop discovery with a partial list. The tests also
cover duplicate media that cannot inflate the target, merged player captions,
header-sensitive identity, partial results after budget exhaustion, source-header
preservation and exact relative-caption resolution for granted premium sources.

Fast API and Vidzy fallback now depends on qualifying results. Low resolution,
confirmed unavailable masters (401/403/404/410), or an HTTP 200 non-HLS body cannot
prevent recovery. Inconclusive transport/503 metadata failures retain upstream
hints. Healthy fast API discovery remains two requests. The separate workers
preserve incremental results: TV 1.0.0's own repository collector sends each
scraper completion individually; this was checked against its tagged source.

## Added source coverage

**Movix / Extra** independently reads public custom, Omega and SwiftFlow lists.
Omega uses TMDB's explicit IMDb correspondence. Custom TV rows require exact
series/season/episode coordinates, including season zero. Omega TV entries require
matching declared TMDB identity before any host is attempted. A live Reacher IMDb
query returned cached Stranger Things data; that entry was rejected. No guessed
season/episode offsets or production title-ID exceptions were added.

SeekStreaming uses its public video API with local AES-CBC decoding, prefers
`cfNative` over its duplicate IP transport, and keeps native playback headers.
Its cipher dependency is unmodified MIT aes-js 3.1.2; the complete MIT notice is
included in every active bundle. No player scripts, browser, external decrypting
service, WebCrypto or timer is needed. Observed Dood/VOE aliases and Dropload
recognition are centrally configured. Challenge-only pages return no fabricated
stream; a captcha script does not suppress public media already on a page.

SwiftFlow's current Blinkflux iframe is unsupported. SwiftFlux advertises direct
files without their URLs and requires a browser verification token to retrieve
them. Its availability/limitation is recorded without calling that gated resolver.
The update does not claim complete native coverage of every website button.

## Live release evidence

The reports exercise Dragons, Matrix, The Office S1E1, Reacher S4E1/S1E1 and
Jujutsu Kaisen 0 through both runtime fixtures. Every recorded final-bundle hash
is checked against the generated provider. Known numeric quality tiers below
720p are excluded; unknown resolution is retained. Media checks fetch playlists
and a small media sample; caption checks fetch advertised subtitle files. They
do not certify full-program synchronization or subtitle content quality.

Across all five providers this covers **60 calls, 100 returned entries and 79
filtered sources**, with zero native timer jobs. Every case has qualifying media
on both runtimes. **99 of 100 initial media probes passed**; all advertised caption
checks passed. Ten lookups intentionally return empty after filtering all sources.
The separate Frembed host list for Jujutsu Kaisen 0 still returns zero on both
runtimes: one returned link is HTTP 404 and the other players expose no supported
public media. Those availability failures remain recorded; the film's working
API, catalogue and extra-provider sources are independently verified.

Dragons' catalogue worker returned **four entries on both runtimes** after nine
player attempts, compared with one entry after six attempts in the 1.6.0 check.
Its extra worker returned **two entries per runtime**, including a measured
**1080p SeekStreaming source**. All those media samples passed. Counts are per
provider; separate providers may discover overlapping media.

The additional-worker report covers **12 calls and 20 returned sources** with
all media samples and advertised caption checks passing. The official-directory
helper also passed through both runtime fixtures with five requests per call.
The initial mobile Reacher S4E1 catalogue run had one media-segment HTTP 403 and
a Vidara HTTP 520 during discovery. A focused fresh lookup returned six sources;
all six media probes and subtitle checks passed. Original failures are retained.

Healthy fast API lookups remain **two requests**, observed at **0.44–1.02s**.
Reacher S4E1's expanded backup returns four entries with nine requests, observed
at **5.61–7.74s**. The core catalogue worker uses 14–22 requests, observed at
**8.08–19.70s**; extra discovery uses 6–13 requests at **1.65–19.57s**. Additional
coverage and recovery require more requests when earlier copies fail or fall
below the minimum; those workers do not delay completion of the fast worker.

Reports: [catalogue/Vidzy selection](tests/live-selection-1.7.0-2026-10-16.json),
[final API/Frembed hosts](tests/live-api-hosts-1.7.0-2026-10-16.json),
[extra source families](tests/live-extra-1.7.0-2026-10-16.json),
[focused Reacher recheck](tests/live-selection-recheck-1.7.0-2026-10-16.json),
[official-directory helper](tests/live-directory-1.7.0-2026-10-16.json).
Use `scripts/verify_live.py --provider NAME --case TMDB --runtime both --report FILE`;
`--season` and `--episode` isolate exact TV coordinates. The selectors' logs report
attempted/failed/filtered/returned counts, languages, remaining candidates and the
stop reason; source inventories distinguish unsupported/gated website players.

Reports omit credentials, signed media URLs, response bodies and caption dialogue.
No physical TV was available. Python HTTP/QuickJS verifies source discovery and
the app's JS wrappers, not Android DNS/TLS, hardware decoding, subtitle selection
or continuous playback. Observed lookup durations are not device benchmarks.

---

# Historical verification — 1.6.0, 2026-10-16

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
