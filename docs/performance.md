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
