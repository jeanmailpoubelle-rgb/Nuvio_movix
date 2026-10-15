# Nuvio French Providers

A small provider repository targeting **Nuvio Android TV 1.0.0**. Repository
version **1.2.0** contains three self-contained JavaScript providers:

| Provider | Version | Matching and retrieval |
| --- | --- | --- |
| Movix VF TV | 1.2.0 | TMDB ID → Movix API → Purstream media; Cpasmal backup |
| Purstream VF TV | 1.0.0 | TMDB metadata → title/year search → verified TMDB correspondence → media |
| Nakios / Vidzy VF TV | 1.0.0 | Vidzy TMDB player first; Nakios catalogue and address discovery as fallback |

There is no IMDb lookup inside these providers. Nuvio supplies a numeric TMDB
ID, a media type, and explicit season/episode numbers for series. The TV badge
in Nuvio describes **TV series**, not certification for a television device.

All three passed tests with JavaScript extracted from NuvioTV **tag 1.0.0**.
Live tests retrieved HLS playlists and small media-segment samples for two films
and a series episode through each provider. **Physical TV playback is still
unverified**; Android networking, decoding and continuous playback need a device
test. See [VERIFICATION.md](VERIFICATION.md) for results and limits.

## Install or update

Add this manifest in **Settings → Local Scrapers / Plugins → Add repository**:

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/refs/heads/main/manifest.json
```

If you installed the earlier Movix-only repository, **refresh that repository**.
The URL stays the same. Its name becomes **Nuvio French Providers**, with three
providers. If the displayed versions do not update, remove and add this
repository again.

The repository and provider files must be publicly accessible for Nuvio to
retrieve them. A private GitHub repository cannot be installed using an ordinary
raw URL. Do not put an access token in a plugin URL.

Temporarily disable the original All-in-One equivalents while testing, enable
one new provider at a time, run **Tester**, then try actual playback. Android TV
1.0.0's Tester normally uses *The Matrix*, TMDB 603. Also check a specific series
episode. IDs `movix-tv`, `purstream-tv` and `nakios-tv` distinguish these providers
from the All-in-One originals. Android internally prefixes IDs with a repository
identifier.

## What changed

### Movix

The successful lookup needs **one API request**, with no TMDB display-metadata
request, deleted domain-list request, or playlist prefetch. The API request uses
the Movix Referer, while returned Purstream media uses the **Purstream player
Referer**. Using the Movix Referer for playback produced HTTP 403 in our test;
the same media URL worked with Purstream's Referer. Explicit source-provided
headers take precedence.

Empty or invalid primary results trigger the Cpasmal backup. Backup attempts
are bounded and interleave VF/VOSTFR entries. Static media and the supported
public Vidzy player encoding can be extracted; unsupported players are logged.

### Purstream

The original used two TMDB metadata requests and a deleted domain-list lookup.
This provider uses one metadata request. A first uncached movie lookup normally
needs **three requests**, and a series episode needs **four**, including identity
validation.

Matches require the correct media type, a matching normalized title or poster,
and a year within one year when TMDB supplies one. If needed, the original title
is searched after the French title. Ambiguous matches are rejected. The media
sheet's `tmdbId` and type must match before any streams are returned. It never
falls back to an unrelated first search result.

A bounded, ten-minute in-memory catalogue-ID cache can reduce repeated lookups
when the host reuses the JavaScript context. Nuvio may create a fresh context per
call. Signed stream URLs are always retrieved anew.

### Nakios / Vidzy

The old `api.nakios.click/api/sources/...` protocol is not the protocol used by
the current Nakios catalogue. Merely replacing `.click` with `.live` does not fix
that provider.

The [Vidzy documentation](https://api.vidzy.org/) exposes these TMDB player routes:

```text
https://vidzy.org/movie/{tmdbId}
https://vidzy.org/serie/{tmdbId}/{season}/{episode}
```

The provider reads the player iframe, then parses its public media-source data
without executing third-party JavaScript. It handles the observed hostname/CSS
constants in Vidzy's encoded VideoJS source and rejects `/troll/` placeholders.
A successful default lookup normally needs **two requests**. Results are named
**Vidzy** so the source is clear. The availability API is not requested first,
since it adds a round trip and returns an embed URL rather than a native stream.

If that route fails, the provider searches [Nakios Live](https://nakios.live/)
using TMDB title/year metadata, reads the matched movie or exact episode page,
and resolves supported direct/Vidzy sources. Such results are named **Nakios**.
It does not treat arbitrary browser embeds as playable videos.

If catalogue lookup fails, it reads the labelled catalogue/streaming link from
[nakios.org](https://nakios.org/) and retries once if that address has changed.
Directory lookup is deferred to avoid adding a request to every successful
lookup. Unrelated advertisements and the informational `.info` link are ignored.
The discovery currently follows root `https://nakios.<domain>` links; a future
rename to an entirely different brand would require a provider update.

Some catalogue players currently return a three-minute loading page, or use
other unsupported hosts. Those entries are skipped rather than returned as
streams. This fallback cannot guarantee every title or every language variant.

## Android TV 1.0.0 compatibility

- Standard `module.exports.getStreams(id, type, season, episode)` export,
  isolated in an IIFE to avoid collisions with the host's polyfill globals.
- Each file in `providers/` is complete: no runtime imports, Node modules, DOM,
  WebView, crypto library, or browser-cookie dependency.
- Uses the host's `fetch` and Promise response methods. JSON is parsed explicitly
  so TV 1.0.0's `response.json()` returning null on malformed bodies cannot hide
  the underlying stage.
- Supports `movie`, `tv`, `series`, `show`, and season zero. Missing episode
  arguments are rejected instead of silently selecting episode one.
- Browser timeout helpers are optional. The code works without timers; TV
  1.0.0's native HTTP timeout and overall provider limit still apply. Request
  counts and elapsed time are bounded between requests. A native request already
  in progress cannot be interrupted by a missing browser timer.
- Purstream and Nakios catalogue fallback use **Nuvio's injected `TMDB_API_KEY`**.
  No third-party key is bundled. Movix and the successful Vidzy path do not need
  that key. A host that does not inject it needs an explicit settings override.

Maintainer overrides, through `SCRAPER_SETTINGS` if supported by the host:
`apiBase` / `siteBase` for Movix/Purstream; `purstreamReferer` for Movix media;
`siteBase`, `vidzyBase`, and boolean `preferCatalogue` for Nakios; and
`tmdbApiKey` for metadata requests. No custom settings UI is assumed.

## Maintain and verify

Edit **`src/`**, then regenerate the standalone provider files:

```sh
npm run build
npm test
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
.venv/bin/python scripts/quickjs_check.py --all
```

The QuickJS harness loads the literal JS polyfill and call wrapper extracted
from NuvioTV tag 1.0.0. Its native HTTP binding uses Python urllib, not Android's
OkHttp. It runs without browser timers or a DOM. Offline fixtures require no
network access or credentials.

For live verification, supply your own TMDB key via the `NUVIO_TMDB_API_KEY`
environment variable to emulate the app's injected key, then run:

```sh
.venv/bin/python scripts/quickjs_check.py --all --live --probe-media
```

`--probe-media` checks playlists and a small range of one media segment; it does
not decode video or establish uninterrupted playback. `--report path.json`
writes a summary without credentials or signed URLs. To test just one provider,
use `--provider providers/nakios.js` instead of `--all`.

To add a provider, create `src/<name>.js`, add its manifest entry with filename
`providers/<name>.js`, add regression coverage, and run the build. Shared HTTP,
URL, metadata and player parsing lives in `src/common.js` and
`src/extractors.js`. CI checks generated files, regressions and TV 1.0.0 fixtures.

## If the TV still fails

Confirm the app is **Nuvio Android TV 1.0.0** and the provider versions match the
table. Capture the on-screen result and the player's error if streams appear
but playback fails. With ADB already configured, run Tester and collect logs:

```sh
adb logcat -d | rg 'movix-tv|purstream-tv|nakios-tv|PluginRuntime|PluginManager'
```

Provider warnings identify HTTP failures, matching failures, unsupported players
and request budgets. Review logs before sharing: native app logs can contain
full URLs and metadata keys. Test phone and TV on the same network to compare
network-specific failures.

## License and attribution

GPL-3.0-or-later; see [LICENSE](LICENSE). Request protocols were reviewed against
wooodyhood's providers distributed by
[D3adlyRocket/All-in-One-Nuvio](https://github.com/D3adlyRocket/All-in-One-Nuvio).
The new implementation is readable and independently written. Vidzy extraction
follows public player data. TV runtime test fixtures are extracted from
[NuvioMedia/NuvioTV 1.0.0](https://github.com/NuvioMedia/NuvioTV/tree/1.0.0)
under its GPL license; see the fixture notices. No credentials, cookies or live
signed media URLs are committed.
