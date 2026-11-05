# Hunter × Hunter numbering investigation — 2026-11-05

Confirmed identity: TMDB `46298`, IMDb `tt2098220` (2011, not 1999).
User uses TVDB metadata with IMDb stream compatibility IDs. The reported request
is S2E78, with the title Homecoming / True Name, and S2E22.

## Reproduction and findings

Read these public inventories, preserving raw responses only under ignored
`reports/hxh/`:

- `https://catalog.nuvio.tv/meta/series/tt2098220.json`
- `https://catalog.nuvio.tv/meta/series/tmdb:46298.json`
- `https://v3-cinemeta.strem.io/meta/series/tt2098220.json`
- `https://thetvdb.com/series/hunter-x-hunter-2011/seasons/official/2`
- `https://www.themoviedb.org/tv/46298-hunterxhunter/season/2`
- `https://anime-sama.to/catalogue/hunter-x-hunter/`

Nuvio Catalog uses 62 / 74 / 12 regular episodes, with S2 labels 63–136.
Cinemeta uses 58 / 78 / 12, with S2 labels 1–78. TVDB Aired agrees with
Cinemeta for the two tested episode identities/dates. S2E22 corresponds to
continuous E80; S2E78 (Homecoming / True Name) corresponds to continuous E136.
The French display title for E22 was not independently checked.

Passing those real catalogue responses through current Anime-Sama metadata and
episode selection reproduces both reported errors against a synthetic 148-slot
edition: S2E22 selects slot 83 (E84), S2E78 selects slot 77 (E78). The source page
places the 2011 version in `saison1/`, separate from the 1999 version, film and Kai.
The episode-script request returned HTTP 403 in this workspace, so this is a
mapping reproduction, not a host/media playback verification.

The cause is `titleContext` preferring Nuvio Catalog even for an IMDb request,
combined with `chooseCatalogEpisode` treating an unmatched number as an ordinal.
22 is absent in that S2 list and becomes its 22nd row (84). 78 exists and is
accepted directly. Neither selection uses the requested metadata episode's
title/date. This is a numbering ambiguity, not a fixed season offset to hardcode.

Sources FR has a separate problem boundary. The Custom inventory returns 404 for
S2E22 but accepts S2E78, S2E80 and S2E136 with matching coordinate fields. Running
the shared correspondence engine with the real inventories maps S2E22 to S2E80.
S2E78 is ambiguous in auto mode because both metadata services have a different
episode at those coordinates. Moreover, a successful original inventory bypasses
missing-only recovery. HTTP 200 and echoed coordinates do not prove media identity.
No video byte identity was verified for these inventory responses.

## Repair requirements

Do not silently change all IMDb requests to a different episode order: an IMDb
series identity does not identify the metadata add-on or its episode order.
Likewise, a numeric TMDB argument may have been converted by Nuvio from IMDb
without translating the episode coordinates. Capture the actual invocation and
make the input numbering explicit, or obtain verified episode identity from the
app. Map independently to each backend's verified layout before a conflicting
successful inventory can win. An ambiguity must stay distinguishable from a
missing episode; blind retries can select another playable episode.

Any production repair must cover overlapping labels (78), ordinal-only input
(22), boundaries, other seasonal and flattened anime, sparse slots, TV/Mobile,
and healthy request counts. Preserve primary metadata identity and do not mix
episode lists from different orders without a declared input policy. No title
offset or production change is shipped by this investigation.

Sanitized evidence: `tests/hxh-numbering-diagnosis-2026-11-05.json`.
Versions remain Sources FR 1.8.13 / Anime-Sama 1.2.6. Physical device invocations,
private AIOmetadata payloads and actual host playback remain untested.
