# Afterdark API feasibility — 23 October 2026

Afterdark exposes a TMDB-based source API, but these checks do **not** establish
a usable fast native provider. Source requests require browser verification.
No production provider, configuration, credentials or hosted helper was added;
Sources FR remains 1.8.8 and dedicated Anime-Sama remains 1.1.4.

Evidence: [sanitized observations](../../tests/afterdark-feasibility-2026-10-23.json).
Raw HTML, JavaScript and responses remain ignored locally. Downloaded JavaScript
was inspected as text, not executed. No account was created, challenge solved,
verification proof fabricated or private endpoint accessed.

## Current domain discovery

The user-supplied `https://afterdark.rest/` responds with a branded address page.
Its **Ouvrir le site** link (`a.btn.primary[href]`) currently points to
`https://atfr1026.mom`. That target returns the expected Afterdark application.
The directory is HTML, not a verified JSON status API or HTTP redirect.
Its canonical metadata still references `afterdark.mom`; follow the live-site
button rather than assuming every hostname on the page is the current site.

The page also advertises `cherishmylove.space` as a stable entry address; that
second address was not independently checked. No claim of permanent discovery
availability is made. A future provider could keep a validated current origin
centrally configured and consult the directory lazily after a genuine endpoint
failure, avoiding a preflight on every lookup. Validate branded content and the
expected protocol after following a candidate. A 403 verification gate must not
trigger domain rotation to try to escape access controls.

## Source lookup protocol found in the first-party client

The site's current main client bundle is `/assets/index-BEobYxuy.js`. Its source
request builder uses:

```text
GET /api/sources?tmdbId=603&type=movie
GET /api/sources?tmdbId=2316&type=tv&season=1&episode=1
Accept: application/x-ndjson
```

It can also append `title`, `originalTitle`, `imdbId` and `releaseYear` when
available. This is a direct TMDB/type/episode lookup; the inspected builder does
not first search a catalogue by title. These are frontend contracts, not
documented promises that optional fields never affect a backend's matching.

The browser reads newline-delimited JSON incrementally. Each accepted row is a
source group with a nonempty `items` array. Its player code recognizes service,
provider, URL, quality, language, source type, proxy status and subtitles; it
distinguishes proxied direct HLS/MP4 from embeds. Those shapes are established
by static client inspection, **not a successfully returned source payload**.
The origin's canonical browser branding and API paths may change with deployment;
do not pin a hashed asset name as a permanent discovery endpoint.

## Verification requirement and actual requests

The browser's source request attaches an `x-nabi-proof` header when it has a
title proof. The inspected normal flow obtains a Cloudflare Turnstile response,
posts that response and a title key to `/api/sources`, and stores the returned
proof in an in-memory map. The map key combines media type and TMDB ID; it is
per title/series, not shown to be per episode. No proof lifetime, portability,
account exemption or supported third-party API credential was established.

| Check | HTTP | Observation |
| --- | --- | --- |
| Directory and site home | 200 | Expected address page and application |
| Public `/api/site-settings` | 200 | Expected JSON settings schema |
| Matrix source lookup | 403 | JSON `Forbidden` |
| The Office S1E1 source lookup | 403 | JSON `Forbidden` |
| Matrix with the client-supplied title/year fields | 403 | Same result; omitted title fields do not explain the first rejection |
| Matrix and Office watch pages | 200 | Browser-verification interstitial, not a playable-media response |

The source rejections took approximately **0.24–0.98 seconds** in these samples.
That measures denial latency, **not source-discovery or playback speed**. The
readable home/settings responses and client verification code support an access
gate diagnosis; no replacement domain or resolver repair is justified by these
403s. The watch interstitial separately confirms browser verification is present.

## Nuvio and speed implications

NDJSON itself is text and could be parsed on TV 1.0.0 after `response.text()`.
The blocker is the browser-verification flow: the native plugin has no DOM,
Turnstile widget or WebView. This investigation did not establish a supported
headless/native way to satisfy it. A domain fallback cannot supply authorization.

Also, the browser displays groups as they arrive, whereas TV 1.0.0's text fetch
bridge buffers the HTTP response. An authorized future implementation must
measure time to complete the response, not just time to the first browser group.
No successful source response was obtained, so request counts, real latency,
catalogue coverage, media access, resolution, audio languages and French subtitle
availability remain unverified. VOSTFR branding is not a measured track inventory.

The inspected client constructs Videasy, Frembed and Peachify fallback embeds
from TMDB coordinates. Constructing an embed URL does not establish availability,
native resolver compatibility or French audio/captions. Frembed already has its
own integration; do not add duplicate speculative links just to return results.

## What can break and how to revisit

- Directory origin, live-button selector and migration target: fetch the current
  address page, inspect the live-site link and validate its target's application.
- Hashed bundles, request query fields and NDJSON group/item schemas: inspect a
  fresh first-party client as data. Do not execute downloaded challenge code.
- Verification exchange, proof binding/expiry and 403 responses: re-establish
  supported access before designing a provider; do not treat access denial as
  an API domain failure. Do not embed proofs or user sessions in the repository.
- Proxy URLs/headers and external hosts: only after authorized source access,
  verify actual fresh media with shared resolvers, original HLS masters, audio
  groups and caption probes. Do not infer tracks from filenames or brand claims.
- Streaming response duration and native compatibility: check movie/episode
  identities on both literal runtimes and bound the whole lookup. Preserve the
  existing fast providers and their independent request budgets.

Revisit if the site provides supported API access compatible with native clients.
Until then, keep this as research outside the installed-provider inventory.
