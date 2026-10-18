# Cinemeta anime: episode ordering, artwork and backend availability

**Follow-up correction:** the user identified a playing
**Movix / Custom / SeekStreaming | 1080p** link at S1E25. The earlier unavailable
media below belongs to the separate primary API, not that Custom source.
Sources FR **1.8.6** now recovers this Custom entry from Cinemeta S2E1 through
verified episode metadata. See [the implementation and failure map](../custom-episode-recovery.md)
and [release evidence](../../tests/live-custom-episode-recovery-1.8.6-2026-10-18.json).

**1.8.7 follow-up:** [shared recovery](../episode-mapping.md) now gives series
workers independent target policies, automatic input matching with ambiguity
rejection, and isolated maintenance checks. Healthy backups still take priority.
Empty/gated/unavailable upstream media and Cinemeta artwork are not fixed by
coordinate correspondence. Unverified alternate backend layouts remain native.

Historical read-only diagnosis, 18 October 2026, for Sources FR **1.8.5** and
dedicated Anime-Sama **1.1.3**. The observations below did not change production code.
Evidence: [metadata, artwork and native checks](../../tests/live-cinemeta-coordinate-diagnosis-2026-10-18.json).

## Reported Jujutsu Kaisen S2E1 failure

The user selected Cinemeta for faster metadata, then reported missing artwork
after S1 and missing fast-API links. These have distinct causes:

| Boundary | Observed result |
| --- | --- |
| Cinemeta episode list | S2E1 exists and the explicit IMDb identity matches |
| Cinemeta/MetaHub artwork | S1E1 thumbnail returns an image; S2E1 and S3E1 thumbnail URLs return HTTP 404 |
| Nuvio Catalog artwork | Matching continuous S1E25/S1E48 thumbnails and season posters return images |
| Primary numeric API, S2E1 | HTTP 404 |
| Primary numeric API, S1E25 | Two cached HLS links on unavailable `zebi.xalaflix.design` |
| Backup API, S2E1 | Eight VF and eight VOSTFR candidates, including unsupported/deleted/unavailable or sub-720p choices |
| Backup API, S1E25 | HTTP 202 pending; no alternatives |
| Direct API, known sheet 3816 | Both layouts return 404 on the configured `.id` and previously verified `.sh` origins |

The production S2E1 lookup returned two VOE VOSTFR alternatives in the TV wrapper
(19 requests). The MP4 media sample passed; the HLS segment sample returned 403.
S1E25 returned zero (six requests): failed playlists, a pending backup and no
premium alternatives. Physical TV playback and a new mobile lookup were not
tested in this diagnosis.

**Globally changing S2E1 to S1E25 would remove those backup choices without
restoring the primary videos.** Do not add a universal offset or rewrite the
shared request context. The prior HLS fix already excludes unreadable playlists;
a dead upload still needs an upstream replacement.

## Identity does not define episode ordering

### Native IMDb conversion recheck

The fresh Cinemeta response for `tt12343534` explicitly declares
`moviedb_id: 95479`. An independent public anime correspondence also pairs those
two IDs and identifies the second season's first episode as seasonal S2E1 /
absolute E25. This verifies the series correspondence without assuming that
Nuvio's conversion succeeded on a particular device.

The inspected Mobile code converts the base IMDb ID through TMDB's external-ID
lookup, separately passing the requested season and episode to the plugin. That
conversion is not an episode-layout adapter. No live TMDB `/find` call or physical
app trace was available in this cloud check; do not claim either was tested.

To remove app conversion from the experiment, the production primary helper was
called directly with TMDB `95479` on both native wrappers. S2E1 returned 404 in
one request. S1E25 returned two cached URLs, but both playlist reads failed;
Google and Cloudflare DNS independently reported NXDOMAIN for their hostname.
The same series ID at S1E1 returned a 1080p MULTI source in two requests.
Replacing the series-ID converter alone cannot repair these episode/media
failures. Rewriting every backend to S1E25 would also discard the working
seasonal backup inventory.

Fresh normal S2E1 checks returned two VOE VOSTFR alternatives on each wrapper
(19 requests). Both mobile media samples passed; TV's MP4 sample passed and its
HLS segment returned 403. Other failed upstream candidates remain visible in
the audit. [Recheck evidence](../../tests/live-jjk-id-conversion-2026-10-18.json)
records these limits; production code and versions are unchanged.

IMDb/TMDB identify the series. Converting that ID does not convert episode
coordinates. Current responses also disagree on Bleach and One Piece, including
cases where both catalogues expose S2 but mean different episodes.

Anime-Sama 1.1.3 retains an explicit IMDb correspondence when Nuvio Catalog lacks
the requested season. It fixes the tested Jujutsu boundaries; it is not a general
Sources FR remapper or a guarantee for every anime layout. Nuvio passes the native
plugin ID/type/season/episode, without the selected metadata provider or episode
title/date. Do not infer the metadata provider merely from a numeric TMDB ID.

Conversion needs a known incoming layout, verified episode identity and
**separate coordinates for each backend**. Preserve the original request for
backends that support it. Counts/fixed offsets alone are insufficient. Keep movie
lookups on their current path. Version 1.8.6 implements these checks for missing
Custom entries with configured Cinemeta input. It does not rewrite the primary
API or other adapters. Episode conversion cannot repair missing artwork or the
separate primary's unavailable cached files.

## Nuvio settings and upstream responsibilities

Metadata-page images come from the metadata addon/Nuvio, not these stream plugins.
The checked Cinemeta image URLs actually fail upstream. Show-level poster and
background fields were present; the episode images fail after S1.

The inspected Nuvio Mobile source applies TMDB episode enrichment to existing
season/episode pairs, replacing titles/overviews/thumbnails without converting
the episode order. **Episodes** enrichment alone cannot reconcile these layouts
and can mix metadata for different episodes. **Season posters** enrichment also
depends on the season existing at the artwork source. Do not recommend either
as an automatic season-order repair.

Mobile also attempts TMDB-to-IMDb conversion before addon metadata lookup, so
choosing a TMDB catalogue/ID alone does not force a different artwork provider.

Cinemeta can remain useful for movies. Anime needs metadata whose actual episode
list/images agree with the selected content. Per-type/per-anime metadata priority
controls were not established in the inspected UI; do not invent a setting or
claim profile synchronization. Anime-Sama's tested Jujutsu links remain a streaming
alternative. No account settings, external issue submissions or routing were
changed in this diagnosis.

## Reproduce and maintain

```sh
.venv/bin/python scripts/audit.py --skip-offline --provider movix --case jjk-api-cinemeta
.venv/bin/python scripts/audit.py --skip-offline --integration primary-api --case jjk-api-cinemeta
.venv/bin/python scripts/verify_anime.py --case jjk-s2e1 --runtime both --report reports/cinemeta-anime.json
```

The audit records original API/host failures even when a backup works. A 404 at
one backend is not proof of a bad domain or permission to reinterpret another
backend's coordinates. Preserve a pending backup as pending.

For images, obtain fresh thumbnail URLs from the actual metadata response and
read a small sample with TLS verification. Record HTTP status and MIME; HTTP-200
metadata JSON does not establish image availability. The standard media audit
does not currently probe page artwork: these checks are manual coverage.

Repair locations: upstream metadata/artwork for page images/order;
`src/purstream-provider.js` and backend adapters for lookup coordinates;
`src/hls.js`/shared resolvers for media validation. Keep raw responses, signed
media links, credentials and private logs out of shared reports.
