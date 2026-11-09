# Playback, labels and runtime

These are current policies. Use [configuration](../config/README.md) for exact
limits/endpoints and [dated verification](../VERIFICATION.md) for measured results.

## Quality and result ordering

Sources FR discards known tiers below720p and keeps unknown resolution without a
quality label. Dedicated Anime-Sama has no quality minimum. Adaptive HLS masters
retain their original renditions, audio and subtitle groups; the filter does not
force the player to remain above a bitrate during playback.

Results sort by resolution descending, then MULTI/VF/VOSTFR/other at equal quality;
unknown quality is last. Invisible Unicode priority prefixes preserve sorting
across independently completed entries. Visible numeric sort codes are obsolete.
See [presentation details](source-fr-ordering.md) and
[Anime-Sama presentation](anime-sama.md#result-policy-and-presentation).

## Native link layout

Headings show `1080p · MULTI` (or just `VF` when quality is unknown). The lower
caption shows provenance once, e.g. `Movix · Wiflix · Voe`. Anime-Sama retains its
actual host there. Native quality is preserved: Mobile automatically repeats it
before that caption; TV1.0.0 already shows quality in the heading. The plugin does
not control the app's unknown-quality decoration.

Audio is rendered once in the heading. The final transport keeps the resolved
value as `audioLanguage` and omits the bridge's `language` caption field; neither
bridge retains that field as a playable audio-track inventory. Internal matching,
ranking and validation still use the original language before presentation.
Actual HLS groups, headers, URLs and caption tracks are unchanged. Audit tools
read semantic audio separately; never infer missing audio from the omitted UI field.
The string `size` is presentation text, not a fabricated numeric file size.

Preview adds a separate lower line only when coordinates change:
`AIO S2E72 → Réf. S2E130`. This is reference-catalogue numbering, not a claim that
Anime-Sama's source season is2. Source position remains in the diagnostic report.
Unchanged mappings are hidden on stream cards but remain fully diagnosed.

## Audio and subtitles

Prefer actual declared HLS audio languages over upload-title hints. Repeated
codec/language aliases are not extra languages. A name containing MULTI or one
unknown audio track cannot prove multiple selectable languages. Unknown metadata
remains inconclusive. Keep the original HLS master and playback headers so the
player can discover its audio/subtitle groups.

Source editions such as VOSTFR describe the offered edition; they do not prove
a downloadable subtitle track. Parse advertised sidecars and preserve embedded
tracks, rather than inventing captions. Keep signed URL bytes, subtitles and
required playback headers intact. Native plugins do not control metadata artwork.

## Speed and runtime

Sources FR's default selection target and budget are separate from Anime-Sama's
all-candidate policy. Independent entries return their own results; a stalled
entry need not prevent a completed entry appearing. Their prerequisites can still
fail together, and repeated independent lookups have an aggregate request cost.

Mobile can overlap host requests. TV1.0.0 serializes HTTP within a scraper entry;
JavaScript concurrency does not change its bridge. Budgets are checked between
requests and cannot cancel a pending native HTTP call. Preserve per-host Mobile
budgets and the shared lookup counter/deadline; do not add timer races.

Only request-local media/metadata reuse is allowed: do not persist signed media,
subtitle grants or playback tokens across lookups. Healthy paths should not add
preflight checks, metadata downloads or MP4 probes merely to decorate labels.
Source-specific availability checks remain necessary where already implemented.

## Verification limits

A resolver implementation is not a guarantee that every current file works.
Readable playlists and small media samples provide availability evidence, not
physical Android playback or decoded episode identity. Browser challenges,
missing media and CDN failures must remain visible in audit results.

Sendvid validation needs binary-capable transport; TV1.0.0 has a text-only bridge.
DASH media sampling is not implemented. Diagnose mapping, discovery, extraction
and media separately using the [maintenance runbook](maintenance.md). See
[current limitations](limitations.md) before proposing another provider or service.
