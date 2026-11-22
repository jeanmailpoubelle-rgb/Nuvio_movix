# Changes

## Android Anime-Sama Host 0.1.4 — actionable setup errors

- Accept Stremio installation URLs by normalizing the scheme to HTTPS without
  rewriting private path/query bytes, matching the native metadata adapter.
- Identify the selected empty manifest field, malformed personal URL or accidental
  GitHub plugin URL. Keep provider selection explicit, with no inactive fallback.
- Separate configuration validation, encrypted storage and service-start errors;
  show persistent safe dialogs and retain typed values. Never show exception text.
- API keys are not verified during save; do not misreport a storage/start failure
  as a manifest error. Preserve update identity and TV keyboard/navigation.


## Android Anime-Sama Host 0.1.3 — Android TV setup

- Add a readable TV layout, large controls, explicit D-pad focus order and visible
  focus feedback, dialog selectors and remote-triggered keyboard editing.
- Add stable control IDs to preserve unsaved state across activity recreation;
  start saved settings directly and display/copy the private addon URL on TV.
- Keep phone support, Android application ID/storage, original update certificate,
  visible credential fields, screenshots and existing bounded idle/cache policies.
- Publish a proper TV launcher banner/icon. Test remote navigation, keyboard,
  selectors, state restoration and background local-server access on a TV emulator.


## Shared distributions — native and + on main

- Keep Sources FR 1.8.23 and Anime-Sama 1.2.17 at their existing native URLs;
  generate them and the mapped variants from the same source. Native bundles
  cannot enable the private adapter, including through stale saved settings.
- Rename mapped products Sources FR+ (1.9.0-beta.21), Anime-Sama+
  (1.3.0-beta.22) and Sources EN+ (0.1.0-beta.21). Retain IDs and host partitions.
- Add canonical + paths, generated legacy-URL exports, and daily EN publication
  from main. Preserve immutable mapping revisions and installed relative paths.
- Move Android source to android/addon-host without changing app identity,
  storage or signing. Published APK remains 0.1.2; hosted FR/EN are future work.
- Replace the installation overview with copyable URLs; add architecture and
  handoff documents. Keep dated investigations/evidence and unmerged worktrees.

## Android Anime-Sama Host 0.1.2 — selective caches and lower idle residency

- Keep one addon and full host coverage, with no link preloading or polling.
- Cache verified series-ID conversions for six hours; keep title details for
  five minutes and episode inventories for 30 seconds. Bound metadata data/keys
  to 4 MiB/24 entries and verified IDs to 64 KiB/128 entries, with lazy expiry.
- Let idle HTTP/configuration threads expire; release caches/idle bytecode on
  Android memory pressure while keeping the server available.
- Add local resource/cache counters and an optional one-shot idle CPU/PSS sample.
  No physical TV idle-performance claim; no video URL/token cache.
- Exercise clock-controlled expiry, failed/empty identity freshness, pressure
  recovery, no autonomous preloading and idle-worker revival.

## Android Anime-Sama Host 0.1.1 — IMDb input repair and requested UI changes

- Resolve the hosted addon's incoming IMDb series ID to a verified TMDB ID before
  invoking the unchanged engine. Preserve displayed episode coordinates for its
  existing mapping layer; reject absent/ambiguous identities and invalid keys.
- Reproduce Xperience's missing TMDB stamp and the previous external-ID error
  with the full engine, then verify the corrected IMDb request succeeds.
- Display manifest/API-key fields in clear text and allow screenshots as requested.
- Build unsigned CI artifacts for verification; distribute locally signed GitHub
  release APKs with the original certificate for settings-preserving updates.

## Android Anime-Sama Host 0.1.0 — independent prototype

- Add a separate Android foreground service exposing a stream-only addon, with
  native touch/TV controls, private local configuration and optional LAN access.
- Reuse the checked-in Anime-Sama engine with coroutine HTTP, bounded lookup and
  network concurrency, socket cancellation, short metadata-only cache and
  in-flight request sharing. Keep media/token data fresh and playback unchanged.
- Add actual QuickJS/server/HTTP integration tests, Android build/lint workflow
  and phone/TV acceptance instructions. No native plugin versions or stable code
  change. Physical device support and real speed remain unverified.

## Preview TVDB series artwork — FR beta.20 / Anime-Sama beta.21 / diagnostic beta.20 / EN beta.20

- Recognize TVDB /banners/series/{show}/episodes/{episode}.jpg paths, restoring
  external episode identity for Vinland S1 and other titles using that format.
- Preserve existing URL-origin, mapping and batch-release checks; no image
  download, source offsets, settings migration or stable-main change.
- Compare configured Vinland seasons with native controls and synchronize
  sanitized metadata probes with the shared parser.

## Preview untouched selector defaults — FR beta.19 / Anime-Sama beta.20 / diagnostic beta.19 / EN beta.19

- Fix Hunter S1E1 and other Xperience requests failing before discovery with
  INPUT_METADATA_PROVIDER_REQUIRED when the displayed order default was unsaved.
- Apply auto for FR/Anime-Sama and TVDB Aired for EN at runtime, matching their
  settings UI. Preserve explicit choices, validation and saved manifest slots.
- Add native regressions and a private installed-entry S1E1 discovery check with
  both manifests and omitted select defaults; no extra production requests.

## Preview saved manifest switching — FR beta.18 / Anime-Sama beta.19 / diagnostic beta.18 / EN beta.18

- Save independent AIOmetadata and Xperience manifest URLs and switch with
  Manifeste actif. Both remain saved; only the active slot is queried.
- Preserve legacy single-manifest installations until dedicated slots are saved.
  Empty/invalid selected slots never use the other addon or the legacy URL.
- Update EN diagnostic presence and settings across all configured entries.
  Query/order controls and mapping/playback remain unchanged.

## Preview regular/special separation — FR beta.17 / Anime-Sama beta.18 / diagnostic beta.17 / EN beta.17

- Keep specials out of regular-episode release/title uniqueness checks in the
  independently verified Xperience official-episode fallback. Preserve global
  stream-ID uniqueness, regular batch/duplicate rejection and AIO behavior.
- Live probe identifies a special sharing Office S6E1’s release; fixtures cover
  that boundary on both literal runtime bridges.

## Preview official episode corroboration — FR beta.16 / Anime-Sama beta.17 / diagnostic beta.16 / EN beta.16

- Verify Xperience broadcast/date-only discrepancies through an official TMDB
  episode and its translations when existing proofs fail. Require exact stream
  identity, unique releases/titles and matching official episode/date.
- Keep the global24-hour guard and AIO behavior; add one request only on this
  guarded Xperience fallback, with lookup-local reuse and original budgets.

## Preview mixed-profile stream anchors — FR beta.15 / Anime-Sama beta.16 / diagnostic beta.15 / EN beta.15

- Reuse exact IMDb stream-ID and independently unique release evidence for
  Xperience auto matching when episode titles differ. Reject changed dates,
  duplicate IDs and repeated/batch dates; keep provider identity unknown.
- Add Office season-boundary controls and retain the initial failed evidence.

## Preview mixed Xperience profiles — FR beta.14 / Anime-Sama beta.15 / diagnostic beta.14 / EN beta.14

- Add verified automatic input matching to FR/Anime-Sama for TVDB-anime/TMDB-series
  profiles. Keep an absent provider unknown and require independent episode proof.
- Retain explicit TVDB/TMDB options and EN’s explicit AniBridge input order.
  Expand private live checks to regular-series boundary controls.

## Preview Xperience input — FR beta.13 / Anime-Sama beta.14 / diagnostic beta.13 / EN beta.13

- Add an explicit Xperience input adapter and declared episode-order setting.
  Preserve existing AIOmetadata settings/defaults and independent per-entry setup.
- Require unique trusted TVDB episode evidence for Xperience TVDB input; retain
  series/stream identity and backend mapping guards. No inferred count offsets.
- Reuse FR/Anime-Sama correspondence and EN AniBridge/veto/playback policies;
  show Xperience mapping captions and expose private-workflow coverage.
- No new adapter requests or stable-main changes. See verification for live scope.

## Xperience compatibility research — 21 November 2026

- Confirm public controls for TVDB anime, IMDb stream IDs and TMDB regular
  series; record defaults and the pending private metadata-contract checks.
- No production adapter or compatibility claim; preserve current AIOmetadata
  behavior until episode/provider/identity responses are verified.

## Documentation and maintenance refresh — 21 November 2026

- Reconcile current manifest versions, AIO setup, per-entry settings and metadata
  compatibility. Record Xperience as uninvestigated, not a supported adapter.
- Document EN MULTI/SUB/DUB layout, AniBridge authority, optional ani.zip veto,
  silent missing mappings and gated daily data updates in the shared guides.
- Separate resolved historical EN failures from active limitations, update the
  maintenance inventory/checklist and correct native/Preview scope. No runtime,
  manifest version or generated bundle changes; no new live host-health claim.

## Sources EN Preview 0.1.0-beta.12 — visible stream editions

- Show SUB or DUB beside quality for single-language streams; retain MULTI for
  verified multi-audio masters. Audio/subtitle details and playback are unchanged.

## Sources EN Preview 0.1.0-beta.11 — quiet missing mappings

- Leave ordinary results empty when no usable AniBridge mapping exists.
- Keep informational warning rows for genuine contradictions only; diagnostic
  settings still expose missing-mapping codes. Daily updates and playback paths
  are unchanged.

## Sources EN Preview 0.1.0-beta.10 — AniBridge authority, daily data and conflict warnings

- Use AniBridge episode ranges; ani.zip only vetoes supplied contradictory facts.
  Missing/partial/unavailable ani.zip records do not block video. Keep actual
  conflicts and missing/ambiguous AniBridge rules blocked.
- Show clearly marked non-playable warning rows with public conflict details;
  gear toggle can disable them. No fabricated quality/audio or playback URLs.
- Add one small current-revision lookup and immutable mapping snapshots, with a
  compiled baseline for delivery failures. Never retry older maps to hide a veto.
- Add gated daily data publication to the preview branch; timestamp-only updates
  do not create duplicate snapshots. Stable plugin code is unchanged.
- Extend native/audit checks, updater failure/immutability coverage and new-title
  references. Warning rows are separated from playable-source audit counts.

## Sources EN Preview 0.1.0-beta.8 — independent Beta multi-audio entry

- Add Ani.pm Beta as an independent playback entry in the same EN repository.
  Configure its own AIOmetadata gear once; existing Standard settings remain.
- Resolve exact corroborated AniList episodes through Beta availability/copy and
  Settlar. Preserve one complete signed master, all audio/quality tracks, native
  HLS type and named FR/EN subtitles. Summarize original/French/English audio.
- Keep Standard Sub/Dub independent with zero added requests. Sort by resolution
  then MULTI/audio. Validate expiry, origins, media routes and referenced groups;
  unavailable Beta episodes never change the episode or suppress Standard.
- Extend native fixtures, diagnostic selection/visible absence and live inventory.
  Live audits now check preferred alternate audio playlists/segments as well as
  video/captions; Beta phone playback/track switching remains unverified.

## Sources EN Preview 0.1.0-beta.7 — explicit native HLS playback type

- Beta.6 phone lookup now returns two masters200, but both native streams fail
  playback. Settlar masters have no filename extension. Mobile ignores our
  `format` field; it imports `type` into the player's streamType.
- Add `type: "hls"`, retain `format: "m3u8"`, preserve exact signed masters and
  headers, and add no requests or proxy. No mapping/language policy changes.
- Use extensionless URL fixtures on both literal wrappers. Require the player
  type contract in the EN live audit, including a missing-type negative control.
- Phone playback after this repair remains to be confirmed.

## Sources EN Preview 0.1.0-beta.6 — native request identity and denial evidence

- The phone beta.5 report still denies session and embed-document requests with
  403 despite successful browser playback. Cookie recovery did not solve it.
- Use a complete browser User-Agent consistently instead of bare Mozilla/5.0;
  keep no-referrer session JSON requests and explicit HTML Accept for recovery.
- Safely classify Settlar403 as an explicit browser challenge or HTML/JSON/text
  response. Report ACCESS_DENIED for document403 too; never show response text.
- Keep mapping, language policy and healthy request counts unchanged. Header
  alignment is not proof of a phone fix or browser TLS impersonation.

## Sources EN Preview 0.1.0-beta.5 — bounded Settlar session recovery

- The phone report confirms Hunter S2E72 mapping and Settlar HTTP403 on both
  audio channels. Keep the existing episode mapping and language policies.
- Match the player's no-referrer JSON request. On session403, read the validated
  embed document, retain applicable fresh cookies for that channel, and retry
  once; no additional requests on healthy paths or cookie leakage to CDNs.
- Report repeated refusal as EN_SETTLAR_ACCESS_DENIED. This is a bounded recovery
  attempt, not proof the phone's access restriction is resolved. Existing FR and
  Anime-Sama artifacts remain unchanged.

## Sources EN Preview 0.1.0-beta.4 — visible phone diagnostics

- Nuvio Mobile renders only the first eight test results. Beta.3 returned up to
  sixteen rows, hiding the failing playback stages below the visible prefix.
- Cap the settings-only report at eight rows, showing Bilan/Cause and failed
  network stages first. Keep existing settings and playback requests/policies.
- Exercise denied and successful reports against the eight-row limit and both
  literal wrappers. This fixes report visibility; the underlying phone playback
  cause still requires the visible stage/code.

## Sources EN Preview 0.1.0-beta.3 — phone empty-result investigation

- Add a settings-only diagnostic entry in the same EN repository: exact lookup
  stages/status, mapping target, key/config presence and safe failure codes.
  It shares playback code but cannot enter normal searches or return video URLs.
- Add the reported Hunter/Apothecary S1E1 cases to the dedicated live inventory.
  Distinguish403 access denial, wrong/missing configuration, mapping rejection,
  unpublished media and language filtering. No guessed availability repair or
  relaxed mapping/language policy; the phone's actual failing stage needs its
  own diagnostic evidence.

## Sources EN Preview 0.1.0-beta.2 — 2026-11-21

- Add a dedicated phone-first Ani.pm plugin, leaving all existing plugin bundles
  and stable releases unchanged. Configure its own personal AIOmetadata manifest.
- Map actual TVDB/TMDB episode coordinates to AniList with pinned, sharded
  AniBridge v3 data and ani.zip episode corroboration; no title-specific offsets.
- Preserve original HLS masters and track groups, fresh session URLs and headers.
  Keep original/French/English audio and FR/EN sidecars, no quality minimum.
  Hide original-only streams without full preferred subtitles.
- Display quality above audio/subtitle inventories and optional changed numbering.
  Add native fixtures, mapping expectations, maintenance inventory and a dedicated
  private live workflow. Known gaps and setup are in `docs/sources-en.md`.

## Maintenance — 19–20 November 2026

- Refresh the third HTML catalogue mirror from `movix.zip` to its verified
  redirect destination `movix.free`; keep primary mirrors and fast APIs intact.
- Existing redirect recovery already works. This avoids reliance on the retired
  address without changing parsers, matching, resolvers, quality or request limits.
- Release Sources FR1.8.22 / Preview1.9.0-beta.12; rebuild shared config in
  Anime-Sama1.2.16 / Preview1.3.0-beta.13 and diagnostic1.0.0-beta.12.

## Maintenance — 2026-11-17

- Move Frembed’s default origin from `.uno` to its verified `.shop` destination,
  repairing inventory/premium requests rejected for stale Referer/Origin.
- Refresh Movix’s known website fallback to the official `.miami` site; preserve
  healthy fast-API endpoints, request counts, metadata and source policies.
- Update migration regressions, both runtime fixtures and maintenance evidence.
- Release Sources FR1.8.21 / Preview1.9.0-beta.11; rebuild/version shared config
  in Anime-Sama1.2.15 / Preview1.3.0-beta.12 and diagnostic1.0.0-beta.11.

## Maintenance — 2026-11-14

- Support Anime-Sama’s November12 inline player IDs and page-token link API;
  preserve legacy scripts, same-slot references, all host entries and resolutions.
  Bind each resolved URL to its advertised host and keep tokens invocation-local.
- Update Yablom’s verified secondary address/search shortcut from Dokimov to
  Trimav; keep primary lookup and existing migration/identity checks unchanged.
- Correct provider-owned audit expectations for shared anime cases; keep
  upstream HTTP/media failures visible. No runtime request impact.
- Add native partition, token failure, sparse-position and audit regressions;
  document the protocol, failure boundaries and current live coverage.
- Release Sources FR1.8.20 / Preview1.9.0-beta.10, Anime-Sama1.2.14 /
  Preview1.3.0-beta.11 and rebuilt diagnostic1.0.0-beta.10.

## Sources FR selection speed — 2026-11-09

- Reuse candidate URL parsing and host classification during Sources FR support
  validation and priority calculation. Preserve distinct signed-identity/ranking
  decoding policies, exact playback data, request counts and selection limits.
- Add full installed-worker benchmarks and classification/signed-byte regressions.
  Healthy direct-API paths and Anime-Sama scheduling/selection are unchanged.
- Release Sources FR1.8.19 / Preview1.9.0-beta.10; version rebuilt shared bundles
  (Anime-Sama1.2.13 / Preview1.3.0-beta.10, diagnostic1.0.0-beta.10) for cache updates.

## Compact link presentation — 2026-11-09

- Put quality/audio in the heading and provider/host provenance in the lower
  caption, preserving native quality and invisible quality/audio sort priorities.
- Keep resolved audio in `audioLanguage` while omitting the duplicate native
  language caption. Preserve URLs, headers, audio/subtitle groups and source coverage.
- Preview shows changed AIO-to-reference coordinates below provenance; hide equal
  coordinates and retain full source-position diagnostics. No extra requests.
- Version both plugins on stable and Preview; validate real serialized bridge
  fields, metadata ordering and per-backend episode mapping.

## Anime-Sama processing speed — 2026-11-09

- Stable1.2.11 / Preview1.3.0-beta.8 defer normalization of unused episode-player
  URLs, preserving every slot, candidate, edition, header and validation step.
- Benchmark distinct unused player URLs and exact returned data on both native
  wrappers; preserve request counts, concurrency and quality policies.
- Diagnostic Preview1.0.0-beta.7 embeds the updated anime parser. Sources FR
  provider runtime/version is unchanged. See the current verification summary.

## Repository organization — 2026-11-09

- Add a current limitations/work list, including the remaining unlabelled
  Anime-Sama season-boundary gap and its supported cases and acceptance checks.
- Replace stale installation instructions with explicit stable/Preview manifests;
  add documentation, provider, playback and investigation indexes.
- Separate dated live evidence from executable fixtures and archive older
  release/verification notes, preserving recorded data and updating links.
- Remove unpublished comparison notes from the abandoned Movix accelerator
  exploration and check local Markdown links in normal CI. No runtime or
  manifest changes, plugin version bump or new network requests.

## Reference metadata recovery preview beta7 — 2026-11-07

- Recover missing Nuvio Catalog target episodes through its explicitly linked
  IMDb route, shared by Sources FR1.9.0-beta.7, Anime-Sama1.3.0-beta.7 and
  diagnostic1.0.0-beta.6. Haikyuu's TMDB route omits season2 while its IMDb route
  contains it. Keep stable unchanged.
- Require same-series identity, compatible overlapping episode inventories and
  normal episode/date validation. Reuse external-ID results and recovered source
  context; healthy/native/movie paths gain no requests. Recovery adds one metadata
  request, with no persistent cache or title-specific numbering rule.
- Add missing-inventory/negative regressions on both native bridges, public
  Haikyuu fixtures, paired maintenance controls and repair documentation. General
  Anime-Sama/TMDB season-boundary differences remain a separate task.

[Older records](docs/archive/changelog-history.md). Historical results do not guarantee current upstream availability.
