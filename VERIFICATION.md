# Verification — 1.4.3, 2026-10-16

## Spirited Away / Le Voyage de Chihiro / TMDB 129

The VF mislabel was reproduced on 1.4.2. Vidzy's player names the file with an
opaque ID, so there is no MULTI token for the filename parser to find. The old
rule was generic, with no title IDs or hardcoded title exceptions, but it was
insufficient. Its HLS master declares **French and Japanese audio**. The API
source also declares **Japanese and French audio**.

Version 1.4.3 applies a shared HLS metadata inspector to every result path,
including Vidzy, catalogue recovery and backup players. Explicit subtitle files
no longer bypass audio inspection. Actual declared languages override filename
and category hints; language aliases, duplicate codec groups and unused groups
cannot inflate the language count. Missing/unknown metadata retains the upstream
hint and is visible in diagnostics. There are no title-specific production rules.

Both Chihiro results now display **MULTI** through the TV 1.0.0 and mobile JS
fixtures. Both media samples passed. Neither master advertises subtitle tracks,
Vidzy's player HTML supplies no caption files, and the API response supplies no
caption metadata. The lack of selectable captions is upstream for these two
sources. French/Japanese audio does not establish subtitle availability.

## Broader regressions and speed

The live run covers **ten films/episodes × two providers × two runtime fixtures**:
40 provider calls, 48 returned sources and zero native timer jobs. TV and mobile
returned matching source/language counts for every case. **82 Node regressions**
and offline QuickJS checks passed. The regression fixtures use an unrelated TMDB
ID for the opaque-filename case, and cover existing captions, three returned HLS
sources, misleading MULTI hints, header-sensitive inspection reuse, catalogue
fallback and backup players.

| Case | Vidzy | API / backup |
| --- | --- | --- |
| Matrix | MULTI, French/English | MULTI; subtitle files validate |
| Fight Club | MULTI, French/English | MULTI; subtitle files validate |
| Spider-Man: Brand New Day | MULTI + VOSTFR; available caption files validate | MULTI; subtitle files validate |
| Game of Thrones S1E1 | VF + VOSTFR | MULTI; subtitle files validate |
| Reacher S4E1 | VF + VOSTFR | VF + VOSTFR via backup |
| Breaking Bad S1E1 | VF + VOSTFR | MULTI; subtitle files validate |
| The Office S1E1 | MULTI; English/French caption files validate | MULTI; English/French caption files validate |
| The Dark Knight | MULTI, French/English; no advertised captions | Missing master, no backup; zero streams |
| Spirited Away | MULTI, French/Japanese; no advertised captions | MULTI, Japanese/French; no advertised captions |
| The Simpsons S1E1 | VF; no advertised captions | MULTI; English/full French/forced French files validate |

In the initial run, **46 of 48 media probes passed**. Fight Club's TV probe and
Breaking Bad's mobile VOSTFR probe received HTTP 503. Focused rechecks of those
cases passed; the initial failures are preserved. The Dark Knight's API master
still returns HTTP 404 and has no backup, recorded as an availability failure
for both runtimes. One Spider-Man VF master inspection also returned HTTP 503;
discovery retained the upstream MULTI hint, its playback probe passed, and the
mobile inspection confirmed the declared audio languages. These outages were
not hidden by production retries or by excluding failures from reports.

Normal API discovery remains **two requests**. Vidzy now uses **four** when both
routes select one embed, or **six** for two distinct embeds: one additional small
master read per distinct HLS source. Backup HLS sources use the same inspection.
Metadata is reused within each lookup, with no signed-URL cache across lookups.
Audio paths run concurrently on asynchronous hosts. Discovery never reads media
segments or subtitle bodies and creates no timers. These checks use Python HTTP;
observed durations are not Android device benchmarks.

Subtitle labels, including **Français**, were not changed. Original HLS masters
are retained, so Nuvio's embedded/external subtitle selection behavior is unchanged.
Physical TV playback remains unverified; the checks exercise the actual TV 1.0.0
and mobile JavaScript polyfill/call wrappers, not Android networking or decoding.

Reports: [complete run](tests/live-1.4.3-2026-10-16.json),
[focused 503 rechecks](tests/live-1.4.3-recheck-2026-10-16.json).

---

# Historical verification — 1.4.2, 2026-10-16

## The Dark Knight / TMDB 155

The user's 1.4.1 symptoms were reproduced. Vidzy's filename is underscore
separated (`The_Dark_Knight_2008_Multi_1080p_...`). JavaScript word boundaries
consider underscores part of a word, so the old parser missed both tokens and
displayed VF/HD. Version 1.4.2 normalizes those separators for metadata parsing.
No extra lookup is needed. The original HLS master remains unchanged.

Vidzy's master advertises **French and English audio**, with no subtitle
renditions. Its inspected player HTML also advertises no subtitle files. A
working playlist and a media-segment sample were retrieved. This is different
from The Office, whose subtitle files were present but missed by our parser.
The plugin cannot expose captions the host does not advertise.

Purstream's supplied master returns **HTTP 404** with its playback headers.
The direct Purstream API confirms TMDB 155 and returns the identical missing
URL. Cpasmal's VF/VOSTFR backup lists are empty. Version 1.4.1 caught the 404
as an optional metadata error and kept the broken video entry. Version 1.4.2
removes confirmed 404/410 masters, preserves other working primaries and tries
the existing backup path. With no backup, zero API streams is the correct
result. Upstream media availability has not been restored by this change.

The live availability report records the missing API source as a failure,
rather than presenting that absence as a successful media probe. Vidzy playback
probes and MULTI labels pass through both runtime fixtures. The Office caption
regression also passed live through both fixtures. **69 Node regressions** and
offline TV 1.0.0/mobile QuickJS checks passed, including fallback on a missing
master, empty-backup behavior and underscore metadata. Physical TV playback
remains unverified.

Report: [The Dark Knight 1.4.2](tests/live-dark-knight-1.4.2-2026-10-16.json).

---

# Historical verification — 1.4.1, 2026-10-16

## The Office S1E1 / TMDB 2316

Both source masters advertise **French and English audio**. Vidzy's catalogue
selects a VF bucket, but the file's title explicitly declares MULTI. Version
1.4.1 preserves that declaration instead of overriding it with the bucket.

Both hosts also provide **English and French WebVTT subtitle files**. They were
fetched successfully: English has 564 timestamped cues and French has 349.
Vidzy loads them through `player.loadTracks` with a same-origin rewrite function;
1.4.0 missed that form. Purstream references raw WebVTT files in its HLS master
instead of HLS subtitle playlists. The previous native-only assumption did not
work on the user's phone. Version 1.4.1 exposes these URLs as explicit Nuvio
subtitle results with their playback headers.

| Provider | TV and mobile results | Discovery requests | Observed discovery time |
| --- | --- | --- | --- |
| French Catalogue / Vidzy | 1 MULTI; English + French subtitle files | 3, unchanged | 3.74–4.10 seconds |
| Purstream API / Cpasmal | 1 MULTI; English + French subtitle files | 2, including master metadata | 2.10–2.42 seconds |

The API metadata read adds one request only when needed; it never downloads
subtitle bodies or video segments during discovery. It preserves the original
master and both audio tracks, and its failure cannot discard the video. The
test harness separately fetched subtitle files and media samples. These are
development-environment timings, not device timings.

**64 Node regressions passed**, along with TV 1.0.0 and mobile QuickJS fixtures,
including the wrapped Vidzy subtitles and explicit HLS caption files. Live
Matrix and Reacher checks also passed through both runtime fixtures. Reacher
keeps its separate VF/VOSTFR sources and burned-in French subtitles. Matrix's
Vidzy file also declares MULTI and is now labelled accordingly.

Report: [The Office 1.4.1](tests/live-office-1.4.1-2026-10-16.json).
Office verification targets the TMDB provider routes; its HTML-catalogue
inventory comparison is skipped. Vidzy's inspected player implements an Audio
menu and defaults to French; Nuvio reads the master independently of that UI.
Physical TV playback and subtitle selection still need a device test.

---

# Historical verification — 1.4.0, 2026-10-16

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
for timestamped cues. Version 1.4.0 left them referenced by the original HLS
master and relied on native handling. **The Office report above corrects this
assumption for raw caption-file URLs**; 1.4.1 exposes those files explicitly.
Explicit API/HTML/JWPlayer tracks are preserved when supplied,
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
