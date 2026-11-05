# On-device episode translation — phone preview

Sources FR **1.9.0-beta.3**, Anime-Sama **1.3.0-beta.3**, diagnostic **1.0.0-beta.2**.
Stable main remains Sources FR1.8.16 / Anime-Sama1.2.9. The user subsequently reported working phone tests for the main API and
Anime-Sama across Hunter, Jujutsu and Apothecary; per-host/provider coverage is
not exhaustive. Other Sources FR entries remain unverified against working media.
No hosted service or new TVDB API key is introduced. Series-ID conversion already
exists; this preview validates episode identity before backend/source selection.

## Phone installation and first test

Keep the TMDB-only control profile on **stable**. Use a separate preview profile
with AIOmetadata: TMDB movies/regular series, TVDB **Aired Order (Default)** anime,
**Anime Detection Override enabled**, and IMDb anime stream compatibility IDs.
The override is essential when normal series use TMDB: the inspected AIOmetadata
code otherwise treats IMDb/TMDB requests as regular series even when an anime
catalogue uses TVDB. Ensure the personal manifest belongs to the
configuration installed in that profile. The plugin cannot discover the profile's
metadata provider or URL automatically.

Install these three **plugin repositories** using Add plugin/repository:

- [Sources FR Preview](https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/aiometadata-input/manifest.json)
- [Anime-Sama Preview](https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/aiometadata-input/plugins/anime-sama/manifest.json)
- [Correspondance — Diagnostic Preview](https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/aiometadata-input/plugins/episode-diagnostics/manifest.json)

A repository installation URL and a personal **AIOmetadata manifest URL are
different settings**. A beta version badge proves installation, not configuration.
The GitHub Actions secret configures cloud tests only, never your phone.

1. In Plugins, initially leave **only the main API entry** enabled for Sources FR
   Preview and **ANSEmbed** enabled for Anime-Sama Preview. Disable the other
   playback entries during this first test so their different setup cannot obscure
   the result. Names in each repository stay identical for merged stream sorting;
   their descriptions identify the entries.
2. Open the **settings gear** on each of those two entries. Choose **Ma
   configuration AIOmetadata**, paste your personal AIOmetadata installation URL
   into **Manifeste personnel AIOmetadata**, leave query format **IMDb**, leave the optional source-map JSON empty, and Save.
   Do not paste the GitHub repository URL into that field or share the personal URL.
3. Configure the diagnostic entry's own gear with the same personal manifest.
   Its settings are independent. Leave **Liste attendue** at **TVDB — anime**. Leave its target fields empty for the default
   **Hunter × Hunter S2E72**, or enter TMDB series ID46298, season2, episode72.
   Save, then press **Tester le fournisseur** on the diagnostic entry.
4. Read the report: configuration, diagnostic request, selected AIO episode,
   validated stream ID, TMDB/Nuvio coordinates, Cinemeta coordinates, Anime-Sama
   source position, and summary. Success says **CORRESPONDANCE OK**. Failures name
   their stage/code. These are explicitly non-playable diagnostic rows visible
   only in Test provider; the diagnostic advertises **no media types** and never
   appears in episode stream searches.
5. Open the real Hunter episode in Nuvio. Real preview streams append a short
   annotation, for example **[AIO S2E72 → S2E130]**. This records the actual incoming
   request and that stream's backend coordinates. Anime's annotation uses the
   canonical metadata target; its exact source group/position is in the report.
   Confirm the episode content as well as stream availability.

Expected Hunter examples for this Aired Order configuration:

| Selected episode | Main API target | Anime-Sama source |
| --- | --- | --- |
| S2E1 | S1E59 | season1, episode59 |
| S2E22 | S2E80 | season1, episode80 |
| S2E62 | S2E120 | season1, episode120 |
| S2E63 | S2E121 | season1, episode121 |
| S2E72 | S2E130 | season1, episode130 |
| S2E78 | S2E136 | season1, episode136 |

The diagnostic target is explicitly configured, not a recording of the last
playback click. The annotation on a real stream is evidence of the actual click.
An empty playback result cannot prove which stage failed; run the diagnostic for
that exact episode and report its stage/code. A successful mapping report does
not certify host availability or correct decoded video. Do not use the playback
entries' Matrix-only test button for anime; use the separate diagnostic entry.

## Configuration and isolation

The main API entry and Anime-Sama default to **AIOmetadata** in this preview.
Missing/invalid personal URLs stop before requests. Older saved **native** settings
remain an explicit control option, not automatic detection; choose AIOmetadata for
this test. Nuvio may display a select default without persisting it: URL-only saves
still activate AIOmetadata in these test entries. Optional root entries keep their
existing modes; expansion is outside this first two-entry device proof.

Phone settings are keyed by the repository-prefixed scraper ID, without a profile
argument in the inspected app. Stable and preview installation URLs differ; avoid
installing both in the same test profile. Each entry still needs its own settings.
Settings are local; no phone-to-TV synchronization is assumed. The current renderer
does not guarantee password masking. Keep the personal URL private.

TV1.0.0 can execute injected runtime settings but has no provider-settings editor
or personal-field sync. The latest beta checked (1.1.0-beta.11) syncs the grouping
toggle only. See [the pinned-source investigation](investigations/tv-plugin-settings.md).
Repeated phone configuration is accepted as a one-time setup; no new service is
needed to remove it. Practical TV configuration remains blocked.
No credential or personal manifest is compiled into any public bundle.

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

Explicit native-control mode, movies and specials add **zero AIOmetadata requests**. Configured TVDB
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
Anime-Sama source positions on fourteen episodes across three series, plus fourteen
executions of the actual phone report. It deliberately
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
Phone tests also cover missing settings, URL-only saves and both literal native
bridges for the actual diagnostic bundle (`tests/test_preview_phone.py`). The
generic native fixtures are `input-order`, `input-order-72` and
`input-order-mismatch`. Fixtures/test expectations contain public example IDs;
production code has no Hunter/Jujutsu/Apothecary mapping table.

## What can break

| Symptom | Inspect / repair | Verification |
| --- | --- | --- |
| `INPUT_METADATA_PROVIDER_MISMATCH` | The IMDb/TMDB query returned a different metadata provider; enable Anime Detection Override for the agreed TVDB anime setup and ensure the correct personal config is saved | Report shows actual provider; Anime-Sama refuses a TMDB input list in this preview |
| Preview installed but no translation | Confirm the personal URL was saved in each gear, not merely in Add plugin or GitHub | Diagnostic configuration row, then actual stream annotation |
| Diagnostic missing from episode links | Intended: it is settings-only with no supported media types | Run its Test provider button |
| Blank/short report or timeout | Native 60-second job limit or metadata/source outage | Use one episode; inspect stage codes, retry fresh, do not infer mapping success |
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

Native control regressions explicitly select `episodeMetadataSource=native` in
their harness settings. They test the retained extraction behavior, not fresh
preview configuration. Separate actual-entry tests pass empty runtime settings
and verify zero requests/explicit failure; URL-only tests verify the app’s
unsaved-default behavior. Audit reports distinguish `native-control` from
`aiometadata`. Do not equate a control audit with a configured phone test.
