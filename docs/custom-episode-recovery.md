# Movix Custom: recovering Cinemeta anime episodes

Sources FR **1.8.6** fixes the reported **Movix / Custom / SeekStreaming | 1080p**
entry for Jujutsu Kaisen. Cinemeta requests S2E1; Custom stores that episode at
S1E25. Before recovery, both wrappers returned zero Custom streams at S2E1 after
one request, while S1E25 returned a working 1080p stream after three requests.
The earlier primary API's stale Pulse URLs are a different source family.

## Dependency chain and identity

The existing native call supplies TMDB ID, type and season/episode. Nuvio usually
converts the IMDb series ID first and does not identify the selected metadata
addon. The repository therefore explicitly configures **Cinemeta** as the input
numbering system; no ID-prefix heuristic claims to detect it.

1. Request Custom with the original coordinates. A successful response stays on
   the existing path. Only HTTP 404 for a regular TV episode permits recovery.
2. Read Nuvio Catalog's numeric-TMDB metadata, require Animation and explicit
   IMDb correspondence, then request that IMDb series from Cinemeta.
3. Require Cinemeta's IMDb identity and explicit `moviedb_id` to agree with the
   original request. Select exactly one incoming season/episode row.
4. Match a unique non-generic episode title and release timestamps within 24
   hours in both catalogues. The time allowance handles overnight broadcasts;
   dates alone, episode counts and fixed offsets never establish correspondence.
5. Retry Custom with that target row's actual coordinates. The API row must
   still match the exact series, season and episode before exposing its links.
6. Resolve the returned player through the existing shared Seek/host/HLS path,
   preserving quality, original masters, signed URLs, audio, captions and headers.

The original request context is never rewritten. Omega, SwiftFlow and the other
independent providers keep their coordinates. Specials, movies, pending imports,
auth/rate limits, transport failures and malformed/mismatched metadata do not
trigger guessed-coordinate requests. An unavailable match leaves recovery empty
and lets the remaining adapters continue.

## Configuration and speed

Edit `config/endpoints.json:movix.customEpisodeRecovery`:

- `inputCatalog`: `cinemeta` for this repository's selected metadata source;
  `disabled` when incoming numbering follows another catalogue.
- `catalog`: Nuvio Catalog metadata origin for Custom's target layout.
- `cinemeta`: Cinemeta metadata origin for the selected input episode.

The optional native override `customEpisodeRecovery: false` also disables it.
There is no new settings UI, account state, service or mandatory TMDB credential.
Both TV 1.0.0 and Mobile use ordinary bounded JSON requests.

Healthy Custom discovery adds no metadata requests. The isolated Jujutsu direct
lookups remain three requests; mapped lookups use six on a fresh context. Only
correspondence is cached, for ten minutes/up to 50 entries if the app reuses the
JavaScript context. A missing mapped row invalidates that entry. Custom inventories,
players, grants, media and captions are always requested afresh. All calls share
the existing 24-request / 45-second-between-requests budget.

## What can break and where to repair it

| Boundary | Symptom / action |
| --- | --- |
| Incoming metadata layout changes | Disable/reconfigure `inputCatalog`; Nuvio does not forward that context |
| Metadata domain/routes/schema | Inspect fresh `meta`, IMDb/TMDB fields, Animation genres and video arrays; update origins here or `src/custom-episode-mapping.js` |
| Missing/translated/generic titles, changed release times or ambiguous matches | No mapping; preserve the rejection instead of selecting by count or position |
| Large/truncated catalogue bodies | Existing 1 MiB native/common limit rejects them; this is not universal coverage for every long-running anime |
| Custom route or row schema | Check original 404 and matched retry; repair `src/movix-extra.js`, retaining all three identity checks |
| Seek player/cipher/CDN or HLS | Mapping can succeed while playback fails; repair `src/seek.js` / shared media helpers from a fresh candidate |
| Expected episode differs in audit | Inspect `episode-mapping` from/to evidence; a playable different episode must fail the reference assertion |

`episode-mapping` records coordinates, configured catalogues and matching basis.
`episode-mapping-unavailable` explains metadata/identity rejection without logging
captions, source titles or signed URLs. Source counts, HTTP failures and selection
events remain available. No frontend JavaScript is executed for mapping.

## Reproduce and verify

```sh
.venv/bin/python scripts/audit.py --skip-offline --provider movix-extra --case jjk-custom-seasonal
.venv/bin/python scripts/audit.py --skip-offline --integration custom-episode-mapping --case jjk-custom-seasonal
.venv/bin/python scripts/audit.py --skip-offline --provider movix-extra --case jjk-custom-continuous
```

The owned seasonal case asserts S2E1 -> S1E25. The isolated helper excludes Omega
and SwiftFlow, so a successful other adapter cannot hide missing Custom recovery.
The audit still reports the original HTTP 404; inspect the proven mapping and
returned media rather than making that failure disappear. A normal cloud run
without the app's TMDB key cannot cover Omega's catalogue correspondence.

Tests include an unrelated anime with S2E1 -> E14, identity/episode ambiguity,
dates/titles, explicit opt-out, request budgets, cache invalidation, fresh media
requests and unaffected backup coordinates. Both literal runtime suites exercise
the new protocol. [Dated live evidence](../tests/live-custom-episode-recovery-1.8.6-2026-10-18.json)
contains direct/mapped Jujutsu episodes, two movies and the normal worker.
Bounded HTTP media/caption probes and native wrappers do not certify physical
Android playback, all audio renditions, subtitle content or later seek positions.
