# Verification — repository 1.3.0, 2026-10-16

Targets: Nuvio **Android TV app 1.0.0** and the Nuvio Mobile JS runtime at
commit `808272dcec4be02397282600b70a07111576e0c7`.

## Reacher S4E1 (TMDB 108978)

| Provider | Result in 1.3.0 | Discovery requests | Media check |
| --- | --- | --- | --- |
| Nakios / Vidzy | VF and VOSTFR | 4 | Both HLS playlists and 1,024-byte segment samples passed |
| Movix / Cpasmal / Uqload | VF and VOSTFR | 4 | Both HLS playlists and 1,024-byte segment samples passed |
| Purstream | No valid source: episode API HTTP 404 | 4 | No media URL supplied by the API |

Nakios's episode page and the two explicit Vidzy language routes point to
separate embed IDs. Version 1.2.0 fetched only the default VF player. Version
1.3.0 fetches both `/vf` and `/vostfr`, keeps successful results when another
language fails, and avoids duplicate downloads if the server returns the same
fallback embed for both routes.

Movix's primary Purstream-backed endpoint returned HTTP 404. Its Cpasmal backup
listed multiple hosts in both languages. The old provider spent requests on
unsupported VOE pages and could not unpack Uqload's public player data. The
new code skips known unsupported embeds and decodes Uqload's packed source
without eval. Both returned language URLs passed media probes.

Purstream's media sheet confirms the correct Reacher TMDB ID and lists four
seasons, but the exact S4E1 stream endpoint returns HTTP 404 / “Aucune source
valide disponible.” The provider does not substitute another episode. The
All-in-One Purstream provider also returned zero for this exact episode during
the comparison; All-in-One Movix likewise returned zero in the TV-style runtime.

Machine-readable comparison, updated TV/mobile results and media checks:
[tests/live-reacher-2026-10-16.json](tests/live-reacher-2026-10-16.json).
The Python native-HTTP adapter performs synchronous urllib requests, so its
elapsed times are not a benchmark of the mobile host's concurrent networking.

## Latency regression identified and removed

Version 1.2.0 scheduled a 12,000 ms timeout for each fetch when timers were
available. Nuvio Mobile's JS timer implementation delegates to native
`__plugin_sleep`; its `clearTimeout` removes the callback flag but does not
cancel that native sleep. Its fetch implementation does not consume AbortSignal,
so this wrapper did not cancel HTTP work either.

A replay of the **saved 1.2.0 Movix bundle** using the mobile JS fixture produced
one successful API result and **one still-pending native sleep of 12,000 ms**.
That native job can hold up a QuickJS evaluation after the useful HTTP work
finishes. The new code schedules **zero** native sleeps in all provider checks.
The replay records pending native jobs without waiting in real time; it is not
an Android device timing measurement.

Source evidence:

- [Nuvio Mobile JS timer/fetch implementation](https://github.com/NuvioMedia/NuvioMobile/blob/808272dcec4be02397282600b70a07111576e0c7/composeApp/src/fullCommonMain/kotlin/com/nuvio/app/features/plugins/runtime/js/JsBindings.kt).
- [Native sleep binding](https://github.com/NuvioMedia/NuvioMobile/blob/808272dcec4be02397282600b70a07111576e0c7/composeApp/src/fullCommonMain/kotlin/com/nuvio/app/features/plugins/runtime/host/HostFunctions.kt).

## Regression and compatibility checks

- **47 Node tests passed**, including Reacher's two languages, failed VOSTFR
  preserving VF, default-language deduplication, Movix's Uqload backups and
  Purstream's genuine missing-episode response.
- Offline checks passed with the literal **Android TV 1.0.0** JS polyfill/call
  wrapper and composed **Nuvio Mobile** JS polyfill/call wrapper.
- The mobile harness records native sleep jobs and asserts none are created.
  The Node Reacher tests also expose timers that fail if called.
- Live checks through both runtime fixtures returned both Reacher languages
  from Nakios/Vidzy and Movix, and the expected zero from Purstream.
- Generated bundle, syntax and whitespace checks passed. CI runs both runtime
  fixture sets; no network or credentials are required for CI.

These checks use Python urllib for native HTTP, not Android's OkHttp/TLS/DNS or
a hardware decoder. **Physical phone/TV playback and end-to-end timing still
need the user's device check.** Streams and upstream availability can change.

---

# Previous verification — repository 1.2.0, 2026-10-15

Compatibility target: **Nuvio Android TV app 1.0.0**.

## Local and runtime checks

- 42 Node regressions passed: fallback behavior, malformed HTTP/JSON responses,
  strict title/year matching, final TMDB ID/type validation, episode selection,
  media headers, Vidzy decoding, unsupported players and address discovery.
- All three generated providers ran in QuickJS with the **literal JS polyfill
  and call wrapper** extracted from NuvioTV tag 1.0.0. Fixtures exercised direct
  results, empty/error fallback, series aliases and season zero.
- Browser timers and a DOM were absent in the runtime checks. Each provider
  exports the expected `getStreams` function and fits comfortably below the
  native runtime's code/response limits.
- Generated-file, JavaScript/Python syntax and whitespace checks passed.

The original Android source is tag `1.0.0`, commit
`9f17e8bf4abc799dc8c832d2894a8b3b166e4353`:
[PluginRuntime.kt](https://github.com/NuvioMedia/NuvioTV/blob/1.0.0/app/src/full/java/com/nuvio/tv/core/plugin/PluginRuntime.kt).
The test fixtures retain that source attribution and GPL license.

## Live checks

Each row returned one source. HTTP request counts exclude the subsequent media
probe. A successful probe read the HLS master, a child playlist, and a **1,024-byte
sample of one media segment** with HTTP 206. No signed media URLs or credentials
are saved in the report.

| Provider / route | Title | Discovery requests | Discovery time | Media probe |
| --- | --- | --- | --- | --- |
| Movix | Matrix, TMDB 603 | 1 | 0.31 s | Passed |
| Movix | Fight Club, TMDB 550 | 1 | 0.21 s | Passed |
| Movix | Game of Thrones, 1399 S01E01 | 1 | 0.54 s | Passed |
| Purstream | Matrix | 3 | 1.76 s | Passed |
| Purstream | Fight Club | 3 | 1.02 s | Passed |
| Purstream | Game of Thrones S01E01 | 4 | 1.28 s | Passed |
| Nakios / Vidzy direct route | Matrix | 2 | 1.56 s | Passed |
| Nakios / Vidzy direct route | Fight Club | 2 | 1.48 s | Passed |
| Nakios / Vidzy direct route | Game of Thrones S01E01 | 2 | 1.17 s | Passed |
| Forced Nakios catalogue fallback | Spider-Man: Brand New Day, TMDB 969681 | 5 | 4.79 s | Passed, VOSTFR |

Machine-readable results:
[tests/live-verification-2026-10-15.json](tests/live-verification-2026-10-15.json).
Timings are observations from this development environment, not a TV benchmark.

## Review findings addressed

- Movix and Purstream supplied the same tested media URL. Using a Movix
  playback Referer resulted in HTTP 403; using Purstream's player Referer allowed
  playlist and segment access. Movix 1.2.0 now distinguishes API request headers
  from playback headers. The initial Movix 1.1.0 media-access limitation is
  therefore resolved in these tests.
- The old domain-list URL remains HTTP 404. No provider depends on it.
- Purstream's original lookup used five requests for the tested films and six
  for the episode. The new lookup uses three/four and verifies identity before
  returning streams.
- nakios.live is an HTML catalogue with embedded players; the old Nakios API
  path returned HTTP 404 on that host. The new code uses the documented Vidzy
  TMDB route plus a catalogue fallback, rather than swapping the old API domain.
- nakios.org lists nakios.live as its catalogue/streaming service. A regression
  exercises a changed directory address and proves retry at the listed host;
  an actual future domain migration cannot be tested in advance.
- Vidzy's availability endpoint returns metadata/an embed URL, not native media.
  The provider skips this preflight and resolves the documented player route.
- The forced Nakios catalogue route for Game of Thrones S01E01 returned a loading
  page from its listed Vidzy embed and correctly produced no source. The direct
  Vidzy TMDB route for the same episode passed. Spider-Man's catalogue VF embed
  also returned a loading page, while its VOSTFR embed succeeded. Unsupported
  catalogue hosts are skipped. This limitation is visible in diagnostics.

## What remains unverified

**No physical television was available.** These checks establish compatibility
with the exercised JavaScript interface and successful network/media access
from this environment. Python urllib supplies the native HTTP callback; it does
not reproduce Android's OkHttp/TLS/DNS stack or the device's exact QuickJS build.
No hardware decoder, audio/subtitle track behavior, full-film playback, DRM,
network/IP differences or future site changes were tested.

For the final device check, refresh the repository, test each provider in Nuvio
Android TV 1.0.0, and try one film and one explicit series episode. A failure that
occurs only on that device needs its runtime or player logs.
