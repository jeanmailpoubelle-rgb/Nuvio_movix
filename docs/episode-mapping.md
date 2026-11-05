# Shared episode recovery

Known investigation: [Hunter × Hunter overlapping episode orders](investigations/hunter-numbering.md).
A successful original inventory can still use the wrong order; missing-only
recovery cannot repair that case. IMDb identity alone does not identify input order.
The scoped input-order path below now handles the two verified fast backends;
the original auto/missing-only engine remains for other series/backends.

## Scoped input order

**1.8.15 / Anime-Sama 1.2.8 follow-up:** shared `src/episode-title.js` treats
standalone `×` and `x` as equivalent separators before exact title/date matching.
It preserves words/order and embedded expressions such as `2×2`. This verifies
S2E72 → target S2E130 / Anime-Sama index 129, adding no HTTP requests. Series IDs,
unique matches, release-date tolerance and target layout checks remain required.
This is formatting normalization, not fuzzy matching or a title-specific alias.

When a scoped correspondence cannot be verified, primary/Custom mark the current
worker `episodeOrderUnverified`. That worker now stops rather than continuing to
direct, backup, premium or extra inventory routes at the original coordinates.
The pre-fix live E72 primary-worker trace reached an unmapped Frembed premium
fallback after metadata matching failed. Other independent entries remain
unchanged. A media/inventory failure **after successful mapping** does not set
this flag, preserving existing verified-request recovery behavior.

Sources FR **1.8.14** and dedicated Anime-Sama **1.2.7** compile the same
`config/episode-orders.json`. Initially it declares only TMDB `46298` / IMDb
`tt2098220` (Hunter × Hunter 2011), with `seasons: [2]` and `inputCatalog: "cinemeta"`. This is a
user-selected input-order policy, not automatic detection of a metadata add-on.
The tested TVDB Aired coordinates agree; DVD/other TVDB orders are not supported
by that declaration. If the user switches to continuous TMDB episode IDs, disable
this policy rather than silently reinterpreting the same coordinates.

This first trial intentionally scopes **season 2 only**. A complete metadata scan
finds 75 unique title/date correspondences among its 78 episodes. S2E27, S2E32
and S2E50 have differing titles which the strict matcher cannot verify;
the scoped primary/Custom/Anime-Sama path returns no result for those episodes
rather than using dates alone. Independent unchanged backends may still work.
Seasons 1 and 3 keep their prior behavior, avoiding regressions from their own
title/date differences. Episode-count correspondence alone cannot resolve these
cases safely. The reduced unmatched samples are regression fixtures, not alias
or offset mappings shipped to the plugin.

Sources FR applies it **before querying** the configured `primary` and `custom`
backends, including original inventories which would accept the wrong number.
Both live inventories use continuous TMDB episode labels. It requires verified
series correspondence and a unique meaningful title/release-date match (within
24 hours). Original context coordinates stay immutable. Failed identity/mapping
does not issue that backend's original-coordinate request. A mapped missing row
invalidates its cached correspondence and does not repeat the same backend in
late recovery. Independent backups keep their original layout and behavior.
Frembed had no readable Hunter inventory in the live probes; it is **not** added
to the pre-query backend list. Neither are the other unverified families.

Anime-Sama uses the same series/order declaration for both ID forms and all six
host entries. It reuses the primary metadata response's complete regular episode
inventory, reads Cinemeta once, requires a unique title/date match in both, and
derives the matched target's absolute ordinal from a contiguous, ordered target
inventory. The selected input number must exist uniquely; no ordinal fallback
is permitted on this scoped path. The source's continuous 2011 group then supplies
that slot in each available edition. Missing/duplicate episodes, contradictory
IDs, incomplete target layouts, unmatched titles/dates and metadata outages fail
closed. No guessed season lengths, title offsets or provider-specific episode
table is shipped. Legacy mapping for other identities and explicit `sourceMap`
bindings is unchanged. No host, quality, audio, captions or artwork logic changes.

### Cost and rollback

- Other series, unconfigured seasons, movies, specials and unverified backend families add **zero**
  metadata requests. Existing buffers/request limits remain.
- A fresh scoped Sources FR lookup adds two metadata reads before its inventory;
  successful correspondence has the existing bounded ten-minute cache. Metadata
  is reused within the lookup. Signed media/inventories remain fresh.
- Each scoped Anime-Sama entry adds one Cinemeta read to its existing primary
  metadata request. Host entries remain independent; no shared signed cache or
  binary dependency is introduced. Matching adds only local parsing, not media
  probes. Existing source/host validation can still fail independently.
- Set `config/episode-orders.json:enabled` to `false`, build, bump versions and
  republish to restore legacy mapping for both plugins. A per-entry runtime
  `episodeOrderOverride: false` also restores legacy behavior, but settings are
  not shared across independent entries. Full rollback baseline is Git tag
  `before-hxh-order-2026-11-05` (Sources FR 1.8.13 / Anime-Sama 1.2.6). Re-release
  its content with **higher versions** if clients will not accept a downgrade.

### What can break

| Boundary / symptom | Check and repair |
| --- | --- |
| Changed metadata order: consistent wrong episodes | Confirm actual input coordinates; update the declaration only after checking episode identity. IDs do not reveal order |
| Input or target title/date/identity schema changes: no scoped links | Inspect `episode-mapping-unavailable` or Anime `EPISODE_ORDER_*` errors; fix parsing or upstream metadata, never replace identity with counts alone |
| Catalogue becomes truncated, sparse or unordered | Scoped Anime-Sama rejects an incomplete/ambiguous target; inspect raw private metadata, preserve strict rejection |
| Backend changes numbering | Verify its own inventory/media independently; update `backends` and target policy only with evidence |
| Correct mapping but no streams | Check host availability, quality filtering and CDN responses. A mapping cannot restore deleted media |
| Need old behavior urgently | Disable the shared declaration or re-release the tagged baseline; refresh both repositories in the app |
| Separator formatting blocks a valid identity | Shared `src/episode-title.js`; verify E72 on both plugins and retain word/order/date/ambiguity guards. Never add broad synonyms |
| A failed match still yields a wrong fallback | `episodeOrderUnverified` in `src/episode-mapping.js`, primary/extra worker guards; native `scoped-order-mismatch` must finish empty after two metadata requests |

Regression fixture: `tests/fixtures/episode-orders/hunter.json`. Node tests cover
all seven Anime-Sama boundaries, five targeted Sources FR S2 coordinates, IMDb/TMDB IDs, missing/duplicate/mismatched data, an input
prefix-count change, pre-query selection and rollback. Literal native suites
exercise S2E63 in the real generated primary, Custom and Anime-Sama entries on
TV 1.0.0/Mobile. Native fixtures are not physical device playback tests.

Owned live checks:

```sh
.venv/bin/python scripts/audit.py --skip-offline --case hxh-primary-63 --runtime both
.venv/bin/python scripts/audit.py --skip-offline --case hxh-primary-72 --runtime both
.venv/bin/python scripts/audit.py --skip-offline --case hxh-custom-63 --runtime both
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --case hxh-anime-62 --case hxh-anime-63 --runtime both
.venv/bin/python scripts/verify_anime.py --case hxh-s2e62 --case hxh-s2e63 --runtime both --report reports/hxh.json
.venv/bin/python scripts/verify_anime.py --case hxh-s2e72 --runtime both --report reports/hxh-72.json
```

Add another series/season only after confirming input order, matching identity and each
backend layout. Add owned references to `config/maintenance.json`, native/Node
regressions, failure documentation and live evidence in the same change. The
build currently permits only the two backend adapters wired for pre-query policy;
supporting another requires implementation and tests, not just a new array value.

Sources FR 1.8.7 shares one correspondence engine across its five series workers.
Each backend keeps its own numbering policy. Different APIs can store the same
episode differently; never globally rewrite the incoming coordinates. This does
not repair metadata-page artwork.

## Configuration

Edit `config/endpoints.json:episodeMapping`, then build and publish the bundles.

- `inputCatalog`: `auto` (default), `cinemeta`, `nuvio-catalog` or `disabled`.
  Nuvio does not forward the selected metadata add-on. Auto compares the requested
  coordinates in both catalogues. If both exist but describe different episodes,
  it refuses recovery. Configure the actual input catalogue for that ambiguity;
  a series ID cannot resolve it.
- `catalog` and `cinemeta`: HTTPS origins for public episode metadata.
- `targets`: independent backend policies below. `native` preserves original
  coordinates and skips correspondence. Other values permit one verified retry
  using that catalogue's coordinates after a confirmed missing episode.

| Backend keys | Default target | Evidence and limits |
| --- | --- | --- |
| `custom` | `nuvio-catalog` | Jujutsu S2E1/S2E2/S3E1 match E25/E26/E48; working SeekStreaming media |
| `primary`, `direct` | `nuvio-catalog` | Jujutsu continuous episode/media inventory; matching cannot repair dead cached media or a missing direct stream |
| `backup`, `vidzy` | `cinemeta` | Jujutsu S2E1 exists; E25 is pending/missing. Pending itself never triggers recovery |
| `frembed` | `nuvio-catalog` | S2E1 absent; E25 has a matching episode record but an authoritative empty host list |
| `swiftflow` | `nuvio-catalog` | Missing Jujutsu season versus continuous E25 inventory; browser-gated MP4 remains unavailable |
| `catalogue`, `premium`, `wiflix`, `fstream`, `coflix`, `omega` | `native` | Alternate numbering not established by live probes; original queries remain |

These are observed backend conventions, not universal promises for every title.
A policy change requires fresh identity/episode evidence and regressions. Do not
enable a guessed policy merely because an API accepts a TMDB ID.

Native `episodeRecovery: false` disables shared recovery. The compatible
`customEpisodeRecovery: false` override disables only Custom. There is no new
settings wheel, account or helper service. Public correspondence is keyless;
existing direct search, HTML matching and Omega still require Nuvio's TMDB key.
Cloud audits without `NUVIO_TMDB_API_KEY` cannot cover those live branches.

## Lookup and identity

1. Run original queries. Existing useful backups and host selection precede new
   late retries. Custom retains its 1.8.6 immediate missing-episode retry;
   independent Frembed hosts also recover at their own API.
2. Require a regular series episode with a confirmed missing response: structured
   HTTP 404, both Vidzy language **player routes** returning 404, or SwiftFlow's
   exact same-series missing-season response. Omega's optional hook requires a
   matching series inventory with the requested episode absent.
3. Read Nuvio Catalog by TMDB ID, then Cinemeta through explicit IMDb correspondence.
   Require Animation, matching IMDb identities, Cinemeta's explicit `moviedb_id`,
   and usable video arrays. Select the input layout as configured.
4. Match a unique meaningful normalized title and release timestamps within 24
   hours in both catalogues. No fixed lengths, title-specific offsets, count-based
   guesses or dates-only matches. Same coordinates cause no repeat request.
5. Retry only that backend, at most once, within the original budget. Keep
   `ctx.season/episode` unchanged. Validate returned series and declared episode
   fields against its coordinates, then resolve fresh players normally.

Movies, specials, valid empty inventories, pending imports, auth/rate limits,
browser gates, broken media and malformed/foreign responses are not numbering
evidence. A deleted Vidzy embed is not a missing player route. Modern Frembed
`links: []` remains authoritative; legacy links are not resurrected. No retry
selects the first episode instead.

Outside the scoped pre-query policy, healthy lookups add **zero metadata requests**. Fresh recovery normally adds two
metadata reads and one inventory retry, plus ordinary host validation. Metadata
reads are shared within a lookup; only successful correspondence may persist for
ten minutes/up to 50 entries. Missing mapped responses invalidate cached matches.
Streams, grants, players and captions stay fresh. The 24-request/45-second budget,
720p minimum, unknown-quality policy, HLS masters/audio/captions, signed bytes,
headers and display ordering remain. Dedicated Anime-Sama keeps its own mapping,
all-host policy and no minimum; its current version is 1.1.5.

## What can break and where to repair it

| Boundary / symptom | Check and repair |
| --- | --- |
| Metadata domain/routes/schema | Origins in `episodeMapping`; identity/episode parser in `src/episode-mapping.js` |
| Ambiguous input, missing/translated titles or incomplete dates | Inspect `episode-mapping-unavailable`; configure known input or retain rejection. Do not weaken identity |
| Backend changes numbering | Compare two episodes and both layouts in its isolated audit; update only its target after verifying identity |
| Backend route/row/missing-response changes | Adapter in `src/`; keep missing, pending, auth and media failures distinct; add regression before repair |
| Mapping succeeds but no sources | Inspect inventory, quality filtering, gates and CDN responses. Matching does not create missing media |
| New latency or missing backups | Check request counts/order/budgets and metadata reuse; healthy lookups must have no metadata preflight |
| Large episode list | Native/common responses are bounded to 1 MiB; unusable/truncated metadata fails closed |
| Playable wrong episode | Assert backend and from/to in `episode-mapping`, independently of media reachability |
| Artwork/sequence changes at overlapping episode numbers | Follow the [Hunter × Hunter boundary diagnosis](investigations/hunter-numbering.md); inspect actual image redirects and incoming order, not just successful HTTP or series-ID correspondence |

`episode-mapping` logs backend, input/target catalogues, from/to and basis.
`episode-mapping-unavailable` explains rejection without exposing signed URLs.

## Reproduce

```sh
.venv/bin/python scripts/audit.py --skip-offline --integration custom-episode-mapping
.venv/bin/python scripts/audit.py --skip-offline --integration episode-primary
.venv/bin/python scripts/audit.py --skip-offline --integration episode-direct
.venv/bin/python scripts/audit.py --skip-offline --integration episode-backup
.venv/bin/python scripts/audit.py --skip-offline --integration episode-vidzy
.venv/bin/python scripts/audit.py --skip-offline --integration episode-frembed
.venv/bin/python scripts/audit.py --skip-offline --integration episode-swiftflow
```

Explicit integrations include their owned deep reference even in smoke mode.
Helpers change only a temporary entry point. Each enabled target has an isolated
case, so working backups cannot hide it. Normal lookup cases do not demand an
optional retry when a backup already works. Expected initial 404s remain attention
findings. A pending backup cannot exercise recovery and is not a passing mapped
lookup. Native policies have original-path audits and synthetic hook fixtures;
their alternate layouts remain unverified live.

Node fixtures cover all 13 backend hooks, ambiguous/unchanged coordinates, backup
priority, pending/rate limits, identities, fresh grants and shared budgets. Both
literal TV 1.0.0 and Mobile suites exercise primary, backup, Vidzy, Frembed,
SwiftFlow and Custom recovery. Runtime compatibility and bounded HTTP media/caption
samples do not certify physical TV networking/decoding or continuous playback.
