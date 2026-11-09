# Sources FR merged ordering — 1.8.11

All six active root-manifest entries share the display name **Sources FR**.
Nuvio Mobile compares scraper names before stream labels; distinct names would
keep links grouped by provider regardless of their quality. The manifest's
`sourceLabel` preserves each provider's wording when compiling `PROVIDER_NAME`.
Descriptions identify entries in settings. Existing IDs, supported types,
enabled states and the inactive migration entry are preserved. Refresh the
repository to update locally cached entry names; keep repository grouping enabled
for a single source filter. No app settings or credentials are shared by this change.

The entries still complete independently. This change adds no host splits,
prerequisite requests, scheduling changes or cancellation capabilities.

## Presentation contract

After existing enrichment, deduplication and resolution filtering, order by:

1. Resolution descending, including nonstandard resolutions.
2. MULTI, VF, VOSTFR, then other/unspecified audio at equal resolution.
3. Manifest entry order, then stable original order within that entry.

Unknown resolution comes last without an invented quality label. The minimum
remains 720p; unknown resolutions remain available. A higher-resolution VOSTFR
link precedes a lower-resolution MULTI link.

`src/stream-order.js` supplies the composable quality/audio priority and invisible
VS1–VS16 encoding shared with Anime-Sama. `src/fr-presentation.js` adds provider
and position ties, strips only the numeric prefix produced by the existing local
sorter, and changes only presentation fields (`name`, `size`, bridge `language`, semantic `audioLanguage`). Every result, even a single link, needs a prefix
because results from other entries can arrive later. The heading now contains quality/audio; the lower caption retains provider/host wording. Headers, URLs, audio, subtitles and resolution fields are
unchanged. Anime-Sama 1.2.4 imports the shared helper while retaining its own
candidate ordinal and unchanged output contract.

Use the app's ordinal lowercase string comparator to verify merged ordering.
`localeCompare` may ignore variation selectors and does not model that behavior.
These are default-ignorable characters, not bidi controls; they are not intended
to add visible glyphs. Prior local JVM rendering observations do not certify
physical Android rendering. Recheck on devices if the app changes its renderer,
normalization or sorting.

## What can break

| Symptom | Check and repair |
| --- | --- |
| Results still grouped by provider | Refresh cached repository names; all active `name` values must be Sources FR. The build rejects missing `sourceLabel` values or different active names. |
| Provider identity disappears | Preserve `sourceLabel` and provider/host labels; inspect `scripts/build.cjs` and compiled `PROVIDER_NAME`. Descriptions remain distinct. |
| Wrong order as entries finish | Inspect `stream-order.js`, `fr-presentation.js`, actual app comparison, and manifest-order ties. Compare all entries, including singles, unknown qualities and nonstandard resolutions. |
| Technical codes appear or sorting metadata vanishes | Inspect raw JSON and the app renderer. Use `visible_label` / `label_priority` in `quickjs_check.py`; reports expose readable names and priorities. |
| Playback, quality policy or network cost changes | Presentation must change only names. Compare complete playback data and request counts with the committed baseline; retain filtering and source coverage. |
| A new provider breaks global ordering | Keep the common name, provide a descriptive sourceLabel, preserve independent entry delivery, and route results through the shared final presentation hook. Update docs and maintenance coverage in the same change. |

## Verification

```sh
npm test
.venv/bin/python scripts/quickjs_check.py --all --runtime both
.venv/bin/python -m unittest discover -s tests -p test_audit.py
.venv/bin/python scripts/audit.py --skip-offline --provider movix --case matrix
.venv/bin/python scripts/verify_live.py --case 603 --case 2316 --provider movix --provider nakios --provider frembed-hosts --runtime both --report reports/fr-order.json
```

`tests/fr-group-order.test.cjs` executes all six compiled presentation paths,
reverses completion order, checks actual JSON transport and the ordinal app
comparator, compares playback fields, and exercises the compiled 720p/unknown
policy without extra HTTP. The native suites also validate prefixes/order on
all root fixtures. `tests/stream-order.test.cjs` retains local stable sorting
checks; Anime-Sama's existing fixtures cover its independent-entry union.

See [release evidence](../tests/evidence/fr-group-order-1.8.11-2026-11-02.json). Live
upstream limitations and physical-device gaps remain separate from fixture proof.
