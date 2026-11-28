# Sources FR upstream overlap — 28 November 2026

Recommendation: do not add the complete Webflix provider. Its FastFlux-only route
may unlock an additional source already advertised as Movix SwiftFlux; it is not
proven to add a separate catalogue. Address verified overlap without removing
independent backups or requiring new media probes during ordinary discovery.
No production behaviour changes in this investigation.

Follow-up: [the larger FastFlux/SwiftFlux comparison](fastflux-swiftflux-comparison-2026-11-28.md) corroborates six shared movie assets via Movix’s regular BlinkFlux route and measures URL-resolution costs. The gated SwiftFlux MP4 grant and whole-catalogue equivalence remain unproven.

## Scope and method

Current native FR1.8.30 bundles at `fb8eaec` were run through the literal Mobile
wrapper with Python HTTP. Four TMDB controls: Iron Man1726, Matrix603, Hunter×Hunter
46298 S1E1 and Breaking Bad1396 S1E1. Six enabled entries per control,24 runs:
Vodix, Frembed, Purstream/Cpasmal, Movix Catalogues, Movix Extra and Vidzy/Nakios.
Empty controls were accepted explicitly; no-result is not a runtime failure.
Yablom was excluded because no personal metadata key was supplied. Native and +
share discovery/resolver sources, but no private configured-input test is claimed.

Signed URLs and headers stayed in memory. Persisted identities are hashes; no raw
HTTP/player bodies, video, tokens or credential values are stored. This is a small
network sample, not physical Android playback, a full maintenance audit or a
catalogue-wide completeness comparison. Sources can change between lookups.

## FastFlux adds a route, not demonstrated new title coverage

Webflix FastFlux returned an MP4 URL for all four controls in0.29–1.04s. None
matched the exact URL or host/path of the media returned by our six entries.
However, each title already had returned sources from existing entries. No better
resolution was established: FastFlux advertised `Unknown` quality in every case.

| Control | Webflix FastFlux | Movix SwiftFlux MP4 inventory |
| --- | --- | --- |
| Iron Man | VF,3.16 GB | VF,3.16 GB |
| Matrix | VF,3.29 GB | VF,3.29 GB |
| Hunter S1E1 | VF,451.26 MB | VF,451.26 MB |
| Breaking Bad S1E1 | VF,940.73 MB | VF,940.73 MB |

Movix's public `/api/swiftflow/...` route advertises those MP4 entries, while its
movie player code names them SwiftFlux and hands off to its playback flow.
Iron Man/Matrix also expose BlinkFlux embeds; Webflix integrates BlinkFlux too.
This strongly indicates overlapping upstream inventory. Identical complete files
are not proven: no browser verification/grant flow was completed to obtain the
SwiftFlux MP4 for a byte comparison.

Our `src/movix-extra.js:movixSwiftflow` currently reads the regular players, reports
available `mp4.entries` as `browser-verification-required`, and does not return
those MP4s. FastFlux therefore offers a potentially useful access route to an
existing upstream family that our plugin does not currently expose. It should be
evaluated narrowly for reliable playback, edition, languages and added value;
importing Webflix's Frembed and generic embed fallbacks would overlap existing
integrations. A separate API/frontend is not evidence of a unique media source.

## Confirmed duplicate inside our current implementation

Iron Man's Vidzy/Nakios entry and Movix/FStream inside Catalogues returned the same
`u14.vidzy.org` master path with different signed queries and different headers.
A fresh targeted comparison again matched that path. Both first video segments
had the same CDN host/path and the same SHA256 for a bounded1024-byte206 sample.
This corroborates the same asset reached through two routes, not two independent
uploads. It does not establish full-film integrity.

There were no identical full returned URLs across entries in the initial four
controls. That does not mean there were no duplicates: rotating capabilities hid
the confirmed Vidzy overlap. Breaking Bad's Frembed/Movix VOE outputs did not
match media paths in the sample; do not merge them merely because both use VOE.
HLS and MP4 from a single VOE upload are intentionally different transport choices.
Whether to hide one is a presentation policy, distinct from removing identical
playback resources.

## What we already remove, and what remains

- `src/selection.js` removes repeated candidates with the same URL and canonical
  headers before resolution, and combines subtitle inventories.
- `src/common.js:unique` removes exact returned URL/header duplicates within one
  worker. Independent phone entries have separate calls; one banner does not
  create a cross-entry identity store.
- `android/addon-host/core/src/main/kotlin/local/animesama/host/HostedRuntime.kt`
  merges completed entries and removes exact URL/serialized-header/caption
  duplicates. Different signatures, headers, captions or serialization can survive.
- Catalogue replica domains are attempted as fallbacks, rather than deliberately
  concatenating every replica's identical inventory.

Prefer source provenance for future cleanup: a verified host-family/upload ID plus
edition/language and transport, carried from discovery through resolution. Keep
original signed URLs and required headers intact. Such identities need no extra
HTTP or media download. Distinguish the same upload from merely the same film,
host family or CDN. Preserve separate language editions, masters, captions and
format alternatives unless an explicit policy chooses between them.

The hosted addon has a natural central merge point. Phone entries do not; solving
cross-entry overlap there needs deliberate ownership/coordination design. A
blanket removal of Vidzy/VOE from other routes can lose unique uploads or break
coverage when the preferred entry is disabled or unavailable. Consolidating all
phone work could also change the progressive results behaviour the user values.
Do not make that tradeoff as an incidental cleanup.

[Sanitized evidence](../../tests/evidence/sources-fr-upstream-overlap-2026-11-28.json).
