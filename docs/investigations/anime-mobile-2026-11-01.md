# Anime-Sama mobile scheduling — 1 November 2026

Anime-Sama **1.1.8** increases host workers from four to six on a verified
asynchronous native bridge. It adds a configurable **20-second cooperative
per-host budget**. Sources FR remains **1.8.10**, with byte-identical generated
providers. Anime-Sama still has no resolution minimum or result-count target.

## Native contract and the timeout limit

The inspected Mobile implementation registers
[`__native_fetch` as an `asyncFunction`](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/fullCommonMain/kotlin/com/nuvio/app/features/plugins/runtime/network/FetchBridge.kt#L24).
Android HTTP runs in
[`Dispatchers.IO`](https://github.com/NuvioMedia/NuvioMobile/blob/cmp-rewrite/composeApp/src/androidMain/kotlin/com/nuvio/app/features/addons/AddonPlatform.android.kt#L275).
The plugin observes the promise returned by an ordinary native request, without
another network read. Binary support is not used as a concurrency test: a newer
TV can support bytes while retaining a synchronous fetch bridge. Unknown and
synchronous bridges keep four workers and no per-host deadline.

The deadline starts when a worker takes a candidate. Its scoped context retains
the invocation's original start time, request counter and memoization tables;
it cannot multiply the 64-request budget or extend the 45-second lookup budget.
Over-budget responses stop before parsing/followups. Existing validated outputs
survive a later failed format in that host, and other candidates continue.
Nothing is blacklisted or cached into the next lookup.

This does **not** interrupt an in-flight native call. Mobile's native fetch does
not implement AbortSignal cancellation, and its coroutine-backed timer jobs can
outlive JavaScript `clearTimeout`. Its runtime awaits native evaluation before
delivering the captured result. A timer race would leave the pending native work
alive, so none is introduced. A completely unresponsive host can still delay
delivery or reach the app's own timeout. Hard cancellation/early delivery needs
an upstream app change. The earlier conversational suggestion of a plugin-only
hard deadline was too strong.

## Verification

- **307 Node tests**, **40 maintenance tests**, both full literal native fixture
  suites, and build freshness checks pass. No pending native timer jobs.
- Controlled asynchronous tests observe six active hosts versus four on an
  unknown transport. One held host allows all seven other candidates to finish;
  the overall promise still waits for that native call, as documented.
- Fake-clock tests stop late followups, retain other hosts, preserve a validated
  HLS when an alternate MP4 expires, share the global budget, start queued clocks
  correctly and retry fresh on the next invocation.
- Both new behavior regressions fail for the expected reasons against the
  actual **1.1.7** bundle at `150310c`.
- The deterministic long-script benchmark retains **identical complete playback
  data**, eight TV / ten Mobile choices, and **30 / 34 requests** respectively.
  Local CPU remains essentially unchanged. This release improves scheduling;
  it does not claim a parsing or measured physical-phone speed improvement.

The live harness initially returned Mobile promises but performed Python HTTP
synchronously. That falsely exhausted some per-host budgets: Your Name returned
two links instead of four. The corrected live Mobile bridge uses bounded HTTP
futures, settling every promise only on the QuickJS interpreter thread and
draining all pending native requests. A six-party HTTP barrier regression proves
the overlap without external network access or a latency threshold. TV stays
synchronous; the CPU benchmark deliberately uses deterministic synchronous HTTP.
The final Mobile live rows below use this corrected concurrent harness.

| Fresh sample | TV results | Mobile results | Final selection evidence |
| --- | ---: | ---: | --- |
| Jujutsu Kaisen S2E1 | 10 | 10 | All candidates visited, zero host-budget stops |
| Bleach S1E1 | 8 | 8 | All candidates visited, zero host-budget stops |
| Your Name | 4 | 4 | All candidates visited, zero host-budget stops |
| Suzume | 2 | 2 | All candidates visited, zero host-budget stops |

Both editions remain represented; ordering, host captions, signed URLs/headers,
original masters, track groups and low-resolution eligibility are retained.
Suzume media/caption probes pass on both wrappers. The other samples retain
upstream media/caption HTTP failures; their discovery counts are not a claim
that every cloud media probe passes. A focused Your Name audit also reports its
upstream media/gating failures instead of concealing them behind working links.
No new Sendvid candidate appeared in these live references; its transport and
placeholder behavior is fixture-verified. No physical Android timing, decoding
or subtitle-rendering certification is implied.

Evidence: [sanitized bundle, benchmark, regressions and live report](../../tests/evidence/anime-mobile-1.1.8-2026-11-01.json).

## Future repairs

Settings live in `config/anime-sama.json:limits`. Watch `hostWorkers`,
`hostBudgetMs`, `hostBudgetStops`, published/attempted/remaining and stop reason.
`anime-host-budget` logs origins and editions, never private media URLs. Audit
and the dedicated verifier flag `host-budget` even when remaining is zero and
other links play. If healthy links disappear, compare their actual dependency
chain and a concurrent harness before changing the budget. Do not add timer
races, weaken validation, invent a new host domain or silently increase limits.

If the app changes its native return, cancellation or evaluation contract, update
transport detection, literal fixtures and the harness together. Keep live HTTP
off the Mobile interpreter thread; keep all QuickJS calls on that thread. Run
the held-host, shared-budget, fresh-retry and HTTP-barrier regressions, then
movies/episodes and both native suites. See [the maintenance runbook](../maintenance.md).
