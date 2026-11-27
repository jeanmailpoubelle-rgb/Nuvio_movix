# Maintenance —27 November2026

Maintenance now includes deployed Movix integration changes, actual scheduled
mapping-job execution, Vodix media/audio and configured input, independent EN
checks with both saved manifests, and native controls. **No Movix repository
check was added**, as requested.

## Completed scope

| Check | Result | Scope |
| --- | --- | --- |
| Deep FR/Anime audit |574/574 probes,13 entry shards |140 pass,294 attention,140 not tested |
| Native controls |64/64 probes |26 pass,24 attention,14 not tested |
| EN / AIOmetadata |19/19 pass |Mapping, video, preferred audio and captions |
| EN / Xperience |19/19 pass |Same independent entry checks |
| Vodix input |12/12 pass |Both manifests/wrappers; TMDB shows and TVDB guard |
| Vodix exact ranges |8/8 pass |Cloud controls, video and advertised FR/EN audio |
| Vodix local codec samples |8/8 pass |Bounded initialization/fragments, actual offsets and ffprobe |
| Deployed frontend preflight |Pass |12 first-party modules; reviewed service/API baseline |
| Daily mapping job |Pass |Recent scheduled success, active workflow and executed update gates |

The deep run is46056353067. Its final aggregation succeeded and preserved all
findings; the workflow's overall failure reflects attention/coverage rows, not a
failed report merge. It is not a clean bill of health for every upstream host.
Raw initial statuses remain in the [sanitized evidence](../../tests/evidence/maintenance-2026-11-27.json).
New verifier checks and the directory cleanup are separate focused followups,
not a retrospective claim that all574 probes ran the enhanced verifier.

## Production cleanup

`https://purstream.org/` now serves a domain-sale page with no valid branded
catalogue target. The isolated directory helper accounted for both parser/schema
findings in the initial deep audit. This is a retired address, not evidence that
we should loosen the parser or guess another domain.

Remove that directory from `catalogue.directories`. Retain direct Purestream CC,
all working catalogue mirrors and the verified Nakios directory, which still
points to `https://nakios.live`. Healthy lookups have unchanged request counts;
the affected fallback avoids one obsolete request. Regression controls retain
successful address discovery and recovery through a known mirror after a parked
candidate. Native FR1.8.29 and FR+1.9.0-beta.27 contain the shared configuration
cleanup; Anime-Sama/EN mapping and resolution policies are unchanged.

## Maintenance gaps repaired

- The read-only website preflight follows the deployed entry/registry/watch/player
  dependency graph as bounded text. New services/API prefixes, changed module
  fingerprints, unreadable graphs and missing Vodix require review. It neither
  executes website JavaScript nor accepts baselines automatically.
- The daily check reads our own GitHub workflow's active state, recent successful
  **scheduled** execution and completed validation/regression/publication/
  compatibility steps. A recent manual run or skipped updater does not pass.
- Runtime inventories now explicitly flag advertised unsupported hosts even when
  another stream works. Reports aggregate domain observations so additions behind
  an unchanged API are visible. These are candidates for investigation, not
  automatically enabled aliases or broken installed resolvers.
- HLS child manifests are read without a truncating Range header. Byte-range HLS
  probes honor the declared initialization/media offsets and matching206
  Content-Range. A JPEG cover prefix no longer counts as media verification.
  ffprobe is optional and reports codec metadata only when actually run.
- Vodix checks its advertised French/English audio renditions as well as video.
  The reviewed samples expose4K HEVC Main10/PQ video and six-channel AAC audio;
  cropped3840×1600 movie rasters retain the familiar4K tier.
- `health.yml` orchestrates these independent scopes. Native, EN, input and
  preflight reports are not mixed into the FR shard schema. Standalone native
  controls also offer a focused Vodix recheck.

## Interpretation and remaining gaps

Many attention rows retain useful streams. Observed404s include guessed anime
slugs that recover through a verified title and Seek's expected legacy404 before
successful TurboEmbed migration. Other findings include sub720p-only results,
retired/deleted embeds, Dood challenges, SwiftFlux browser-verification gates,
CDN403/502/429 responses, unavailable captions and lookup budgets. Preserve these
observations; do not lower the resolution floor or weaken episode identity to
turn the report green.140 deep cases had no advertised candidate for the selected
entry, particularly Vidmoly; they are not playback passes.

Advertised unsupported domains included `blinkflux.lol`, `bysebuho.com`,
`doodstream.com`, `embedorigin.cc`, `purstream.mx` and `superplayer.ws`. The deployed
frontend also references integrations outside our installed FR sources. These
remain explicit coverage/integration work; this maintenance does not claim their
support or introduce credentials/browser workarounds.

All focused Vodix range controls passed without reproducing its earlier403s.
That does not establish permanent availability. The Avengers availability case,
initially empty, now returns a source; its stable historical case ID is retained,
and the valid-empty protocol remains covered offline.

The EN and Anime-Sama data revisions remain84ea1f561a1f3d9b. The scheduled job
46023036118 completed its actual update gates on27 November, and the preceding
scheduled runs also succeeded. Unchanged upstream rows correctly avoid redundant
snapshots; an old snapshot publication date alone is not update failure.

Validation:487 Node tests,114 Python tests, both literal runtime suites,
workflow lint, build and documentation checks pass. No physical Android playback,
ngrok portability, restart or idle-cost acceptance is claimed. Existing Host0.3.1
can receive the configuration repair through its signed engine channel; no new
APK/native capability is required.

Delivery: provider checks46060076737 and legacy compatibility46060143136 pass.
All55 host core tests pass with the rebuilt production bundles. Signed engine
release4 (API2/minApp10) pins source b5ddcb17bac682f26e74270b00ad38b17297d7af;
all9 immutable remote assets match their advertised SHA256. Refresh Sources FR
1.8.29 or Sources FR+1.9.0-beta.27; existing Host0.3.1 users can select
**Check engine updates**, without an APK upgrade.

Android workflow46060076685 completed successfully: APK build/lint and9 TV
navigation tests pass. The initial TV attempt hit a null-view focus assertion in
one existing test; the failed-job rerun passed without code changes. This is
emulator coverage, not physical TV playback acceptance. Public signed channel4
was fetched back and matches the locally verified metadata exactly.
