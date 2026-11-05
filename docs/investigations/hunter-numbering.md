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

## Follow-up: discontinuity at E62 / E63 and upstream images

The user reproduced this with Cinemeta alone, including missing S2E62 artwork
and visible S2E63 artwork. Fresh metadata and production mapping code reproduce
the exact boundary against the same synthetic source edition:

| Cinemeta request | Intended continuous episode | Current Anime-Sama selection |
| --- | ---: | ---: |
| S2E60 | 118 | 122 |
| S2E61 | 119 | 123 |
| S2E62 — Fake / Real | 120 | 124 |
| S2E63 — Defeat / Dignity | 121 | 63 |
| S2E64 | 122 | 64 |

Before 63, ordinal fallback selects the requested position in the 63–136 list.
At 63, exact-number lookup succeeds and wins instead. The sudden backwards jump
is our selection bug; it is not evidence of an out-of-order source edition.
The relative sequence stays increasing on either side, as the user observed.

Independent image HTTP checks establish a second cause without relying on app
settings or Nuvio enrichment:

- Cinemeta's `https://episodes.metahub.space/tt2098220/2/61/w780.jpg` and the
  corresponding E62 URL return HTTP 404.
- Its E63 URL redirects to
  `https://image.tmdb.org/t/p/w780/3dAKW55W7JjsPRYfxi0IPy5zDDi.jpg` (HTTP 200).
  That exact still belongs to Nuvio Catalog/TMDB S2E63, **A Hard Master**, while
  Cinemeta S2E63 is **Defeat / Dignity**, represented by TMDB S2E121 and still
  `qBo3Achl6DDeheSwIxFVhY3khO5.jpg`.
- E64 likewise redirects to TMDB's S2E64 still, rather than S2E122.

Thus a thumbnail loading successfully does not establish that it depicts the
selected episode. Selecting Cinemeta alone does not repair this upstream image
correspondence. Disabling Nuvio enrichment cannot repair MetaHub's own redirects.

Current public Mobile code, commit
`77dfe7c2cdfcae54bf20f3a2999169159c0be400`, has another coordinate-only boundary:

- [TmdbMetadataService.kt](https://github.com/NuvioMedia/NuvioMobile/blob/77dfe7c2cdfcae54bf20f3a2999169159c0be400/composeApp/src/commonMain/kotlin/com/nuvio/app/features/tmdb/TmdbMetadataService.kt#L855)
  matches TMDB enrichment by `(season, episode)`, without title/date identity.
  It can overwrite titles, summaries and thumbnails when episode enrichment is
  enabled, while keeping the original episode ID and release date. Its fetching
  code builds the same coordinate-keyed map at line 1148.
- [PluginRepository.kt](https://github.com/NuvioMedia/NuvioMobile/blob/77dfe7c2cdfcae54bf20f3a2999169159c0be400/composeApp/src/fullCommonMain/kotlin/com/nuvio/app/features/plugins/PluginRepository.kt#L366)
  resolves the series ID but forwards the supplied season/episode unchanged.
- [JsBindings.kt](https://github.com/NuvioMedia/NuvioMobile/blob/77dfe7c2cdfcae54bf20f3a2999169159c0be400/composeApp/src/fullCommonMain/kotlin/com/nuvio/app/features/plugins/runtime/js/JsBindings.kt#L36)
  calls the plugin with ID/type/season/episode, without the selected episode's
  title/date/order. This inspected commit is not proof of the user's installed
  app version or enrichment settings.

## Is it isolated to this title?

Fresh public inventories for six verified IMDb identities show broader order
differences. These are metadata observations, not claims of tested playback:

| Title | Nuvio Catalog | Cinemeta |
| --- | --- | --- |
| Hunter × Hunter | S1 62; S2 labels 63–136 | S1 58; S2 labels 1–78 |
| Jujutsu Kaisen | S1 E1–59 | S1 24; S2 23; S3 12; S4 1 |
| The Apothecary Diaries | S1 E1–60 | S1/S2/S3 each 24 |
| Bleach | S2E1 The Blood Warfare (2022) | S2E1 Enter! The World of the Shinigami (2005) |
| One Piece | S2 begins at E62, Laboon (2001) | S2 begins at E1, Usopp (2000) |
| Attack on Titan | S2 E1–12, Beast Titan first | Same S2 numbering; S4 counts differ |

Not every spelling/date difference proves a different episode. Compare actual
identity and inventories, not raw string inequality or cumulative counts alone.
In particular, the six-series sample is not an exhaustive catalogue audit.

Future repair needs explicit input order (or app-provided selected episode
identity), independent verified backend translation, and identity-aware artwork
mapping in the metadata service/app. A plugin repair cannot change metadata-page
images. Do not force all backends to one global offset or declare a correct
series-ID lookup to be an episode-order conversion.
