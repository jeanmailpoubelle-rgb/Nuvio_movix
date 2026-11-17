# Maintenance — 17 November 2026

Stable and Preview remain separately maintained. This change updates verified
domains; it does not change episode correspondence, player extraction, quality,
audio, sorting, concurrency or request budgets.

## Confirmed domain repairs

Frembed’s `.uno` homepage redirects to `.shop`. Movie and exact episode API
requests through the retired address return403. Direct requests to `.shop`
with its own Referer/Origin return200 and the correct TMDB identity for Your
Name372058, Dark Knight155 and Office2316 S1E1, with three advertised links each.
A controlled request to `.shop` using `.uno` headers reproduces403 and the
“Invalid Referer” error; changing only the headers to `.shop` restores200.

The central `frembed.base` is updated. Existing code derives inventory URLs,
premium-grant URLs and headers from it, so no preflight/follow-redirect heuristic
is added. The updated movie/episode regression fails against the old generated
bundle. Explicit user `frembedBaseUrl` overrides keep precedence and may need
a manual update when pinned to the old site.

Movix’s official `movix.online` directory names `movix.miami`; the final first-
party app bundle names `api.movix.miami`. Its Matrix stream endpoint has the
expected sources-array schema. The known website fallback is updated from
`.college` to `.miami`. Existing `api.movix.dog` also returns a valid Matrix
sources array, so healthy fast paths keep that endpoint and their request count.

## Verification scope

Full pre-repair cloud audits and final focused rechecks are recorded separately.
A domain repair restores API access; it does not revive deleted files or prove
every advertised stream decodes/seeks correctly. Physical Android playback and
complete all-title coverage remain outside these checks.

## Focused compiled-release checks

Both complete native suites pass with updated migration fixtures. Preview has
383 Node/65 Python tests and stable346/54; generated-build/docs checks pass.
The current-origin regression fails before rebuilding the config repair.

Frembed hosts: Your Name/Dark Knight/Office return3/2/1 links on each wrapper
and track. Final media samples reach12/12 stable and11/12 Preview; a Preview
Your Name sample fails while the corresponding stable sample works. Dood
no-media/challenge observations stay visible even with working VOE/Uqload links.

Ordinary premium: Matrix/Hunger Games/Office each return one reachable stream
and pass advertised-caption checks on both wrappers and tracks. Dark Knight
remains empty on that branch. These isolated helper checks execute the real
production protocol in an entrypoint override; they do not claim the ordinary
lookup chose that fallback. Original production hashes are recorded separately.

The final Movix directory→first-party bundle→API→Matrix media checks pass on
both wrappers/tracks. Healthy `api.movix.dog` calls remain unchanged. The config
repair adds no preflight; formerly rejected calls can now continue into normal
player/media requests, so their total cannot be compared to a one-request403
as if both were successful paths. No physical device speed claim is made.
