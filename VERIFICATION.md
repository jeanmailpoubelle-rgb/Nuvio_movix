# Verification — 1.4.0, 2026-10-16

The six-title run exercised **24 provider calls**: two active providers, six
film/episode cases, and both runtime fixtures. Every call returned sources and
created **zero native timer jobs**. Bundle SHA-256 values in the report identify
the exact generated files tested.

Targets: the literal JavaScript polyfill/call wrappers from NuvioTV **tag 1.0.0**
and Nuvio Mobile commit `808272dcec4be02397282600b70a07111576e0c7`. Native HTTP in
this harness is Python urllib. **No physical TV was available**: Android
networking, hardware decoding, subtitle selection UI and continuous playback
still require a device check.

## Sources and languages

TV and mobile discovery returned the same counts/languages in every case.

| Title / TMDB | French Catalogue / Vidzy | Purstream API / Cpasmal | Discovery requests, catalogue / API |
| --- | --- | --- | --- |
| Matrix / 603 | 1 VF | 1 MULTI | 3 / 1 |
| Fight Club / 550 | 1 VF | 1 MULTI | 3 / 1 |
| Spider-Man: Brand New Day / 969681 | 2: VF + VOSTFR | 1, language unspecified by API | 4 / 1 |
| Game of Thrones S1E1 / 1399 | 2: VF + VOSTFR | 1 MULTI | 4 / 1 |
| Reacher S4E1 / 108978 | 2: VF + VOSTFR | 2: VF + VOSTFR via Cpasmal/Uqload | 4 / 4 |
| Breaking Bad S1E1 / 1396 | 2: VF + VOSTFR | 1 MULTI | 4 / 1 |

A missing VOSTFR route for Matrix/Fight Club selects the same VF embed. It is
fetched once and returned once, with its actual VF language. An unspecified
API language stays unspecified rather than being guessed from subtitle presence.

Reacher's primary Purstream endpoint returns HTTP 404 for S4E1. The consolidated
provider goes straight to Cpasmal instead of repeating the same failed lookup
through the direct Purstream API. Both Uqload language versions resolve. The
retired standalone Purstream ID does no work.

## Website counts are not native-player counts

Each cell below is **advertised buttons / supported native-player candidates**.
These inventory checks are separate from the faster Vidzy TMDB route.

| Catalogue page | Nakios Live | Purestream CC | Movix ZIP |
| --- | --- | --- | --- |
| Matrix | 2 / 0 | 2 / 0 | 2 / 0 |
| Fight Club | 2 / 0 | 2 / 0 | 2 / 0 |
| Spider-Man: Brand New Day | 2 / 2 | 1 / 1 | 2 / 2 |
| Game of Thrones S1E1 | 4 / 1 | 3 / 0 | 4 / 1 |
| Reacher S4E1 | 6 / 2 | 6 / 2 | 6 / 2 |
| Breaking Bad S1E1 | 4 / 1 | 4 / 1 | 4 / 1 |

Reacher's three pages have identical six-link inventories: three VF and three
VOSTFR buttons. Two are Vidzy; four are Kokoflix wrappers for other hosts that
this implementation does not resolve. The provider therefore does **not** match
all six buttons. It returns the two supported Vidzy versions. These limits are
also logged by catalogue fallback.

The catalogue replicas differ for Spider-Man and Game of Thrones, so they must
not be described as having identical content everywhere. Vidzy's TMDB index
also supplies working versions absent from a catalogue page. For example, the
Matrix page lists unsupported Dood/Lulu players, while Vidzy's separate index
provides a playable VF version. This is why the HTML pages are recovery paths,
not a mandatory preflight or a replacement for Vidzy's TMDB index.

## Media and subtitles

The complete run made **34 media probes**, following HLS playlists and reading
a 1,024-byte media-segment sample. One Breaking Bad VF child-playlist request
returned HTTP 503; its mobile check passed. The targeted TV recheck is recorded
separately. An earlier run also saw a Fight Club HTTP 503, followed by successful
checks. Upstream availability is intermittent; no artificial delay or blind
retry loop was added to provider discovery.

Purstream's advertised French/English caption files were fetched and checked
for timestamped cues. Those tracks remain referenced by the original HLS master
playlist. HLS captions do not need to be copied into a separate `subtitles`
result field. Explicit API/HTML/JWPlayer tracks are preserved when supplied,
including their playback headers; fixtures cover this path and merging captions
when media URLs are duplicates.

Decoded **VOSTFR dialogue frames** were inspected separately:

| Stream | French burned-in subtitles observed |
| --- | --- |
| Reacher S4E1, Vidzy | Approximately 360, 600 and 1,200 seconds |
| Reacher S4E1, Cpasmal/Uqload | Approximately 600 seconds |
| Game of Thrones S1E1, Vidzy | Approximately 600 seconds |
| Breaking Bad S1E1, Vidzy | Approximately 900 and 1,200 seconds |
| Spider-Man: Brand New Day, Vidzy | Approximately 900 and 1,200 seconds |

These sources advertise no separate caption track. The subtitles are already
in the video and require no subtitle-selection action in Nuvio. This checks
sampled dialogue, not every line or whole-program synchronization. Media samples
and decoded frames are not committed to the repository. Upstream filenames can
claim a higher resolution than the HLS rendition actually served; labels are
upstream metadata, not a measured-resolution guarantee.

## Speed and recovery

For the complete recorded run, healthy one-request API lookups took about
**0.29–1.31 seconds**, Reacher's API/backup path **2.69–3.45 seconds**, and Vidzy
lookups **2.59–4.73 seconds**. These are development-environment observations,
not Android device benchmarks. Python supplies synchronous native HTTP even
when the mobile JS fixture is selected; actual mobile networking can overlap.
Media and subtitle validation is excluded from discovery time and is performed
only by the test tools.

- No separate Purstream provider repeats the API family's work.
- No configuration, directory or availability request precedes healthy lookups.
- Domain-directory parsing was checked against the live reference HTML:
  `nakios.org` resolved to `nakios.live`; `purstream.org` to `purestream.cc`.
- Regressions exercise changed directory addresses, parked candidates, directory
  outages and recovery through a known mirror.
- The one-request fast path, strict TMDB identity checks, VF/VOSTFR preservation,
  no native timers, subtitle headers and inert legacy migration are covered by
  **59 passing Node regressions** and both offline QuickJS runtime fixtures.

Reports: [complete run](tests/live-1.4.0-2026-10-16.json),
[targeted TV recheck](tests/live-1.4.0-recheck-2026-10-16.json).
Repeat with `scripts/verify_live.py`; use `--case 1396 --runtime tv` to isolate
Breaking Bad. Historical reports remain in `tests/live-reacher-2026-10-16.json`
and `tests/live-verification-2026-10-15.json`.
