# Changes

## 1.3.0

- Fixed missing VOSTFR by requesting both explicit Vidzy language routes;
  preserve successful VF when VOSTFR fails and deduplicate fallback embeds.
- Removed provider-side timeout timers from all three providers. Nuvio Mobile
  leaves their native sleeps pending after clearTimeout, and its fetch ignores
  AbortSignal. This avoids the old 12-second native timer tail.
- Added bounded Uqload player-data unpacking without eval. Movix now recovers
  both Reacher S4E1 backup languages and skips known unsupported slow players.
- Added Reacher regressions and actual mobile-runtime JS fixtures alongside the
  existing Android TV 1.0.0 fixtures; CI asserts no pending native timer jobs.
- Confirmed Purstream's API currently has no valid stream for Reacher S4E1.

## 1.2.0

- Expanded the repository to Movix, Purstream and Nakios / Vidzy.
- Corrected Movix's playback Referer for Purstream media; kept the Movix Referer
  for API requests. Retained empty/error fallback and reduced request count.
- Added strict Purstream matching with final TMDB ID/type validation and fewer
  metadata requests.
- Replaced the old Nakios API approach with Vidzy's documented TMDB routes plus
  a title/year catalogue fallback using nakios.live.
- Added lazy catalogue address discovery through nakios.org.
- Added a public Vidzy source parser without runtime DOM or script execution.
- Added shared source files, deterministic standalone bundles, CI and regression
  tests using Nuvio Android TV 1.0.0's actual JS polyfill and call wrapper.

## 1.1.0

- Initial Movix-only implementation with fewer discovery requests and diagnostics.
- Physical TV playback was unverified. Its playback Referer limitation was
  identified and corrected in 1.2.0.
