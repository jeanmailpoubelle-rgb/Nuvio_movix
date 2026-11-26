# Anime-Sama+ guarded AniBridge fallback

Anime-Sama+1.3.0-beta.26 retains its existing input-to-reference mapping first.
Android Host0.2.2 bundles the same engine. No new field or credential is required.
Sources FR/EN policies and native Anime-Sama behaviour are unchanged.

## When it runs

A successful lookup makes no new mapping-data requests. The fallback is considered
only after the current route returns unavailable correspondence, the selected
TVDB episode's TMDB `/find` response was a successful **empty episode list**, and
an independently identified Cinemeta row corroborates the exact unique stream ID,
TVDB episode ID and compatible input release. Missing input rows, network errors,
foreign/nonempty find results, ambiguous IDs, provider/series conflicts and source
or player failures do not trigger it. This is not a catch-all retry.

Reference inventory recovery remains the existing independent path. The first
fallback release conservatively skips attempts that already entered reference
inventory recovery; it never bypasses its compatibility guards or invents missing
reference rows. Unsupported specials/season0 remain unsupported.

## How correspondence is established

- Read one validated revision pointer and one small TVDB-series bucket. Tables
  retain explicit direct TVDB→TMDB and forward TVDB→AniList→TMDB ranges from the
  same upstream snapshot. They are packaged together, so composition requires no
  extra AniList API/shard request. Empty identity links, ratios and multi-segment
  episode mappings are not guessed into ordinary one-to-one ranges.
- Reconcile direct/composed candidates, bind the expected TMDB show and require
  exactly one supported target in the actual reference inventory. Preserve
  duplicate-row and conflicting-route errors. Alternative layouts are not source
  coordinates merely because a range exists.
- Reuse EN's ani.zip contradiction checks when an AniList target exists. Missing
  veto data is not a conflict. Xperience auto without a provider stamp additionally
  needs a positive exact TVDB episode-ID match to establish its input order;
  without that proof it stays unavailable. This does not change EN's policy.
- Pass the result through unchanged strict TargetContext and Anime-Sama source
  title/group/counting/range/edition/slot selection. Keep original media URLs,
  hosts, audio, headers, quality/order and stream presentation.

The changed mapping basis is `anibridge/<revision>` in diagnostics. All returned
streams still go through normal source availability and host validation. A mapping
range does not establish that a future/recent episode has been published.

## Data maintenance and bounds

`src/anime-sama/input-bridge.js` owns runtime eligibility, data loading, candidate
composition and corroboration; `catalog-context.js` opts into it after the current
route fails. `config/anime-mapping.json` owns public endpoints and a pinned
baseline. Immutable tables and their MIT attribution are in
`plugins/anime-sama-plus/data/` and `LICENSE-AniBridge.txt`.

The existing daily mapping workflow downloads **one** upstream v3 snapshot, stages
both EN and separate Anime-Sama outputs, validates hashes/shape/boundary fixtures,
rejects coverage drops, and runs the normal regression gates before publication.
EN's table schema/pointer/consumer remain separate. Timestamp-only changes do not
publish redundant Anime-Sama snapshots; old revisions remain available.

One revision is used per lookup. Pointer/shard delivery or schema failure may use
the pinned baseline. Missing/ambiguous/conflicting rules never retry an older
revision to erase the result. Existing request/deadline budgets apply. The normal
successful fallback adds pointer + shard + optional ani.zip reads (three in the
historical fixture); there is no background polling/preload/media cache change.
These request counts are not a phone/TV latency guarantee.

## Verification and the Witch update

The user reports Witch E8 resolves again after upstream metadata updated. It is
therefore a current healthy control, not evidence of a still-broken live episode.
The regression separately preserves its historical state: existing TVDB episode,
empty TMDB association and generic Cinemeta title. Tests require the same source
slot/stream before and after recovery, no bridge reads for updated metadata, and
no native reads of private metadata/bridge tables.

`tests/anime-input-bridge.test.cjs`, `test_anime_bridge_runtime.py` and
`test_anime_mapping_update.py` cover guards, directional boundaries, conflicts,
missing data, immutable data publication, and actual generated Mobile/TV entries.
`scripts/verify_anime_bridge_live.py` checks current live controls plus a labelled
historical simulation that changes only the public find/canonical title responses
in memory. Private metadata and source selection remain live; no host playback
or physical device acceptance is claimed. See [the comparison study](investigations/anime-mapping-routes-2026-11-26.md).
