# Jujutsu Kaisen S2E22: intermittent empty lists and independent entries

## Report and diagnosis

The user reports an intermittently empty Anime-Sama list on **Mobile**, after
**about a minute or longer**. The same episode later returns links; S2E23 works.
The symptom reportedly predates 1.1.8. No failed on-device trace was available.

Repeated 1.1.8 cloud lookups resolve S2E22 to the correct source: season2,
zero-based array index **21**, in both VF and VOSTFR. Eight initial S2E22 lookups
using numeric TMDB and IMDb identities all return ten links. S2E23 controls use
index **22** and also return ten. Neither a title-specific season offset nor an
episode-specific production patch is justified. Some video CDN requests return
HTTP 503 intermittently, but existing fallback recovers the complete list; those
observations do not establish the cause of the user's empty result.

The timing points to an app-owned boundary. Inspected Mobile code has a
[`60_000` ms whole-plugin timeout](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/fullCommonMain/kotlin/com/nuvio/app/features/plugins/runtime/PluginRuntime.kt#L41)
and [60-second native connect/read timeouts](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/androidMain/kotlin/com/nuvio/app/features/addons/AddonPlatform.android.kt#L106).
The old plugin joins all host workers before returning. One pending native call
can therefore outlive the overall plugin deadline while healthy hosts have
already finished. Raising concurrency does not cancel that call. The held-host
regression reproduces this structural limitation, not the precise failed phone
request. Shared prerequisite timeouts and app-side ID mapping remain other
possible causes.

## Approved trial: Anime-Sama 1.2.0

The user approved independent host entries in the **same dedicated repository**.
The manifest now exposes:

| Manifest ID | Owned initial host family |
| --- | --- |
| `anime-sama` | ANSEmbed; retains the legacy ID |
| `anime-sama-smoothpre` | Smoothpre |
| `anime-sama-voe` | VOE |
| `anime-sama-uqload` | Uqload |
| `anime-sama-vidmoly` | Vidmoly |
| `anime-sama-other` | Unassigned hosts, Sendvid and new/unrecognized aliases |

All entries use **one generated bundle**, one central `hostEntries` table and
the existing shared resolvers. Candidate ownership is disjoint and decided
before fetching players. Unknown VOE aliases remain eligible through the other
entry and normal branding/F7 detection; no URL is discarded merely because its
initial family is unknown. Rare fallback hosts still share that fallback entry.

TV prefixes IDs with a repository UUID; Mobile prefixes them with the manifest
URL. Dispatch uses the final colon-delimited manifest ID. Unknown nonempty IDs
fail closed with `UNSUPPORTED_ENTRY_ID`. An empty ID is the unscoped development
comparison, not the installed entry path.

Nuvio independently launches each scraper and
[merges completed results without clearing earlier results on an empty completion](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/commonMain/kotlin/com/nuvio/app/features/streams/StreamsRepository.kt#L515).
Its [stream list renders available cards while the group is still loading](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/commonMain/kotlin/com/nuvio/app/features/streams/StreamsScreen.kt#L846).
Thus an individual host entry can remain pending or time out while links from
other completed entries remain available. No timer race, native cancellation,
hosted service or account is introduced. Shared metadata/site failures can
still affect all entries; this is not a universal cure for every empty result.

## Migration and presentation

Refresh the repository and enable **all six entries** for full coverage. Keep
grouping by repository enabled for one Anime-Sama source filter. The legacy
entry now owns ANSEmbed. Settings are per entry: copy any custom URL, edition
preference or source map to the added entries. Compiled defaults work on TV.

All entry names remain **Anime-Sama**, with host descriptions/settings labels.
This is intentional: [Mobile sorts scraper names before stream labels](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/commonMain/kotlin/com/nuvio/app/features/streams/StreamFetchSupport.kt#L138).
Distinct host names there would override quality-first ordering. TV's compact
plugin list may therefore show identical titles. Actual video hosts remain on
the stream's secondary line.

Installed labels use composable quality/audio priority plus the original
candidate ordinal, e.g. `14.003. Anime-Sama / Uqload | 720p | VF`. The prefix is
a sort key rather than a consecutive result counter. This preserves resolution
descending, MULTI/VF/VOSTFR/other and original ties across partial completions.
Unknown quality stays last with no invented resolution label; nonstandard
resolutions retain exact descending order. Internal ordinal fields are removed
before delivery. Original URLs, headers, masters, track groups and captions stay
unchanged. The dedicated plugin retains **no resolution minimum**.

## Verification and request cost

**313 Node tests, 46 maintenance tests and both full literal native fixture
suites pass**, including all six prefixed installed IDs. Controlled tests hold
one ANSEmbed request while the other five entries finish, then verify the healthy
union against unscoped discovery. The comparison preserves full playback data,
every supported host/edition, low resolutions and final ordering, permitting only
the planned composable label prefix. Unknown aliases and absent host families
are covered. Sources FR stays 1.8.10 with byte-identical provider bundles.

The unscoped processing benchmark remains at **30 TV / 34 Mobile requests** with
identical playback data. That benchmark does not measure the new entry layout.
The controlled installed union uses **60 TV / 64 Mobile requests**, returning
the same eight/ten choices. The extra thirty reads are repeated prerequisites;
media extraction is partitioned, not repeated. There is no cross-context cache.
Each entry retains its own 64-request/45-second budget and mobile cooperative
20-second host budget; these are not one shared budget across all six contexts.
Candidate ownership is disjoint, but final-media deduplication is per entry.
If different initial families later redirect to the identical file and headers,
the app can show both results. There is no cross-entry signed-media cache to
suppress them. The recorded fixtures and live references have no such duplicates.

Fresh final-bundle live checks run all six entries concurrently:

| Sample | TV / Mobile links | TV / Mobile first-result seconds | Total requests TV / Mobile |
| --- | ---: | ---: | ---: |
| Bleach S1E1 | 8 / 8 | 7.34 / 4.28 | 58 / 58 |
| Jujutsu Kaisen S2E22 | 10 / 10 | 6.66 / 3.77 | 70 / 71 |
| Jujutsu Kaisen S2E23 | 10 / 10 | 5.45 / 5.11 | 70 / 70 |
| Suzume | 2 / 2 | 7.11 / 4.46 | 42 / 42 |

All entries report their expected scope, complete mapping and a complete
combined partition, with no remaining candidates or host-budget stops. These
are cloud Python HTTP observations, not physical Android timings or a speed
factor against earlier runs. The extra request cost is largest for one-host
movies. An earlier provisional Suzume lookup filtered a VOSTFR playlist after
HTTP 403; final checks recover both editions without weakening validation.
Bleach retains upstream media/caption probe failures, and one final Mobile
S2E22 lookup recovers a transient HTTP failure. These remain explicit attention
findings. S2E23 and Suzume media/caption probes pass on both runtimes. The exact
minute-long phone failure has not been reproduced, and physical playback and
subtitle rendering remain untested.

## Future debugging

The S2E22 deep reference asserts the verified source group/index only in the
development inventory. `--provider anime-sama` expands all installed entries;
`--entry-id` isolates one, including the legacy ANSEmbed ID. The verifier runs
the actual IDs on independent interpreter threads and retains per-entry scopes,
completion times, HTTP findings and the hash of the exact loaded bundle bytes.
It cannot certify a subset when an entry fails or the partition is inconsistent.
The audit distinguishes an unadvertised host after a successful inventory from
a failed prerequisite or an advertised-but-unplayable candidate. A file rebuilt
mid-lookup must not change the recorded hash of what was actually executed.

Repair locations: `config/anime-sama.json:hostEntries`, the dedicated manifest,
`src/anime-sama/host-groups.js`, provider/native adapter, `scripts/anime_entries.py`,
the verifier and audit. Update the literal prefix contracts together if the app
changes ID construction. Preserve fallback ownership for unknown aliases. Do
not silently restore an all-host entry, rename entries by host, add timer races,
lower validation requirements or guess an episode to make results appear.

Evidence: [sanitized repeated lookups, fixtures, benchmark and final entry checks](../../tests/anime-independent-1.2.0-2026-11-01.json).
