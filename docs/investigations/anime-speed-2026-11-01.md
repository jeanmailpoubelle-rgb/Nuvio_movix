# Anime-Sama discovery performance, 1 November 2026

Baseline **1.1.6**, commit `8089adf7d08cf4b14ff9d6dd026eee81c54551f1`;
dedicated release **1.1.7**. Sources FR remains **1.8.10** and its generated
providers are byte-identical. No shared resolver or media validator changed.

## Avoidable work and correction

Normal matching had already parsed the selected language pages and complete
episode arrays, but extraction parsed those arrays again. Each edition page was
also parsed separately to find its script and its label instructions. Normal
two-edition discovery now uses **two array parses instead of four**, and **three
HTML parses instead of five**, including the title page.

Reuse borrows the existing invocation-local version rows, with no new persistent
cache or extra copy of every array. It requires the same edition path and exact
script URL/query. A failed cache or changed script takes the original fresh
extraction path; cold external `as:ep:` references still work. The next lookup
fetches fresh scripts and players. Sparse slots, specials, canonical VOSTFR season
lengths and edition gaps are interpreted by the existing mapping code.

TV 1.0.0 cannot perform Sendvid's required binary placeholder validation. It used
to fetch the player before rejecting the file. Once an earlier ordinary response
establishes a text-only bridge, that player request is skipped with the same
explicit unavailable reason. Mobile retains binary validation and Sendvid links.
`transportSkipped` is a subset of visited/attempted candidates, never a count of
unvisited hosts. No timer, timeout reduction, host cutoff or capability preflight
was introduced. The 64-request/45-second/four-worker bounds stay intact.

## Controlled comparison

`scripts/benchmark_anime.py` uses the real native wrappers and deterministic
synthetic HTTP responses. Every before/after sample must return identical full
playback data, headers, captions, language/quality and ordering, complete candidate
selection and non-increasing request counts. It runs one warm-up then seven
alternating measurements per version/runtime. CPU and wall time are separate.

| Synthetic workload | TV CPU median, old → new | Mobile CPU median, old → new |
| --- | --- | --- |
| One source slot per edition | 0.053389 → 0.049853 s | 0.055743 → 0.050616 s |
| 1,000 source slots per edition | 0.553543 → 0.421290 s | 0.557707 → 0.437921 s |

The long-script processing reduction is about **21–24%** in this environment.
Small-script gains are only a few milliseconds here. These are local synthetic
processing measurements, not a 24% phone/TV lookup or network-speed promise.
An initial small-script wall-time run was noisy while other checks ran; the
recorded repeat adds process-CPU measurement and does not enforce timing gates.

With two Sendvid candidates, TV uses **30 instead of 32** requests and returns
the same eight playable host/edition choices. Mobile keeps **34 requests and ten
choices**. The tested current live pages do not list Sendvid, so this request
saving has native-fixture coverage, not a claimed live saving on those titles.

## Live checks and practical limits

Fresh comparisons cover Jujutsu seasonal S2E1, Bleach S1E1, Your Name and Suzume
on both wrappers. Observed result counts remain **10, 8, 4 and 2**, with complete
published-candidate processing and both VF/VOSTFR editions. Two movie references
and two series references exercise source matching, script extraction and hosts.
Season/episode correspondence and unknown/low-resolution behavior are unchanged.

Remote hosts still dominate cold lookups. Baseline Jujutsu samples range roughly
16–40 seconds and its live request count varies with failed players/variants.
Bleach and Suzume keep 28 and 12 requests. Your Name varies between 18–19,
and Jujutsu between 35–39 as existing player/variant retries change. Different
network times cannot be attributed entirely to this parsing optimization.
Some media samples still return upstream 403 and some caption checks cannot
reread a master. Suzume's media/caption checks pass; other checks retain their
availability findings. No physical Android decoding, all-track or subtitle
content/timing guarantee is implied.

299 Node regressions, both full native fixture suites and 38 maintenance tests
pass. The two parsing regressions and TV Sendvid-request assertion fail against
the actual baseline bundle. Cold external references, changed script queries,
failed mapping caches and fresh subsequent lookups have regression coverage.
The new benchmark also refuses equal source counts with changed playback headers.

## Debugging this optimization

- Repair `provider.js:version` / `streams` and `pages.js:episodePage` /
  `episodeSlotsFromPage` if source page or script-query semantics change. Do not
  reuse another edition, ignore query bytes or retain data across lookups.
- Revisit the capability guard and transport if a future TV bridge gains binary
  support. Do not make unsupported Sendvid links appear playable by dropping its
  placeholder check. Inspect `transportSkipped` alongside remaining candidates.
- Run `benchmark_anime.py --baseline-ref <commit> --episodes 1` and again with
  `--episodes 1000`; then run real movie/episode checks on both wrappers. This
  fixture router cannot establish current host availability or device speed.
  It expands the shared `quickjs_check.py:fixture_response` episode arrays;
  changed fixture grammar must fail rather than silently reducing the workload.
- Preserve exact source choices and original HLS audio/subtitle groups. Keep
  signed data fresh, validation intact and the anime resolution minimum at zero.

See the [dedicated guide](../anime-sama.md), [maintenance runbook](../maintenance.md)
and [sanitized comparisons](../../tests/anime-speed-1.1.7-2026-11-01.json).
