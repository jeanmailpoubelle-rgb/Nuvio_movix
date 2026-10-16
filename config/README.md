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
resolution during playback or download MP4 metadata. Filtering now participates
in fallback and host selection: discarded sources lead to another candidate or
backup within the same request/time budget.

## Result selection and speed

`selection.targetSources` defaults to **3** qualifying alternatives per host-list
provider. It is a target: a completed batch or a host returning multiple variants
may yield more. Unknown resolutions count because they are intentionally kept.
Failures and filtered links do not count. VF/MULTI and VOSTFR candidates are
given opportunities before stopping on the target.

`selection.hostPriority` lists preferred host families, fastest/reliable first.
Direct media is always considered first. These are configurable preferences,
not a claim that every current file on a host works. `limits.hostConcurrency`
defaults to **3**; requests within TV 1.0.0's synchronous bridge still serialize.
`limits.requests` (**24**) and `limits.elapsedMs` (**45000**) bound each provider
lookup between native requests. No timer or cancellation support is assumed.
The previous six-host and three-backup attempt caps have been replaced by this
result target and request/time budget.

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
| `movix.extra` | Choose/order extra adapters: `custom`, `omega`, `swiftflow` |
| `frembed.base` | Frembed changes domain |
| `yablom.mirrors[].site` | A Yablom/Pirvab/Xatobam origin changes; list the preferred site first |
| `yablom.mirrors[].search` | Optional verified POST search route, including its entry folder; update alongside `site` or remove it for automatic entry discovery |
| `yablom.directories[].url` | The branded address page or independent FMHY recovery directory changes |
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

Yablom's current fast path is Xatobam, then Pirvab on endpoint failure. Its
configured search route avoids two landing/home requests on healthy lookups.
If that route fails or stops echoing the search query, entry/form discovery
recovers the folder without guessing it. Domain announcements, known mirrors,
the branded `yablom.com` address page and finally FMHY provide recovery hints;
every discovered site must pass the same search/film validation. These hints are
not a permanent official domain API. Verified addresses alone can be cached for
30 minutes within a reused JS context. Missing films, filtered streams and failed
players never cause duplicate searches across equivalent mirrors.

## Publish a change

1. Edit `config/endpoints.json`.
2. Bump the version in `package.json`, `manifest.json`, and each scraper entry.
3. Run `npm run build` and `npm test`.
4. Commit the config, versions and rebuilt `providers/` files, then push.
5. Refresh the repository in Nuvio on the phone and TV.

The build validates endpoints and the minimum, and CI rejects outdated generated
bundles. Edit source/config files; the next build replaces generated providers.
