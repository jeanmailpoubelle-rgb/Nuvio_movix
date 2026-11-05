# Changes

## Sources FR 1.8.16 / Anime-Sama 1.2.9 — stable rollback, 2026-11-05

- Restore the pre-Hunter production code from `6f775ea` (1.8.13 / 1.2.6).
  Remove the scoped Hunter policy, separator follow-up and associated fallback
  changes. Existing ID conversion, generic missing-only recovery, host resolvers,
  independent entries, quality/audio ordering and speed defaults are preserved.
- Keep higher release numbers for stable updates. Retain historical diagnostic
  evidence; translation adapter development stays on the `aiometadata-input`
  preview branch and must not be merged into stable without a separate release.
- This restores previous behavior, including known numbering mismatches when a
  successful backend inventory uses a different order. It does not fix those
  mismatches or alter artwork. Private AIOmetadata secrets remain diagnostic-only
  on stable and are never compiled into provider bundles.


## Sources FR 1.8.15 / Anime-Sama 1.2.8 — 2026-11-05

- Share exact standalone `x`/`×` episode-title normalization. Hunter × Hunter
  S2E72 now uniquely matches continuous E130; retain series identity, words,
  order, date tolerance and ambiguity guards, with no title-specific offsets,
  fuzzy aliases or new HTTP requests. Scoped inventory coverage becomes 75/78.
- Stop primary/extra worker fallback after an unverified scoped match. The
  previous E72 live primary-worker trace reached an unmapped premium fallback.
  Keep other independent entries and post-match media-error recovery unchanged.
- Add E72 plus fallback-suppression regressions to both literal native suites,
  owned maintenance cases and current live verification. E27/E32/E50 remain
  strict unmatched rejections. Artwork, quality, audio/captions and scope stay.
- 345 Node / 49 maintenance tests and both native suites pass. Live E72 primary
  audits pass on both wrappers; Anime-Sama returns nine links per wrapper from
  source index 129. S2E63 retains five alternatives. Unmatched E27 stops primary
  and extra workers after two reads. Custom's player remains unavailable; optional
  host failures and physical-device playback remain coverage limits.

## Sources FR 1.8.14 / Anime-Sama 1.2.7 — 2026-11-05

- Add shared, reversible `config/episode-orders.json`: Hunter × Hunter 2011
  season 2 explicitly uses Cinemeta-compatible incoming episode coordinates. This is
  an input-order preference, with no hardcoded episode offsets. Other titles,
  movies, specials and unverified backend policies retain existing behavior.
- Sources FR primary/Custom map a unique title/release-date identity before
  querying their verified continuous inventories, so a successful wrong-number
  response cannot bypass conversion. Ambiguous/unavailable mapping fails closed
  for that backend; original request context and independent backups remain.
- Anime-Sama matches the declared input episode against the complete target
  metadata, validates its regular layout and selects the matched source ordinal
  in each edition. Remove number/position ambiguity on this scoped path. Keep
  all six host entries, all resolutions, audio/captions and artwork unchanged.
- Add seven Hunter boundaries, ID/conflict/count-change/rollback regressions,
  literal TV/Mobile fixtures, owned live audits and maintenance documentation.
  Fresh scoped costs are two metadata reads per Sources FR lookup and one added
  read per Anime-Sama entry; unrelated controls retain their request counts.
- Scope this initial trial to S2, preserving working S1/S3 behavior. A whole-S2
  metadata scan verifies 74/78 unique matches; E27/E32/E50/E72 have title
  differences and fail closed on the scoped path. Add rejection regressions;
  do not use dates or season counts alone to force a correspondence.
- 343 Node / 49 maintenance tests and both full native fixture suites pass.
  Live mapping passes all seven boundaries in both wrappers. Full host probes
  retain upstream failures: S2E63 ANSEmbed 403, current Custom player 404, and
  optional control media failures. Five S2E63 alternatives remain. No physical
  Android playback claim. Tagged rollback: `before-hxh-order-2026-11-05`.

## Maintenance investigation — Hunter × Hunter, 2026-11-05

- Follow up on S2E62/E63: reproduce the E124 → E63 discontinuity, verify
  Cinemeta/MetaHub's 404 and wrong-image redirects independently of Nuvio, and
  inspect Mobile's coordinate-only enrichment. Compare six anime inventories;
  differing episode orders are broader than one title. Production remains unchanged.
- Reproduce S2E22 → E84 and S2E78 → E78 in Anime-Sama from real public metadata;
  TVDB/Cinemeta identify E80 and E136 respectively. Record the conflicting orders
  and Sources FR's successful-inventory recovery limitation. No guessed offset,
  production change, plugin release or playback claim.

## Maintenance investigation — VOE direct MP4, 2026-11-05

- Record eight movie/episode lookups, five readable VOE MP4s, ranged requests,
  full metadata and short remote audio/video decoding for two controls. Nuvio's
  reported playback failure remains unconfirmed; do not hide valid sources or
  claim an app fix. Keep production bundles, versions and filtering unchanged.
- Add Your Name to the live verifier and an owned Frembed/VOE audit reference;
  document device diagnosis, bounded HTTP limitations and remaining coverage.

## Sources FR 1.8.13 / Anime-Sama 1.2.6 — 2026-11-02

- Reject Uqload's promotional homepage and its own static hero.mp4 asset when
  unavailable embeds redirect there. Fixes The Flash S1E1 returning a 2.667-second
  unrelated clip. Apply through shared host resolution, not a title-specific rule.
- Filter before qualifying-source counting so alternatives remain eligible. Add
  no requests, binary downloads or duration threshold; preserve real short media,
  external hero.mp4 filenames, playback data, quality policy and host coverage.
- Add root/Anime-Sama regression cases, both native homepage/fallback fixtures,
  the Flash maintenance reference and sanitized before/after live evidence.

## Sources FR 1.8.12 / Anime-Sama 1.2.5 — 2026-11-02

- Normalize exact full English language names in HLS LANGUAGE metadata alongside
  existing ISO codes. Fix the Spider-Verse Vidara playlist declaring french and
  english, now correctly labelled MULTI. Deduplicate languages across codec/alias
  variants; unknown tracks remain inconclusive. Do not infer from track count or
  arbitrary display NAME labels.
- Share the parser repair across both plugins without extra requests, MP4 label
  probes, playback/header changes, filtering or sorting changes. Preserve blank
  quality/audio when upstream metadata is unavailable.
- Add generic full-name regressions, native full-name playlist fixtures, an owned
  maintenance movie case and live TV/Mobile media checks; document metadata gaps.

## Sources FR 1.8.11 / Anime-Sama 1.2.4 — 2026-11-02

- Give all six active Sources FR entries the same display name and merge their
  completed links by resolution, then MULTI/VF/VOSTFR/other. Unknown quality stays
  last; ties use manifest order then stable entry position. Encode priorities
  invisibly, including single results; preserve provider/host wording through
  sourceLabel and identify entries in their descriptions. Keep IDs/enabled states.
- Share the existing Anime-Sama priority/encoding helpers with Sources FR.
  Anime-Sama retains its own candidate ties and unchanged presentation/playback.
- Preserve 720p filtering/unknown qualities, all discovery budgets, URLs, headers,
  audio and subtitles. Add no network requests. Add merged compiled-entry tests,
  native ordering assertions and readable priorities in live reports.

## Anime-Sama 1.2.3 — 2026-11-02

- Read canonical TMDB/IMDb identities from Anime-Sama's external-links section.
  Confirm differently named source pages without fuzzy title matching; reject
  conflicting IDs and distinguish movies from series. Fixes Attack on Titan's
  English-title lookup of the Shingeki no Kyojin catalogue.
- Retain numeric input identity and verified Cinemeta IMDb-to-TMDB correspondence
  for source matching only. Preserve primary dates/episodes and normal year
  checks. External-link parsing adds no requests. Sources FR remains unchanged.
- Add parser/matching guards, native identity fixtures and owned maintenance
  references for numeric/IMDb S1E1 requests on both wrappers.

## Anime-Sama 1.2.2 — 2026-11-01

- Recover catalogue/source spelling differences through alternate Cinemeta
  names only when the same explicit IMDb identity is confirmed. Preserve the
  primary episode inventory, numbering and dates; retain ambiguity/year guards.
  Fixes the 2013 Ace of Diamond lookup without title-specific production rules.
- Healthy exact matches add no requests. Recovery adds one alternate metadata
  read per independent entry and retries normal matching once. Sources FR
  1.8.10 and its generated bundles remain unchanged.
- Add generic identity/layout regressions, both native alias fixtures, an owned
  maintenance case and live checks of all installed entries on both wrappers.

## Anime-Sama 1.2.1 — 2026-11-01

- Remove visible compound sorting codes from installed stream labels. Encode
  the existing composable priority as leading default-ignorable Unicode
  variation selectors, retaining the app's ordinal quality/audio/candidate order.
- Preserve independent entries, host captions, source coverage and all playback
  data, with no extra requests. Sources FR 1.8.10 bundles remain unchanged.
- Add JSON/ordinal/visible-label regressions and clear decoded priority fields
  in maintenance reports. Check local JVM pixel rendering and both literal
  native wrappers; physical Android rendering remains untested.

## Anime-Sama 1.2.0 — 2026-11-01

- Replace the single all-host completion with six independent entries in the
  same dedicated repository: ANSEmbed, Smoothpre, VOE, Uqload, Vidmoly and other
  hosts/new aliases. A slow native request affects its own entry; Nuvio can
  display the others. Native HTTP cancellation remains an app responsibility.
- Keep one shared generated bundle, dispatching TV/Mobile prefixed IDs through
  central host-family configuration. Keep the legacy ID for ANSEmbed, fail closed
  on unknown IDs, and preserve the complete disjoint union of healthy choices.
- Preserve all resolutions, editions, original masters/headers/captions and
  shared resolvers. Use composable quality/audio/candidate ranks and identical
  entry names for correct merged ordering. Host descriptions identify settings
  cards; actual hosts remain below streams. Settings belong to each entry.
- Add the S2E22 audit/verifier reference, independent entry verification,
  partition/error coverage and exact entry filters. Hash the executed bundle
  snapshot. Record repeated pre-change lookups, the app's 60-second boundary,
  final multi-title checks, request overhead and remaining upstream failures.
- Sources FR stays 1.8.10 with unchanged generated providers. The exact failed
  phone request remains unreproduced; shared metadata/site outages can still
  affect all entries. This release adds no timer race or hosted helper.

## Anime-Sama 1.1.8 — 2026-11-01

- Use six workers after observing a promise-returning native bridge, retaining
  four for synchronous/unknown bridges and adding no capability preflight.
- Add a configurable 20-second cooperative mobile host budget. Stop subsequent
  reads/late responses after the current call settles; retain one global budget,
  invocation-local reuse, healthy links, all editions and no resolution minimum.
- Do not create timer races: the native app must provide cancellation to stop an
  in-progress HTTP call. A stuck native request can still delay final delivery.
- Add controlled asynchronous concurrency/deadline regressions and report
  `host-budget` in maintenance even if every candidate was visited. Model the
  Mobile bridge's promise return and concurrent live HTTP in the native harness;
  settle futures only on its interpreter thread. Keep CPU benchmark HTTP
  deterministic and distinguish all harness results from real Android timing.
- Release only the dedicated plugin; Sources FR 1.8.10 bundles are unchanged.

## Anime-Sama 1.1.7 — 2026-11-01

- Reuse already parsed matching slots within a lookup, guarded by edition path
  and complete script URL/query. Parse each language page once for script and
  labels; retain fresh extraction for cold, changed or failed cache entries.
- Skip known-incompatible Sendvid player requests on text-only TV before fetching
  them. Keep Mobile binary validation, all playable choices, both editions, no
  minimum resolution, ordering, existing validation and lookup limits.
- Add repeatable native processing/request benchmarks that require identical
  full playback data. Record live movies/episodes and CPU/network limitations;
  add regressions for parsing reuse, fresh lookups and reference fallback.
- Release only the dedicated plugin; Sources FR 1.8.10 bundles are unchanged.

## Sources FR 1.8.10 / Anime-Sama 1.1.6 — 2026-11-01

- Replace Yablom's retired Pirvab backup/search shortcut with the verified
  Dokimov site/form announced by both Pirvab and the branded address page.
  Preserve the working Xatobam primary and lazy migration/directory recovery.
- Avoid four discovery/migration requests on the isolated backup route. Keep
  matching, extraction, media freshness, headers, quality/audio rules and budgets.
  The dedicated Anime-Sama rebuild contains no behavior change.
- Add failing-before backup regressions on Node and literal TV/Mobile wrappers.
  Record completed keyed coverage, fresh maintenance findings, media/caption
  checks and remaining gaps. No credential is embedded in a provider or report.
- Teach the maintenance bridge/audit to classify the observed cloud tunnel 503
  signature as environment-blocked, including failed inventory queries that
  otherwise look like absent hosts. Preserve ordinary upstream failures and
  omit private error bodies; add regressions without new plugin requests.

## Sources FR 1.8.9 / Anime-Sama 1.1.5 — 2026-10-24

- Update Frembed's default origin from `.bar` to the first-party redirected
  `.uno` site. The retired origin leaves a stale Referer and produces API 403;
  the new base restores matching host inventories and ordinary premium grants.
- Keep API URL, Referer and premium Origin aligned through existing shared
  configuration. No new discovery preflight, resolver algorithm, episode policy,
  media cache, quality minimum or lookup-budget change.
- Add failing-before movie/episode regressions and literal TV/Mobile migration
  fixtures. Verify current-origin headers, identity, original masters, declared
  audio and the existing signed-URL/caption handling.
- Complete the deep maintenance baseline and focused recovery checks; update
  failure notes and sanitized evidence, retaining key-dependent and upstream
  host/media coverage gaps. Anime-Sama's independent source behavior is unchanged.

## Afterdark API feasibility — 2026-10-23

- Verify `afterdark.rest` advertises `atfr1026.mom` through its live-site button.
  Record the directory's HTML selector and distinguish it from a JSON status API.
- Identify the first-party TMDB/season/episode source API, grouped NDJSON client
  protocol and title-specific browser-verification proof. Anonymous movie/TV
  requests return 403 while public settings remain accessible; watch pages show
  verification. No playable-source performance, audio or subtitles are verified.
- Save sanitized research and maintenance notes. No provider, hosted helper,
  credentials, production configuration or plugin version changes.

## Sources FR 1.8.8 / Anime-Sama 1.1.4 — 2026-10-18

- Recognize the first-party catalogue's `luluvid.com` entry alias before host
  selection, allowing its supported LuluStream redirect to resolve. Preserve
  final-player playback headers, deduplication, original masters and measured
  audio/quality. No new preflights or healthy fast-API requests.
- Add a regression that fails against 1.8.7 and literal TV 1.0.0/mobile fixtures.
  Release the shared configuration in both independently installed plugins;
  dedicated Anime-Sama mapping, all-host policy and no minimum remain intact.
- Correct the dedicated anime verifier: budget stops, remaining published hosts
  and missing/inconsistent selection evidence cannot pass with a playable subset.
  Add three maintenance regressions, including an end-to-end verifier failure.
- Complete a 220-job deep baseline plus targeted native/live checks, verify
  directory/status/API relationships, add Dragons as a host-audit reference, and
  document failures, repairs, speed and explicit key/network/host coverage gaps.

## Sources FR 1.8.7 — 2026-10-18

- Share verified anime episode correspondence across all five series workers,
  with independent backend targets in central `episodeMapping` configuration.
  Preserve native coordinates for unverified layouts; keep movies and the
  dedicated Anime-Sama plugin's independent mapping unchanged.
- Detect either metadata layout when unambiguous, including reverse continuous
  to seasonal recovery. Reject overlapping coordinates identifying different
  episodes; permit an explicit input-catalogue setting. Keep strict series,
  unique-title/release matching and returned episode checks without fixed offsets.
- Preserve original working backups before new late retries. Healthy lookups add
  no requests. Share two metadata reads across recovering backends, retry each at
  most once, and preserve existing budgets, signed playback data and filtering.
  Pending/empty/gated responses, rate limits and failed media never justify a
  coordinate conversion. Deleted Vidzy embeds are distinct from missing routes.
- Add independent recovery audits for each enabled target, backend-specific
  episode assertions, unrelated-anime regressions for all hooks, literal TV and
  mobile fixtures, configuration migration notes and maintenance failure maps.

## Sources FR 1.8.6 — 2026-10-18

- Recover missing Movix Custom anime episodes from explicitly configured Cinemeta
  numbering. Match unique episode titles and release times through verified
  IMDb/TMDB series correspondence, then retry Custom's target coordinates.
  Reject incomplete/ambiguous metadata and retain strict API row identity checks.
- Fix the reported playing SeekStreaming entry: Cinemeta Jujutsu S2E1 now finds
  Custom S1E25; verify S2E2/E26 and S3E1/E48 as well. Earlier dead-media evidence
  concerned the separate primary API and did not establish Custom availability.
- Preserve the incoming context for all other backends. Healthy episodes and
  movies add no requests. Only a confirmed missing Custom regular episode can
  add two metadata reads and one inventory retry, within the original budget.
  Cache only correspondence, never streams; expose configuration and diagnostics.
- Add unrelated-anime and negative regressions, both native wrapper fixtures,
  owned maintenance references with episode assertions, an isolated audit helper,
  protocol/failure documentation and sanitized before/after live evidence.
  Dedicated Anime-Sama remains 1.1.3 with its own mapping and no quality minimum.

## Jujutsu native ID-conversion recheck — 2026-10-18

- Verify Cinemeta explicitly pairs IMDb `tt12343534` with TMDB `95479`, and
  separate series correspondence from episode-layout conversion.
- Reproduce the primary S2E1 HTTP 404 and unreachable cached S1E25 media using
  the correct numeric ID on both wrappers, independently of Nuvio conversion.
  Confirm the shared CDN's NXDOMAIN through two public DNS resolvers and retain
  the normal seasonal backups, media successes and TV HLS sample failure.
- Save sanitized evidence and refine the existing maintenance diagnosis.
  Production code and both plugin versions remain unchanged.

## Frembed Jujutsu S1E1 diagnosis — 2026-10-18

- Confirm Frembed's modern host inventory is empty for the exact S1E1 request
  on TV and Mobile; no host resolver or resolution filter removes a link.
- Verify its premium route and the normal fast API return the exact same signed
  1080p stream, with French/Japanese audio and two readable French HLS caption
  tracks. Keep the existing duplicate-avoidance and healthy two-request path.
- Save sanitized observations and add an owned deep-audit reference and repair
  notes. Production code and plugin versions remain unchanged.

## Cinemeta anime diagnosis and maintenance coverage — 2026-10-18

- Verify Jujutsu S2E1/S3E1 thumbnail HTTP 404s, primary S2E1 HTTP 404, unavailable
  cached S1E25 media and the backup's different episode layout. Preserve both
  successful and failed media samples in sanitized evidence.
- Document why a global season rewrite would discard available backups, why
  series-ID conversion is insufficient, and why stream plugins cannot repair
  metadata-page artwork. Record broader Bleach/One Piece layout differences and
  limits of the dedicated Anime-Sama missing-season recovery.
- Add an owned Sources FR maintenance reference and repair/failure notes.
  Production code remains unchanged: Sources FR 1.8.5 / Anime-Sama 1.1.3.

## Anime-Sama 1.1.3 — 2026-10-18

- Recover seasonal requests when Nuvio Catalog exposes only a continuous season.
  Keep its explicit IMDb correspondence and check Cinemeta for the exact requested
  season, including numeric TMDB inputs. Retain existing TMDB recovery on failure.
- Fix Jujutsu Kaisen S2E1 without a title override or fixed season lengths.
  Continuous S1E25 and seasonal S2E1 select the same published source position;
  verify the following boundary as well. Preserve missing-season/edition failures,
  no anime quality minimum, all-host coverage, host captions and final ordering.
- Keep valid primary metadata on its one-request path; consult the alternate
  catalogue only when required. Add reduced layout regressions, an unrelated
  anime fixture, TV/mobile source-position checks, live boundary cases and
  maintenance references documenting identity/schema/grouping failure modes.
- Audit expected source group/index coordinates across editions; a wrong episode
  cannot pass just because media is reachable. Avoid a diagnostic false positive
  caused by `.json` in successful HTTP request logs.
- Sources FR remains 1.8.5; no shared resolver or root provider changes.

## Sources FR 1.8.5 / Anime-Sama 1.1.2 — 2026-10-17

- Stop unreadable HLS playlists from blocking fallback. Native network failures,
  timeouts and HTTP 5xx/other failed requests now exclude that source for the
  current lookup, instead of retaining a cached API hint as a playable result.
  This also prevents unavailable backup players from consuming the result target.
- Fix Jujutsu Kaisen S1E20's stale primary links: both point at a domain returning
  NXDOMAIN. The normal provider now reaches its existing VOE backups. No CDN
  domain is guessed, rewritten or permanently blacklisted.
- Preserve readable playlists with unknown optional metadata, a healthy primary
  when another source fails, both plugins' resolution policies, final ordering,
  headers, complete HLS groups and the explicit inspection opt-out. Healthy
  discovery adds no requests; no DNS/media probes or timers enter production.
- Add network/HTTP-error and mixed-primary regressions, TV/mobile status-zero
  fixtures, a smoke/deep maintenance reference and a buffering investigation.
  Update both plugins for the shared HLS change and record live recovery checks.

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
