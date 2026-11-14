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
