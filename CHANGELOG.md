# Changes

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
