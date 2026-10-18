# Frembed: Jujutsu Kaisen S1E1 has no published host links

Read-only diagnosis, 18 October 2026. Sources FR remains **1.8.5**, Anime-Sama
**1.1.3**. [Sanitized evidence](../../tests/live-frembed-jjk-first-2026-10-18.json).

## Where the links stop

The generated Frembed / Hosts provider requests the correct numeric TMDB ID
**95479**, season **1**, episode **1**. Its public `/api/series` response is HTTP
200 and identifies Jujutsu Kaisen at those exact coordinates, but returns
`links: []`, `has_vf: false`, `has_vostfr: false`, and `has_vo: false`.

Both literal TV 1.0.0 and Mobile wrappers return zero streams after **one HTTP
request**. No host is attempted and no resolution filter removes anything. This
case is independent of the S2E1 metadata-layout investigation.

S1E2 also has an empty modern inventory. Controls still publish three host links
for The Office S1E1 and two for Matrix: this is not evidence of a service-wide
domain/schema failure. An IMDb query returns 404; switching away from the
correctly matched TMDB record does not restore its host inventory.

The legacy `link1` field contains a relative `/api/stream` route despite the
empty modern list. A manual request redirects to a third party that the cloud
could not access. That is not verified playable-media evidence. Do not resurrect
legacy numbered fields when the modern `links` array is present, or classify a
cloud access failure as proof of device failure.

## The premium player is a separate inventory

The existing ordinary premium grant/source helper returns one **1080p MULTI**
HLS stream. Its master declares French and Japanese audio and two French subtitle
renditions. Media samples and both caption-track probes pass on both wrappers;
these checks do not certify continuous playback, every audio rendition, caption
synchronization or physical Android networking/decoding.

Fresh normal fast-API lookups return the **exact same signed media URL** as this
premium helper in each runtime comparison. The normal lookup takes two requests;
the isolated premium route takes three. Premium remains the API worker's final
recovery route when its primary and backup have no qualifying stream. Listing it
again through Frembed / Hosts would duplicate the already returned stream and
add discovery requests. No source or episode is hardcoded to obtain these results.

## Recheck and repair boundaries

```sh
# Normal hosts and fast API on both wrappers.
.venv/bin/python scripts/audit.py --skip-offline --case frembed-jjk-first

# Independent premium grant/source/master, regardless of the healthy primary.
.venv/bin/python scripts/audit.py --skip-offline --case frembed-jjk-first --integration premium-recovery
```

The normal audit should flag an empty host result for inspection; do not turn
that reference into an unconditional passing/expected-empty exception. Upstream
may add or remove sources later. Compare the fresh modern inventory with the
`frembed-inventory` and selection events before changing code.

Repair `config/endpoints.json:frembed.base` only with verified domain evidence;
repair API schema/grant handling in `src/frembed.js` if the first-party protocol
changes. A populated inventory whose attempted players fail belongs to the shared
host resolvers. Readable masters below 720p belong to Sources FR's intentional
quality filter. Empty inventories and shared premium media do not justify a
new alias, a global season rewrite, a lower quality floor or another premium
worker. Generated provider files remain unchanged in this investigation.
