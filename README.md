# Movix VF TV

A small, readable Nuvio JavaScript provider for Movix films and series. Version
1.1.0 targets the JavaScript interface in **Nuvio Android TV 1.0.0** and also
exports the usual `getStreams(tmdbId, mediaType, season, episode)` function for
mobile clients. Playback on a physical TV still needs verification.

## Installation

The repository is private initially. **Make it public before adding this URL to
Nuvio**; Nuvio cannot retrieve a private GitHub manifest or its provider file.
Do not put a GitHub access token in an add-on URL.

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/refs/heads/main/manifest.json
```

1. In Nuvio, open **Settings → Local Scrapers / Plugins → Add repository**.
2. Paste the manifest URL above.
3. Enable **Movix VF TV**, version **1.1.0**. Temporarily disable the original
   **Movix VF** to identify which provider supplies the result.
4. Run **Tester**. Nuvio Android TV uses TMDB **603** (The Matrix) for this test.
5. Check a film and an individual series episode, then try playback.

After code updates, refresh this repository in Nuvio. If its displayed version
does not change, remove and add this repository again.

The separate scraper ID `movix-tv` avoids sharing settings or cached code with
the original `movix` provider.

## What the investigation established

The badges **MOVIE** and **TV** describe films and **TV series**. They do not
certify compatibility with a television device. The original README separately
claims NuvioTV support.

The supplied All-in-One manifest identifies Movix VF as provider version 1.0.0.
That number does not establish the installed application's version.

Source inspected: [D3adlyRocket/All-in-One-Nuvio at
3f09a6f](https://github.com/D3adlyRocket/All-in-One-Nuvio/tree/3f09a6ff4360498895e622877af7a32212f75038).
Runtime inspected: [NuvioTV tag
1.0.0](https://github.com/NuvioMedia/NuvioTV/blob/1.0.0/app/src/full/java/com/nuvio/tv/core/plugin/PluginRuntime.kt).

On 2026-10-15:

- The old domain-list URL, `wooodyhood/nuvio-repo/main/domains.json`, returned
  HTTP 404. The original code catches this and falls back to `movix.cash`, so
  **the 404 alone does not explain zero streams**.
- Movix's API returned a direct stream URL for Matrix (603), Fight Club (550),
  and Game of Thrones S01E01 (1399).
- The original Matrix provider returned one result when run in QuickJS with
  Nuvio TV 1.0.0's fetch behavior. A universal JavaScript incompatibility was
  **not reproduced**. The specific device failure remains unconfirmed without
  the TV's app version, platform, network details and runtime logs.
- The old Matrix lookup made four HTTP requests: TMDB metadata, the dead
  domain list, Movix API, and the media playlist. The replacement makes one
  request when the primary API supplies a direct stream.
- The original fallback only runs when the primary chain rejects; an empty
  `sources` array succeeds with zero results. Some HTTP failures can also turn
  into empty arrays rather than useful diagnostics.
- The media host returned a **Cloudflare HTTP 403** from the development
  environment. Discovering a URL does not establish that the video plays.
  This provider does not solve browser challenges, bypass host restrictions,
  or transfer browser cookies to the player.

Mobile and TV use different execution and HTTP environments. DNS, TLS,
network/IP restrictions, host responses, cached provider code, and runtime
timeouts can differ even with the same manifest. These are possible causes,
not a confirmed diagnosis of this TV.

## Changes

- Uses `api.movix.cash` directly; no dependency on the removed domain list or
  a TMDB API key for display metadata.
- Returns direct media URLs without fetching the playlist during discovery.
  Sends the same User-Agent in discovery and playback and preserves source
  headers, with a default Movix Referer.
- Tries the backup for empty, malformed and failed primary responses.
- Handles `movie`, `tv`, `series`, `show`, explicit episode selection and season
  zero; it does not silently choose episode one when episode arguments are absent.
- Preserves actual resolution/language labels instead of labeling a 1440p
  MULTI result as 720p or inventing codec/audio details.
- Resolves simple static backup embeds; dynamic/obfuscated players still
  require their own supported extractor. Extra backup requests are capped at three.
- Emits `[MovixTV 1.1.0]` warnings for HTTP errors, malformed responses and
  empty results. Android TV's native HTTP timeouts and overall execution limit
  still apply; this provider does not depend on unavailable browser timers.

For maintainers, optional `SCRAPER_SETTINGS.apiBase` and `.siteBase` overrides
can change the domain without changing the request protocol. No Nuvio settings
screen is assumed for these overrides; defaults work without configuration.

## Verification

Node 18+ (no npm dependencies):

```sh
npm test
```

QuickJS smoke tests, using a synchronous native fetch adapter matching the
relevant NuvioTV 1.0.0 behavior:

```sh
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
.venv/bin/python scripts/quickjs_check.py
.venv/bin/python scripts/quickjs_check.py --live
```

The live test checks **source discovery**, not video decoding, DRM, CDN access
from your TV or continuous playback. It requests only the API for a successful
primary lookup. The adapter is a compatibility test, not an Android emulator.

To compare a locally downloaded original provider:

```sh
.venv/bin/python scripts/quickjs_check.py --live --provider /path/to/original/movix.js
```

## If Tester still returns zero

Confirm the displayed provider is **Movix VF TV 1.1.0** and record the exact
Nuvio app version and TV platform. Test phone and TV on the same connection
without changing VPN/DNS settings between tests.

On Android TV with ADB already configured:

```sh
adb logcat -c
# Run Tester in Nuvio, then:
adb logcat -d -s Plugin:movix-tv PluginRuntime PluginManager
```

The on-screen Tester summary does not include all provider console messages;
they appear in Android logs. An HTTP 403, HTTP 0/network error, invalid JSON,
empty catalogue result, or an overall timeout needs a different diagnosis.
If streams appear but playback fails, capture the player's error separately.
Review logs before sharing them: native Nuvio logs can contain full URLs.

## License and attribution

GPL-3.0-or-later; see [LICENSE](LICENSE). This implementation was written
independently using the existing Movix request protocol. Credit to wooodyhood
for the original provider and D3adlyRocket for the All-in-One distribution.
The test fetch adapter follows GPL-licensed NuvioMedia/NuvioTV behavior.
No third-party keys, account credentials or generated stream URLs are bundled.
