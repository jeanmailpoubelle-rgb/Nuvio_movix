# Vinland Saga S1 versus S2 — 21 November 2026

## Confirmed cause

The configured Xperience profile returns valid series/stream identities for both
seasons. Season1 uses trusted TVDB artwork paths shaped as
`/banners/series/{showId}/episodes/{episodeId}.jpg`; season2 uses the supported
`/banners/v4/episode/{episodeId}/screencap/...` shape. AIOmetadata’s control
response also uses the series-style path in season1. Our shared parser accepted
v4 and `/banners/episodes/{showId}/{episodeId}.jpg`, but missed the series-style
path. It therefore lost the episode ID for the checked S1E1/E2/E3/E24 rows.

This explains the asymmetric result:

- Xperience TVDB EN refuses an episode without a trusted episode ID, before
  AniBridge or source fetching: `INPUT_METADATA_XPERIENCE_EPISODE_ID_REQUIRED`.
- FR/Anime-Sama automatic input cannot use that external ID. The first three
  Vinland episodes share a release day and their localized titles differ from
  the reference. The fallbacks correctly refuse a date/coordinate guess.
- Season2’s recognizable v4 ID allows the existing correspondence path.
- Native/TMDB controls find links because they do not use the configured-input
  translation path. This is not evidence that the site lacks season1 uploads.

Before repair, configured S1E1 returns zero links in all four tested entries;
S2E1 and native S1E1/S2E1 return streams. [Sanitized baseline](../../tests/evidence/vinland-tvdb-artwork-before-2026-11-21.json)
records the private metadata facts without URLs/raw bodies.
The first S2 EN control incorrectly expected AniList139518; actual production
AniBridge and ani.zip correctly identify136430. The verifier expectation is
corrected; no production mapping rule changed. S2 EN already returned streams.

## Repair and verification

`src/input-metadata.js:tvdbEpisode` now recognizes the additional exact trusted
TVDB path. It extracts the published episode ID locally without fetching images.
Keep the strict HTTPS origin, positive numeric IDs and path shape. Existing
modern/legacy matching, source identity, independent episode correspondence,
AniBridge/ani.zip veto rules and batch-release guards stay unchanged. Do not
strip host validation, infer offsets or accept another source because of counts.
The same-origin blur-wrapper path can expose the trusted shape after decoding.

Production callers in FR, Anime-Sama and EN share this parser. Sanitized input
probes now recognize the shape too. Fixtures verify three distinct episode IDs
on a shared release date, exact target episode selection, hostile origins and
paths, both native bridges and unchanged supported forms. The private workflow
compares configured S1/S2 with native controls; final live evidence is recorded
in [verification](../../VERIFICATION.md). These are installed-entry discovery
checks, not complete device decoding or catalogue coverage.

No new credential, mapping service, image download or healthy-path preflight is
introduced. Stable/native behavior is unchanged. Preview settings and both saved
manifest slots remain intact. If it recurs, inspect the safe artwork shape and
extracted ID first, then the existing mapping/media stages independently.
