# Configured episode translation (test release)

**Preview only; device behavior unresolved.** Stable main has been rolled back to
Sources FR1.8.16 / Anime-Sama1.2.9, matching pre-Hunter1.8.13 /1.2.6 behavior.
The user reports Hunter S2 working only partially in Sources FR and not in
Anime-Sama with this preview. Harness mapping evidence below does not establish
end-to-end device correctness. Keep further translation work on previews; do not
merge this adapter or reintroduce the old Hunter override into stable as a repair.
The desired input setup is TVDB anime metadata with IMDb compatibility IDs;
series-ID conversion already exists, while episode-order correspondence remains
the problem to solve. Counts/absolute ordering alone need episode-identity checks.

Sources FR 1.9.0-beta.1 and dedicated Anime-Sama 1.3.0-beta.1 replace the
Hunter-specific trial with a shared opt-in adapter. The stable main branch is
unchanged. Native numbering is the default; there is no title-specific rule.

## Setup and migration

Nuvio supplies ID/type/season/episode, not the active metadata add-on URL. The
adapter therefore needs the **same personal AIOmetadata installation** used for
the displayed episode list. In each enabled entry's settings, select
**Ma configuration AIOmetadata**, paste the personal manifest installation URL,
and leave query format **IMDb** for the tested TVDB + IMDb-compatibility setup.
The query format selects the metadata request namespace; it does not assert an
episode order. TMDB remains an alternative query namespace. Movies bypass the
adapter and keep their existing discovery behavior. This adapter handles series
with whole-series IMDb/TMDB identity; season-specific Kitsu/MAL IDs remain on
the existing native Anime-Sama path and are not supported as configured input.

The inspected setup uses TMDB movies, TVDB series/anime and IMDb anime stream
compatibility. The adapter does not change that configuration or artwork.
Changing numbering providers requires updating the matching private setting.
Turn the source back to **Numérotation native** to disable the adapter. That also
removes the old Hunter override; overlapping input/target numbers are then
assumed native, so native mode does not repair a wrong successful inventory.

Settings are **local to each entry and device**. Configure all desired independent
entries. The current phone renderer does not guarantee password masking or
cross-device synchronization. Treat the URL as private. TV 1.0.0 can execute the
adapter with injected settings, but the inspected app has **no settings editor**
or proven phone-to-TV settings sync. This release does not solve that UI problem.
Do not embed a personal URL in a public bundle, manifest or repository.
The Actions secret is for cloud verification only; it does not configure devices.

Test branch installation manifests:

- Sources FR: `https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/aiometadata-input/manifest.json`
- Anime-Sama: `https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/aiometadata-input/plugins/anime-sama/manifest.json`

Use these instead of the stable installation while testing; running both can
produce duplicate entries. Keep stable URLs available for rollback.

## Identity and data flow

1. Load the public Nuvio Catalog reference using the app-provided TMDB identity.
2. Query the private AIOmetadata `/meta/series/<id>.json` route. Preserve configured
   path/query bytes, validate explicit series IDs and select one row by its
   displayed **season/episode fields**. Validate its stream ID separately: IMDb
   compatibility can rewrite the suffix without rewriting the displayed fields.
3. For TVDB input, read the explicit TVDB episode ID, or a narrowly parsed ID from
   a trusted TVDB artwork path. No image is downloaded. TMDB `/find` with
   `external_source=tvdb_id` provides the target episode coordinates. Validate the
   returned show and the target row; artwork hints also require matching dates.
   A date discrepancy needs independent Cinemeta corroboration of the same
   stream ID, TVDB episode ID and input date. No TVDB API key is required.
4. Translate independently to each backend's verified target layout before its
   inventory query. Cinemeta-target backends use the corresponding Cinemeta row.
   Strict unique title/date correspondence is a fallback when it can be proved;
   localization, dates alone or matching episode counts are not enough.
5. Anime-Sama applies the target metadata layout to its source groups. Continuous
   source positions require known absolute labels or complete preceding seasons.
   Unknown/ambiguous layouts fail closed instead of guessing an offset.

Shared pure code: `src/input-metadata.js`. Root HTTP and per-backend wiring:
`src/episode-mapping.js`. Anime HTTP/reference wiring:
`src/anime-sama/catalog-context.js`; source selection: `native.js` and
`episode-mapping.js`. Backend policies and public URLs live in
`config/endpoints.json:episodeMapping`; Anime public metadata URLs remain in
`config/anime-sama.json`. The private URL is never compiled.

Verified-policy backends: primary/direct/Custom/Frembed/SwiftFlow target Nuvio
Catalog, backup/Vidzy target Cinemeta. **In configured mode**, catalogue/premium/
Wiflix/FStream/Coflix/Omega are skipped because their alternate layouts have not
been verified. Native mode keeps their existing behavior. A policy is not proof
that every upstream series inventory agrees: new discrepancies need an owned
regression and backend evidence, never a blind policy change.

Missing input data, foreign IDs, ambiguous rows, unresolved episode identities or
unverified backend layouts return no link from that path. No fallback queries
unverified original coordinates after a failed translation. Successful mapping
followed by media failure still permits verified recovery. No signed streams or
private metadata are cached across lookups.

## Speed and verification

Native mode, movies and specials add **zero AIOmetadata requests**. Configured TVDB
translation normally adds three metadata requests per independent entry: public
reference, private input and external-ID lookup. Cinemeta targets or date
corroboration may add another read. Each lookup reuses those reads across its
backends; independent entries still repeat prerequisites. This trades extra
metadata latency for correct episode selection. Host scheduling, source limits,
minimum resolutions and display ordering are unchanged.

Configure repository Actions secrets `NUVIO_AIOMETADATA_MANIFEST_URL` and
`NUVIO_TMDB_API_KEY`, then run **Private input metadata check** on this branch.
`scripts/probe_input_metadata.py` reads whitelisted public episode facts.
`scripts/verify_input_metadata.py` executes generated-bundle adapters with both
literal native wrappers, checks all seven verified backend policies and
Anime-Sama source positions on nine episodes across three series. It deliberately
does not claim playable media from metadata-only checks. Runtime settings are
injected from secrets only; artifacts contain public IDs, expected/observed
coordinates, bundle hashes and source positions. Raw logs/bodies/private URLs and
keys are not uploaded. Artifacts expire after three days.

```sh
npm test
.venv/bin/python scripts/quickjs_check.py --all --runtime both
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
# With secrets available as environment variables, never CLI arguments:
.venv/bin/python scripts/verify_input_metadata.py --output reports/input/translation.json
.venv/bin/python scripts/audit.py --skip-offline --case hxh-primary-72 --runtime both
.venv/bin/python scripts/verify_anime.py --input-metadata aiometadata --case hxh-s2e72 --runtime both --report reports/input/anime.json
```

Maintenance references requiring this input are flagged `input_metadata`; the
planner retains only that boolean, and workers inject the URL from the runtime
environment. Missing secrets are reported as blocked coverage, not broken hosts.
The generic native fixtures are `input-order`, `input-order-72` and
`input-order-mismatch`. Fixtures/test expectations contain public example IDs;
production code has no Hunter/Jujutsu/Apothecary mapping table.

## What can break

| Symptom | Inspect / repair | Verification |
| --- | --- | --- |
| All configured series empty | Private config removed, changed route/auth, query namespace, rate limits | Private diagnostic; compare explicit returned series IDs |
| One episode empty | Missing/duplicate displayed row, rewritten/foreign stream ID, absent trusted episode ID or date | Public facts and `INPUT_METADATA_*` code; never guess by counts |
| External mapping empty | TMDB key unavailable, `/find` schema or external-ID mapping changed | Validate `show_id`, unique target and IDs with runtime secret |
| Artwork hint date conflict | Stale/wrong TVDB thumbnail or discrepant reference date | Same stream-ID/TVDB-ID/date corroboration; no artwork download |
| One backend absent | Unverified policy intentionally skipped, upstream inventory disagreement | `input-metadata-backend-unverified`, owned backend audit |
| Anime source empty | Source groups/episode layout changed or absolute position unverified | `anime-input-mapping` then `anime-episode`; verify actual source slot |
| Long series fail | Metadata body exceeds existing 1 MiB cap or runtime memory/request budget | Measure sanitized counts; fail closed on truncated JSON |
| Phone works, TV native behavior | Per-entry private setting absent on TV | App settings/editor limitation; no assumed sync |

To add a new metadata protocol, backend target or source layout, update code,
settings/docs, maintenance inventory, privacy tests, both native fixtures and
configured live evidence together. Do not relax identity checks to make an audit
pass. Physical phone/TV playback and remote-host health require separate checks.
