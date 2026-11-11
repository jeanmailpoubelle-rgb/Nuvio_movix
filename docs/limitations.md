# Known limitations and work list

Updated 11 November 2026. This is the current backlog, not a statement that every
listed scenario fails. Historical investigations and live results describe their
recorded versions. Keep this list updated when adding an integration or fixing a
limitation; link its regression and evidence when closing it.

## AS-01 — Unlabelled Anime-Sama seasons with different boundaries

**Status: open coverage gap; no concrete failing title identified in the latest
conversation. Do not replace working mapping logic on this assumption alone.**

The potentially unsupported combination is:

1. Anime-Sama restarts episode numbers at1 for each source season.
2. Its season boundaries differ from the reference episode inventory.
3. It supplies no usable overall episode ranges or other verified correspondence.
4. The layout is outside the existing supported source-group counting paths.

For example, a verified overall episode50 could belong to reference S2E3 but
Anime-Sama S2E8. Finding an existing S2E3 link is not proof of correct identity.
The ordinary seasonal branch can still select the same-numbered source season;
there is no universal reconstruction of every unlabelled multi-season layout.

Already implemented; preserve these paths:

- TVDB-to-reference episode identity translation in Preview.
- A continuous source season, such as the tested Hunter × Hunter layout.
- Explicit source episode ranges, such as Conan's observed1–42 /43–85 /86–128
  groups. Different displayed season counts are expected here, not luck.
- Canonical source-group counting for supported flattened/split-season layouts.
- Sparse positions, regular/special separation and edition-specific gaps.

Next work: capture an actual failing title and exact input/source coordinates;
inspect its episode identities and source labels; add a synthetic failing fixture;
then extend only the unsupported path. A safe solution may derive a source
position through verified regular-episode ordering, but counts alone must not
establish cross-catalogue identity. Reject missing, conflicting or ambiguous data.

Acceptance checks: episode before/after each changed boundary, same playback
identity on both wrappers, unchanged working continuous/range cases, all eligible
host/edition candidates retained, and measured request/latency impact. Reuse data
within a lookup and avoid broad all-season scans on already verified paths.

Repair locations: [source position mapping](../src/anime-sama/episode-mapping.js),
[reference context](../src/anime-sama/catalog-context.js),
[shared input adapter](../src/input-metadata.js). Existing regressions:
[episode mapping](../tests/anime-episode-mapping.test.cjs) and
[input metadata](../tests/input-metadata.test.cjs).

## META-01 — Both reference routes incomplete or incompatible

**Status: bounded recovery implemented; remaining failure mode stays explicit.**

Preview beta7 repairs the demonstrated Haikyuu missing-season response by trying
the same catalogue's linked IMDb route, validating series identity, compatible
existing episodes and the selected episode. It adds one reference request only
when recovery is needed. It does not repair two incomplete routes or accept a
replacement with conflicting episode order. No direct TMDB-season reconstruction
was added. See [the adapter guide](aiometadata.md#missing-reference-episodes-beta7-recovery).

Keep this separate from AS-01: a missing reference entry is different from a
mismatch between valid reference and Anime-Sama season boundaries.

## META-02 — Fresh episode associations and placeholder titles

**Status: confirmed upstream-data gap; no bypass implemented.**

A newly released episode can exist on Anime-Sama, TVDB/AIOmetadata and the TMDB
reference list while TMDB's TVDB-ID lookup still returns no association. If the
independently corroborated canonical fallback title is only “Episode N”, Preview
cannot safely finish correspondence and stops before host extraction. Native
stable lookup can still work. This differs from META-01's missing reference row.

Verified example: [The World's Strongest Witch S1E6](investigations/witch-new-episode-2026-11-11.md),
11 November 2026. Recheck upstream associations/titles without promising a refresh
time. Future recovery must use independent episode evidence and retain foreign,
ambiguous, generic-title and batch-release protections; do not assume matching
season/episode coordinates or disable translation across a TVDB profile.

## TV-01 — Preview settings and runtime constraints

**Status: app/runtime limitation; no app patch planned in this repository.**

TV1.0.0 has no editor for the private AIOmetadata settings. Phone settings are
per entry/device and are not proven to sync to TV or follow Nuvio profiles.
Independent entries do not share their settings just because they use one bundle.
TV HTTP is synchronous within an entry; Mobile can overlap requests. Neither
plugin can cancel an outstanding native call. See
[pinned app findings](investigations/tv-plugin-settings.md) and
[playback/runtime rules](playback.md).

## NET-01 — Availability and media metadata

**Status: continuing upstream and coverage constraints.**

- Correct mapping cannot create an absent upload or bypass a deleted file,
  CAPTCHA, browser verification, rate limit or CDN403.
- Unknown quality/audio stays unknown. A filename claiming MULTI is not a measured
  audio inventory. Native plugins cannot manufacture missing tracks or artwork.
- Sendvid's validation needs binary transport unavailable on TV1.0.0. Physical
  Android playback and complete catalogue/host coverage are not proven by the
  QuickJS harness. DASH media probing remains unimplemented.
- Independent plugin entries cannot reliably deduplicate each other's results
  without a shared result collector. Sorting prefixes do not provide shared state.

Use the [maintenance runbook](maintenance.md) and [current evidence](../VERIFICATION.md)
to establish which layer failed before changing mapping or filtering.

## Deferred additions

Bowd, Stigstream/VidSrc and Afterdark remain uninstalled/deferred for the reasons
in their [investigations](investigations/README.md). Movix's anime feed was
investigated and set aside; keep direct Anime-Sama discovery. These are not
scheduled work or permission to add accounts, helper services or new providers.
