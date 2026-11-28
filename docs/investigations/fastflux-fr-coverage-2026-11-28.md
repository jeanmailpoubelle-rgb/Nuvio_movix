# FastFlux versus returned Sources FR media — 28 November 2026

FastFlux adds a distinct returned playback source on all eight selected controls;
it does not add a newly available title in this sample. No existing Sources FR
card matched its media URL/resource path, including an additional check after
Spider-Verse's storage redirect. This supports a narrow FastFlux integration,
without importing Webflix's overlapping Frembed/generic embed fallbacks. No
production source, resolver, cache, bundle, engine or APK was changed.

## Coverage

All seven enabled FR1.8.30 entries were invoked on each control using the literal
Mobile wrapper and Python HTTP: Vodix, Frembed, Purstream/Cpasmal, Movix Catalogues,
Movix Extra, Vidzy/Nakios and Yablom. The disabled retired Purstream entry was
excluded. Native and + distributions share these discovery/resolver sources;
private configured-input/profile behaviour was not tested here.

No personal TMDB key was available. To include Yablom and key-dependent recoveries,
only `tmdbDetails` was replaced in temporary development bundles with public
French/original title, year and IMDb fixtures. Each TMDB-to-IMDb correspondence
was corroborated against the public Nuvio reference. Actual backend episode
mapping, discovery, language/quality selection and host resolution were unchanged.
This is a source-only live comparison, not official-key or profile acceptance.

| Control | Existing returned cards | FastFlux available | Matching returned media |
| --- | --- | --- | --- |
| Iron Man1726 | 9 | Yes | None |
| Matrix603 | 5 | Yes | None |
| Your Name372058 | 9 | Yes | None |
| Age of Ultron99861 | 6 | Yes | None |
| Spirited Away129 | 7 | Yes | None |
| Spider-Verse324857 | 9 | Yes | None |
| Breaking Bad1396 S1E1 | 8 | Yes | None |
| Hunter46298 S1E1 | 2 | Yes | None |

There were56 completed entry/control runs and55 returned cards, not55 proven
independent uploads. Yablom returned Sharecloudy streams for five of the six
movies; Age of Ultron returned none, and TV requests correctly returned none.
Upstream failures/absence varied by entry; this is not a claim every host passed.

## How overlap was checked

Returned media URLs were compared exactly and by CDN hostname/path. Requests,
redirect destinations and URL literals observed in returned JSON/HTML/HLS were
also compared. Original query arguments and playback headers were retained;
comparison normalization is not a playback URL rewrite or a dedup implementation.
Signed URLs, headers and HTTP bodies remained in memory; persisted identities
are hashes. No downloaded website/player JavaScript was executed.

FastFlux used `cdn99.zen-200.store` for seven controls. Spider-Verse initially
returned a BlinkFlux media endpoint, which redirected to an S3-compatible storage
host. Its final original redirected URL was compared against all seven entries
in seven additional runs; no returned or observed host/path match was found.

Movix Extra's Spider-Verse inventory did advertise a BlinkFlux host. That is not
a duplicate returned file: this source family is not currently resolved by the
plugin. None of the55 returned cards matched FastFlux's original media resources.
See [the prior protocol/file comparison](fastflux-swiftflux-comparison-2026-11-28.md)
for the shared FastFlux/BlinkFlux assets and the separately gated SwiftFlux route.

Existing returned sources in this run included Purstream/Pulse, Vodix, VOE,
Vidara, Seek/TurboEmbed, Vidzy, Uqload, Lulu, Mixdrop and Sharecloudy. They exposed
different delivery resources from FastFlux. This does not prove independent
ownership, unrelated original release files, or the absence of hidden server-side
proxying. A film reuploaded/transcoded to another host can still be a useful
independent playback alternative; identical title alone is not a duplicate URL.

## Media and practical conclusion

A first1024-byte read of each FastFlux result returned MP4 data: seven206 responses
and one200 response (Breaking Bad ignored Range). Reads were capped and closed;
no complete film was downloaded. No physical player, full integrity, exact episode
identity, audio/subtitle inventory or maximum resolution is certified by this.
All eight API results advertised VF and unknown quality; do not infer higher
quality or extra tracks from the larger file sizes.

FastFlux therefore looks useful as one additional playable upstream family in
Sources FR for these existing titles. It should not be presented as a separate
content library from BlinkFlux/SwiftFlux, nor implemented alongside a second
successful route returning the same family/file. Prefer one direct route, with an
alternate access path as fallback if later justified. Preserve current independent
providers and original signed URLs. No extra ordinary-discovery media probes or
full Webflix scraper is warranted.

This is an eight-control sample with normal production selection limits, not an
exhaustive scan of all titles or every advertised player. Globally unique content
coverage, closed proxy internals and device playback remain unproven.

[Sanitized evidence](../../tests/evidence/fastflux-fr-coverage-2026-11-28.json).
