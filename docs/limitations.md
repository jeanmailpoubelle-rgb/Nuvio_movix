# Known limitations and work list

Updated 25 November 2026. This is the current backlog, not a statement that every
listed scenario fails. Historical investigations and live results describe their
recorded versions. Keep this list updated when adding an integration or fixing a
limitation; link its regression and evidence when closing it.

## AS-01 — Unlabelled Anime-Sama seasons with different boundaries

**Status: open coverage gap; no concrete failing title identified in the latest
conversation. Do not replace working mapping logic on this assumption alone.**

The potentially unsupported combination is:

1. Anime-Sama restarts episode numbers at1 for each source season.
2. Its season boundaries differ from the reference episode inventory.
3. It supplies no usable overall episode ranges or other verified correspondence.
4. The layout is outside the existing supported source-group counting paths.

For example, a verified overall episode50 could belong to reference S2E3 but
Anime-Sama S2E8. Finding an existing S2E3 link is not proof of correct identity.
The ordinary seasonal branch can still select the same-numbered source season;
there is no universal reconstruction of every unlabelled multi-season layout.

Already implemented; preserve these paths:

- TVDB-to-reference episode identity translation in Preview.
- A continuous source season, such as the tested Hunter × Hunter layout.
- Explicit source episode ranges, such as Conan's observed1–42 /43–85 /86–128
  groups. Different displayed season counts are expected here, not luck.
- Canonical source-group counting for supported flattened/split-season layouts.
- Sparse positions, regular/special separation and edition-specific gaps.

Next work: capture an actual failing title and exact input/source coordinates;
inspect its episode identities and source labels; add a synthetic failing fixture;
then extend only the unsupported path. A safe solution may derive a source
position through verified regular-episode ordering, but counts alone must not
establish cross-catalogue identity. Reject missing, conflicting or ambiguous data.

Acceptance checks: episode before/after each changed boundary, same playback
identity on both wrappers, unchanged working continuous/range cases, all eligible
host/edition candidates retained, and measured request/latency impact. Reuse data
within a lookup and avoid broad all-season scans on already verified paths.

Repair locations: [source position mapping](../src/anime-sama/episode-mapping.js),
[reference context](../src/anime-sama/catalog-context.js),
[shared input adapter](../src/input-metadata.js). Existing regressions:
[episode mapping](../tests/anime-episode-mapping.test.cjs) and
[input metadata](../tests/input-metadata.test.cjs).

## AS-02 — Other-host batches and rotating mirrors

**Status: verified VOE aliases isolated; Other still returns as one batch.**

An unrecognized mirror belongs to Other until verified. A slow member of that
entry can delay Sendvid and other already-resolved results. Native plugin entries
return one array and cannot publish individual hosts incrementally. Existing
ANSEmbed/Uqload/VOE entries finish independently. Keep media validation and all
host coverage; do not shorten deadlines or drop slower hosts to hide this delay.

The Apothecary Diaries S3E4 VOE mirrors now use the existing VOE entry in
native1.2.18 / +beta23. See [measurements and regression](performance.md#anime-sama-host-routing--24-november-2026).
Further work would require an explicit choice between more entries and a runtime
supporting incremental results. The installed Android-host APK has its own
bundled-engine delivery and is not updated by a plugin refresh.
The [shared host-rule cache](performance.md#shared-host-recognition--24-november-2026)
reduces repeated CPU work; it does not remove this batch wait or a CDN timeout.

## META-01 — Both reference routes incomplete or incompatible

**Status: bounded recovery implemented; remaining failure mode stays explicit.**

Preview beta7 repairs the demonstrated Haikyuu missing-season response by trying
the same catalogue's linked IMDb route, validating series identity, compatible
existing episodes and the selected episode. It adds one reference request only
when recovery is needed. It does not repair two incomplete routes or accept a
replacement with conflicting episode order. No direct TMDB-season reconstruction
was added. See [the adapter guide](aiometadata.md#missing-reference-episodes-beta7-recovery).

Keep this separate from AS-01: a missing reference entry is different from a
mismatch between valid reference and Anime-Sama season boundaries.

## META-02 — Fresh episode associations and placeholder titles

**Status: general upstream-data limitation remains; Witch E6’s canonical-title fallback now succeeds.**

A newly released episode can exist on Anime-Sama, TVDB/AIOmetadata and the TMDB
reference list while TMDB's TVDB-ID lookup still returns no association. If the
independently corroborated canonical fallback title is only “Episode N”, Preview
cannot safely finish correspondence and stops before host extraction. Native
stable lookup can still work. This differs from META-01's missing reference row.

Verified example: [The World's Strongest Witch S1E6](investigations/witch-new-episode-2026-11-11.md),
11 November 2026. On November14 its TVDB-ID find is still empty, but the updated
canonical title permits the existing verified fallback. The separate Anime-Sama
inline-player migration is repaired; see [maintenance](investigations/maintenance-2026-11-14.md).
Recheck upstream associations/titles without promising a refresh
time. Future recovery must use independent episode evidence and retain foreign,
ambiguous, generic-title and batch-release protections; do not assume matching
season/episode coordinates or disable translation across a TVDB profile.

## TV-01 — Preview settings and runtime constraints

**Status: app/runtime limitation; no app patch planned in this repository.**

TV1.0.0 and the inspected full TV1.1.0 build have no editor/import for the
private per-entry metadata settings. The user now runs1.1.0. A
[private setup companion](investigations/tv-private-setup-design.md) is proposed
for review; it has not been built or tested on the device. Phone settings are
per entry/device and are not proven to sync to TV or follow Nuvio profiles.
Independent entries do not share their settings just because they use one bundle.
TV HTTP is synchronous within an entry; Mobile can overlap requests. Neither
plugin can cancel an outstanding native call. See
[pinned app findings](investigations/tv-plugin-settings.md) and
[playback/runtime rules](playback.md).

## NET-01 — Availability and media metadata

**Status: continuing upstream and coverage constraints.**

- Signed playback URLs may depend on the issuing network/session as well as
  time. A readable master is not proof its media segments are accessible. A fresh
  lookup can restore access; this alone does not prove a resolver or player bug.
- Correct mapping cannot create an absent upload or bypass a deleted file,
  CAPTCHA, browser verification, rate limit or CDN403.
- Unknown quality/audio stays unknown. A filename claiming MULTI is not a measured
  audio inventory. Native plugins cannot manufacture missing tracks or artwork.
- Sendvid's validation needs binary transport unavailable on TV1.0.0. Physical
  Android playback and complete catalogue/host coverage are not proven by the
  QuickJS harness. DASH media probing remains unimplemented.
- Independent plugin entries cannot reliably deduplicate each other's results
  without a shared result collector. Sorting prefixes do not provide shared state.

Use the [maintenance runbook](maintenance.md) and [current evidence](../VERIFICATION.md)
to establish which layer failed before changing mapping or filtering.

## Deferred additions

Bowd, Stigstream/VidSrc and Afterdark remain uninstalled/deferred for the reasons
in their [investigations](investigations/README.md). Movix's anime feed was
investigated and set aside; keep direct Anime-Sama discovery. These are not
scheduled work or permission to add accounts, helper services or new providers.
## EN-01 — Sources EN mapping coverage and freshness

**Status: AniBridge authoritative; daily updates implemented, coverage finite.**

Sources EN beta.12 reads AIOmetadata’s actual TVDB Aired/TMDB episode, applies
one AniBridge range to AniList and checks ani.zip only for known contradictions.
Missing/partial/unavailable ani.zip data does not stop playback. From Far Away’s
previous missing-proof blocker was resolved in beta.10, not left as an open gap.
No usable AniBridge rule still means no links, without an ordinary warning.
Settings diagnostics retain the missing/unsupported/ambiguous code. Only genuine
identity/episode/release contradictions produce optional non-playable warnings.

Daily validated snapshots reduce staleness but cannot guarantee upstream mapping
coverage or GitHub scheduling. Delivery/schema failures may use the compiled
baseline; missing rules and contradictions cannot trigger an older-map retry.
Specials, unsupported ratios and ambiguous/combined mappings remain blocked.
See [daily updates and warning behavior](sources-en.md#mapping-policy-daily-data-and-warnings).

Acceptance for new mapping support: real directional episode evidence, boundary
fixtures, both runtime wrappers and configured-input live checks. Counts or
same-numbered seasons alone are insufficient. This AniBridge policy belongs to
EN; FR/Anime-Sama retain their separate reference/backend mapping.

## EN-02 — Ani.pm playback and language availability

**Status: user reports playback works; upstream and device coverage remains finite.**

Standard and Beta are independent entries with separate settings. Beta preserves
the complete multi-audio master; Standard keeps useful Sub/Dub alternatives.
Headings show MULTI/SUB/DUB beside quality; lower captions list actual preferred
audio/subtitle languages. Original/French/English audio and FR/EN captions are
summarized; unrelated embedded tracks remain in the unmodified master.

Historical Settlar403 reports and opaque-URL startup errors are recorded in
[the EN guide](sources-en.md), not assumed current failures. The bounded session
recovery and explicit `type: "hls"` repair are implemented. Availability, grants,
headers, CDN segments, referenced audio groups and captions can still fail
independently. A master200 or mapping pass is not decoded-video proof. No known
French dub for a particular package is not evidence that mapping failed.

## META-03 — Metadata addon and profile configuration

**Status: explicit Xperience Preview adapter added; coverage is bounded.**

Xperience omits AIOmetadata’s provider/extra-series-ID fields. Select its adapter
and either verified automatic matching (FR/Anime-Sama) or the actual explicit
episode order. Explicit TVDB Xperience input requires a unique
extractable TVDB episode ID; opaque/custom artwork without that evidence remains
unsupported in explicit mode. Automatic matching requires independent episode
evidence and can also fail safely. No provider is inferred from IMDb IDs. Broadcast/date-only differences may need
one official TMDB episode/translation check; specials are excluded only from its
regular-episode release/title peer checks. Global stream-ID uniqueness and
regular batch-date rejection remain required. Missing
ani.zip data remains non-vetoing for EN after input validation.

The plugin does not discover or switch to the active Nuvio profile’s metadata
manifest automatically. Each entry/device needs its own settings. Other addons
remain unverified. Stable FR/Anime-Sama retain native behavior; EN series have no
native bypass. See [Xperience setup/evidence](xperience.md) and the
[metadata contract](aiometadata.md#what-the-personal-manifest-field-does).

## PLAY-01 — Libmpv compatibility with some FR HLS transports

**Status: user confirms ExoPlayer works; exact libmpv failure is unconfirmed.**

For Iron Man2008 (TMDB1726), the user reports Vidara/SeekStreaming did not open
with libmpv, while Purstream/Cpasmal showed dark video and a growing duration.
Switching to ExoPlayer fixed the symptoms on the same phone. The agent's bounded
video/audio checks found finite playlists of about126 minutes and readable media.
Seek chunks carry a1x1 PNG prefix before MPEG-TS at byte70; local ffprobe detects
the image. Vidara's AAC MPEG-TS audio is served with a font MIME type. These are
compatibility-relevant observations, not proof of every failure's exact cause.
Purstream's checked playlists contain ENDLIST, so its growing25-minute display
does not reflect the declared source duration.

Current Nuvio Android source forwards the stream-type hint to ExoPlayer; its
libmpv loader passes URL/headers to loadfile without that hint. An extra plugin
HLS hint therefore cannot be promised as a libmpv repair. Do not strip signed
parameters, flatten audio/subtitle masters or discard these ExoPlayer-working
sources. Device logs/app version and a controlled engine comparison are needed
before changing playback integration. No Nuvio app change is authorized here.
See [sanitized evidence](../tests/evidence/iron-man-player-2026-11-24.json).

## PLAY-02 — Ani.pm Android libmpv access denial

**Status: phone failure reported; desktop libmpv opens the same transport.**

The user reports a blocked/restricted-source error for both Standard SUB/DUB and
Beta MULTI. Headless desktop libmpv0.40/FFmpeg7.1.5 entered playback for three
fresh controls, including all original multi-audio masters. This is not a general
encoded-URL/codec incompatibility. Current Nuvio's error text indicates HTTP4xx;
the installed build is Mobile1.0.1; exact request/status and cause remain unknown.

Decoded Beta masters worked with upstream-origin headers and preserved quality/
audio inventory, but differ in default audio and native subtitle groups. They
are not a validated Android fix or a replacement for Standard's opaque transport.
Keep the current provider-returned route, signed parameters, tracks and scopes.
Next evidence: a same-phone fresh-link comparison with the newer MPV library in
Mobile1.1.0-beta.3, then sanitized device HTTP logs if it persists. No verified
access fix is claimed. PenguPlay is currently unavailable for comparison. See [findings and limits](sources-en.md#libmpv-access-errors-and-the-decoded-beta-url).

## HOST-01 — Android-hosted addon device acceptance

A separate [Anime-Sama Android host](../android/addon-host/README.md) has phone discovery reported working. Its cache/idle update adds resource
measurement for device testing. Verify actual Mobile/TV addon installation,
playback headers/embedded tracks, configured TVDB mapping, screen-off/background
recovery, reboot and profile sync before calling it TV-supported. Localhost does
not follow a synced profile to another device; LAN URLs require a reachable host.
Away-from-home access is not provided. Unlike native cached plugins, the server
must run for every new lookup. Total search time can benefit from concurrency,
but the addon returns a complete list and does not stream partial links. A
standalone server cannot inherit Nuvio's TMDB key; configure one where mapping
requires it. The old installation-only companion remains a separate proposal.


## HOST-02 — Longer metadata caching with new-release recovery

**Status: future work agreed on 23 November 2026; not implemented in the APK.**

The Android host currently keeps verified title identities for six hours, general
TMDB series details for five minutes and episode/private metadata for 30 seconds.
The user wants longer reuse, particularly for completed anime, without delaying
access to an episode that has just been released. This concerns the hosted addon
(currently Anime-Sama), not a change to native plugin distributions.

Proposed starting defaults, to validate during implementation:

| Data | Proposed maximum lifetime |
| --- | --- |
| Verified IMDb-to-TMDB title identity | 7 days |
| General series information | 24 hours |
| Episode inventories for an explicitly completed series | 24 hours |
| Episode inventories for ongoing or unknown-status series | 15 minutes |

A completed season is not proof that the series has ended. Use explicit,
independently identified series metadata; do not infer completion from episode
counts, an old release date or the latest season finishing. Unknown status keeps
the shorter policy. Responses that mix general information with episode/season
inventories need the shorter lifetime unless those data are separated safely.
These lifetimes remain upper limits: memory pressure, bounded eviction and a
service restart can discard entries earlier.

New-release recovery must work before the normal lifetime expires:

1. Try the requested episode using the existing cached metadata.
2. If cached episode data is the obstacle—missing requested episode, an outdated
   not-yet-available entry, or incomplete evidence needed to identify it—bypass
   the relevant episode/season inventories and configured metadata response once.
   Refresh associated season-list data too when a newly started season is absent.
3. Re-run the existing identity/mapping checks with the fresh data. Keep verified
   title-ID correspondence and unrelated titles' caches intact; do not flush the
   entire cache simply because one new episode was requested.
4. If fresh data is still missing, ambiguous or contradictory, return no links.
   Do not guess an offset, select a neighbouring episode, change the selected
   metadata provider or silently switch to native numbering. A release date alone
   cannot prove identity or justify weakening the existing matching rules.

The retry is bounded to once per lookup, with refresh requests coalesced/scoped
so concurrent calls do not create a refresh storm or reuse the stale response
being bypassed. Do not negative-cache the failed episode as a long-lived absence.
A correct episode identity followed by unavailable video hosts is a different
failure: Anime-Sama discovery/player pages already run fresh, so an ordinary
empty source result must not automatically invalidate metadata or repeat all work.

Keep current global memory/entry bounds, credential/manifest isolation, lazy
expiry and memory-pressure handling. No background polling or preloading. Source
pages, epsJeton/player tokens, signed playback URLs, grants and HLS media remain
fresh; this work does not approve caching or stripping arguments from media URLs.
FR and EN can reuse host infrastructure later, but retain their own verified
mapping policies; do not port this into unimplemented engines as a side task.

Acceptance checks: clock-controlled completed/ongoing/unknown lifetimes; no false
completion from a finished season; same- and next-episode reuse; cached missing
new episode recovered immediately (including a new season); fresh upstream still
missing or contradictory fails closed; no refresh loop/request storm; selected
manifest/key isolation; ordinary host failure adds no metadata retry; identical
working playback fields and fresh source requests. Compare cold/warm request
counts and latency, and retain memory/idle/no-media-cache regressions.

Implementation points: [HTTP/cache policy](../android/addon-host/core/src/main/kotlin/local/animesama/host/HttpBridge.kt),
[bounded cache](../android/addon-host/core/src/main/kotlin/local/animesama/host/MetadataCache.kt),
[lookup orchestration](../android/addon-host/core/src/main/kotlin/local/animesama/host/Engine.kt),
[existing cache regressions](../android/addon-host/core/src/test/kotlin/local/animesama/host/CachePolicyTest.kt).


## HOST-03 — Pixel hosting and private remote access without a client VPN

**Status: Termux remote discovery confirmed; integrated Host0.2.0 implemented, physical acceptance pending.**

See the [Pixel remote-addon plan](plans/pixel-remote-addon-host.md) for the current
objective, access-key versus physical-device distinction, synced-profile limits,
ngrok/Android feasibility gate, provider-by-provider cross-network/lifetime tests,
physical Pixel/phone/TV acceptance and later FR/EN integration. Keep [HOST-02](#host-02--longer-metadata-caching-with-new-release-recovery)
as the separate future metadata-cache change. No video proxying or signed-URL
stripping/cache is part of the first remote-hosting trial.
The [integrated Pixel guide](pixel-integrated-host.md) covers one-time public-key
registration, stable URL migration and stop/reconnect controls. Network/reboot
recovery code exists; physical uptime/playback and per-profile revocation remain
open. The Termux setup remains a fallback; no video proxy is added.


## HOST-04 — Concurrent AIOmetadata/Xperience profile compatibility

**Status: required future work added 24 November 2026; existing single active
adapter remains supported.**

The host has both adapters and saved manifests but one global active configuration.
Incoming Stremio requests do not reliably identify the client's personal metadata
installation. Use named, revisioned per-profile presets selected by installation
URL, keeping authorization separate from episode order and private credentials
on the Pixel. Nuvio sync can intentionally share a preset/key across devices.

Audit compatibility-ID suffixes versus displayed episode coordinates at the hosted
boundary, preserve verified mapping and isolate private caches/in-flight lookups.
Do not guess which addon is active, query both manifests silently, or substitute
native numbering on failure. The [full design and acceptance matrix](plans/pixel-remote-addon-host.md#metadata-compatibility-and-synced-profiles)
are part of the Pixel plan. No hardware verification is required: private revocable
bearer links are the confirmed access model, with copying/leakage acknowledged.


## HOST-05 — Hosted engine updates independent of APK releases

**Status: future delivery design recorded 24 November 2026; not implemented.**

The APK currently embeds the generated Anime-Sama+ engine at build time. A plugin
update on GitHub does not update installed APKs. Plan authenticated, versioned
engine packages published only after CI, with startup/manual/request-triggered
checks under a cooldown, atomic activation, offline resilience and compatible
last-known-good recovery. Android infrastructure/native-interface changes still
require an APK. Clients keep their hosted addon URL; native phone plugins refresh
independently. See the [complete update flow](plans/pixel-remote-addon-host.md#engine-updates-github-to-pixel-without-reinstalling-every-apk).
No idle polling or execution of arbitrary downloaded player JavaScript is included.

## INPUT-05 — Xperience TVDB episodes without an exposed episode ID

**Status: guarded EN fallback added in beta.22; independent evidence still required.**

Before beta.22, Sources EN's explicit-TVDB Xperience selector required an ID
exposed by the input metadata itself. Jujutsu S1E1–3 exposes none; S2E1 includes
an extractable ID. EN can now recover the missing ID through an independently
identified Cinemeta episode and exact unique IMDb stream/release evidence.
Reference outages, duplicate/batch dates and absent proof still return no links. AIOmetadata stamps its
TVDB order explicitly and works through the existing path. This is independent
of the24 November503 outage. Do not remove identity checks or guess from stream
suffixes/counts. The fallback preserves EN's AniBridge-primary/ani.zip-veto-only policy and
ambiguity guards; it does not change FR/Anime-Sama explicit-mode policy.
See the [diagnosis and workaround](xperience.md#jujutsu-kaisen-season1--25-november2026).
