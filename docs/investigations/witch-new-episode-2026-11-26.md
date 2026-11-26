# The World's Strongest Witch S1E8 — 26 November2026

Investigation and fallback proposal only. No production plugin/APK, cache or
mapping changes. The user confirms stable works while Anime-Sama+ with Xperience
returns no links. The integrated Android tunnel0.2.1 was separately confirmed
working; this new report concerns the phone plugin.

## Reproduced cause

Series: TMDB321518 / IMDb tt43691408 / TVDB477424.

| Evidence | S1E7 control | S1E8 |
| --- | --- | --- |
| AIOmetadata TVDB episode | 12023448 | 12023449 |
| Xperience selected episode | Same ID/title/date as AIO | Same ID/title/date as AIO |
| TMDB find by TVDB episode ID | Empty successful response | Empty successful response |
| Nuvio Catalog, TMDB and IMDb routes | I Tried Making a Secret Weapon! | I Tried Teleporting! |
| Cinemeta canonical title | I Tried Making a Secret Weapon! | Episode 8 |
| Configured Anime-Sama selection | Exact source index6 | INPUT_METADATA_EXTERNAL_ID_UNAVAILABLE |
| Native installed ANSEmbed entry | One returned VOSTFR stream, index6 | One returned VOSTFR stream, index7 |

The configured checks run the current + generated bundle with only the entry
point replaced to stop after selection. AIOmetadata, Xperience auto and Xperience
explicit TVDB all select E7 correctly and stop E8 after four metadata requests,
before Anime-Sama discovery/extraction. Native full installed-entry controls for
both episodes each return one ANSEmbed stream after12 requests; these are cloud
source/playlist results, not physical playback proof or all-host acceptance.

AIO/Xperience already contain E8, named “J'ai essayé de me téléporter”, released
2026-11-25T13:00Z. The reference has the meaningful English title and midnight
release on the same day. The TMDB direct episode row7903448 also exists, but has
no TVDB external ID; its French episode translation is empty. Thus direct TMDB
French translation is not an available repair in this example.

The existing empty-find fallback first corroborates the configured exact stream
and TVDB episode identity against Cinemeta, then matches a meaningful canonical
title/date into the reference inventory. “Episode8” is deliberately rejected.
This is the same [E6 issue from11 November](witch-new-episode-2026-11-11.md),
which later recovered when the canonical name was updated. Neither source cache
flushing nor switching from Xperience to AIOmetadata fixes the reproduced E8 gap.
No upstream refresh deadline was established.

## Feasible fallback to design next

The exact official TVDB endpoint
[`/dereferrer/episode/12023449`](https://thetvdb.com/dereferrer/episode/12023449)
returns the correct public episode page, with English “I Tried Teleporting!”,
Japanese “転移してみた！” and the aired day2026-11-25. Its English title matches
the TMDB/reference episode. This establishes an available independent title
source even while Cinemeta's canonical name remains generic.

A bounded fallback could read an authoritative alternate-language title for the
**already identified TVDB episode**, then require a unique meaningful title/date
match in the reference inventory. Keep the original configured episode identity,
existing series/stream/TVDB corroboration, ambiguity and contradiction guards.
Validate exact episode and parent-series binding, trusted origins/redirects,
release dates and response structure; never scrape search results or infer from
season counts. Errors or insufficient/contradictory proof still return no links.

Prefer a structured official API when its authentication/data contract is
available. The public page works without a key in this check, but introduces an
HTML/redirect availability dependency and requires its own strict parser and
negative tests. Do not execute downloaded scripts. Add no requests to healthy
mappings; failed fallback work must be bounded and reused inside a lookup. Cache
policy changes remain separate: caches cannot create missing upstream proof.

Before shipping: prove this generic route against different seasonal boundaries,
foreign/misleading artwork IDs, conflicting parent series, duplicated/generic
titles, same-day batches, wrong dates, malformed pages and HTTP failures. Retain
all existing Hunter/Haikyuu/Xperience controls on both literal wrappers, unchanged
native output and no new healthy-path requests. No title-specific exception or
implicit TVDB/TMDB coordinate equality is proposed.

[Sanitized facts and bundle hash](../../tests/evidence/witch-new-episode-2026-11-26.json).
The **Anime fresh episode investigation** workflow can recheck the current probe;
its private manifests/API key are never included in the report.


## Follow-up: structured AniBridge comparison

The [nine-anime comparison](anime-mapping-routes-2026-11-26.md) confirms an
explicit AniBridge mapping for E8 and the correct Anime-Sama slot on both
wrappers. It recommends a guarded structured-data fallback before introducing
the public-TVDB HTML-title route. Neither fallback is deployed by this study.
