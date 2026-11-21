# Sources EN Preview — Ani.pm

Version **0.1.0-beta.6** is a dedicated phone-first plugin, with its own manifest,
one Ani.pm playback entry and one settings-only diagnostic. It is separate from Sources FR, Anime-Sama and the episode
diagnostic. Existing provider bundles and settings remain unchanged.

## Install and configure

Copy into Nuvio's plugin repository URL field:

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/aiometadata-input/plugins/sources-en/manifest.json
```

Open this entry's gear, paste the personal **AIOmetadata manifest URL**, leave
query format **IMDb** and displayed order **TVDB — Aired Order**, and Save. Use the same AIOmetadata configuration as the
profile: TVDB **Aired Order** anime, IMDb stream compatibility IDs and Anime
Detection Override enabled when ordinary series use TMDB. AIOmetadata with TMDB
episode metadata is supported by selecting **TMDB** in the entry's displayed-order
setting. A response from a different provider is rejected, protecting against
AIOmetadata silently using regular-series TMDB data for a TVDB anime request.
An IMDb ID does not imply IMDb
episode order. The app supplies its TMDB key; no new TVDB/MAL key or account is
required. Cloud secrets configure cloud checks only, never the phone.

Test on a real anime episode or film. Nuvio's generic Matrix movie test is outside
this anime catalogue and can correctly return nothing. TV settings setup is not
part of this first release; literal TV compatibility fixtures are not device
installation/playback evidence.

### Empty results on the phone

Refresh this repository to beta.6. Open **Sources EN — Diagnostic**, paste the
same personal AIOmetadata manifest into **its own** gear, leave IMDb and TVDB
Aired Order, Save, then **Test provider**. This entry advertises no media types
and never participates in ordinary movie/episode searches. Test rows contain
`diagnostic:` text only, not playable URLs.

Empty target fields test Hunter S2E72. To test either S1E1, enter season1,
episode1, and TMDB series ID46298 (Hunter2011) or220542 (Apothecary).
Read Configuration, Épisode confirmé, each network stage, Cause and Bilan.
Nuvio Mobile displays only the first eight test results (`scraperResults.take(8)`
in [PluginsSettingsScreen](https://github.com/NuvioMedia/NuvioMobile/blob/main/composeApp/src/fullCommonMain/kotlin/com/nuvio/app/features/plugins/PluginsSettingsScreen.kt)).
Beta.4 therefore returns at most eight rows: Bilan and Cause first, followed by
failed network stages (or the final successful stage), confirmed/proposed target,
selected input and configuration/request context. There is no hidden list to
scroll. This is a diagnostic-display correction, not a confirmed playback repair.
For example, **Ani.pm bootstrap — HTTP403** identifies a denied source request;
an absent injected TMDB key or rejected AIO provider has a different code.
Share stage/status/code only, never the private manifest or a signed stream.
The beta.4 phone report for Hunter S2E72 confirms TVDB episode4884760 maps to
AniList11061/E130, followed by Settlar session HTTP403 for both channels. This
is access denial after successful mapping, not a reason to change the episode.
Beta.5 matches the embed player's `Accept: application/json` / no-referrer fetch.
On a session403 only, it reads the exact validated embed document, keeps fresh
applicable cookies within that channel, and retries the same token once. This
follows the recovery sequence also used by
[curd's native Ani.pm client](https://github.com/Wraient/curd/blob/1cd77f3c2a1c58954aeaa7e23b62577b74760116/internal/providers/anipm/streams.go).
Healthy requests add no round trips; recovery adds at most two per denied channel
inside the existing global request/time budgets. No HTML scripts are executed.
Cookies never reach metadata/CDN requests or later lookups. A repeated403 reports
`EN_SETTLAR_ACCESS_DENIED`; warming the page cannot guarantee access through an
upstream anti-bot/IP restriction. The phone beta.5 retest still denies both session and embed-document requests
with403, while the same video plays in the browser on the same phone/network.
Thus cookie recovery did not resolve this reported failure. Beta.6 uses a complete
browser User-Agent, consistent across grants, sessions and playback, instead of
the earlier bare `Mozilla/5.0`. This aligns native-client headers; it does not
reproduce browser TLS or establish that headers caused the rejection. The report
adds only a locally classified `[challenge navigateur]`, `[HTML]`, `[JSON]` or
`[TEXT]` to denied Settlar stages, never raw response contents. A challenge label
requires the explicit `cf-mitigated: challenge` header or Cloudflare challenge
script marker; other labels describe response format, not the root cause.
The fallback now also reports `EN_SETTLAR_ACCESS_DENIED` when its document403s.
If refusal persists, use this evidence to distinguish an upstream browser
challenge from an API rejection before choosing another approach. No browser,
proxy or hosted helper is added. Phone beta.6 recovery is still unverified.

Private settings are independent of the playback entry. A successful mapping
report alone does not establish working source access or playback.

## Mapping and playback

1. Validate the typed TMDB/IMDb identity through TMDB, retaining original language
   and linked TVDB/IMDb identities. Movies and series cannot share numeric IDs.
2. For series, read the configured private AIOmetadata response and select the
   **displayed** season/episode fields using the existing input adapter. Validate
   its series/stream identity. Do not use rewritten IMDb suffixes as TVDB order.
3. Fetch one small pinned mapping shard for the actual metadata provider's series
   and apply one unambiguous AniBridge TVDB/TMDB-to-AniList episode range. No
   Nuvio Catalog or TVDB-to-TMDB episode detour is required here.
4. Corroborate series episodes with ani.zip. Known TVDB episode IDs must match;
   artwork-derived IDs also need release corroboration. Missing IDs require a
   unique release and matching TVDB aired coordinates where applicable. Unknown,
   conflicting or split/combined episode identities stop without a guessed link.
5. Anime films use a typed TMDB-movie mapping to an AniList film episode.
6. Ani.pm's selected-episode bootstrap must confirm the AniList identity and
   episode. Resolve advertised soft-sub/sub and dub channels through Ani.pm's
   session endpoint and the exact configured Settlar origin. Read the original
   master and its referenced audio/subtitle groups, preserving signed bytes and
   required headers.

No quality minimum applies. Unknown quality is left unlabeled. Audio must be the
title's original language, French or English. Original-only streams need a
declared full French/English subtitle track; signs/songs-only captions do not
qualify. English/French audio can remain without subtitles. Unverified audio or
unrelated-only languages are rejected rather than guessed from `sub`/`dub` names.
Only FR/EN sidecars are supplied to Nuvio. Extra tracks inside a master remain
intact and may remain selectable; no proxy strips or rewrites them.

One identical master URL produces one result. Distinct native/English masters
stay separate. Initial live Your Name samples use separate Japanese and English
masters, not one consolidated audio inventory. Quality is the heading; the lower
caption lists relevant audio and subtitle languages, Ani.pm provenance and changed
episode numbering. Mobile may repeat its native quality on the secondary line.
Invisible ordinal prefixes preserve descending quality before audio ties.

Sessions, signed masters and subtitles are never persisted between lookups.
Two channels can overlap on Mobile; there is one 24-request/45-second cooperative
budget. An already pending native HTTP call cannot be cancelled by that budget.

## Maintenance and verification

Endpoints, host allowlists and budgets: `config/sources-en.json`. Source:
`src/sources-en/`. Build: `npm run build`. Generated output:
`plugins/sources-en/providers/sources-en.js`.

The separate [maintenance inventory](../config/sources-en-maintenance.json)
names each dependency, failure symptom and repair location. This entry uses its
own verifier rather than silently enlarging the existing FR/Anime-Sama audit:

```sh
node --test tests/sources-en.test.cjs
.venv/bin/python -m unittest discover -s tests -p test_sources_en.py
.venv/bin/python scripts/verify_sources_en.py
# Focused installed-entry live retry:
.venv/bin/python scripts/verify_sources_en.py --case hunter-72 --case your-name
# Live source controls without secrets (only metadata reads use public fixtures):
.venv/bin/python scripts/verify_sources_en.py --public-controls --case your-name
```

The live command requires runtime secrets `NUVIO_TMDB_API_KEY` and
`NUVIO_AIOMETADATA_MANIFEST_URL`; use the **Sources EN private live check** Actions
workflow when they are only available in GitHub. It runs the actual Mobile entry
against Hunter, Haikyuu, Jujutsu, AOT, Ippo, Apothecary and Your Name (including
the reported Hunter/Apothecary S1E1 cases), with bounded
media/caption probes. Public reports omit URLs, keys, grants, raw bodies and
subtitle dialogue. A mapping pass does not imply a playable upload or full
decoding/seeking on Android. Empty/blocked/attention rows remain coverage gaps.
`--public-controls` executes the same generated entry while replacing only TMDB
title/private metadata reads with public fixture facts. Shards, episode proof,
bootstrap/sessions, HLS/media and captions stay live. Its report scope explicitly
distinguishes this from a full configured-input test; it cannot prove the user's
saved settings. The dedicated workflow also runs on Preview pushes affecting EN
source/config/artifacts or its verifier; existing provider checks stay separate.

## Updating the mapping data

[AniBridge](https://github.com/anibridge/anibridge-mappings) supplies directional
episode ranges, not just series-ID links. Its schema includes inferred and edited
rules; it is useful evidence, not a guarantee of every episode's identity.
The reviewed v3 snapshot is split into 64 buckets per supported source type.
Each lookup fetches one shard instead of the entire roughly 9 MB dataset.
`data/<revision>/index.json` records the source SHA-256, source date/schema and
all generated shard hashes. The upstream MIT license is retained in
`plugins/sources-en/LICENSE-AniBridge.txt`; upstream notices remain applicable.

```sh
# Fetch a new candidate v3 release, pin its hash and generate new shards:
.venv/bin/python scripts/update_en_mappings.py
# Or use a previously downloaded reviewed snapshot:
.venv/bin/python scripts/update_en_mappings.py --source /path/to/mappings.min.json
npm run build
npm test
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
# Then the installed-entry live workflow and content/episode verification.
```

Review changes before publishing. Preserve old revision directories for installed
older bundles, update the EN version, evidence and changelog, and rerun regressions.
Forty public fixture expectations are development checks, not production offsets.
No nightly unreviewed mapping replacement or private metadata is compiled.

## Known gaps and failure boundaries

The [21 November evidence](../tests/evidence/sources-en-2026-11-21.json) records
the exact beta.2 bundle. All eight private configured-cloud mappings pass, but
Ani.pm rejects that GitHub runner's bootstrap requests with HTTP403. Eight
workspace source controls return fifteen streams and pass bounded media/caption
checks; only their TMDB/private metadata reads are replaced with public fixtures.
This separates mapping, cloud access, source extraction and physical playback.
Your Name returns2160p Japanese/English options; the sampled AOT episodes include
FR/EN captions. Ippo S2E1 exposes one720p Japanese option in this observation.
These are snapshots, not guaranteed languages/availability for other episodes.
The configured series live coverage uses TVDB; TMDB-series mode has a dedicated
combined-season regression, not a separate live AIOmetadata-profile proof.

- A pinned dataset can lag newly aired episodes or corrections. Compare
  `EN_MAPPING_MISSING`, the recorded source date and upstream rules before blaming
  the video resolver. A current Ani.pm listing alone does not establish mapping.
- Season-zero specials, ratios, non-contiguous and one-to-many episode mappings
  are unsupported initially. Empty range maps are not numbering proof.
- AIOmetadata must actually return TVDB/TMDB metadata and a uniquely selected row;
  other metadata providers/orders are not automatically inferred from IMDb IDs.
- Ani.zip identity/date data can be missing, stale or unavailable. Conflicting
  known episode IDs are never bypassed by a title/count guess.
- Ani.pm has no established French dubbing in this investigation; French
  subtitles are per episode. Missing FR/EN captions correctly hide original-only
  streams. Hardsub-only packages with unverified burned-in language are not
  returned as a substitute. Track declarations do not certify subtitle accuracy.
- Bootstrap/session/domain/schema changes, media origin restrictions, expired
  grants, challenges and unavailable CDN variants/segments may prevent playback.
  Repair only observed first-party changes; never invent a CDN alias or execute
  remote player scripts. Do not return embed pages as native stream URLs.
- Full catalogue coverage, physical phone/TV playback, all tracks and seeking are
  not established by the finite fixtures or HTTP samples.
