# Maintenance — 19–20 November 2026

Stable and Preview are checked independently. The task began late19 November
UTC and continued on20 November. Existing settings, metadata correspondence,
quality/audio policies, source selection, budgets and runtime compatibility stay
unchanged. This is a domain-config refresh, not a new resolver or mapping policy.

## Verified catalogue address change

`movix.zip` redirects to `movix.free`. A no-follow request to the configured
`/search/Matrix` endpoint returns301 to the same path on `.free`. Both search
and the exact Matrix movie page load through either address; parsed player
identities/editions have the same hash. The current-origin Dark Knight lookup
returns a reachable stream on both native wrappers.

The old configuration already follows the redirect. The third HTML mirror is
updated directly to avoid depending on the retired address continuing to work.
Primary Nakios/Purestream mirror order and the independent Movix `.dog` fast API
are unchanged. No discovery preflight is added. Explicit user mirror overrides
retain precedence. Domains stay editable in `config/endpoints.json`.

## Focused catalogue evidence

The real production catalogue/parser/resolver helper is executed with public
movie/title/year fixtures replacing only the key-dependent metadata fetch.
These checks are distinct from full Actions audits that use the real TMDB key.

Matrix and Your Name reach matching film inventories, but some hosts are
unreachable, gated or return no media. Hunger Games reaches eight advertised
players; one resolved480p result is correctly discarded below720p. Flash S1E1
reaches four advertised players and rejects Uqload’s known promotional asset.
Office/Jujutsu search samples find no accepted series match; guessed direct
routes are not production evidence and are not used to invent source links.
No matching guard or quality threshold is relaxed to increase source counts.

The generic HTML catalogue protocol is unchanged. Existing parser, fallback,
promotional-clip, signed-URL and literal-native fixtures provide regression
coverage; no test asserts that a retired URL must remain reachable.

## Final compiled controls and performance

The final generated `nakios` bundle is executed with a reviewed entrypoint
override selecting `ENDPOINTS.catalogue.mirrors[2]`, rather than hardcoding the
test address. Public metadata fixtures replace only the title/year read.
Dark Knight, Hunger Games and Flash S1E1 are exercised on TV/Mobile on each
track. Dark Knight returns one reachable stream in all four checks. Hunger
Games remains gated/filtered, and Flash’s promotional Uqload asset stays rejected.
No qualifying result is fabricated for the remaining candidates. Executed helper
and original production bundle hashes are retained separately.

All existing offline checks pass: Preview383 Node/65 Python tests, stable346/54,
both complete literal native suites and generated build/docs checks. The source
parser/resolver code is unchanged, so no new protocol fixture or cosmetic
quality/availability probe is introduced. The config refresh avoids the old
address’s redirect on this fallback; it adds no healthy-path request and makes
no physical-device latency or full playback/decoding guarantee.
