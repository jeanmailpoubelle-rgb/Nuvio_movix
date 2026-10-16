# Changes

## 1.4.2

- Recognize MULTI/VF/quality tokens separated by underscores in release names.
  This corrects The Dark Knight's VF/HD display without extra HTTP requests.
- Remove HLS masters confirmed missing by HTTP 404/410 and allow normal backup
  recovery. Preserve working primary sources and transient-failure behavior.
- Confirmed The Dark Knight's Vidzy upload has two audio languages but advertises
  no subtitles. Its Purstream master is missing and Cpasmal currently has no
  replacement, so the broken API stream is omitted.
- Added missing-master and release-token regressions in Node and both native JS
  fixtures. Live reports now record failed HTTP hosts/statuses without full URLs.

## 1.4.1

- Corrected MULTI release labels when a catalogue groups the file under VF.
- Added bounded parsing of Vidzy's wrapped `player.loadTracks` subtitle URLs,
  including the player's same-origin rewrite and subtitle playback headers.
- Exposed raw WebVTT/SRT caption URLs found in Purstream HLS masters directly
  to Nuvio. Preserve the complete audio master and proper HLS subtitle playlists.
- Added one small playlist read when an API HLS result lacks explicit captions;
  no segment/caption-body downloads, timers or video failure on metadata errors.
  `inspectHls: false` retains the previous API-only lookup.
- Verified The Office S1E1's French/English audio and caption files on both
  source paths; added Office regressions and native TV/mobile runtime fixtures.

## 1.4.0

- Consolidated to two active source families, preserving the installed IDs.
  The redundant Purstream ID is disabled and inert for TV 1.0.0 migration.
- Centralized URLs/directories/limits in validated build-time configuration.
  Added lazy Purstream directory discovery and known catalogue mirror recovery.
- Kept the one-request API fast path and both Vidzy language paths. Added
  verified direct Purstream recovery on wrapper failures, skipping duplicate
  backend queries for explicit missing episodes.
- Added subtitle file/HTML/JWPlayer parsing, playback headers and subtitle
  merging on duplicate media. Original HLS audio/subtitle renditions remain intact.
- Added stage/status/timing and source-inventory diagnostics without query secrets.
- Added repeatable six-title catalogue/source/media/subtitle verification and
  regressions for recovery, migration, captions and diagnostics.

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
