# Compact native layout — 9 November 2026

377 Node tests,63 Python tests, generated build/docs checks and both literal
runtime suites pass. Headers, signed URLs, subtitle tracks and formats remain
unchanged; the new shared native presenter moves quality/audio above provenance.
Semantic audio stays in `audioLanguage`; native quality stays available to the
app. The duplicate native language caption is omitted. Mobile's automatic quality
caption remains. No network request, source selection or quality policy changed.

Preview reference mappings move to a separate caption line when coordinates
change; equal mappings are hidden on cards, with full diagnostics retained.
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
