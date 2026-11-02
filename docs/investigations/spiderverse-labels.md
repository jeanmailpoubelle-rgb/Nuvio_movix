# Spider-Verse missing quality/audio labels — 2026-11-02

Spider-Man: Into the Spider-Verse is TMDB 324857 / IMDb tt4633694. Its links
illustrate several independent metadata situations. Do not fill every blank
field with a guessed value.

| Link | Observed cause | Behavior |
| --- | --- | --- |
| Custom / Vidara | Master exposes 1712×720 and French/English audio, but LANGUAGE contains full names `french` / `english` | Fixed: shared HLS aliases recognize exact full English language names, producing 720p MULTI |
| Custom / ShareCloudy | HLS media playlist, no STREAM-INF resolution or EXT-X-MEDIA audio declarations | Keep both fields blank; no metadata to parse |
| VOE direct MP4 | Returned alongside HLS, but direct file has no playlist inventory | Keep unknown quality; retain catalogue VF when supplied. Do not transfer a differently encoded HLS resolution to the MP4 |
| Dood/MixDrop MP4 | No reliable numeric resolution in the public resolver result | Keep unknown quality; retain only available upstream language hints |
| Custom/Omega missing audio | Public custom links are URL strings or URL/date objects; Omega supplies player URLs and is_hd=false without a language edition | Keep audio blank absent real track evidence. is_hd=false does not specify a numeric resolution |

The existing minimum remains 720p with unknown quality retained, as requested.
Reading video bytes just to label direct files would add requests/latency and
conflict with TV 1.0.0's binary bridge limitations. This repair does not add such
probing or alter playback, track selection, captions, sorting or quality filters.

## Repair and repeat

`src/hls.js:hlsTracks` normalizes explicit LANGUAGE values. Exact known full
English names are mapped to ISO codes; existing code/region aliases remain valid.
Repeated language renditions are deduplicated. Unknown tracks still prevent a
single known language from proving a complete inventory. Track count or NAME
text alone does not establish MULTI. The original HLS master remains untouched.
Both plugins compile this shared repair (Sources FR 1.8.12 / Anime-Sama 1.2.5).

```sh
node --test tests/hls.test.cjs
.venv/bin/python scripts/quickjs_check.py --all --runtime both
.venv/bin/python scripts/audit.py --skip-offline --provider movix-extra --case spiderverse-labels
.venv/bin/python scripts/verify_live.py --case 324857 --provider movix-extra --runtime both --report reports/spiderverse.json
```

Inspect hls-tracks audio/unknownAudio/resolutions, actual LANGUAGE fields, and
upstream catalogue language hints. If a readable media playlist omits them, a
blank field is expected. If declared full names are treated as unknown, inspect
the exact alias map rather than introducing movie-specific rules. No signed
URLs, player bodies or dialogue belong in committed fixtures.

## Coverage

The repaired Vidara link passes bounded media sampling on both wrappers. TV also
returns the metadata-free ShareCloudy link; its player returns 502 during one
Mobile sample. Preserve this HTTP finding rather than blacklist the host.
Normal extra lookup records unavailable optional Omega metadata (no runtime TMDB
key) and browser-gated SwiftFlux. The raw public Omega response was inspected,
but complete Omega/Yablom discovery and the exact Yablom file were not validated.
No physical playback/listening or subtitle rendering was performed.

See [sanitized release evidence](../../tests/spiderverse-labels-1.8.12-2026-11-02.json).
