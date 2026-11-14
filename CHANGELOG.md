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

- Separate setup, limitations, provider/playback guides, archived notes and dated
  evidence; update local links and add documentation validation to CI.
- Document Preview boundaries without copying its runtime code into stable.
- No runtime, manifest, fixture or plugin version changes.

## Stable Sources FR1.8.17 / Anime-Sama1.2.10 — 6 November 2026

- Backport verified Seek-to-TurboEmbed public-header migration and official alternate-title recovery for source discovery. Preserve native metadata/episode behavior, healthy legacy paths and existing settings.
- Keep AIOmetadata input/translation, preview settings and diagnostic plugin on the preview branch. Stable remains independently usable with the existing TMDB-focused setup.

[Older records](docs/archive/changelog-history.md). Historical results do not guarantee current upstream availability.
