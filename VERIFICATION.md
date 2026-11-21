# Xperience explicit-order live verification — 21 November 2026

Run44930271948 on6c32470 passes all12 generated-wrapper translation checks and
three phone diagnostic reports for Hunter S2E72, Apothecary S2E1 and Haikyuu
S2E15. This validates actual private-input correspondence and Anime-Sama source
positions on both wrappers, not media extraction in those overridden entrypoints.
EN’s actual installed Standard Hunter and independent Beta Hunter/Apothecary
cases all pass mapping and bounded video/audio/caption checks (2/1/1 streams).
The separate existing AIOmetadata EN control run44930271959 also succeeds.
Subsequent mixed-profile auto matching adds independent identity/unique-title
proof without assuming the missing provider stamp.423 Node tests,86 Python tests
and native bridge fixtures pass; final mixed-profile cloud checks are pending.
No new lookup requests or physical Android playback claim.

# Xperience Preview adapter — initial configured probe and offline gates

Run44923074239 successfully read the private Xperience and AIOmetadata profiles
by IMDb and TMDB. Thirteen selected anime episode IDs match across profiles;
Xperience lacks AIO’s provider/extra-series-ID stamps. Regular Office season
inventories differ, so no global assumed TVDB order is inferred. Sanitized facts:
[configured-input evidence](tests/evidence/xperience-configured-input-2026-11-21.json).
The initial pure parser selected rows but reported an unknown provider; it was
not a full translation/playback pass. The new explicit adapter adds declared
provider and unique TVDB episode evidence guards while preserving AIO defaults.
422 Node tests,86 Python tests and the full literal Mobile/TV suites pass.
Private generated-entry live checks are being completed; see subsequent
verification before claiming recovery.
No physical Android playback is established by these probes.

# Documentation/maintenance reconciliation — 21 November 2026

Reviewed current guides against manifest versions and runtime/configuration;
updated per-entry AIO setup, metadata compatibility boundaries, EN daily data,
warning behavior, stream layout and resolved-versus-open limitations. Historical
investigations/evidence retain their recorded scope. The maintenance inventory
was refreshed without production/config endpoint, bundle or version changes.
Documentation check:58 Markdown files /382 local destinations. All419 Node and
78 Python tests pass; build freshness is included in npm test. The inspected
EN daily-data workflow run44919063573 succeeded with unchanged validated rows.
This is not a new live host sweep or device playback test. Xperience remains the
requested next compatibility investigation, with no implemented adapter.

# Sources EN Preview beta.12 — stream edition headings

Headings now show quality followed by MULTI, SUB or DUB. Standard preserves its
selected channel; verified multiple preferred audio languages take precedence
as MULTI. A single-language Beta master uses its verified original/dub audio.
Audio/subtitle details, sorting, mapping, signed masters and request counts are
unchanged. Unknown resolution shows only the edition, without invented quality.
419 Node tests, 78 Python tests and the full literal Mobile/TV suites pass.
This presentation-only change has no new live media protocol or physical playback
claim.

# Sources EN Preview beta.11 — quiet absent mappings

Ordinary mapping warnings are restricted to actual identity/episode/release
contradictions. No usable AniBridge mapping produces an empty list, including
anime films; the settings diagnostic keeps the code for maintenance. Existing
contradiction warnings and the toggle remain supported. Playback extraction,
numbering, optional ani.zip checks and daily data publication are unchanged.
Updated Node regressions cover empty series/film results; both literal runtime
fixtures cover missing-mapping silence alongside preserved conflict messages.
419 Node /78 Python tests and the full literal Mobile/TV suites pass. No live
media protocol changed; this verifies result presentation, not physical playback.

# Sources EN Preview beta.10 — AniBridge mapping with ani.zip veto

AniBridge supplies numbering. Supplied contradictory IDs/positions/comparable
release dates still block, but missing/partial/unavailable ani.zip data does not.
Equal explicit TVDB episode IDs outrank alternate labels/dates. Missing or
ambiguous AniBridge rules remain blocked. Native Mobile/TV fixtures cover both
non-vetoing absent data and visible conflict warnings; the latter contain no
media URL, quality, headers, audio or private configuration. Audits exclude
warning rows from video counts/probes. These rows are informational and clicking
can cause a player error; the per-entry toggle also allows autoplay users to
hide them. No app UI modification is claimed.
The data loader fixes one validated revision per lookup from current.json and
an immutable shard. Delivery/schema failure can use the compiled baseline;
missing/ambiguous rules and actual contradictions never trigger older-map
retries. Daily candidate validation includes schema/hash/bucket checks, the40
existing episode fixtures, a10% count-drop guard and regression gates. Failed
validation cannot publish a pointer. Timestamp-only changes create no duplicate
snapshot. Runtime adds one small pointer request per installed entry. Existing
FR/Anime-Sama generated bundles are unchanged. The default-branch workflow is installed and active; manual run44919063573
passed its gates and skipped publication because only upstream metadata changed.
419 Node /78 Python tests and both full literal native suites pass on the final
build. Five current-build public source controls pass, including From Far Away
Standard and Beta. An earlier configured policy build also passed all15 cloud
cases; the focused configured From Far Away Beta run44918986804 confirms TVDB
S1E1 → AniList209463/E1 and returns one1080p Japanese stream with EN/FR captions.
The final build additionally fixes film-warning wording; physical phone playback/
warning display remains unverified. Stable plugin files are unchanged.
[Sanitized policy/update evidence](tests/evidence/sources-en-anibridge-policy-2026-11-21.json).

# Sources EN Preview beta.8 — independent Beta multi-audio

Ani.pm Beta is a new independent installed entry in the same EN repository. It
needs its own one-time AIOmetadata configuration; Standard IDs/settings stay.
Both use the existing corroborated episode mapping. Beta checks exact episode
availability, obtains a fresh copy grant, resolves Settlar and preserves the
original multi-audio HLS master and FR/EN sidecars. Owned media routes and
referenced audio/video are validated; missing/expired/foreign data fails closed.
Standard makes no Beta requests. A pending Beta lookup does not gate the tested
independent Standard context. Each installed entry retains its own 24-request/
45-second cooperative budget; pending native calls still cannot be cancelled.
412 Node /74 Python tests and full literal Mobile/TV suites pass. New coverage
includes original track preservation, preferred summary/sidecars, low/unknown
quality, fresh grants, bad episode/expiry/origins, stalled-entry isolation and
visible Beta absence. The live verifier exercises the actual Beta entry and
checks preferred alternate audio playlists/segments, not only video. Its failed-
audio regression produces attention even when video is readable.
Live public controls pass: Apothecary S2E1 and Your Name each return one1080p
Beta master with Japanese/English/French and FR/EN captions; Hunter E130 returns
one1080p Beta master with Japanese/English and EN captions. Preferred audio,
video and caption network checks pass for each. Standard Hunter E130 still
returns its two working1080p channels in11 discovery requests; Beta series use8
(four repeated metadata/proof + four source reads), the Beta movie6. Combined
installed series discovery therefore costs19 requests in this sample, with no
added Standard dependency. Actual Android timings and audio switching are not
established by these HTTP/native-JS checks. User-reported Standard playback works
after beta.7; Beta physical phone playback and track switching await a retest.
[Sanitized beta.8 evidence](tests/evidence/sources-en-beta-audio-2026-11-21.json).

# Sources EN Preview beta.7 — extensionless HLS handoff

The latest phone report finds two masters200 and two streams for Hunter S2E72,
but both fail native player startup. The inspected Mobile contract imports
`type`, not `format`, into its player streamType; EN supplied only `format` on
opaque extensionless Settlar master URLs. Beta.7 adds `type: "hls"`, preserving
signed master bytes, headers, track groups, mapping and request counts. Existing
FR/Anime-Sama bundles remain unchanged. PenguPlay's supplied links use its own
`index.m3u8` wrapper route; this repair adds no proxy or dependency on that service.
404 Node /71 Python tests and full literal Mobile/TV suites pass. Extensionless
fixtures cover both wrappers; the EN audit now checks player_contract_ok, with a
negative control where HTTP succeeds but the player type is absent. Three live
public source controls (Hunter S2E72, Hunter S1E1, Apothecary S1E1) each return two
streams with correct type and passing bounded media/caption checks. Hunter E130
360/720/1080 variants in both channels expose no key tags; 256KiB initial segment
samples identify MPEG-TS with H.264/AAC. These are finite HTTP/codec samples,
not physical Android playback. The beta.7 phone retest is still pending.
[Sanitized beta.7 evidence](tests/evidence/sources-en-hls-handoff-2026-11-21.json).

# Sources EN Preview beta.6 — browser/native access difference

The beta.5 phone screenshot still shows session403 and embed-document403 for
both audio channels, while the user confirms episode130 plays in a browser on
the same phone/network. The recovery did not resolve the reported failure.
Nuvio's inspected native bridge passes the supplied headers to OkHttp; the EN
plugin previously supplied only bare Mozilla/5.0. Beta.6 uses a complete browser
User-Agent consistently, without pretending to reproduce browser TLS. It safely
labels403 responses using only format or explicit challenge markers; raw denial
bodies/headers remain private. Document403 also reports ACCESS_DENIED.
403 Node /71 Python tests and full literal Mobile/TV suites pass. Two live public
source controls (Hunter S2E72, Apothecary S1E1) each return two streams and pass
bounded media/caption checks. These replace only TMDB/private metadata inputs
with public fixtures; phone recovery remains unverified. Healthy request counts
and all existing FR/Anime-Sama bundles are unchanged.
[Sanitized beta.6 evidence](tests/evidence/sources-en-denial-2026-11-21.json).

# Sources EN Preview beta.5 — Settlar access recovery

The phone beta.4 screenshot confirms Hunter S2E72 → AniList11061/E130 and
Settlar session403 for both channels. Mapping remains unchanged. Beta.5 matches
the player's no-referrer JSON headers and, on403 only, reads the validated embed
document and retries once with scoped fresh cookies. Continued refusal remains
explicit; no executed remote scripts or additional healthy-path requests.
402 Node /70 Python tests and the full literal Mobile/TV suites pass, including
successful cookie recovery, persistent denial, fresh lookups, header privacy,
foreign redirects, rate limits and channel isolation. Three live public source
controls (Hunter S2E72, Hunter S1E1, Apothecary S1E1) each return two streams;
bounded media and caption checks pass. Metadata inputs in these source controls
are public fixtures; source/proof/media requests stay live. The workspace does
not reproduce the phone403, so physical phone recovery remains unverified.
[Sanitized beta.5 evidence](tests/evidence/sources-en-settlar-2026-11-21.json).

# Sources EN Preview beta.4 — visible diagnostic results

The inspected Nuvio Mobile PluginsSettingsScreen renders `scraperResults.take(8)`.
The reported15-row phone test therefore hides its final playback/error rows;
there is no hidden scrolling list. EN diagnostics now return at most8 rows,
with Bilan, Cause and failed (or final) HTTP stage before contextual information.
398 Node/69 Python tests pass, including denied/successful visible-prefix checks
and both literal native wrappers. Existing settings IDs, playback requests,
mapping, language and quality policies are unchanged. The phone playback cause
still needs the now-visible report; this is a diagnostic-display repair.

# Sources EN Preview beta.3 — phone empty-result diagnosis

397 Node/69 Python tests pass. A new settings-only EN entry executes the real
lookup with sanitized stage/status reporting; both literal native wrappers
verify403 reporting, no playable URLs and no private bodies/settings/grants in
the rows. Playback configuration/identity/language policies remain strict; this
does not claim that the phone's failing stage is identified or repaired.
The user confirms the public Ani.pm bootstrap is reachable in their phone's
browser, which does not prove that Nuvio's native bridge can fetch all stages.
The dedicated live inventory now also covers Hunter2011/Apothecary S1E1.
All ten configured cloud cases confirm their mapping and then record Ani.pm
bootstrap HTTP403 on that runner. This includes both reported S1E1 cases.
[Exact beta.3 evidence](tests/evidence/sources-en-phone-2026-11-21.json).
See [on-phone diagnostic instructions](docs/sources-en.md#empty-results-on-the-phone).

# Sources EN Preview 0.1.0-beta.2 — 21 November 2026

A separate phone-first Ani.pm entry, with pinned AniBridge mapping shards and
ani.zip episode corroboration. Forty public mapping expectations cover six anime;
dedicated Node and literal Mobile/TV fixtures cover low quality, original/audio
and full-caption filtering, multi-audio preservation, conflicting identity,
signed URL/header bytes and missing private configuration. Existing provider
bundles are unchanged. See [setup, verification and coverage gaps](docs/sources-en.md).
Live installed-entry evidence is recorded separately from deterministic fixtures.

396 Node/68 Python tests pass, including the EN entry on both literal wrappers;
the existing complete native suites pass. The final beta.2 configured cloud run
maps8/8 references correctly, then receives Ani.pm bootstrap HTTP403 on that
runner. It does not prove cloud playback. Workspace controls using public
fixtures **only for TMDB/private metadata reads** pass8/8 cases and return15
streams, with bounded media and caption probes passing. All source requests run
through the same final compiled bundle/hash. No physical phone playback claim.
[Sanitized EN evidence](tests/evidence/sources-en-2026-11-21.json).

# Catalogue fallback refresh — 19–20 November 2026

Sources FR1.8.22 / Preview1.9.0-beta.12 updates only the third HTML catalogue
origin from `movix.zip` to its first-party301 destination `movix.free`. Existing
redirect handling already works. Primary mirrors, fast APIs, resolver protocols,
quality/audio, episode mapping and budgets remain unchanged. Shared config is
rebuilt/versioned in Anime-Sama1.2.16 / Preview1.3.0-beta.13 and diagnostic
1.0.0-beta.12.

383 Node/65 Python tests on Preview and346 Node/54 on stable pass, alongside
build/docs checks and both complete literal native suites. Final compiled third-
mirror helpers exercise Dark Knight, Hunger Games and Flash S1E1 on both wrappers
and tracks. Dark Knight returns reachable media; gated/filtered/promotional
results remain excluded. The focused helper uses public title/year fixtures for
the key-dependent metadata read; full Actions audits independently use real keys.

Both full pre-refresh plans complete:410 stable +552 Preview probes, with no
missing rows. Remaining host/metadata/caption/media warnings stay explicit.
Final configured Preview correspondence passes160/160 and40/40 diagnostics;
the independent24-row media sample retains18 attention rows.

[Current maintenance and coverage](docs/investigations/maintenance-2026-11-20.md)
and [sanitized evidence](tests/evidence/maintenance-2026-11-20.json).

# Domain maintenance — 17 November 2026

Sources FR1.8.21 / Preview1.9.0-beta.11 updates Frembed `.uno` → `.shop`
and Movix’s verified website fallback `.college` → `.miami`. Shared config is
rebuilt/versioned in Anime-Sama1.2.15 / Preview1.3.0-beta.12 and diagnostic
1.0.0-beta.11. Mapping, resolvers, quality policies and request limits are unchanged.

383 Node/65 Python tests on Preview and346 Node/54 Python on stable pass,
including both complete native wrapper suites, build/docs checks and updated
movie/episode domain regressions. Old compiled bundles fail the new-origin
regression. Direct API identity checks and controlled old/new Referer requests
confirm the cause, rather than assuming a working homepage proves recovery.

Final Frembed host controls return3/2/1 links for Your Name/Dark Knight/Office
on each wrapper, with12/12 stable and11/12 Preview media samples reachable.
Ordinary premium Matrix/Hunger Games/Office return one reachable stream each
on both wrappers/tracks; Dark Knight remains empty on that branch. Both final
Movix directory-discovery controls return reachable media on both tracks.
Final configured Preview correspondence passes160/160 and40/40 diagnostic
reports on the rebuilt bundles. The separate24-row playback sample retains18
attention rows for upstream/media failures, without mapping-difference warnings.
Full pre-repair audit coverage accounts for410 stable and552 Preview probes
across24 worker reports, with no missing rows. Results and final repaired
controls remain separate; unadvertised hosts and upstream failures stay explicit.
[Investigation and coverage](docs/investigations/maintenance-2026-11-17.md) and
[sanitized evidence](tests/evidence/maintenance-2026-11-17.json).

# Maintenance repairs — 14 November 2026

Both tracks pass generated-build/docs checks, all Node/Python tests and both
literal native wrapper suites: Preview383/65; stable346/54. New inline-link
fixtures exercise all six installed host IDs, full disjoint union, low-resolution
editions, token failures, removed-script recovery and unexecuted page expressions.

The full pre-repair audits account for398 stable and540 Preview probes across
12 entry shards each. They expose the new Anime-Sama inline protocol, Yablom’s
stale backup shortcut and remaining upstream/gated/media failures; they are not
post-repair availability claims. Sources FR configured mapping passes80/80 checks
in the original private workflow; Anime positions failed before the parser fix.

The repaired native Witch S1E6 ANSEmbed control returns reachable1080p VOSTFR.
Final native installed-entry checks return42 streams per track with38 reachable
media samples, complete partition evidence, and explicit remaining host failures.
Configured correspondence passes160/160 plus40/40 diagnostic reports.
Final installed-entry/media and private correspondence follow-ups are recorded in
[the maintenance report](docs/investigations/maintenance-2026-11-14.md).
Legacy1000-slot processing retains exact playback output and30 TV/34 Mobile
requests; the new inline format replaces script reads with per-player link-API
requests. No limits, metadata mapping policies or minimum resolutions change.

# Sources FR candidate preparation — 9 November 2026

379 Node tests,63 Python tests, both complete native suites and build/docs checks
pass. Exact installed-worker output is unchanged in the synthetic benchmark:
2000 candidates (1000 per language),5 repetitions after warm-up,3 returned
alternatives and9 requests on both sides. Median CPU savings are32.2% TV /
28.2% Mobile. This is local processing, not end-to-end device/network speed.

Preview live catalogue controls return four links with22 requests on both old
and optimized Mobile builds. Frembed's zero result reproduces on the old build
with404/low-quality filtering. The optimized TV catalogue media sample includes
one unreachable stream; Mobile's four samples are reachable. Stable has its own
compiled benchmark/regressions; the live audit here is explicitly Preview evidence.
Healthy direct APIs, selection policies, validation and language coverage remain
unchanged. Shared embedded helpers are rebuilt/versioned; Anime-Sama's separate
candidate scheduler is unchanged. No signed media is cached across lookups.
[Sanitized measurements and controls](tests/evidence/sources-fr-selection-speed-2026-11-09.json)
and [benchmark instructions](docs/performance.md).

# Compact native layout — 9 November 2026

377 Node tests,63 Python tests, generated build/docs checks and both literal
runtime suites pass. Headers, signed URLs, subtitle tracks and formats remain
unchanged; the new shared native presenter moves quality/audio above provenance.
Semantic audio stays in `audioLanguage`; native quality stays available to the
app. The duplicate native language caption is omitted. Mobile's automatic quality
caption remains. No network request, source selection or quality policy changed.

Preview reference mappings move to a separate caption line when coordinates
change; equal mappings are hidden on cards, with full diagnostics retained.
The configured follow-up passes8/8 correspondence/source-position checks and
2/2 diagnostics for Hunter S2E72 and Haikyuu S2E15 on both wrappers. Twelve
Hunter season-start traces confirm actual native/configured Mobile card captions,
including changed reference lines and hidden equal mappings.
[Configured run](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/42554828521).

Actual main/ANSEmbed native-control samples return6 streams on both runtimes,
with5/6 media probes reachable in this sample. Live failures and unknown
metadata remain explicit. Physical Android rendering/content were not tested.
[Sanitized cards and executed hashes](tests/evidence/compact-link-layout-2026-11-09.json).

# Anime-Sama processing speed — 9 November 2026

Anime-Sama1.3.0-beta.8 defers unused episode-player URL normalization. Sources FR's
runtime/version, mapping policies, host coverage and network limits are unchanged.
375 Node tests,63 Python tests, build checks and both literal native wrapper
suites pass. In the five-repeat1000-slot distinct-player benchmark, CPU falls by
48.8% on the TV wrapper and50.9% on Mobile; request counts remain30/34 and
all returned data is exactly equal to baseline. These are local processing
measurements, not end-to-end Android loading guarantees. Small-season gains are
limited and host/network waits remain.

Live Jujutsu S2E22, One Piece S23E1180 and Your Name probes execute all six entry
IDs on both runtimes, preserving complete partition evidence. Upstream failures
remain recorded; this is not a claim that every file plays. Stable One Piece
Mobile had a timed-out caption probe; all returned media samples were reachable. Preview live checks here use native controls;
configured AIOmetadata paths also pass8/8 live correspondence/source-position
checks and2/2 diagnostic reports for Hunter S2E72 and Haikyuu S2E15 on both
wrappers in [the focused run](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/42551216161).
This configured follow-up does not test video-host playback.
[Sanitized measurements, hashes and limitations](tests/evidence/anime-processing-speed-2026-11-09.json).

# Repository organization — 9 November 2026

Documentation link validation,374 Node tests,63 Python tests and both native
wrapper suites pass after the cleanup. All69 relocated evidence files retain
their original bytes. Runtime source, manifests, generated bundles and fixtures
are unchanged. No new live availability claim or plugin release is implied.

# Reference recovery preview beta7 — 2026-11-07

Sources FR1.9.0-beta.7 / Anime-Sama1.3.0-beta.7 / diagnostic1.0.0-beta.6.
374 Node tests,63 Python tests, both literal native suites and build checks pass.
The [final configured run](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/42398884588)
passes44/44 correspondence/source-position checks and11/11 diagnostics across
Hunter, Jujutsu, Apothecary, AOT, Ippo and Haikyuu. Executed production hashes
match final generated bundles. Haikyuu S2E15 returns two reachable1080p ANSEmbed
editions and one reachable main-API stream. Missing-reference recovery adds one
metadata request; healthy fixtures add none and reuse the external-ID result.

The final cloud S2E1 VOSTFR and both S3E1 ANSEmbed playlists returned403 after
correct mapping. The earlier repaired configured sample returned both editions;
all8 final native-control audit rows returned reachable media. Two audit attention
rows retain a guessed-title404 before successful verified source recovery. These
are not claims of universal host availability. No physical device/video-content
check was performed; extraction coverage is main API and ANSEmbed, not all hosts.
[Full sanitized evidence](tests/evidence/live-reference-recovery-2026-11-07.json) retains
these limitations, mapping bases, request counts and hashes. Stable is unchanged;
general source-season boundary correspondence remains separate.

[Older records](docs/archive/verification-history.md). Historical results do not guarantee current upstream availability.
