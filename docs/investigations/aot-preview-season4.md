# Attack on Titan season 4 preview investigation — 2026-11-05

User report: configured AIOmetadata/TVDB returns no Anime-Sama S4E1 links and
omits Sources FR’s main API result; a native TMDB profile works. Stable is untouched.
Installer-app work remains paused.

## Confirmed cause

Identity is TMDB 1429 / IMDb tt2560140 / TVDB 267440. The configured AIOmetadata
response has no extractable TVDB episode ID for S4E1–E13. Its French episode names
do not match the English target names, so the previous strict adapter rejected
these rows. Later S4 rows have usable IDs. Anime-Sama still has a direct season4
route and an explicit trusted TMDB link at `/catalogue/shingeki-no-kyojin/`.
This is an input-identity failure, not a source-title or host discovery failure.

[Configured facts run](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/42092812963)
retains public IDs, selected names/dates and target facts, never private manifests.
Local native controls returned one reachable main API stream and two reachable
ANSEmbed streams. The screenshot’s other five labels appear in both lists;
labels/counts alone do not establish their episode content or saved settings.

## Generic repair and safeguards

`src/input-metadata.js` falls back only when a TVDB episode ID is absent and
ordinary title/date matching failed. A validated series IMDb ID, exact unique
IMDb stream ID and unique release within the existing 24-hour tolerance must
agree across the configured and Cinemeta inventories. The canonical row’s own
ID must agree with its coordinates. It then maps the canonical title/date or
TVDB episode identity into each backend’s verified target catalogue. Displayed
input coordinates need not equal the compatibility ID suffix. No title-specific
rules, season offsets, counts-only conversion or blind same-coordinate retry.

Missing dates, duplicate dates/IDs, foreign series and contradictory existing
TVDB IDs retain rejection. Healthy ID-backed paths add no requests. This new
path reads Cinemeta once per lookup, reusing it across backends; for the sampled
S4E1 it replaces the external-ID lookup. No host budgets or media filters change.
Both plugins and the settings-only diagnostic compile the same adapter.

## Maintenance and remaining gaps

Fixtures cover S1E1, S3E22, S4E1–E17 and S4E28, plus existing Hunter/Jujutsu/
Apothecary regressions. Exercise `aot-input` on both literal native wrappers and
run the private input metadata workflow. Its paired `aot-native-4-1` and
`aot-input-4-1` media sample checks installed main/Frembed/ANSEmbed entries.
If this breaks, inspect input provider/stream-ID/date schemas, Cinemeta identities,
localized canonical titles, target IDs and source positions independently.

The two final chapters are separate: AIO/Cinemeta S4E29/30 map to TMDB S0E36/37.
The current positive-season target adapter does not support that conversion;
do not claim this repair fixes those specials or guess regular S4 slots.
Unverified catalogue backend layouts remain skipped in configured mode. Physical
phone playback/content confirmation remains distinct from native-harness checks.
