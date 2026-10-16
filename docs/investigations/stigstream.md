# Stigstream / VidSrc feasibility

Investigation on 16 October 2026. Production remains Sources FR 1.8.1;
this is research, not an installed or verified playable provider.

## Public protocol

`https://stigstream.ru` browses/searches TMDB. Its current player bundle
`/_next/static/chunks/909227253d0fb05d.js` enables VidSrc and disables VidLink.
Watch pages accept explicit TMDB coordinates, including
`/movie/watch/10191` and `/tv/watch/108978/4/1`.

The enabled player builds `https://vidsrc.sh/embed/movie/ID` or
`https://vidsrc.sh/embed/tv/ID/SEASON/EPISODE`, preferring IMDb when available.
The reviewed Stigstream frontend exposes no independent direct-media API.
Its broad TMDB catalogue does not establish playback availability or French audio.

The normal VidSrc chain is:

1. Read the embed's `data-api` and request its temporary inner-player grant.
2. Follow the landing page's declared player URL.
3. Read the fresh player configuration, check the requested identity/coordinates,
   and use its normally issued, single-use stream API token.
4. Request stream data from `data.vidsrc.sh/api.php`.
5. Decode the encrypted URL list with the supplied five-minute-window decoder.
6. Fetch each selected media host's optional playback token and HLS metadata.

Observed stream-data responses for Dragons and Reacher S4E1 took 1.12–1.25s.
Those timings exclude bootstrap, decoder, media-token and playlist requests.
The three returned anime URLs are not proof of three audio choices.
No account, challenge solver, fabricated token or external decrypting service
was used. The development prototype used Node's WebAssembly implementation.
No production provider uses that development implementation.

## Anime language investigation

The API responses and supplied decoders were processed for these six examples:

| Title | Upstream release hint | Default captions advertised |
| --- | --- | --- |
| Jujutsu Kaisen 0 | Japanese-labelled | None |
| Jujutsu Kaisen S1E1 | Dubbed | None |
| Attack on Titan S1E1 | Dual-Audio | Three English tracks |
| Le Voyage de Chihiro | No explicit language | None |
| Your Name | No explicit language | None |
| Demon Slayer S1E1 | No explicit language | None |

**These are release hints, not measured track inventories.** The original
Dual-Audio filename cannot prove that the transcoded HLS output retains both
audio tracks. Likewise, a single track's count cannot establish its language.
The user reports English-only anime copies, which do not meet their preferences.
No Japanese/French track or MULTI label was confirmed during this investigation.
No French default captions were advertised for these six cases. This does not
rule out French captions through the website's external subtitle-search feature.

All tested media playlists returned HTTP 403 from this workspace. The browser
check also returned Cloudflare's "Sorry, you have been blocked" page. This is
not evidence of global unavailability, but it prevents checking actual audio,
resolution and continuous playback here. The reviewed custom player code has
no audio-track selection handler; absence of a website control does not prove
that a stream has only one track. A native player can expose tracks retained
in the media, provided the playlist actually supplies them.

The first audit had an Attack on Titan bootstrap HTTP 403. A fresh recheck
obtained its API payload; its media playlists remained blocked, as did the
other five examples. Optional playback-token failure was allowed to fall back
to the raw playlist, matching the website; those requests also returned 403.

See [the redacted audit](stigstream-anime-audit.json). Temporary grants, API
tokens, raw response bodies, decoded URLs and downloaded decoder modules remain
outside the repository. No media URLs, decoder keys or complete captions are
committed.

## Android TV 1.0.0 blocker

The current API sends an encrypted string plus a binary `application/wasm`
decoder URL. Its browser code uses a rotating ChaCha20 WebAssembly module.
Although a portable decoder could replace WebAssembly execution, the exact
TV 1.0.0 runtime also has a binary-transport limitation:

- Its JavaScript `fetch` response supplies `text()`/`json()`, without
  `arrayBuffer()` or raw/base64 response bytes.
- Native `performNativeFetch` converts bytes to a string using the response
  charset, defaulting to UTF-8. `decodeBodyToSafeString` does not retain raw
  bytes. The sampled decoder produced 337 replacement characters and failed
  a UTF-8 round trip.
- The literal runtime fixture reports `typeof WebAssembly === 'undefined'`.

Source: [PluginRuntime.kt at tag 1.0.0](https://github.com/NuvioMedia/NuvioTV/blob/1.0.0/app/src/full/java/com/nuvio/tv/core/plugin/PluginRuntime.kt#L562),
especially `performNativeFetch`, `decodeBodyToSafeString` and the fetch polyfill.
The provider cannot repair bytes already lost by the app's native bridge.
The API's browser decoder recognizes an inline-base64 fallback, but the current
tested responses provide binary decoder URLs. No supported way to request the
inline format was found in the reviewed public client code.

Supporting the current protocol on TV 1.0.0 would require a binary-safe hosted
helper, a change to the TV runtime, or a supported textual decoder transport
from the upstream service. A public proxy was not added as a new dependency.
The user chose to leave VidSrc out for now. No hosted service or production
provider was added. Revisit only with a suitable TV-compatible architecture
and verified media/audio access. Do not enable a provider based on API HTTP 200
or filename hints alone.
