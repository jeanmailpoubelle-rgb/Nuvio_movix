# Anime catalogue season layouts

## Reproduction and cause

On 17 October 2026 the dedicated Anime-Sama 1.1.2 plugin returned no links for
numeric TMDB 95479, TV S2E1, on both literal native wrappers. The user had switched
to Cinemeta metadata. Nuvio Catalog's same title response put all 59 published
episodes in season 1; Cinemeta split them into seasons of 24, 23 and 12, plus an
S4E1 listing. Anime-Sama published three regular seasons of 24, 23 and 12 episodes,
with a film between the first two. Both editions reset episode labels per season.

The continuous mapping was generic, ported from the original plugin. It counted
canonical VOSTFR slots without a Jujutsu-specific ID, offset or season-length rule.
The failure was earlier: title metadata rejected Nuvio Catalog's missing season
and discarded its explicit IMDb ID. Only requests already using an IMDb ID could
then reach Cinemeta. Numeric requests fell back to TMDB pages; the reproduction
ended after four requests with no source episode selection.

## Recovery and boundaries

The plugin now retains the catalogue's explicit IMDb correspondence before
checking for the requested season. When that season is absent, it tries the
configured Cinemeta endpoint for that ID and exact season. A contradictory IMDb
identity or missing season is rejected. Numeric requests retain their existing
TMDB API/public-page fallbacks if the alternate catalogue fails. No ID is guessed
from a title, and episode numbers are never borrowed from another season.

When primary metadata already has the requested season, the one-request path is
unchanged. Continuous S1E25 continues through canonical source counts; seasonal
S2E1 uses its own episode list and direct source season. Both select source
`saison2`, array index 0. S1E48 and S3E1 select `saison3`, index 0. Movies, specials,
lagging VF editions and dead players do not change the continuous offsets.
Missing source S4 and absent episodes/editions stay unavailable.

Nuvio's native call supplies ID, media type, season and episode. It does **not**
supply the selected metadata addon's name or its full episode list. The plugin
therefore validates those coordinates against available catalogues and source
labels; it cannot infer every custom split when two metadata layouts reuse the
same coordinates for different actual episodes. Existing explicit `sourceMap`
overrides remain authoritative for genuinely ambiguous layouts. A manually saved
override containing only season 1 must be extended or cleared before automatic
season recovery applies.

## What can break

Dependency chain: Nuvio coordinates -> public catalogue identity/season -> exact
Anime-Sama title -> source season labels/scripts -> shared hosts/media.

- A catalogue removes or renames its IMDb correspondence: numeric-ID recovery
  cannot query Cinemeta. Inspect `meta.id`/`meta.imdb_id`, not title-search guesses.
- Cinemeta changes its schema, becomes unavailable or omits a season: retain
  safe TMDB recovery and explicit failure; do not silently flatten the request.
- A metadata provider changes its episode grouping: compare continuous and
  seasonal boundary cases with actual source labels. Similar titles are not an
  identity match.
- Source groups, regular episode labels or canonical counts change: repair
  `episode-mapping.js`/`pages.js`, preserving sparse/dead positions, excluded
  films/specials and strict selected-edition gaps.
- An episode resolves correctly but playback fails: diagnose shared host/media
  boundaries independently. A failed segment is not evidence of wrong numbering.

Repair locations: `src/anime-sama/catalog-context.js`, `episode-mapping.js`,
`native.js`, `config/anime-sama.json:metadata.*` and the existing optional
`sourceMap` setting. This correction changes only the dedicated plugin.

## Repeatable checks

```sh
node --test tests/anime-catalog-context.test.cjs tests/anime-episode-mapping.test.cjs
.venv/bin/python scripts/quickjs_check.py --provider plugins/anime-sama/providers/anime-sama.js --runtime both
.venv/bin/python scripts/verify_anime.py --case jjk-25 --case jjk-s2e1 --case jjk-s2e23 --case jjk-48 --case jjk-s3e1 --runtime both --report reports/season-layouts.json
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --case jjk-seasonal
```

The reduced fixture records observed catalogue coordinates only. Regressions
also use an unrelated identity with 13/8 source-season lengths, assert no extra
healthy metadata calls, test both directions/layouts and reject unavailable or
contradictory alternatives. Native fixtures check the actual season/episode
encoded in every requested embed, both editions, low-resolution links and host
captions. Live source counts, failed media probes, request/time measurements and
bundle hashes belong in the dated release evidence; they do not certify physical
TV playback or permanent host availability.

The maintenance references include an expected source group/index. The audit
checks every mapped edition against it and emits `episode-mapping-differs` for
absent evidence or a wrong position, even when a wrong episode would play. These
are development expectations, not title-specific production mappings.

The final [1.1.3 release report](../../tests/live-anime-season-layouts-1.1.3-2026-10-17.json)
records 12 live cases across the two wrappers, including 10 links for each
Jujutsu lookup and identical host/edition/format coverage across both numbering
layouts. All mapping checks passed. It also retains eight failed media samples
(seven HTTP 403s and one timeout) among 106 probes. Mapping accuracy and host
availability are recorded separately. The final focused seasonal TV audit passed
independently.
