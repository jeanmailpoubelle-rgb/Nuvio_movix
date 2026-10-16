# Provider configuration

Edit **[endpoints.json](endpoints.json)** to change domains or the minimum
resolution. The build embeds this one file into every provider, including TV
1.0.0. No settings gear or account-settings synchronization is needed.

## Minimum resolution

```json
"streams": {"minimumResolution": 720}
```

Known quality tiers below 720p are removed from the final result list. Exactly
720p and higher stay. Unknown resolution stays, without a resolution label.
Use `1080` for a 1080p minimum or `0` to disable filtering.

Filtering happens after the existing HLS metadata read, so measured resolutions
override filename/API hints. An adaptive master stays if its highest advertised
video tier meets the minimum; its original renditions/audio/subtitles remain
available. This filter does not force the player to stay above a bitrate or
resolution during playback, download MP4 metadata, or trigger extra searches.

## Domain fields

| Field | Change when |
| --- | --- |
| `catalogue.vidzy` | The Vidzy TMDB lookup site changes |
| `catalogue.mirrors` | Nakios, Purestream CC or Movix ZIP changes domain; list preferred sites first |
| `catalogue.directories[].url` | A current-domain reference page changes |
| `catalogue.lulu` | A LuluStream/Livavid player origin changes |
| `purstream.wrapperApi` | The wrapper API changes |
| `purstream.wrapperSite` | The wrapper site's Origin/Referer changes |
| `purstream.directApi` | The direct API changes; retain its `/api/v1` path |
| `purstream.playbackSite` | The API media player's Referer changes |
| `purstream.status` | The direct API's current-domain status endpoint changes |
| `movix.directory` | Movix's official current-address directory changes |
| `movix.mirrors[].api` / `.site` | A known fallback Movix API/site origin changes |
| `movix.sites` | Known Movix website fallbacks change; used if directory/site recovery fails |
| `movix.catalogues` | Choose/order public catalogue adapters: `wiflix`, `fstream`, `coflix` |
| `frembed.base` | Frembed changes domain |
| `hosts.<family>` | A supported player's domain changes, including Vidzy |

Use HTTPS URLs for site/API fields. Host patterns contain only domains, such as
`vidzy.cc`, or domain stems such as `voe.*`; omit scheme and path there.
Changing a domain within a host family uses the same resolver protocol. A new
host with a different protocol needs its own adapter.

The current Movix API/site defaults are `https://api.movix.dog` and
`https://movix.dog`. `https://movix.online/` currently links that site.
College and Cash serve the same application, so they are recovery origins, not
duplicate normal providers. On endpoint failures, discovery reads the official
site's first-party bundle for literal API origins without executing the bundle.
It adds no preflight to healthy calls and caches only endpoint metadata for ten
minutes. Structured missing-title/pending responses and rate limits do not trigger
domain changes. The direct API's status fallback is also lazy and validates its
returned domain before use. Media/grant URLs are never cached across lookups.

## Publish a change

1. Edit `config/endpoints.json`.
2. Bump the version in `package.json`, `manifest.json`, and each scraper entry.
3. Run `npm run build` and `npm test`.
4. Commit the config, versions and rebuilt `providers/` files, then push.
5. Refresh the repository in Nuvio on the phone and TV.

The build validates endpoints and the minimum, and CI rejects outdated generated
bundles. Edit source/config files; the next build replaces generated providers.
