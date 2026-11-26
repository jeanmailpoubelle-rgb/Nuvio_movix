# Ani.pm Beta startup with libmpv — 26 November2026

**Finding: no source outage or resolver failure reproduced. Beta takes longer
than Standard to initialize in the tested libmpv controls.** The user confirms
that the same Beta episode starts faster in ExoPlayer. No production plugin,
APK, domain, URL, header, audio/subtitle, cache or mapping change is published.

This differs from the earlier access-denied problem resolved after an app update.
Here links appear quickly and playback succeeds, but startup takes longer.

## Maintenance scope

The actual Sources EN+beta22 installed entries passed four public-metadata source
controls: Hunter S2E72 Standard/Beta, Apothecary S1E1 Standard, and Apothecary S2E1
Beta. Streams, HLS player contract, sampled video, preferred audio and FR/EN
captions pass. These use genuine source grants and live media; only TMDB/private
metadata is replaced with existing explicit public fixtures. They are not full
configured-metadata/profile or physical Android acceptance tests.

Both ani.pm and its advertised anipm.pk homepage/bootstrap endpoints return200
and the expected JSON schema. The sampled bootstrap reads take about0.5s on each.
There is no demonstrated address break to fix. Full new-origin playback/header
compatibility was not certified, so the configured domain remains unchanged.

## Matched-episode startup measurements

A second check compares Standard original-audio and Beta for the **same episodes**:
Apothecary TVDB S2E1/AniList176301 E1 and Hunter S2E72/AniList11061 E130.
Two source-lookup rounds per server, alternating server order, produce eight
source controls and16 desktop libmpv starts. Each start runs with/without native
sidecars. All start successfully. Desktop libmpv0.40.0/FFmpeg7.1.5 uses strict TLS,
null outputs, no disk cache, no user config/scripts and a32s event-loop/45s process
bound. This is a cloud/client comparison, not a phone speed guarantee.

| Episode | Standard observed playback event | Beta observed playback event |
| --- | --- | --- |
| Apothecary S2E1 | 1.95–3.57s; median3.04s | 5.40–12.96s; median5.78s |
| Hunter S2E72 | 1.71–2.71s; median2.45s | 2.92–5.16s; median3.26s |

Source-discovery controls remain around1.1–1.9s, with simulated metadata reads;
these are not the user's personal profile lookup timings. First and later player
samples vary; remote cache state and network conditions were not controlled.
There is no comparable previous wrapped-stream startup benchmark establishing
that Ani.pm became slower since24 November.

The observed event is PLAYBACK_RESTART, not a displayed-frame timestamp. Native
sidecars are attached synchronously after FILE_LOADED, reproducing the reviewed
current-main command sequence; this can delay event observation even if internal
playback has progressed. Most Beta delay already precedes FILE_LOADED, so the
main difference persists independently of this caption attachment effect.

## Why Beta is heavier in these controls

Apothecary Beta publishes four video variants and **11 alternate audio tracks**
in the unmodified master; Hunter Beta has four audio tracks. Standard packages
original/dub audio into separate links. This is not newly introduced track
stripping/filtering or a mapping error.

A four-start debug repeat counts **60 child-resource opening messages before
FILE_LOADED for Beta versus9 for Standard** on Apothecary. Beta's extension-based
breakdown is15 playlists and45 other media openings. Standard uses opaque paths,
so its extension breakdown is not directly comparable. These are libmpv/FFmpeg
log events, **not a wire-level count of unique HTTP requests**. Only counts and
timings survive; raw log messages, URLs and headers are discarded in memory.

Beta playlist/init requests and the first128KiB of selected video and preferred
JA/EN/FR audio data are generally fast in these samples (roughly0.03–0.11s in
Apothecary's recorded Beta paths). This does not prove full-segment throughput,
all languages/CDN regions or absence of intermittent upstream delay. The many
opens complete shortly before FILE_LOADED, consistent with multi-rendition
initialization overhead in libmpv's HLS path.

[FFmpeg's HLS documentation](https://www.ffmpeg.org/ffmpeg-formats.html#hls)
describes exposing streams from variants; [mpv's manual](https://mpv.io/manual/master/)
describes the stream-information probing/startup tradeoff. These explain why
player preparation can differ; they do not independently prove this phone's
request sequence. The user-reported faster ExoPlayer comparison supports the
player-specific direction of the investigation.

## Tests that did not justify a change

Ten additional Beta starts compare default settings with
`demuxer-lavf-probe-info=no` and `demuxer-lavf-analyzeduration=1`, retaining all
tracks and native sidecars. Once initial-sample effects are accounted for, starts
remain around6s for Apothecary and3s for Hunter. Preferred-language tracks remain
listed and selected audio reports AAC, but full language switching/seek behaviour
was not tested. There is no reliable gain warranting a player-setting recommendation.

External caption commands add a smaller observed delay (about0.6s in the sampled
Apothecary Beta runs); removing them would not explain/fix its main pre-load wait.
The reviewed Nuvio current-main source attaches first-caption auto/rest cached
on FILE_LOADED. That source version is recorded in evidence; the user's exact
installed app/library version was not supplied.

## Practical handling and future work

The source plugin already returns a readable original master promptly. No
extractor/domain fix was demonstrated, and the current plugin contract does not
provide a validated way to change libmpv's initialization policy per stream.
Keep all audio tracks and captions. Do not rewrite the master, strip capability
parameters or substitute decoded URLs as an incidental performance change.

For faster startup now, the user's confirmed ExoPlayer comparison is the useful
workaround for Beta. Standard is also faster in these libmpv controls, with its
separate source-provided audio editions. Future libmpv work needs the exact app
version and device startup events/request timings, and a tested player change
that retains track discovery, language switching, subtitles and seeking. No Nuvio
app modification or new hosting/proxy feature is authorized/introduced here.

## Reproduce safely

`scripts/benchmark_sources_en_startup.py` runs fresh public-metadata source
controls and isolated headless workers. Install a compatible development libmpv
and its dependencies outside the repository, then run for example:

```sh
ANIPM_MPV_LIBRARY=/path/to/libmpv.so.2 \
LD_LIBRARY_PATH=/path/to/its/dependencies \
.venv/bin/python scripts/benchmark_sources_en_startup.py --rounds 2
```

`--case apothecary --rounds 1 --trace` adds aggregate resource-opening counts.
`--probe-options --rounds 1` is a diagnostic comparison, not recommended user
configuration. Reports go under ignored `reports/anipm-startup/`. Media HTTP
samples are bounded and signed URLs/captions/masters never reach reports/disk.
Workers have no disk cache and discard native stderr; failures remain explicit.

[Persistent sanitized measurements](../../tests/evidence/anipm-startup-2026-11-26.json)
include the four maintenance controls,16 baseline starts,10 option controls and
four trace starts. All30 headless attempts enter playback. EN's43 Node tests and
14 Python/native fixtures pass; generated-build/docs checks pass. Physical playback
of a full episode, all-language switching and device-specific startup remain outside
these cloud checks. No plugin version bump is needed for this tooling/docs-only work.
