# Performance work and repeatable comparisons

## Sources FR candidate preparation — 9 November 2026

Source host-list selection previously parsed the same player URL several times
and classified its host for both support validation and ranking. It now reuses
those values within one candidate. Playback identity and ranking keep their
original entity-decoding policies; a signed URL whose bytes differ still gets a
separate priority classification. Nothing is cached across lookups.

This affects Sources FR host-list routes, not the healthy direct API path. It
adds no request, removes no validation and changes no concurrency, quality
minimum, target, deadline, fallback ordering or source coverage. Shared bundles
are rebuilt/versioned, but Anime-Sama's separate scheduling/selection is unchanged.

```sh
.venv/bin/python scripts/benchmark_sources_fr.py --baseline-ref HEAD --candidates 1000 --repeats 5 --output reports/fr-benchmark.json
```

Compare against a commit before the optimization; HEAD is useful for uncommitted
work. The tool executes the real installed Movix catalogue entry through both
native wrappers with synthetic HTTP. Each language gets the requested candidate
count. It asserts exact stream output/order/headers/tracks and unchanged requests.
One warm-up precedes measured repetitions. CPU measurements are not physical
Android or remote-host latency promises. Smaller inventories may benefit less.
Use local logs and sanitized evidence, not signed URLs, for release comparisons.

What can break: normalization policy, signed bytes, declared direct formats,
unknown host labels, support filtering, priority ties and language coverage. Repair
`src/selection.js`; retain the classification-count/signed-identity regressions in
`tests/selection-speed.test.cjs` plus existing selector, resolver and both-wrapper
checks. Live failures need old-build controls before blaming an optimization.

## Anime-Sama

Its earlier optimization defers processing players in unused episode slots.
See [the dedicated benchmark guide](anime-sama.md#measuring-speed-without-dropping-links).
This is separate from Sources FR candidate preparation and from network waits.

### Anime-Sama host routing — 24 November 2026

Apothecary Diaries source S3E4 publishes VOE through `susanexpectcare.com`
and `derricknationtop.com`. Both were verified to redirect to a branded VOE
F7 player on `caseyseemavoid.com`. These exact domains now belong to the existing
VOE family in `config/endpoints.json`. Previously they resolved correctly by
page inspection, but only after being dispatched to Other. A slow Minochinos
CDN therefore delayed the visible VOE and Sendvid results in that batch.

Two post-change Mobile runs returned ANSEmbed in 2.8–3.1s, Uqload in 2.7–3.3s
and VOE in 3.5–3.6s. Other still took 4.1–13.8s. Before the change VOE waited
for Other, observed at 4.6s and 12.6s. Host latency varies; these are samples,
not promised speedups. The lower CPU benchmark times are noise: this is routing
isolation, not a parser optimization or a removal of validation requests.

The source control runs the actual installed entry IDs through literal wrappers,
with a public `sourceMap` for `/catalogue/les-carnets-de-lapothicaire/saison3/`,
episode4 and VF/VOSTFR. It deliberately bypasses private metadata correspondence;
its common page time includes recovery from removed `episodes.js` references.
Do not quote these totals as full Xperience/AIO lookup times. TV-wrapper VOE
also resolved, but synchronous HTTP required7.5s. Sendvid remains unsupported by
the text-only TV1.0.0 fixture, independently of this routing fix.

ANSEmbed/Uqload need the resolved embed, HLS master and a readable variant.
VOE may additionally need a mirror redirect and validates its alternate MP4.
Sendvid needs a bounded binary read to reject unavailable-video placeholders;
this measured about0.8s, with about0.6s for its embed. These useful checks stay.
Other is still a single result batch, so Sendvid cannot appear while another
member of that entry remains pending. New unknown mirrors must stay in Other
until verified; never guess their family from a domain name.

Regression: `tests/anime-plugin.test.cjs` holds an Other host pending while the
verified VOE entry completes, then compares combined playback data with aggregate
discovery. Existing installed entries, budgets and mapping are unchanged.
[Sanitized evidence](../tests/evidence/anime-host-routing-2026-11-24.json) records
coverage, request counts, benchmark and remaining upstream failures. The shared
aliases ship in native/+ Anime-Sama and FR. Android-host0.1.4 embeds its older
engine and needs a future APK/engine delivery to acquire this fix.

## Shared host recognition — 24 November 2026

Sources FR1.8.25 / Sources FR+beta23 and Anime-Sama1.2.19 / Anime-Sama+beta24
reuse compiled public host-pattern rules in `src/common.js`. Previously each
candidate recompiled the same regular expressions during support checks, ranking
and extraction. Storage is capped at128 rules; new rules still work beyond the
cap without being retained. URL/host decisions, signed links, player tokens and
responses are not cached. There is no background work or added network request.
Sources EN/Ani.pm source and generated bytes are unchanged.

The existing installed Sources FR catalogue benchmark asserts exact playback
data, order, headers and tracks, with9 requests before and after on both literal
wrappers. Five measured repetitions follow one warm-up:

| Candidates per language | TV CPU before → after | Mobile CPU before → after |
| --- | --- | --- |
| 20 | 38 → 25ms | 39 → 24ms |
| 100 | 99 → 42ms | 116 → 52ms |
| 1000 | 884 → 262ms | 1075 → 419ms |

These are local processing times, not end-to-end network loading percentages or
physical TV measurements. Small inventories save milliseconds; larger host lists
benefit more. Anime-Sama's long-inventory benchmark showed no measurable CPU gain
and retained exact outputs with30 TV /34 Mobile requests. Its deferred parser
already avoids unused players. The fast Sources FR API still used2 requests in
the live Matrix control. Do not claim that this change speeds up CDN responses.

A bounded native maintenance audit covered124 selected production/recovery
probes, and a separate30-probe movie host-family sweep found no further routing
repair justified by playable evidence. Yablom/official-key paths were blocked by
missing local credentials; many movie hosts were absent, deleted or challenged.
The paired56 live lookups use actual entry IDs: all six Anime-Sama Mobile entries
for Apothecary S3E4, Hunter S1E1 and Witch S1E6, plus five Sources FR Matrix entries
on both wrappers. Anime source maps bypass private metadata correspondence.
Source/edition/quality/format choices are unchanged. One extra CDN fallback request
in Other reflects transient upstream failure, not a new healthy-path request.
Network timings vary and do not establish a causal loading-time improvement.

Regression: `tests/host-patterns.test.cjs` covers hostname boundaries, changing
rules, reuse without URL caching and the128-rule cap. Repair the shared matcher
without tightening/widening its existing wildcard semantics incidentally. Keep
`benchmark_sources_fr.py`, `benchmark_anime.py --unique-players`, both-track
fixtures and the [sanitized comparison](../tests/evidence/shared-host-speed-2026-11-24.json).
The Other batch limitation remains [AS-02](limitations.md#as-02--other-host-batches-and-rotating-mirrors).
Installed Android-host0.1.4 still needs a separate engine/APK delivery.

## Sources EN request costs

Standard and Beta are independent entries, not a shared request cache. Each
healthy numeric-TMDB series lookup reads title, AIO episode, current revision
pointer, one mapping shard and optional ani.zip facts. Raw IMDb adds a TMDB find.
Beta then needs availability, copy grant, session and master when available;
Standard independently requests its published Sub/Dub channels. Session recovery
adds requests only on the denied path. Daily data selection adds one small pointer
read compared with the original compiled-only mapping. Presentation labels add
no requests. Actual latency depends on the host/network/native bridge; no device
speed guarantee is inferred from request counts. See [EN budgets and policy](sources-en.md).

## Xperience mixed-profile fallback

Input normalization adds no preflight. Ordinary external-ID/title/unique-stream
proofs reuse current metadata. A guarded official-episode/translation check may
add one TMDB request when a date-only reference and broadcast timestamp exceed
the24-hour guard. Responses are reused only within the lookup; the global
matching guard and request/time budgets stay unchanged. Native/AIO paths never
request this Xperience-only proof. See [conditions](xperience.md).
