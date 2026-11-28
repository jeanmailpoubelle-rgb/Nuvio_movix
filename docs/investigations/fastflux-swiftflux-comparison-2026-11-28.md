# FastFlux versus Movix SwiftFlux — 28 November 2026

Follow-up to the [initial overlap investigation](sources-fr-upstream-overlap-2026-11-28.md).
The six movie controls reach the same media assets through FastFlux and Movix's
regular SwiftFlow/BlinkFlux player. FastFlux is the shorter/faster access route in
this sample. Whole-catalogue identity and Movix's separately gated SwiftFlux MP4
grant remain unproven. No plugin, engine or APK behaviour changes.

## Inventory comparison

Thirteen selected movie/episode requests were each compared three times, alternating
API request order, with no more than three concurrent titles. Ten requests had an
MP4 in both APIs and three lacked an MP4 in both, consistently across all rounds.
All30 paired available results matched advertised size and language; there were
no one-sided MP4 availability results in this sample.

Movie controls: Iron Man1726, Matrix603, Your Name372058, Age of Ultron99861,
Spirited Away129 and Spider-Verse324857. Episode controls: Breaking Bad1396 S1E1,
Game of Thrones1399 S1E1, Hunter46298 S1E1/S1E130, Jujutsu95479 S1E1/S2E1 and
Apothecary220542 S2E3. Hunter S1E130, Jujutsu S2E1 and Apothecary S2E3 lacked
MP4s in both. Coordinates here are the explicit native TMDB query, not a TVDB
mapping or a claim that the episode is absent from every upstream source.

Across39 responses per API, median FastFlux time was0.208s and Movix SwiftFlux
inventory0.160s. This comparison alone is misleading: FastFlux returns a media
URL while the Movix inventory contains only MP4 metadata/index and regular embeds.

## Following the media

The public Movix movie player uses `/api/swiftflow/movie/{id}` and labels its
`mp4.entries` SwiftFlux. Its direct MP4 handoff POSTs to
`/api/swiftflow/mp4/resolve` with a browser Turnstile token. Tests with no token
received400 JSON requiring verification at both API origins; no playable URL was
returned and no challenge solver was used.

There is a separate normal route in the same movie inventory: its regular
SwiftFlow player is a BlinkFlux embed. That page currently explicitly calls
`requestUnlock('')`, POSTing its published encrypted payload/IV to its own unlock
endpoint. The development probe parsed those literal fields and made that normal
request, with an in-memory cookie jar; no downloaded JavaScript was executed or
payload decrypted. This route succeeded for all six movie controls.

That distinction matters: media comparison follows **SwiftFlow -> BlinkFlux**, not
a successfully resolved browser-gated **SwiftFlux MP4 grant**. The inventory and
media evidence strongly connect these upstream families but do not expose the
implementation behind the gated endpoint.

Each movie was resolved three times through both routes. All18 pairs matched CDN
host and media path. Five movies used the same `cdn99.zen-200.store` file, with an
additional `ff` query key on BlinkFlux's result. Spider-Verse returned exactly the
same BlinkFlux media URL through both routes, including its query. No parameters
were removed or rewritten to obtain or play these results.

On the first round per movie, each original URL was read with a bounded4096-byte
prefix request. Both routes matched ETag, total file length and prefix SHA256 for
all six movies. The query-bearing CDN returned200 for those five requests despite
Range; only4096 bytes were read before closing. Other samples returned206 with
matching total length. A matching path plus these headers/bytes corroborates the
same served asset, substantially stronger than matching title/rounded file size.
It is not a complete-file cryptographic comparison: no whole movie was downloaded.

## Useful speed comparison

| Route to a media URL | HTTP steps | Median,18 comparisons | Observed range |
| --- | --- | --- | --- |
| FastFlux | One API request | 0.192s | 0.180–0.569s |
| Movix regular SwiftFlow -> BlinkFlux | Inventory, embed, unlock | 1.074s | 0.512–1.338s |
| Movix SwiftFlux MP4 grant | Inventory plus browser verification/grant | Not measured successfully | Tokenless request rejected |

The first full-flow phase requested Movix before FastFlux. A separate check on
Iron Man, Matrix and Spirited Away alternated whole-route order across two rounds
per movie; FastFlux remained faster in both orders (0.186–0.207s versus0.974–1.519s).
No false precision about causality, server load or sustained performance is implied.
These are Python HTTP measurements from one cloud runner, excluding media reads
and playback startup. No physical TV/libmpv/ExoPlayer speed claim follows.
The one-request route should also avoid serial network overhead on TV, but its
actual device behaviour still needs testing if integrated.

## Recommendation

Treat these as one upstream media family, not two independent content sources.
No unique-title or quality advantage was demonstrated by adding a second label.
If this family is integrated later, prefer the narrow FastFlux direct route and
retain a verified alternate route only as fallback, never a second duplicate card.
Our current Movix Extra recognises SwiftFlux inventory but does not return those
MP4s, and its generic resolver does not implement the BlinkFlux unlock protocol;
this investigation is not a shipped resolver change.

Do not infer complete catalogue equivalence from13 requests or silently reuse an
MP4 entry across different editions. Preserve original URLs, audio/subtitle claims,
TMDB episode proof and existing independent backups. No full Webflix scraper,
production media probes or signed-URL cache is justified by this evaluation alone.

[Sanitized measurements](../../tests/evidence/fastflux-swiftflux-comparison-2026-11-28.json).


## BlinkFlux format and metadata follow-up

A separate12-movie check repeated the normal published BlinkFlux player/unlock
flow and read at most1024 media bytes per result. All12 had MP4 signatures and
none had HLS playlist signatures. Every examined player page explicitly used
`video/mp4`; no HLS URL/player branch was observed. The unlock responses contained
only `success` and `url`, with no resolution or embedded-audio inventory fields.
This is direct evidence for the tested movie route, not proof about every title,
TV-show endpoint or future player version.

Controls add Dark Knight155, Interstellar157336, Inception27205, Fight Club550,
Dune438631 and Avatar19995 to the original six movies. External subtitle metadata
was available for Your Name and Dune (FR/EN labels), without inspecting caption
contents. Those external tracks do not establish audio languages or resolution.
The other ten returned no external caption labels in this sample.

BlinkFlux therefore does not offer an observed HLS alternative or richer built-in
quality/audio API for these movies. It does not resolve the user's MP4 metadata
tradeoff. No provider was added, disabled or changed. See the
[sanitized format evidence](../../tests/evidence/blinkflux-format-2026-11-28.json).
