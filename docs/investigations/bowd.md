# Bowd feasibility — 16 October 2026

Bowd's catalogue API works through ordinary authenticated HTTP, but the account
tested did not receive a playable media URL. A production provider was not added.
Sources FR remains at version 1.7.0 with its existing five active providers.

## Verified account flow

The user authorized a temporary workspace session using Bowd's official
`/pair` page. Its normal device pairing and session-to-JWT exchange succeeded.
No password was shared. Sign-up requires Turnstile; the initial registration
attempt did not create an account.

An anonymous session can read the site's playable index but receives
`ACCOUNT_REQUIRED` when listing video sources. The index reported 29,532 unique
movie TMDB IDs and 448 unique series TMDB IDs. These are site-reported catalogue
records, not independently verified playable films or complete series.

With the approved account, exact TMDB movie and episode lookups returned:

| Case | Source entries listed | Listing request | First delivery request |
| --- | ---: | ---: | --- |
| Dragons (2010), TMDB 10191 | 51 | 2.16 s | Preroll challenge |
| Matrix, TMDB 603 | 43 | 1.88 s | Preroll challenge |
| The Dark Knight, TMDB 155 | 34 | 1.83 s | Preroll challenge |
| Reacher, TMDB 108978, S4E1 | 20 | 6.53 s | Preroll challenge |
| Reacher, TMDB 108978, S1E1 | 31 | 1.04 s | Preroll challenge |

The listing uses `/api/v1/vod/{movie|tv}/{tmdbId}/streams`; TV requests include
the exact `sa` and `epi` values. Each source has an opaque server-issued token.
Some entries also include language, resolution and portability hints. These are
catalogue hints; actual media audio and quality were not verified.

## Delivery limitation

The web client first obtains its normal short-lived client pass from
`/api/v1/client/pass`. That request succeeded. Delivering the selected source
still returned an `ad` object containing `beaconChallenge`, `vastUrl`,
`skippableAfterSec: 10` and `adsPerBreak: 1`, without a media URL.

Bowd's separate public player bundle implements a preroll overlay. It loads the
ad, handles playback and then reports completion to
`/api/v1/playback/ad-complete` before requesting the programme again. The probe
did not complete ad playback or submit advertising completion/tracking events.

The same gate occurred when requesting a different Dragons source advertised
as portable 720p VF with Bowd's `x-bod-platform: tv` header. This was an HTTP
protocol check, not a test on Android TV hardware. The official native download
route, using `purpose=download`, returned HTTP 403 `PREMIUM_REQUIRED` for this
account. No paid entitlement was acquired or tested.

Nuvio TV 1.0.0's JS plugin result contract returns media URLs, headers and
subtitles; it has no preroll UI or ad-completion callback. A plugin result cannot
perform this playback interaction. A supported third-party delivery API or
changes to Nuvio's player would be needed for this account flow. Whether a
different account entitlement provides usable direct media remains unverified.

## Login configuration on TV

The exact TV 1.0.0 source synchronizes plugin repository URLs, types and flags,
but does not synchronize arbitrary per-scraper settings. Its separate credential
sync service handles built-in integrations, not arbitrary plugin credentials.
Adding a phone settings field would therefore not establish a working Bowd
login on TV. Per-device authentication needs a concrete solution before release.

## Evidence and limits

- [Sanitized request evidence](../../tests/live-bowd-feasibility-2026-10-16.json)
- [Bowd website](https://bowdtv.com/)
- [Bowd application bundle inspected](https://bowdtv.com/_expo/static/js/web/entry-72db82408ddaff2a1b9920777a753ccc.js)
- [Bowd player bundle inspected](https://bowdtv.com/_expo/static/js/web/entry-73dc8f41f9017efbfd7c6a2afe857455.js)
- [TV 1.0.0 plugin result contract](https://github.com/NuvioMedia/NuvioTV/blob/1.0.0/app/src/main/java/com/nuvio/tv/domain/model/Plugin.kt)
- [TV 1.0.0 plugin sync](https://github.com/NuvioMedia/NuvioTV/blob/1.0.0/app/src/main/java/com/nuvio/tv/core/sync/PluginSyncService.kt)
- [TV 1.0.0 credential sync](https://github.com/NuvioMedia/NuvioTV/blob/1.0.0/app/src/main/java/com/nuvio/tv/core/sync/ProviderCredentialSyncService.kt)

The HTTP timings are individual cloud requests, not device benchmarks or total
discovery times. No movie/episode media, actual resolution, audio tracks,
subtitle correctness or decoder playback was verified. The temporary test
session was signed out successfully and its local credentials/grants removed.
No credentials, pairing codes, source tokens, signed media URLs or downloaded
third-party implementation code are committed.
