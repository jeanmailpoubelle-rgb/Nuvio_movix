# Xperience compatibility — 21 November 2026

## Finding and scope

Public first-party guide and shipped client configuration support the desired
separation: TMDB regular series, TVDB anime episode metadata and IMDb anime
stream IDs. This is a promising configuration, **not a verified replacement for
the current AIOmetadata adapter**. No private Xperience manifest was supplied to
this investigation and no installed-entry metadata/playback test has run.
No production source, settings schema or plugin version was changed.

Sources: [website](https://xperience-app.com/), [guide](https://xperience-app.com/guide),
[release notes](https://xperience-app.com/whats-new). The anonymous guide is more
concise than its shipped editor schema. Public client assets were read as data,
never executed. [Sanitized observations](../../tests/evidence/xperience-compatibility-2026-11-21.json)
record asset hashes and the observed options; ignored reports hold raw pages.
The initial default-agent website request returned403; a normal browser User-Agent
returned200. That does not establish a restriction on metadata or Android access.

## Observed configuration options

| Setting | Client values | Suggested starting point for this user |
| --- | --- | --- |
| Regular-series source | `tvdb`, `tvdb_only`, `tmdb` | TMDB |
| Anime metadata source | `tvdb`, `tmdb`, `kitsu` | TheTVDB |
| Anime stream ID source | `imdb`, `kitsu` | IMDb |
| Anime episode numbering | `absolute`, `seasonal` | Seasonal for a familiar season/episode presentation; verify actual fields |
| Filler marking | `off`, `tag` | Off during initial identity tests |

Client defaults are TVDB regular series, TVDB anime, IMDb stream IDs and absolute
numbering. The distinction between displayed numbering/title prefixes and actual
`videos[].season/episode/id` fields must be checked on a real response; the option
names alone do not prove that absolute mode flattens seasons. Kitsu can use TVDB
fallbacks according to the release notes, so an assumed global provider is unsafe.
The guide says TMDB and MDBList credentials are required for profile setup;
that does not authorize copying credentials into source or public reports.

Xperience also imports AIOmetadata catalogues. Imported catalogue rows and a
replacement metadata endpoint are different features; importing a row does not
prove that the resulting episode order is identical to the original addon.
Using Xperience for home rows while retaining AIOmetadata as the metadata source
is a separate possibility, but must be checked against the actual app’s detail
provider selection, not inferred from catalogue appearance.

## Adapter boundaries to verify next

1. Use the user’s exact private profile. Validate the manifest-declared metadata
   resource/type/ID prefixes and derive its route safely. The documented private
   URL shape ends in `/manifest/{private-token}/manifest.json`; do not request
   example tokens or guess someone else’s configured profile.
2. Request Hunter2011, Apothecary and Haikyuu by known IMDb/TMDB identities.
   Compare series identity fields, actual selected episode coordinates, stream
   suffixes, release dates and external TVDB episode IDs. Probe Hunter S2E1 and
   S2E72, Apothecary S1E1/S2E1 and Haikyuu S2E15; compare a regular TMDB series.
3. Determine whether equivalent `_metaProvider`, `_tvdbEpisodeId` or explicit
   alternatives are present. Their absence from browser code does not prove
   absence from server responses. A valid URL or standard Stremio `meta` resource
   alone is insufficient for identity-safe episode translation.
4. Normalize proven Xperience facts into the existing adapter’s internal episode
   identity. Preserve the AIOmetadata path and per-backend FR/Anime-Sama target
   policies. EN can reuse its AniBridge-to-AniList stage after input normalization.
   Do not impose AIO field names or silently assume TVDB because of a saved option.
5. Add separate fixtures for compatible/absent/conflicting facts and both runtime
   wrappers; then exercise each installed plugin family and media separately.
   Never infer playback from a successful metadata response.

The user was asked to store a private manifest as the Actions runtime secret
`NUVIO_XPERIENCE_MANIFEST_URL`, not paste it into chat. No workflow consumes it yet;
adding a secret alone does not implement support or configure the phone. A future
probe must redact URL/token, artwork paths carrying secrets, raw bodies and keys.

## Decision

Retain existing plugin behavior until the response contract is verified. Likely
work is an explicit Xperience input adapter (or a proven compatible normalization
path), not a rewrite of AniBridge, Anime-Sama source mapping or host resolvers.
No completion, request-cost or device-playback estimate is justified yet.
