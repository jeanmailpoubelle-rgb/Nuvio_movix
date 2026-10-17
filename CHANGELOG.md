# Changes

## Anime-Sama 1.1.1 / Sources FR 1.8.4 — 2026-10-17

- Fix dropped VOE links on unlisted rotating aliases whose page title is
  `Watch filename - VOE | ...`. The port previously recognized only titles
  starting with VOE, so Bleach S1E1's VF/VOSTFR players reached extraction but
  returned no sources. Detect the host branding after the filename as well;
  keep the shared F7 decoder and original media/header validation.
- Recognize the actual final page without adding alias-specific domains or
  discovery requests. A bare VOE mention inside a filename is not host branding.
  Both HLS and direct MP4 alternatives retain their edition and host caption.
- Add a failing-before-fix regression, both native-runtime redirect fixtures
  and Bleach to the smoke/deep audit inventory and live comparison tool. Update
  the maintenance failure map and record live rechecks. Anime-Sama retains no
  resolution minimum and continues through every candidate within its budget.
- Order final results by resolution descending, then MULTI/VF/VOSTFR/other within
  each resolution. Keep unknown resolution last and stable ties. Use padded rank
  prefixes for multiple results so Mobile's alphabetical label sorting preserves
  that order; keep the native video-host caption. Apply the same presentation
  helper to both plugins without additional requests or changed host selection.

## Anime-Sama 1.1.0 / Sources FR 1.8.3 — 2026-10-17

- Port Anime-Sama 1.0.6 into a **dedicated plugin** with its own manifest at
  `plugins/anime-sama/manifest.json`. It is not added to the Sources FR provider
  list. Keep the video host on each stream's secondary line and use the shared
  heading, audio, quality and caption presentation.
- Retain exact title/alias/year matching, TMDB/IMDb/Kitsu metadata, sparse
  episode arrays, canonical combined-season offsets, saga ranges, strict edition
  gaps and relative source IDs. Source parsing uses a bounded local HTML/literal
  reader instead of depending on the app's DOM bridge.
- Apply **no anime resolution minimum** and no three-source target or mobile
  grace cutoff. Attempt all distinct published host/edition candidates within
  the dedicated 64-request/45-second/four-worker budget. Keep low-resolution
  sources for older anime. Sources FR retains its separate 720p policy.
- Share ANSEmbed, Smoothpre and Sendvid support with the existing host registry.
  Read literal referenced player configurations, metadata in either attribute
  order, and verified redirect pages without executing player JavaScript. Preserve
  observed media redirect targets, signed URL bytes and original playback headers.
- Retain Anime-Sama's HLS/variant, DASH and Sendvid placeholder validation, with
  invocation-local reuse. Preserve full HLS audio/subtitle groups and the original
  browser User-Agent. Sendvid's binary placeholder validation remains unavailable
  on TV 1.0.0's text-only bridge; it is explicitly skipped there.
- Add independent configuration, manifest-aware audits, anime reference cases,
  an original-plugin comparison runner, regression/native fixtures, source
  attribution and a dedicated maintenance failure map. Live verification records
  transient metadata/CDN failures as well as successful checks; it does not claim
  physical Android playback or universal host availability.

## Maintenance tooling — 2026-10-17

- Document the verified Movix/Purstream wrapper relationship, current-domain
  status and the distinction between a playback Referer and a public site URL.
- Require additions and behaviour changes to update documentation and audit
  coverage together, including failure symptoms, repair locations and verification
  steps. Add an integration maintenance template and PR checklist.
- Add Codex Cloud instructions, a repair runbook and a central integration/test
  inventory. Production remains 1.8.2; shipped provider code is unchanged.
- Add bounded smoke/deep audits for normal lookup, isolated API/recovery routes,
  configured mirrors/directories and shared host families. Reports retain partial
  results, request counts and explicit blocked/untested paths without signed URLs.
- Add focused rechecks, baseline comparisons, 23 maintenance regressions and a
  manual GitHub health workflow uploading sanitized reports only.

## 1.8.2

- Stop copied player-upload MULTI/DUAL-AUDIO filenames from overriding catalogue
  language hints. This applies to every shared host resolver, including Dood,
  LuluStream, Vidzy and ShareCloudy, with no movie-specific rules.
- Keep MULTI derived from real HLS audio declarations. Preserve complete masters,
  playback headers, subtitle handling and explicit API language metadata. Unknown
  source language stays unlabelled if its only hint was a MULTI upload name.
- Add safe upload-hint diagnostics and regression/native-runtime checks for
  single-rendition Lulu streams, direct Dood MP4s and genuine multi-audio HLS.
  No new discovery requests or video probes are introduced.

## 1.8.1

- Use VF as Yablom's configurable default catalogue-language hint, as requested.
  Explicit VOSTFR badges, MULTI release metadata and measured HLS audio still
  take precedence. This is a site default, not proof of a single audio track.
- Keep unknown resolution unlabelled: ShareCloudy's tested media playlists do
  not report dimensions. No extra probing requests or lookup delays are added.

## 1.8.0

- Add the independent, movie-only Yablom / Films provider. Use the verified
  Xatobam search route first, with Pirvab as a known mirror. Match French/original
  titles and release years, reject ambiguity, and recheck film-page identity.
  Alternate titles require matching TMDB posters on both search and film pages.
- Keep the healthy path to five requests, without catalogue scans or domain
  preflights. Cache only verified search addresses in a reused runtime; refetch
  film/player data for fresh media. Unsupported TV requests use zero requests.
- Recover changed internal folders from entry links and POST forms. Follow explicit
  migration notices, then known mirrors, the branded Yablom address page and FMHY's
  French entry only after endpoint failures. Validate query echoes and namespaces;
  do not retry mirrors for valid missing titles, ambiguity or filtered streams.
- Add ShareCloudy to the shared JWPlayer resolver registry. Preserve playback
  headers, signed URL bytes and actual caption tracks without executing player
  scripts. Keep the 720p minimum; unknown dimensions/audio remain unlabelled.
- Add native TV 1.0.0/mobile and Node regression coverage for new lookups,
  search-path/domain recovery, strict matching, cached addresses, caption headers
  and measured/unknown quality. Record live media samples and upstream absences.

## 1.7.0

- Apply HLS inspection and the minimum resolution before fallback decisions.
  Filtered primary/Vidzy sources can now trigger recovery; empty catalogue results
  can continue through known mirrors within the same request/time budget.
- Replace fixed host/backup attempt caps with a shared three-result target,
  three-worker batches and the existing 24-request/45-second between-request
  budget. Failed/filtered candidates do not satisfy the target. Prefer direct
  media and configured host families; preserve French and VOSTFR opportunities.
- Merge duplicate player captions and duplicate media results across batches.
  Retain unknown resolution without a quality field or invented language. Reject
  unavailable HLS masters and HTTP 200 bodies that are not HLS playlists.
- Add the independent Movix / Extra worker for custom, Omega and SwiftFlow
  public protocols. Use explicit TMDB-to-IMDb correspondence for Omega and reject
  mismatched cached TV entries, missing coordinates and wrong season/episode.
- Add native SeekStreaming API/AES-CBC handling, prefer its cfNative transport,
  and centralize observed aliases. Vendor unmodified MIT aes-js with its full
  notice in generated bundles. No WebCrypto, DOM, timers or external proxy.
- Diagnose SwiftFlux's verification-gated direct files without requesting the
  gated resolver. Unsupported frames and challenge-only host pages remain skipped;
  a captcha script does not hide otherwise exposed public player data.
- Add selection/inventory diagnostics for attempts, duplicates, failures,
  unavailable/filtered results, language coverage, remaining candidates and stop
  reason. Document the result target, host priority and central URL configuration.

## 1.6.0

- Review Movix College and the official Movix directory: College/Cash currently
  share the official Dog application's frontend and API. Update the default API
  to Dog; retain a known API mirror and lazy official-directory/site discovery.
- Add independent public Wiflix, FStream and Coflix protocol clients as
  Movix / Catalogues. Use exact TMDB/episode matching, shared host resolvers,
  language interleaving and deduplication before the six-player cap. Keep this
  work in a separate provider so the existing fast API path stays independent.
- Recover the direct API domain through its status endpoint only on endpoint
  failures. Avoid alias retries for structured missing titles or upstream errors;
  log pending responses without polling and stop API fanout on rate limits.
- Centralize directory, API, site, catalogue selection and additional observed
  player aliases in config/endpoints.json. Cache endpoint metadata only; retain
  fresh signed URLs, 720p minimum, unknown-resolution policy and native TV runtime.
- Preserve explicit subtitle names and use Français for otherwise unnamed French
  tracks. Review public Movix protocols independently; copy no website source.

## 1.5.4

- Rename the plugin repository display name to Sources FR and the internal npm
  package to nuvio-fr-plugin. Keep provider IDs stable for installed phone/TV
  updates. Streaming, domain configuration and the 720p policy are unchanged.

## 1.5.3

- Set a repository-wide 720p minimum for all active providers. Keep unknown
  resolutions without a placeholder; filter after HLS metadata corrects hints.
- Apply filtering to the final list without media probing, timers or additional
  mirror searches. Adaptive masters keep their complete audio/subtitle tracks.
- Centralize Vidzy/Uqload player-domain recognition alongside the other hosts in
  config/endpoints.json. Add a field-by-field URL guide and rebuild instructions.
- Add shared-provider and TV/mobile regression coverage for 720p inclusion,
  unknown-resolution retention, measured quality correction and domain changes.

## 1.5.2

- Omit unknown resolution text and the quality field instead of displaying
  Unknown. Keep host and language, for example Frembed / Voe | VF.
- Rebuild HLS labels from their available quality/audio metadata, so a newly
  measured resolution is inserted correctly after starting without a quality.
- Document TV 1.0.0's native Unknown suffix when the quality field is absent;
  the provider sends no placeholder or fabricated resolution.

## 1.5.1

- Replace the generic HD quality fallback with Unknown when no numeric resolution
  is available. The Office S1E1's VOE direct MP4 played at 720×404 despite being
  labelled HD; that label came from our default, not measured source metadata.
- Keep measured HLS tiers and explicit numeric quality hints. Do not copy HLS
  dimensions to a separate MP4 encode or add media-probing requests to discovery.

## 1.5.0

- Ported useful Nuvio_frembed protocols into a shared resolver registry used by
  Vidzy, catalogue recovery, Cpasmal backups and the new Frembed / Hosts provider.
  Coverage includes VOE F7, Dood public pass_md5, Uqload, Vidmoly, StreamWish and
  MixDrop, plus existing Vidzy/Lulu and a verified Vidara public API adapter.
- Added direct TMDB movie/episode discovery through Frembed, with modern/legacy
  source lists, exact season coordinates and bounded language-interleaved attempts.
- Frembed premium discovery is a final API-family recovery route. Its Matrix
  media URL overlaps the existing API's URL, so it is not a duplicate normal
  premium provider. Healthy primary/backup paths do not request a premium grant.
- Kept the existing stream headings, HLS audio/quality inspection and subtitle
  labels. Preserve signed URL bytes and protocol-specific headers; reuse automatic
  redirect bodies and already-fetched HLS masters. Support declared DASH media.
- Ported no timers, AbortController timeouts, WebViews or challenge solvers.
  Source lists use three workers and six distinct links, with a 24-request / 45s
  between-request budget. Dood CAPTCHA pages are reported and skipped.
- Added 22 regressions and TV/mobile fixtures for the new protocols and POST
  payloads. Live tests exercise seven movie/episode cases, the premium recovery
  helper and The Storm's five unique catalogue players.
- Added source attribution and GPL-3.0-only combined-distribution notices; the
  original Frembed repository remains unmodified.

## 1.4.4

- Derive quality labels from HLS video resolutions using the existing master
  read. Correct inflated release hints and understated API labels without extra
  requests; preserve the original adaptive master and its audio/subtitle tracks.
- Add configured LuluStream/Livavid public-player support to catalogue recovery
  and API backups using bounded decoding without executing player scripts.
  Resolve identical catalogue player buttons once.
- Exclude JWPlayer's Upload captions placeholder from subtitle results. Genuine
  caption labels and integrated subtitle playback remain unchanged.
- Reproduced Jujutsu Kaisen 0's qualities: Vidzy and both catalogue buttons serve
  864×360; the API source serves 1920×800. Its French subtitle file already contains
  264 duplicate cues upstream, including the reported line at 12:28.289.
- Added quality, player-alias, Lulu fallback and placeholder regressions, plus
  both TV 1.0.0/mobile QuickJS fixtures and live source verification.

## 1.4.3

- Inspect actual HLS audio languages on every source path: Vidzy, API, catalogue
  recovery and backup players. Opaque filenames no longer hide declared MULTI
  audio. The previous filename parser was generic, but could not detect this case.
- Inspect even when explicit captions already exist; merge subtitle files without
  changing labels such as Français. Keep original media/audio playlists intact.
- Deduplicate language aliases and codec groups; ignore unused audio groups.
  Correct misleading hints when languages are known, and log unknown metadata.
- Reuse metadata only within a lookup. One additional small master request per
  distinct Vidzy/backup HLS source; normal API lookups remain two requests.
  No subtitle-body/segment downloads or native timer jobs during discovery.
- Added opaque-name, misleading-label, fallback, caption-merge and header/cache
  regressions. Live verification covers ten films/episodes through TV 1.0.0 and
  mobile JS fixtures, including Chihiro's French/Japanese audio and absent captions.

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
