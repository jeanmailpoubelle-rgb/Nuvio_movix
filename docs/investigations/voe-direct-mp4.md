# VOE entries without quality: playback investigation — 2026-11-05

The user reports that Sources FR's VOE links without resolution labels do not
play in Nuvio. The shared resolver returns two distinct formats when published:
`data.source` as HLS and `data.direct_access_url` as MP4. HLS supplies resolution
metadata; direct MP4 has no playlist metadata and intentionally remains unknown.
A blank quality label is not itself a playback error.

## Live sample

Eight normal Frembed-host lookups were tested with the current production bundle:
four movies (Your Name, The Dark Knight, Matrix, Into the Spider-Verse) and four
episodes (The Office S1E1, The Flash S1E1, Reacher S4E1, Jujutsu Kaisen S1E20).
Five returned VOE direct MP4s; Matrix, Flash and Jujutsu did not return a VOE
candidate in this sample and are not evidence of either good or bad VOE playback.

| Title with direct VOE | Initial ranged request | File evidence |
| --- | --- | --- |
| Your Name | HTTP206, video/mp4, valid ftyp | Full moov metadata: H.264 1280×720, AAC LC stereo, 6386.25 seconds |
| The Dark Knight | HTTP206, video/mp4, valid ftyp | Initial bytes only |
| Into the Spider-Verse | HTTP206, video/mp4, valid ftyp | Initial bytes only |
| The Office S1E1 | HTTP206, video/mp4, valid ftyp | Full moov metadata: H.264 720×404, AAC LC stereo, 1383.17 seconds |
| Reacher S4E1 | HTTP206, video/mp4, valid ftyp | Initial bytes only |

Advertised HLS alternatives for Your Name, Dark Knight and Reacher also passed
bounded media probes. Both Your Name and Office MP4s returned correct tail ranges.
Your Name also accepted middle and open-ended ranges, existing headers, final-
origin/referer variants, no Referer, and a changed User-Agent. Those observations
do not demonstrate a header fix or broken range support in the cloud environment.

Development-only bounded reads obtained complete moov headers (about 4.9 MB and
1.2 MB respectively) before inspecting stream metadata. The boxes start at byte
32, so these two files are fast-start; the earlier partial sparse-file inspection
was insufficient to inventory audio and is not used to conclude missing tracks.
FFmpeg then decoded two seconds of video AND audio from each original remote URL
through the inherited proxy, with TLS verification and existing playback headers:
48 frames per file, exit0, no decoder errors. Partial sparse artifacts and raw
signed URLs stay in ignored private reports. No MP4 probing is added to plugins.

## Conclusion and limits

The focused audit retains a failed Dood candidate while returning VOE HLS/MP4
alternatives; it is not a fully passing upstream audit.
The reported Nuvio failure is not reproduced by these HTTP/decoder tests. These
are valid MP4 streams in this environment, not HTML errors or promotional clips.
This does not certify Android networking, Media3/libmpv playback, continuous
playback, seeking throughout the file, or access from the user's connection.
Large moov headers may affect startup latency but are not a demonstrated cause.

Do not remove all unknown-quality links, blacklist VOE or rewrite playback headers
on this evidence. Do not copy HLS quality to MP4, since encodes can differ. The
existing 720p minimum keeps unknown sources as requested; the Office MP4's low
resolution only became known through development file inspection. A host-specific
MP4 opt-out could be a workaround if requested, but no such policy was introduced.
No production code, versions or generated providers changed in this investigation.

## Next device diagnosis

Obtain affected device, Nuvio version, player engine and exact error/buffering
behavior. Trace the actual failed player request (redacting signed URLs/headers)
and compare status, redirect, content type, range behavior and supplied headers
with the working cloud case. Test another player only if the app offers it, keeping
in mind that external-player handoff may not preserve headers. Differences in
network/DNS, app HTTP handling, playback settings or decoder behavior remain
hypotheses until measured. A small readable media prefix is not full playback proof.

## Repeat

```sh
.venv/bin/python scripts/audit.py --skip-offline --provider frembed-hosts --case voe-your-name
.venv/bin/python scripts/verify_live.py --case 372058 --case 155 --case 324857 --case 2316 --case 108978 --provider frembed-hosts --runtime both --report reports/voe.json
```

A future normal lookup may succeed through another host: verify that the returned
list actually contains VOE before claiming VOE coverage. The owned
`voe-your-name` case and existing series/movie cases retain the normal
resolver path. `probe_media` performs bounded HTTP samples, not Android playback
or full MP4 decoding. Further file analysis belongs in development, with explicit
byte/timeout limits and no signed URLs, partial media or caption dialogue committed.
Repair `src/resolvers.js:voeSources` only after a demonstrated payload/URL/header
problem; inspect native playback separately when bytes and decoding work.

Evidence: [sanitized observations](../../tests/voe-direct-diagnosis-2026-11-05.json).
