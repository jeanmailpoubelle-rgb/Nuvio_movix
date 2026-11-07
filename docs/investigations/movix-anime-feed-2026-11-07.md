# Movix anime feed / Apothecary S3 — 7 November 2026

Investigation only. No provider, production endpoint, numbering rule, version or
runtime settings were changed. Applies to the current stable and preview paths.

## Confirmed missing discovery path

At TMDB220542, the website has a separate Anime/WatchAnime path in addition to
ordinary TV player feeds. Its current first-party TVDetails and WatchAnime
modules query `/anime/search/<encoded-title>?includeSeasons=true&includeEpisodes=true`.
They select a candidate using title aliases and sometimes title-specific ID
exceptions; this is not direct TMDB-keyed episode retrieval. Source inspection
was data-only; downloaded code, analytics and browser challenges were not run.
The frontend names api.movix.miami; api.movix.dog serves the tested feed too.
This is evidence for these routes, not a reason to replace every configured domain.

Searching “Les Carnets de l’apothicaire” (straight ASCII apostrophe in the actual
request) returns one result, with source URL on Anime-Sama and aliases The
Apothecary Diaries / Kusuriya no Hitorigoto. It has24/24/6 indexed episodes.
S3E1 has VOSTFR, VF and VA rows with repeated player URLs. ANSEmbed, Uqload,
VOE aliases, Sendvid and another host are advertised. VA’s actual audio/subtitle
meaning was not verified. S3E4 has no VF row; E5/E6 only have VOSTFR in this
snapshot. Do not promise all languages for every listed episode.

Purstream `/api/purstream/tv/220542/stream` and Custom `/api/links/tv/220542`
return404 for both S3E1 and S1E49. Both still have data at S1E48. Sources FR
queries these ordinary feeds, not `/anime/search`, so the website's anime links
never reach those provider workers. This is not caused by quality filtering of
those unseen players. The website's metadata advertising60 episodes does not
prove60 anime-source entries: this feed currently has54.

## Runtime checks

Stable Mobile actual main/Extra entries return0 for both coordinate layouts.
Their traces show the established S3E1 ↔ S1E49 correspondence, so simply changing
the episode numbers cannot fix the empty ordinary feeds. Dedicated Anime-Sama
ANSEmbed returns two reachable1080p editions, VF and VOSTFR, at both S3E1 and
S1E49. Both select source `/saison3/` index0. The two API ANSEmbed URLs match the
two direct-site players exactly; there are no extra ANSEmbed editions in that
API sample.

The private configured preview run42386939209 independently maps AIO S3E1 to
canonical S1E49. Main returns0; Anime-Sama returns two reachable1080p streams
at the same source slots. Raw private configuration/player data are not retained
in evidence. No physical device or decoded episode-content check was performed.

## Search/speed implications

The API is promising as a discovery source: one27KB response took about0.76s in
one sample, with warmer reads0.26–0.31s. Direct Anime-Sama ANSEmbed discovery took
15/18 requests for seasonal/absolute input in this test, including host/HLS work.
Those are different scopes and not a completed accelerator benchmark.

A search for literal220542 returns200 with an empty list. Returned series have
name/aliases/source URL/seasons, not an explicit TMDB identity. Movix's TMDB page
URL therefore does not remove the identity-matching problem. Romaji search also
returned several unrelated partial-title results. Keep ambiguity/foreign-title
rejection and verify the source's trusted external IDs/year; do not copy the
frontend's fuzzy ranking or hardcoded ID/title exceptions.

In this sample, even `includeSeasons=false&includeEpisodes=false` returned the
same full27KB document. Large catalogues can exceed Nuvio’s response limits.
Cached season timestamps and duplicate URLs also require freshness/dedup checks.

## Recommended exploration, not implemented

Prototype the feed as an optional discovery accelerator/fallback for the dedicated
Anime-Sama plugin, reusing the existing source-slot mapper and shared resolvers.
Preserve independent host entries, all eligible editions and no resolution minimum;
do not merge it into Sources FR implicitly. Keep direct-site fallback and measure
coverage and total latency across small/large series, movies and season boundaries
before choosing a default. A separate Sources FR anime feed would be a product
choice and could duplicate the dedicated plugin’s links.

What can break: current API origins, search route/query semantics and response
shape; HTML entities/aliases and missing identity; cache freshness/episode counts;
season names/special groups/absolute numbering; duplicate URLs; edition-language
meaning; host aliases, unavailable files and native text/binary limits. Future
integration needs synthetic protocol/negative fixtures, owned audit cases, actual
installed-entry/both-wrapper checks and source coverage/partition verification.

[Sanitized episode/host counts, native/configured traces and observed statuses](../../tests/live-movix-apothecary-investigation-2026-11-07.json).
