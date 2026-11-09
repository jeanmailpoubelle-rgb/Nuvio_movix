# Changes

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
