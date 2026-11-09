# Providers and shared video hosts

Sources FR contains six active provider entries. Anime-Sama is a separate plugin.
Domains and limits are owned by [configuration](../config/README.md), not this list.
Host support describes implemented protocols, not a promise of live availability.

| Provider | Normal lookup | Recovery |
| --- | --- | --- |
| French Catalogue / Vidzy | VF and VOSTFR player routes using the TMDB ID | Strict catalogue matching on Nakios Live, Purestream CC or Movix ZIP; shared host resolvers |
| Purstream API / Cpasmal | Fast TMDB-to-stream API | Verified direct API on wrapper failure; Cpasmal hosts; ordinary Frembed premium grant if no working stream remains |
| Frembed / Hosts | Frembed film/episode API using the TMDB ID | Shared host resolvers for its returned player links |
| Movix / Catalogues | Public Wiflix, FStream and Coflix lists using the TMDB ID | Shared host resolvers; current API discovery through Movix's official directory |
| Movix / Extra | Public custom links, Omega and SwiftFlow availability | Verified episode correspondence; native SeekStreaming and shared host resolvers |
| Yablom / Films | French/original title search, release-year and film-page verification | Xatobam/Dokimov entry discovery, explicit migration notices, branded address page, then FMHY; shared ShareCloudy resolver |


## Shared host coverage

All provider families use **[src/resolvers.js](../src/resolvers.js)**:

| Resolver | Protocol handled |
| --- | --- |
| Vidzy | Known public player encoding and literal media data |
| LuluStream / Livavid | Packed JWPlayer sources |
| ShareCloudy | Literal/packed JWPlayer playlists and caption tracks; native media headers |
| Uqload | Literal or packed JWPlayer sources, including multiple media entries |
| VOE | Literal player redirect, prefix/suffix host branding on rotating aliases and F7 JSON data; HLS and optional direct MP4 |
| Dood | Public pass_md5 flow on pages that expose it |
| Vidmoly | Public player paths and JWPlayer data |
| StreamWish | Packed/literal JWPlayer data and host-specific playback headers |
| MixDrop | Public file/embed path conversion and packed wurl data |
| Vidara | Public stream API with baseline codec negotiation |
| SeekStreaming | Public video API, local AES-CBC decoding and native HLS transport |
| Dropload | Public literal/packed JWPlayer data when exposed; challenge-only pages are skipped |
| ANSEmbed / Smoothpre | Literal/packed JWPlayer and referenced player configuration fields; shared HLS validation for Anime-Sama |
| Sendvid | Public video/secure-video metadata and bounded MP4 placeholder validation; requires a binary-capable bridge |

The registry selects hosts by centrally configured domains or a Frembed-provided
host label for rotating mirrors. Automatic redirects reuse their final body;
redirects that already return an HLS master seed metadata inspection without
another GET. Known literal player data is parsed; downloaded scripts are never
executed. No DOM, WebView, cookie fabrication or challenge solver is used.

Host failures are isolated. A host family being implemented does not establish
that every current player works. For example, The Storm's Dood page currently
requires an interactive CAPTCHA and returns no stream. See
[VERIFICATION.md](../VERIFICATION.md) for live results and exact coverage.

SwiftFlow's current iframe host is unsupported. Its SwiftFlux direct-file path
requires a browser verification token; availability is logged, with no request to
the gated resolver and no fabricated native stream. SeekStreaming uses local
MIT-licensed aes-js, requires neither WebCrypto nor an external decrypting service,
and prefers its declared `cfNative` transport over duplicate IP transport URLs.


Deferred investigations: [Bowd](investigations/bowd.md),
[Stigstream/VidSrc](investigations/stigstream.md),
[Afterdark](investigations/afterdark.md) and
[Movix anime feed](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/blob/aiometadata-input/docs/investigations/movix-anime-feed-2026-11-07.md).
These are not enabled integrations.
