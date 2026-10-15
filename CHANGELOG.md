# Changes

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
