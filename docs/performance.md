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
