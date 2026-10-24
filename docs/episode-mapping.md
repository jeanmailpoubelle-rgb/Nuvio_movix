# Shared episode recovery

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

Healthy lookups add **zero metadata requests**. Fresh recovery normally adds two
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
