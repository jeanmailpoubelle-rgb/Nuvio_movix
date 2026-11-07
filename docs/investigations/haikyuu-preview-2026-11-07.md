# Haikyuu season 2 / Preview — 7 November 2026

Initial beta6 investigation and subsequent beta7 repair. Stable is unchanged.
Series identity: TMDB60863,
IMDb tt3398540, TVDB278157. The user reports no Anime-Sama Preview links for
S2E15, later confirming Sources FR also fails while other seasons work.

## Findings

The public Nuvio Catalog `/meta/series/tmdb:60863.json` response currently contains
25 season-one videos, 10 season-three videos and 25 season-four videos, but no
season-two videos. This is a missing canonical inventory, not evidence of an
episode offset or a need to hardcode Haikyuu numbering.

The configured private AIOmetadata endpoint identifies TVDB as its provider and
does contain S2E1/S2E15. S2E15 is “Terrain de jeu”, IMDb stream
`tt3398540:2:15`, with TVDB episode5446878. TMDB's authenticated external-ID lookup
maps that episode to show60863, S2E15, episode1160001, “Place to Play”. Its date
is within one day of the configured TVDB release. S2E1 also maps to the correct
TMDB S2E1. Thus the external series/episode correspondence exists; the reference
catalogue lacks the target row needed by Preview's adapter.

Actual Anime-Sama ANSEmbed-entry Mobile checks:

- Stable1.2.10 and Preview1.3.0-beta.6 in explicit native control mode both return
  two 1080p streams for S2E15, VF/VOSTFR. Both media samples return HTTP206.
  Selected source slots are `/catalogue/haikyuu/saison2/{vf|vostfr}/`, index14.
- Native Preview S1E1, S2E1 and S3E1 also return two reachable ANSEmbed streams.
  Native mode can use its existing Cinemeta season fallback when the primary
  catalogue has no requested season.
- Configured Preview returns zero for S2E1/S2E15, after three requests and before
  source-site/host discovery, with `INPUT_METADATA_TARGET_EPISODE_UNAVAILABLE`. S3E1 maps successfully by TVDB episode ID, selects
  source season3 index0 and returns two reachable1080p streams.

The shared adapter's TMDB external-ID branch requires the identified episode to
exist in the Nuvio reference inventory (`targetRow`). An incomplete inventory
therefore blocks translation even when the external lookup gives correct
coordinates. Sources FR uses the same adapter; its installed-entry traces are
checked separately rather than inferring host/backend availability from this
Anime-Sama success. The actual main API entry also returns zero for S2E15 with
the same error, before its backend is queried. Its S3E1 control returns one
reachable1080p MULTI stream. Configured workflow run42394594232 confirms both.

## Follow-up: IMDb and TMDB routes disagree

The user reports Nuvio Catalog's installed addon displays season2 correctly on
its TMDB-only profile, even after clearing app cache and disabling enrichment.
A subsequent paired HTTP check confirms different server responses for the same
series: `/meta/series/tmdb:60863.json` has seasons1/3/4 but no season2;
`/meta/series/tt3398540.json` has all four seasons, including S2E15 “Place to Play”.
Both identify the same IMDb series. The public manifest supports both prefixes.
Thus the missing inventory is specific to the observed TMDB lookup route, not
Nuvio Catalog generally. The exact request made by the user's app has not been
captured; an IMDb request explains the observation but is not proven on-device.
App-cache clearing does not establish that these server-side routes share data.
The root cause of the server discrepancy (cache, fetching or transformation)
remains unverified. Recovery can explore the explicit same-series IMDb reference
before adding another dependency; retain identity/date/ambiguity guards.

## Beta7 repair and maintenance

Do not reset the user's configuration or add title-specific episode offsets.
Preview beta7 recovers a missing reference episode from the explicitly linked
IMDb route on the same catalogue origin. It requires a compatible superset of
regular episodes, rejects duplicate positions and conflicting identities/layouts,
and reruns the existing episode/date checks. It reuses the external-ID lookup and
passes the recovered inventory into Anime-Sama's episode context. Healthy paths
add no requests; recovery adds one reference request. Both-incomplete routes still
stop safely. Direct TMDB season fetching and general Anime-Sama source-season
correspondence are outside this repair.
Sources FR backend translation and Anime-Sama source-position mapping must each
be verified; a correct mapping does not imply every backend has media.

Exercise S2E1 and S2E15 plus healthy S1/S3 controls. Add negative tests for foreign
episode IDs, ambiguous matches, date conflicts and failed/incomplete fallback
responses. Healthy paths must not gain metadata requests. Keep stable native
behavior separate. Similar incomplete canonical inventories can affect other
titles; this finding does not establish which other titles are affected.

[Sanitized initial live evidence](../../tests/live-haikyuu-preview-2026-11-07.json)
includes configured public facts, external-ID results and native controls.
Private manifest URLs, raw logs and signed streams are excluded. Research
workflow changes are isolated on `investigate/haikyuu-preview-2026-11-07`, not on
the installed stable/preview branches.

The repair's public evidence is recorded separately in
[the reference recovery verification](../../tests/live-reference-recovery-2026-11-07.json).
The production fallback is part of the beta7 preview branch; the one-off workflow
script itself is not installed in either plugin.
