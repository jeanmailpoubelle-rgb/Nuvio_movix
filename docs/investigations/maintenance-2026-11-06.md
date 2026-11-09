# Maintenance — 6 November 2026

Preview only: Sources FR1.9.0-beta.6, Anime-Sama1.3.0-beta.6 and settings-only
diagnostic1.0.0-beta.5. Stable main remains d336b49. Repository URLs, installed
entry IDs, settings, quality limits and stream ordering are unchanged.

## Confirmed repairs

**Episode correspondence:** a successful empty TMDB TVDB-episode find can now
recover through the exact same TVDB ID, stream ID and input/Cinemeta date, then
unique canonical title/date correspondence into the target. Foreign, conflicting,
ambiguous, malformed and transport-error responses do not use that recovery.
Ippo’s later seasons exposed the gap. Existing successful paths keep precedence;
there are no title offsets or widened date tolerances.

**Source aliases:** when source discovery fails and Cinemeta supplies no new
spelling, an existing TMDB key can fetch official alternatives. Typed TMDB and
external IMDb identity must match. Only names are borrowed, never episode lists.
This lets Fighting Spirit reach the independently identified Hajime no Ippo
source. Healthy exact matches add no reads; keyless optional alias recovery
remains unavailable. See the [Ippo diagnosis](ippo-preview.md).

**SeekStreaming:** the legacy video API now returns404 for many fresh Movix
Custom candidates. Its first-party page uses a public file mapping to TurboEmbed
and a public encrypted response header. The new fallback verifies old/new file
binding and an editable target-origin allowlist, uses existing aes-js without
DOM/timers/WebCrypto/binary transport, and retains the original HLS/captions and
required headers. Healthy legacy calls are unchanged. Details and failure map:
[Seek migration](seek-migration-2026-11-06.md).

## Verification and performance

372 Node tests and62 Python tests pass, as do both literal native wrapper suites,
new204/encrypted-header fixtures and generated-build checks. CI is green for the
repaired sources. These checks do not establish physical Android playback.

The beta5 configured run passed148 metadata/source-position checks and37 actual
diagnostic reports across Hunter, Jujutsu, Apothecary, Attack on Titan and Ippo.
The final beta6 rerun records the exact newly compiled hashes separately.

Ippo E1 in seasons1/2/3 returned reachable main API1080p and ANSEmbed VF/VOSTFR:
720p for season1,1080p for seasons2/3. Main native controls remain2 requests;
configured S1 uses5 and S2/S3 use6. ANSEmbed uses18 native and20/21 configured
requests in this sample. Cloud samples took roughly0.5–1.3s main and4–5s Anime;
these are not device latency guarantees. New reads occur only on recovery paths.

The final Seek checks exercised Matrix, Dark Knight and Jujutsu S1E20 on both
TV/Mobile wrappers. All six returned reachable1080p streams, with explicit
`seek-migration` events and preserved player headers. An initial old-route404
remains visible as a recovered failure. Other missing/gated candidates can still
make an audit row attention even when the repaired Custom stream is reachable.
No complete decoding, content identity, seeking or all-audio playback was tested.

## Broad audit and tooling

[Provider-scoped broad baseline](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/42301983707)
uses the beta5 snapshot before the Seek repair. It accounts for482 planned probes
across both runtimes, normal entries and isolated recovery routes. The final
checkout adds a separate Seek episode reference (484 planned), explicitly covered
alongside the two movie controls in the repaired six-probe sample. Do not treat
baseline Seek404s as failures of the repaired beta6 transport.

The original serial run was superseded by provider-scoped jobs, with its partial
artifact retained. A coverage test proves the union has no omissions/duplicates
for every profile/runtime. Offline checks run once; at most three jobs run in
parallel. Each job saves its own sanitized findings. The merger preserves
attention statuses, rejects mixed/stale/duplicate/foreign snapshots and marks
missing rows explicitly. A successful merge does not certify every host as healthy.

An audit-reference bug was also repaired after the baseline: generic isolated
helpers could inherit a private case’s Custom/primary episode expectation even
when testing another raw backend. They now use native controls unless the
integration explicitly owns a configured case, and inherit only applicable
mapping expectations. Original `episode-mapping-differs` baseline warnings are
retained; dedicated production and owned mapping checks verify real correspondence
separately. Do not “fix” a backend layout to satisfy an unrelated helper assertion.

## Availability findings and limits

The focused main API controls for Matrix and Office retain their two-request
healthy path. The Dark Knight primary/premium playlist can return404; the repaired
Movix Extra/Seek path is reachable. Frembed includes file-level404s, unresolved
Dood candidates/challenges and below720p editions. Catalogue/Vidzy results often
contain only below-minimum or gated streams; the minimum remains720p and unknown
quality is retained. Yablom’s provider-scoped baseline passes.

The broad report’s status counts, remaining host coverage and final beta6
metadata rerun are summarized in VERIFICATION.md and the sanitized dated evidence.
No replacement domain was guessed from a failed file or cloud connection.
TV1.0.0 settings setup/sync remains separate from runtime support. The AOT
final-chapter TMDB-special conversion remains unsupported. Other provider layouts
without identity evidence stay unverified; no account/service/app changes were
introduced. Physical-device content confirmation remains outstanding.

## Final recorded outcome

The final beta6 configured run42304469565 passes148/148 correspondence/source
slots and37/37 reports with matching production/executed-helper hashes. The
482-result beta5 baseline has121 pass,243 attention and118 host-not-advertised,
with no missing shards.246 rows returned sources and244 had reachable media.
All16 isolated-helper mapping warnings are attributable to the corrected tooling
expectation bug. Original rows remain in evidence rather than being rewritten.

All six repaired Seek samples return reachable1080p. A fresh Dragons subtitle
retry passes both wrappers; two other baseline caption HTTPError observations
remain recorded. The final Ippo repeat reaches main1080p everywhere and both S1
720p editions, but S2 VOSTFR and S3 VF playlists403 on native and configured
paths alike. The other1080p edition remains reachable. Earlier beta5 samples
reached both; source discovery/identity recovery is repaired, while CDN availability
is variable. No subtitle timeline or physical playback assurance is implied.

Sanitized case-level findings, exact hashes, before/after scopes, media and caption
observations: [dated evidence](../../tests/evidence/live-maintenance-2026-11-06.json).
