# Changes

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
- Release Sources FR1.8.19 / Preview1.9.0-beta.9; version rebuilt shared bundles
  (Anime-Sama1.2.13 / Preview1.3.0-beta.10, diagnostic1.0.0-beta.9) for cache updates.

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
