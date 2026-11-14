# Maintenance — 14 November 2026

Both stable and Preview are checked independently. Stable retains native metadata;
Preview retains explicitly configured AIOmetadata translation. No numbering,
quality, audio, scheduling or request-limit policy is weakened.

## Confirmed repairs

Anime-Sama changed its episode transport on November12. Its own `videos.js`
and `lecteur.js` describe inline `lien:<id>` arrays, `epsMeta`, `epsJeton` and
`/api/lien.php`, whose JSON `u` supplies the real player URL. The old parser
returned no source versions when `episodes.js` disappeared. This affects both
tracks, including Preview diagnostics. Literal parsing now supports both formats;
host metadata partitions requests before resolving only selected episode IDs.
Returned hosts are verified; signed JSON URL bytes and source positions remain
intact. Missing/expired/foreign responses fail safely and the next lookup is fresh.

Dokimov’s own homepage and Pirvab’s announcement both name Trimav. The target
entry resolves to `/b86bd60/home/trimav` with the expected POST `searchword` form.
The old isolated mirror check encountered404 before recovering a matched Matrix
page and reachable ShareCloudy media through Trimav. The central secondary
site/search pair now points directly there; Xatobam and migration logic remain.

## Newly released Witch episode

TVDB episode12023447 still has no TMDB episode find result. Since November11,
canonical fallback data has improved: the existing strict title/release path now
maps S1E6 without a numbering bypass. The remaining empty-source issue was the
new inline protocol. A repaired native ANSEmbed check returns one reachable1080p
VOSTFR stream at source index5. This does not prove every host or physical playback.

## Verification scope

Offline checks, full pre-repair cloud reports and focused final-bundle checks are
recorded separately in the accompanying evidence. Old snapshot failures must not
be represented as post-repair results. Full playback/decoding, every catalogue
title and physical Android device testing remain outside this check.

## Verified final bundles and remaining failures

Final stable1.2.14 and Preview1.3.0-beta.11 each execute all six installed IDs
for Witch S1E6, Jujutsu S2E22, Your Name and Suzume on TV/Mobile:8 lookups and
48 entry executions per track. All8 have complete entry/partition evidence.
They return5/10/4/2 streams respectively on each wrapper. Preview media samples
reach38/42; stable38/42. Your Name reaches4/4 on each wrapper/track; Suzume’s
VOSTFR ANSEmbed segment returns403 while VF works. Some Jujutsu/Witch media
probes differ across cloud runs. Source/metadata404 observations stay visible;
complete partition does not establish every stream’s playback or subtitles.

The post-repair private Witch probe executes the final Preview bundle and
returns reachable ANSEmbed1080p VOSTFR for configured E5 and E6. Its source slot
is index5 for E6, with the existing canonical-title/release mapping basis.

The updated Trimav shortcut returns matched Matrix and Dark Knight pages plus
reachable ShareCloudy media on both wrappers and both tracks. This focused
site/resolver check replaces only the key-dependent metadata fetch with trusted
public movie title/year fixtures; the full pre-repair cloud report separately
checks actual TMDB-key lookups and automatic migration to the same site.

Remaining broad-audit findings include deleted Dood uploads (Your Name), a real
Dood verification challenge (Dark Knight), Vidmoly/VOE deleted files, below720p
filtering, unsupported/gated SwiftFlux and missing inventories. Fast-API media
returned404/429 or inaccessible CDN responses on some samples; direct Purstream
reads failed403/404 in cloud probes, while fresh local `/search-bar/search/Matrix`
requests succeeded200 on both configured and status-discovered API domains. This
is not evidence for another replacement domain or a numbering-policy change.
Rate limits were not bypassed and production budgets are unchanged.

Both full baseline reports have all12 shards and no missing plan rows. The16
`not-tested` rows per track are host families absent from the Matrix public-list
sweep. Some receive separate coverage through Anime-Sama or other feed probes;
that does not make the absent Matrix candidates passes. No private endpoint,
page token, signed stream, raw response or caption dialogue is retained here.

## Final configured correspondence and audit ownership

[The final private workflow](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/43596500116)
passes160/160 episode correspondence/source-position checks and40/40 diagnostic
reports across the existing40 episode fixtures on both wrappers. The separate
playback sample has24 rows:5 pass and19 attention. Some configured Haikyuu fast
API requests still encounter429/404 media/backend responses, while Anime-Sama
returns both editions after correct translation. Mapping success is distinct
from source or caption availability.

Four of that playback report’s warnings were audit mistakes: shared Haikyuu
cases carried a Primary-API mapping expectation into the Anime-Sama job. Its
actual source positions are S2/index14 and S3/index0. `episode_references` now
overrides expectations by provider/family, retaining explicit integration-helper
precedence and the legacy default. The regression validates all six Anime-Sama
entries plus the root worker, and still rejects a wrong source slot. Reclassifying
the same live observations removes those four false mapping warnings; HTTP
warnings remain. This is maintenance-tooling only, with no runtime requests or
plugin release change. Original reports are preserved.

Final checks:383 Node/65 Python tests on Preview;346 Node/54 Python on stable;
both complete literal runtime suites and build/docs checks pass. Production CI
is green on both tracks. The1000-slot legacy benchmark retains exact output and
30 TV/34 Mobile requests, with no measured processing regression in this sample.
The inline API adds one lookup per attempted player and avoids the old external
script request; six independent contexts still repeat prerequisite reads.

[Sanitized evidence, executed hashes, original audit totals and reclassification](../../tests/evidence/maintenance-2026-11-14.json).
