# Maintenance check — 24 October 2026

This check covers Sources FR and dedicated Anime-Sama on literal TV 1.0.0 and
Mobile wrappers. The baseline uses Sources FR 1.8.8 / Anime-Sama 1.1.4; the repair
is released as **1.8.9 / 1.1.5**. The user previously chose to continue without a
runtime TMDB key; key-dependent paths remain explicitly unverified.

Evidence: [sanitized baseline and focused checks](../../tests/live-maintenance-2026-10-24.json).
Raw HTTP/player data, signed paths and logs remain ignored. These are bounded
HTTP/runtime checks, not physical Android playback or subtitle-content certification.

The deep baseline completed **232 planned jobs: 33 pass, 149 attention,
34 blocked and 16 not-tested**. Attention includes returned alternatives with
failed candidates or media probes; it is not a count of code defects. The 34
credential-blocked paths remain unverified as requested. The 16 unadvertised-host
probes do not establish host health. No worker crash or probe timeout occurred.

The rebuilt release passes **294 Node regressions, 34 maintenance tests and both
full literal native wrapper suites**. Both new Node regressions and the new
native migration fixture failed on the old generated bundles. Generated artifacts
are rebuilt from source/config; source resolver and mapping algorithms are unchanged.

## Confirmed break and repair

The configured `https://frembed.bar` redirects to `https://frembed.uno`.
The final API rejects the retained old Referer with HTTP 403 and
`Access denied - Invalid Referer`. Its home page still returns HTTP 200, which
does not establish that source discovery or premium grants work.
The isolated ordinary premium baseline also fails at the retired origin with
HTTP 405 on both wrappers. Direct current-origin grants succeed; this is a
separate observation from the inventory API's stale-Referer 403.

Direct requests to the redirected first-party origin with its matching Referer
return valid Matrix, Dark Knight and Office S1E1 records with the expected TMDB
identities and modern `links` arrays. The repair changes only
`config/endpoints.json:frembed.base`. Existing source code derives both URLs
and headers from this base; no discovery preflight or redirect-following heuristic
is introduced. Update explicit `frembedBaseUrl` overrides if pinned to `.bar`.

New movie and episode regressions reproduce a redirected stale-Referer rejection
against the old bundle. The literal `frembed-domain` fixture fails before the
change on TV and Mobile. It checks matching API headers, exact coordinates,
two-request HLS discovery, retained original master, measured quality and declared
French/English audio. Existing premium tests check the updated grant URL,
Referer/Origin and relative caption resolution, while preserving fresh grants,
signed media bytes and playback-header behavior.

Shared configuration is rebuilt into both plugins. Dedicated Anime-Sama does
not use Frembed's discovery API: its independent mapping, all published hosts,
no quality minimum and host captions remain unchanged. Sources FR retains the
720p minimum and unknown-resolution policy. No provider IDs or budgets change.

## Focused evidence before rebuilding

A temporary bundle using only the new origin exercises the production helper
on both wrappers, without a metadata key or changes to production bundles:

| Path | Result on each runtime | Requests |
| --- | --- | --- |
| Frembed hosts, Matrix | Valid inventory; files unavailable or below 720p, so no qualifying result | 4 |
| Frembed hosts, Dark Knight | Two VOE alternatives: measured 720p HLS and unmeasured MP4 | 7 |
| Frembed hosts, Office S1E1 | One unmeasured VOE MP4 alternative; media readable | 7 |
| Ordinary premium, Matrix / Hunger Games / Office S1E1 | One 720p MULTI result per title; all six media and advertised-caption checks pass | 3 per helper |

One Dark Knight TV HLS media sample fails; its MP4 and both mobile alternatives
pass. The failure remains in the evidence. This repairs API access; it does not
revive deleted uploads, remove external-player gates or invent audio/subtitles.
The ordinary premium path stays a fallback, avoiding duplicate fast-API results.

## Other boundaries and limits

The production directory parsers still identify Nakios Live from `nakios.org`,
Purestream CC from `purstream.org`, and Pirvab from both the Yablom address page
and FMHY. Configured HTML mirrors, Movix's address page, Yablom origins,
Anime-Sama home and independent GitHub/metadata network controls respond.
Direct API status advertises `purstream.sh`; an announcement alone does not
justify replacing a configured API that still works.

Additional known-title checks cover direct recovery, HTML, Yablom and Omega on
both wrappers. They supply development metadata and do not replace blocked
app-key/metadata HTTP coverage. Direct Matrix/Hunger Games/Office, HTML Matrix,
both Yablom films and Omega Matrix return readable media. HTML Office and Omega
Office have no matching inventory; HTML Hunger Games has no qualifying result,
and Omega Hunger Games has no usable supported result. Empty media-probe lists
do not establish playback success.

The baseline's late phase encountered an environment-wide tunnel failure.
Independent requests to GitHub, Nuvio Catalog, Movix and Frembed returned
identical HTTP 503 bodies mentioning `cloudflare_https_tunnel`. This is evidence
of a cloud transport failure, not simultaneous domain/episode/parser changes.
Inherited proxies and TLS verification were retained. Earlier network controls
and live candidate tests succeeded.

All **42 final compiled-release recheck jobs** were attempted during that outage.
They remain environment-blocked: their empty results, missing mapping events and
unadvertised-host classifications must not be interpreted as upstream facts.
The earlier successful new-origin helper checks use the same production logic;
the final generated bundles differ from the old bundles only in version and the
Frembed base. Nonetheless, a successful final-artifact live recheck is a remaining
coverage gap, alongside missing-key paths and physical Android playback.

The baseline observed no successful Dood, Dropload, MixDrop, Sendvid, ShareCloudy
or StreamWish extraction. ShareCloudy is independently covered by successful
known-title Yablom helpers. Gates, deleted/unavailable files, absent advertised
candidates and TV's Sendvid binary limitation remain distinct; the audit does
not establish playable coverage for the other five families.

## Debugging the next migration

1. Compare the configured origin's final URL/error with a direct request to its
   explicitly redirected first-party destination. Do not guess domains.
2. Read a known movie and exact episode API with its expected site Referer.
   Confirm TMDB/type/season/episode identity and the actual schema.
3. Test ordinary premium grants separately. Do not solve challenges or add
   account credentials as an incidental maintenance change.
4. Update the central base and overrides, build both affected plugins, run the
   migration fixtures and repeat normal/recovery checks on both runtimes.
5. Preserve failed media, empty inventories, missing-key gaps and untested hosts.
   A successful fallback does not make every dependency healthy.

Representative commands after offline checks:

```sh
.venv/bin/python scripts/audit.py --skip-offline --provider frembed-hosts --case dark-knight --case office
.venv/bin/python scripts/audit.py --skip-offline --integration premium-recovery --case matrix
.venv/bin/python scripts/audit.py --skip-offline --provider movix --case matrix --case office
```

Afterdark, Bowd and Stigstream/VidSrc remain deferred. No hosted service is added.
