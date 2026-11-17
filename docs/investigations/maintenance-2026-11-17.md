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

The old premium POST endpoint also responds302 to `.shop`; the Python-bridge
baseline records405 after following that redirect. Direct current-origin POST
requests restore the grant. This is an additional redirect-sensitive boundary,
not evidence that the ordinary premium protocol or video resolver changed.

Fresh Though I Am an Inept Villainess S1E3 native controls (TMDB286345, confirmed
by the source page’s external link) execute all six host entries on TV/Mobile
for both tracks. All return the four expected1080p VF/VOSTFR ANSEmbed/Uqload
links with complete partition evidence. Three media samples per lookup succeed;
ANSEmbed VOSTFR’s segment returns403. The reported VF stream is reachable. This
uses fresh URLs, not the earlier copied network-specific authorization. It does
not establish the cause of the earlier intermittent skip or test physical playback.

## Final configured metadata and remaining media failures

The rebuilt Preview’s [final private workflow](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/44005796201)
passes160/160 correspondence/source-position checks and40/40 diagnostic reports,
using the exact final root/Anime-Sama bundle hashes. This covers the existing40
episode fixtures across Hunter, Jujutsu, Apothecary, AOT, Ippo and Haikyuu.
No mapping policy changed. The independent playback sample records24 rows:
6 pass and18 attention. Correct mapping is separate from media availability.

The24 playback rows contain no `episode-mapping-differs` warning; the
independent160 checks above establish the tested correspondence. Configured Haikyuu main-API media still has
CDN/empty-result failures in some samples; both Anime-Sama editions are found.
Frembed AOT inventory works again on native and configured inputs, with expected
individual-host failures retained. No catalogue offset or guessed episode retry
is introduced to hide inaccessible media.

Stable’s pre-repair full audit completes410/410 planned rows across all12 shards:
93 pass,217 attention and100 not-tested. The latter include unadvertised
Anime-Sama host families, not successful resolver probes. The pre-repair
Frembed rows still represent the retired domain; final new-origin controls above
are the evidence for its repair. Yablom’s18 scoped rows pass. Several advertised
files on other hosts remain deleted, challenged, unavailable or below720p.

## Complete broad coverage

Both full pre-repair cloud plans finish with all12 entry shards and no missing
rows. The reports preserve their executed pre-repair versions/config hashes:

| Track | Planned/completed | Pass | Attention | Not tested |
| --- | --- | --- | --- | --- |
| Stable |410/410|93|217|100|
| Preview |552/552|132|278|142|

These are baseline findings, not a claim that the repaired deployment has the
same failures. Every Frembed inventory row in these old snapshots fails through
the retired origin. Its missing-mapping warnings follow that failed inventory;
final configured mapping and new-origin controls above are separate evidence.
Not-tested rows identify hosts absent from selected inventories; Vidmoly is not
advertised in these samples, so its live extraction is not certified.

The remaining observed boundaries include deleted VOE/Uqload files, Dood and
SwiftFlux verification gates, inaccessible CDN/media/caption URLs, below720p
filtering, request budgets and absent uploads. Existing normal fallbacks can
still return working alternatives. No domain was guessed from a name and no
quality threshold, identity check or budget was relaxed to improve pass counts.

[Sanitized evidence, exact executed hashes and before/after scope](../../tests/evidence/maintenance-2026-11-17.json).
Full baseline runs: [stable](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/44004512690)
and [Preview](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/44005038262).
The workflows correctly require review when these upstream/coverage findings
remain; a completed plan does not mean every dependency passed.
