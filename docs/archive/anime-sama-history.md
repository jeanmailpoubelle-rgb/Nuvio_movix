# Anime-Sama implementation history

Versioned notes; see the [current guide](../anime-sama.md).

## Clean labels — 1.2.1

Hide the composable priority prefix with default-ignorable Unicode variation
selectors. Preserve independent entries, all playback fields, source coverage,
quality/audio/candidate order and host captions. No extra requests or probes.
314 Node tests, 46 maintenance tests and both native fixture suites pass. JVM
ordinal comparison and pixel rendering are checked locally; physical Android
rendering remains untested. See [release verification](../../VERIFICATION.md).

## Independent host entries — 1.2.0

Six native entries in the same dedicated repository share one generated bundle
and route disjoint host families by their real prefixed IDs. Nuvio can display
completed entries while another remains pending. Preserve all healthy choices,
composable quality/audio ordering, host captions, no resolution minimum and
per-entry limits. Settings are independent and prerequisites repeat. Sources FR
remains 1.8.10. See [the migration, timeout investigation, measurements and limits](../investigations/jjk-s2e22-intermittent.md).

## Historical mobile scheduling — 1.1.8

Six workers on a verified asynchronous native bridge, with a configurable
20-second cooperative per-host budget and explicit host-budget diagnostics.
No timer race, native HTTP cancellation or guaranteed early return is claimed.
Synchronous TV retains four workers and no per-host budget. Healthy fixtures
preserve complete playback data. Sources FR remains **1.8.10** with byte-identical
provider bundles. See [verification and limitations](../investigations/anime-mobile-2026-11-01.md).
The later [S2E22 intermittent-empty investigation](../investigations/jjk-s2e22-intermittent.md)
distinguishes correct episode mapping and recovered CDN failures from a Mobile
lookup that reaches the app's own timeout. Its exact on-device failure remains
unreproduced; a passing cloud lookup does not establish that it is fixed.

## Discovery performance — 1.1.7

This dedicated-only release reduces repeated page/script parsing and avoids
known-incompatible Sendvid player requests on text-only TV. It keeps all source
choices, no quality minimum, existing validation, four workers and the original
budgets. Sources FR remains **1.8.10**, with byte-identical provider bundles.
See [benchmarks, live comparisons and limits](../investigations/anime-speed-2026-11-01.md).

## Shared endpoint configuration — 1.1.6

The shared configuration replaces the retired Yablom/Pirvab backup shortcut with
the verified Dokimov site/search pair. Anime-Sama does not use Yablom discovery;
its independent mapping, host captions, all-host selection, limits and absence
of a resolution minimum are unchanged. The version keeps both distributed
copies of the shared configuration current. See the
[31 October maintenance check](../investigations/maintenance-2026-10-31.md).

## Shared endpoint configuration — 1.1.5

The shared compiled configuration now contains Frembed's verified `.uno` origin.
Anime-Sama does not use that discovery API; its source mapping, all-host policy,
host captions, limits and absence of a quality minimum are unchanged. The version
keeps both distributed copies of shared configuration current. See the
[24 October maintenance check](../investigations/maintenance-2026-10-24.md).

## Shared host configuration — 1.1.4

This release includes the verified `luluvid.com` entry alias in the shared
configuration. Dedicated episode mapping, all-host selection, host captions and
the absence of a resolution minimum are unchanged. See the
[full maintenance check](../investigations/full-maintenance-2026-10-18.md) for live
coverage, the verifier correction and remaining limitations.

## Season-layout recovery — 1.1.3

The missing-season metadata path now retains its explicit IMDb correspondence
and can resolve numeric TMDB requests through Cinemeta's seasonal episode list.
238 Node regressions, both native wrapper suites and 27 maintenance tests passed.
See [the release evidence](../../tests/evidence/live-anime-season-layouts-1.1.3-2026-10-17.json)
and [verification notes](../../VERIFICATION.md), including upstream media failures.

## Historical shared HLS update — 1.1.2

The common inspector now excludes unreadable playlists after network failures
and HTTP 5xx as well as earlier missing/invalid-playlist cases. This prevents
unverified links from blocking fallback. Anime-Sama already validates most host
playlists before this step; its separate budget, all-edition/no-minimum policy
and host captions remain unchanged. Both native fixture suites and 229 Node
tests passed. See the [shared failure investigation](../investigations/jjk20-buffering.md)
and [verification](../../VERIFICATION.md).

## Historical release verification — 1.1.1

Bleach S1E1 exposed a port regression: an unknown redirected VOE alias used a
filename-first page title, while the detector required VOE at the start. The
shared branding detector now recognizes both layouts. Both wrappers return
eight links instead of four, restoring VF/VOSTFR VOE HLS and direct MP4 choices;
all four VOE media samples passed per runtime. Bleach's ANSEmbed VOSTFR segment
returned HTTP 403 in the cloud checks and remains a recorded failure.

214 Node tests, both native fixture suites and 24 maintenance tests passed.
Final live checks also covered Your Name and Suzume, verified resolution-first
ordering/audio ties and preserved host captions. See [the release evidence](../../tests/evidence/live-stream-order-1.1.1-2026-10-17.json).
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

Evidence: [native checks](../../tests/evidence/live-anime-sama-1.1.0-2026-10-17.json),
[focused TV recheck](../../tests/evidence/live-anime-sama-recheck-1.1.0-2026-10-17.json),
[original comparison and shared-provider checks](../../tests/evidence/live-anime-port-shared-1.8.3-2026-10-17.json).
Collecting all alternatives changes the work compared with the original plugin's
first-success/grace stop: the Node HTTP sample used 12–36 requests and about
1.9–16.8 seconds. Those measurements are not phone/TV timings or a speed guarantee.
