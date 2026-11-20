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

## Configured input and playback verification

The [final private workflow](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/44643374438)
passes160/160 correspondence/source-position checks and40/40 diagnostic reports
on the exact rebuilt production bundles. These are the existing40 episode
fixtures across Hunter, Jujutsu, Apothecary, AOT, Ippo and Haikyuu, with both
literal native wrappers. The domain refresh changes no mapping policy.

Its independent24-row playback sample has6 pass and18 attention rows, with no
`episode-mapping-differs` warning. This does not certify all media: unreachable
segments, empty backend inventories, caption failures and rejected/gated hosts
remain explicit. Neither a successful master read nor successful correspondence
proves full playback, every audio track or seeking on a physical Android device.

## Full pre-refresh audit coverage

The stable [full deep audit](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/44641877720)
accounts for410/410 planned probes across12 installed-entry workers:93 pass,
229 attention and88 not-tested. Unadvertised host families are not counted as
live resolver successes. Attention can include playable alternatives alongside
failed candidates; it is not a count of completely broken lookups.

The two stable `episode-mapping-differs` rows belong to the isolated Jujutsu
Vidzy numbering control. Both requests return network status0, with no mapping
event. This is unresolved coverage, not evidence of an observed wrong episode,
and does not justify changing coordinates or weakening identity checks.

Full audits execute their recorded pre-refresh snapshots. Final compiled
catalogue controls and the configured Preview workflow above are separate
post-refresh evidence. The public evidence retains executed hashes and scope.

The Preview [full deep audit](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/44641882544)
accounts for552/552 probes across12 workers:128 pass,290 attention and134
not-tested. It also records the same two unresolved Vidzy controls. One extra
Hunter × Hunter ANSEmbed Mobile row has no mapping event because the configured
metadata request times out. The final configured workflow independently passes
all correspondence fixtures; this isolated failed read is not an observed wrong
episode or grounds for a coordinate fallback.

Both audit plans are complete, with no missing worker rows:962 probes total.
They retain upstream HTTP, unavailable/gated source, empty/filtered inventory,
lookup-budget, caption and media warnings. No additional parser or mapping
repair is confirmed. These workflows intentionally return attention/failure
when any selected dependency remains unverified; they are not all-green claims.

[Sanitized executed evidence](../../tests/evidence/maintenance-2026-11-20.json)
records the full pre-refresh scope separately from final compiled controls and
private correspondence verification. Signed media URLs and private settings are
excluded. Installation URLs and per-entry settings are unchanged.
