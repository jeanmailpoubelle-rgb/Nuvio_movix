# Provider configuration

Edit **[endpoints.json](endpoints.json)** to change Sources FR domains or its
minimum resolution. The dedicated **Anime-Sama** plugin has its own
**[anime-sama.json](anime-sama.json)** for its home origin, editions, metadata
endpoints, browser User-Agent and lookup limits. Shared video-host domains remain
in `endpoints.json`. The build embeds configuration, including on TV 1.0.0;
no settings gear or account-settings synchronization is needed.

For maintenance, [maintenance.json](maintenance.json) defines audit sample titles
and integration ownership; it is not shipped configuration. The audit expands
the mirrors/directories in `endpoints.json` without copying their domains. See
the [Codex Cloud debug workflow](../docs/maintenance.md).
Anime cases can include `episode_reference` with an expected source group and
array index: the audit checks every selected edition, so playing the wrong episode
cannot pass just because it returns media. These reference coordinates are test
expectations; they are never included in the generated plugins.
The `jjk-api-cinemeta` reference belongs to Sources FR's `movix` provider and
diagnoses backend layout/availability separately from the dedicated Anime-Sama
seasonal references. Artwork checks remain manual; see the linked investigation.
The `jjk-custom-seasonal` and `jjk-custom-continuous` references belong to
`movix-extra`. Its seasonal case verifies the Custom adapter's exact mapping
event; a playable different episode does not pass that check.
The isolated mapping integration's `cases` restriction selects its seasonal
reference during the default deep audit, so a healthy movie cannot skip that path.

Anime-Sama's `metadata.nuvioCatalog` is the primary catalogue and
`metadata.cinemeta` supplies alternate seasonal lists through an explicit IMDb
correspondence when a requested season is absent. Keep the configured metadata
origins separate from the Anime-Sama site address. No per-title season lengths
or merge setting are required; see the [layout diagnosis](../docs/investigations/anime-season-layouts.md).

## Minimum resolution

```json
"streams": {"minimumResolution": 720}
```

Known quality tiers below 720p are removed from the final result list. Exactly
720p and higher stay. Unknown resolution stays, without a resolution label.
Use `1080` for a 1080p minimum or `0` to disable filtering.

This minimum applies to **Sources FR only**. Anime-Sama must keep its own
`minimumResolution: 0` and `targetSources: 0`: retain old, low-resolution anime
and attempt every published host/edition within its own budget. Its defaults
are 64 requests, 45 seconds checked between requests and four host workers.
See the [dedicated plugin guide](../docs/anime-sama.md).

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

Final display order is separate from extraction priority: highest resolution
first, then MULTI/VF/VOSTFR/other at each resolution, with unknown resolution
last. `src/common.js:presentStreams` supplies this policy to both plugins after
metadata/validation and filtering. Multiple results receive padded position
prefixes to preserve their order through Mobile's alphabetical label sorting.
This adds no requests and does not change fallback, candidate selection or limits.

A result needs a readable HLS playlist to qualify. Network errors, timeouts,
failed HTTP responses and non-playlist bodies exclude that link for this lookup;
they do not satisfy the source target or suppress a configured backup. A valid
playlist with unknown resolution still stays. Subsequent lookups retry fresh
source data; there is no permanent CDN blacklist or production DNS dependency.

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
| `movix.customEpisodeRecovery.inputCatalog` | Incoming metadata numbering for missing Custom anime episodes: `cinemeta` (this repository's configured source) or `disabled` |
| `movix.customEpisodeRecovery.catalog` | Nuvio Catalog metadata origin used for Custom's target episode coordinates |
| `movix.customEpisodeRecovery.cinemeta` | Cinemeta metadata origin used to identify the requested episode |
| `frembed.base` | Frembed changes domain |
| `yablom.mirrors[].site` | A Yablom/Pirvab/Xatobam origin changes; list the preferred site first |
| `yablom.defaultLanguage` | Default catalogue hint: `VF`; use an empty string to leave unlabelled entries without a language. Explicit VOSTFR and measured audio override this hint |
| `yablom.mirrors[].search` | Optional verified POST search route, including its entry folder; update alongside `site` or remove it for automatic entry discovery |
| `yablom.directories[].url` | The branded address page or independent FMHY recovery directory changes |
| `hosts.<family>` | A supported player's domain changes, including Vidzy |

Use HTTPS URLs for site/API fields. Host patterns contain only domains, such as
`vidzy.cc`, or domain stems such as `voe.*`; omit scheme and path there.

Custom episode recovery is intentionally configured for **Cinemeta** input.
Nuvio does not forward the selected metadata provider to the native plugin.
Set `inputCatalog` to `disabled` if incoming coordinates use another numbering
system; do not infer that system from an IMDb or TMDB series ID. Existing direct
TMDB/continuous Custom entries still work with the default: they do not need
recovery. Only HTTP 404 for a regular TV episode can trigger the two metadata
reads and one retry. A unique non-generic title and release times within 24 hours
must agree, along with explicit series identity. No titles, season lengths or
episode offsets are configured here. See [the protocol and failure map](../docs/custom-episode-recovery.md).
Changing a domain within a host family uses the same resolver protocol. A new
host with a different protocol needs its own adapter.

VOE's rotating aliases can also be identified from the final player page's host
branding (`VOE | ...` or `Watch filename - VOE | ...`) and decoded with the same
F7 resolver. A missing VOE result with a successful embed HTTP response can mean
that branding or encoding changed; inspect `src/resolvers.js` before adding one
short-lived alias to the domain list. Bleach S1E1 is an audit reference for this.

The `purstream` section deliberately includes Movix and Purstream domains:
Movix's `/api/purstream` endpoint wraps Purstream's sources, while `directApi`
provides recovery. `wrapperSite` is used for API requests and `playbackSite` for
media Referer headers; the latter is not a current-website discovery field.
On 17 October 2026, the status service advertised `purstream.sh`, both `.id` and
`.sh` APIs worked, and the Matrix wrapper/direct responses shared the exact same
media URL. The configured `.club` page served the official wiki. See the
[relationship and failure evidence](../docs/investigations/movix-purstream.md).

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

1. Edit the relevant config/source, and update its maintenance notes and tests.
2. For Sources FR, bump `package.json`, `manifest.json` and its scraper versions.
   For Anime-Sama, bump `plugins/anime-sama/manifest.json` and its scraper version.
   Shared production changes require releases of both affected plugins.
3. Run `npm run build`, `npm test`, both native wrapper suites and affected live checks.
4. Commit config, source, versions, docs and generated bundles, then push.
5. Refresh the affected repository in Nuvio on the phone and TV. Anime-Sama has
   its own install URL; it is absent from the Sources FR manifest.

The build validates endpoints and the minimum, and CI rejects outdated generated
bundles. Edit source/config files; the next build replaces generated providers.
