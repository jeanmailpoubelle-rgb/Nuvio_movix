# Debugging and repairing Sources FR and Anime-Sama

Codex Cloud can use this repository without the original conversation or sibling
checkouts. Start with this prompt:

> Check this repository's plugins for broken domains, API endpoints and video resolvers. Follow
> AGENTS.md and docs/maintenance.md. Run the deep audit on TV 1.0.0 and Mobile,
> investigate findings and uncovered resolvers, fix demonstrated problems, preserve
> speed, and run the required checks. Report blocked or untested paths honestly.
> Commit and push verified changes to a branch and open a PR.

For a particular failure, add the title, TMDB ID, season/episode, provider/version,
device/app version, and symptom. Screenshots help but are not required. Codex
must continue with independent checks when that information is unavailable.

## Cloud environment setup

Select this GitHub repository. Use Node **20+** and Python **3.12** (with venv/pip
and build tools if a QuickJS wheel is unavailable). No npm packages are needed.
An environment setup script can run:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r tests/requirements.txt
```

Allow outbound HTTPS to the repository's configured sites/APIs/directories,
`api.themoviedb.org`, dynamically discovered current domains and media hosts.
Domain/CDN rotation makes a static allowlist incomplete: inspect the environment's
network policy before interpreting a network error. Keep inherited proxies and
TLS verification. A blocked cloud connection is not evidence of an app failure.

Add **NUVIO_TMDB_API_KEY** as a runtime environment secret for full coverage. It
emulates Nuvio's injected TMDB key for title matching and IMDb correspondence.
Obtain your own key from TMDB; never put it in the repo or print it. Without it,
the audit still tests numeric-ID providers, but marks Yablom, HTML catalogue
recovery, direct API search and isolated Omega checks blocked. Numeric-ID workers
may also have untested fallback branches. If cloud secrets are available only
during setup, arrange runtime secret injection; do not write a key to a tracked
file. No Bowd account or device token is needed for installed providers.

The dedicated Anime-Sama plugin uses Nuvio Catalog/Cinemeta/Kitsu without a
mandatory TMDB key. It has its own manifest, configuration and anime references;
see [docs/anime-sama.md](anime-sama.md). Its metadata services can still fail or
return incomplete episode inventories. Preserve strict mapping rather than
guessing an episode when metadata is unavailable.

## Commands

Use the venv's Python directly; npm aliases use `python3`, so activate the venv
first if using those aliases.

```sh
# Preview scope without network requests or QuickJS imports.
.venv/bin/python scripts/audit.py --profile deep --list

# Offline regressions plus each plugin's smoke references, both runtimes.
.venv/bin/python scripts/audit.py

# Full production sample set plus isolated integrations and host-family probes.
.venv/bin/python scripts/audit.py --profile deep --runtime both

# Focused recheck after the offline checks have passed.
.venv/bin/python scripts/audit.py --skip-offline --provider movix --case matrix
.venv/bin/python scripts/audit.py --skip-offline --provider movix --case jjk-20
.venv/bin/python scripts/audit.py --skip-offline --case frembed-jjk-first
.venv/bin/python scripts/audit.py --skip-offline --case frembed-jjk-first --integration premium-recovery
.venv/bin/python scripts/audit.py --skip-offline --provider movix-extra --case jjk-custom-seasonal
.venv/bin/python scripts/audit.py --skip-offline --integration custom-episode-mapping --case jjk-custom-seasonal
.venv/bin/python scripts/audit.py --skip-offline --integration episode-primary
.venv/bin/python scripts/audit.py --skip-offline --integration episode-vidzy
.venv/bin/python scripts/audit.py --skip-offline --integration episode-frembed
.venv/bin/python scripts/audit.py --skip-offline --integration episode-swiftflow
.venv/bin/python scripts/audit.py --skip-offline --integration movix-discovery
.venv/bin/python scripts/audit.py --skip-offline --integration shared-hosts --case dark-knight
.venv/bin/python scripts/audit.py --skip-offline --host lulu --case dark-knight
.venv/bin/python scripts/audit.py --skip-offline --host vidmoly --case dragons
.venv/bin/python scripts/audit.py --skip-offline --integration yablom-directories --case hunger-games
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --case jjk
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --case bleach

# Anime movies, combined seasons and long-running saga mapping, all host choices.
.venv/bin/python scripts/verify_anime.py --runtime both --report reports/anime-check.json

# Compare against a previous audit; catalogue changes are observations to inspect.
.venv/bin/python scripts/audit.py --baseline reports/previous-run/report.json
```

Each run creates a fresh ignored `reports/audit-<UTC>/` directory with
**report.md** and **report.json**, checkpointed after each probe. `--output`
selects another fresh directory. Filters (`--provider`, `--case`, `--integration`)
are repeatable. `--host` selects a shared resolver family without rechecking all
families; it is also repeatable. The deep profile covers Sources FR's Matrix,
Office S1E1, Dark Knight, Chihiro, Dragons, Reacher S4E1 and Hunger Games, plus Anime-Sama's
Jujutsu combined-season boundary, One Piece saga, Cowboy Bebop, Your Name and
Bleach S1E1 (VOE alias/title detection).
`config/maintenance.json:manifests` discovers both independently installed plugins;
`provider_cases` and case ownership keep their references separate. Unsupported
media types are excluded; Yablom never receives a series lookup.

Normal lookups use the unchanged generated entry point. Deep integration checks
use a temporary copy of that bundle with an entry point invoking a reviewed
production helper. The copy never replaces a shipped provider. Recovery helpers
use the first selected reference (Matrix by default); repeat a helper with an
episode and a second movie before declaring it repaired. Tests of failure ordering
and budgets remain offline fixtures; a direct helper audit is not evidence that
a real outage occurred.

An integration may restrict its `cases` to an owned reference that actually
exercises its protocol. Custom episode mapping uses `jjk-custom-seasonal` by
default instead of a healthy movie that would skip recovery. Explicit command
case filters still apply; a reference outside that integration's list is excluded.
Explicit integration filters include their owned references even in smoke mode.
Shared episode recovery has isolated helpers for every enabled target, including
direct (key required) and backup. Backend-specific expected coordinates apply to
isolated helpers; normal successful backups need not perform optional remapping.
See [policies, full commands and failure map](episode-mapping.md). A mapping event
does not establish playable media. Pending data cannot exercise a missing-episode
retry; preserve that coverage gap. Attack on Titan and Demon Slayer seasonal cases
check equivalent-layout behaviour. Native policies keep original-path coverage;
their alternate layouts remain unverified live.

Probes run sequentially, each in an isolated subprocess with a **180-second hard
timeout**, with a **one-hour live budget**. Use `--timeout` / `--max-seconds` when
needed. This is a development bound, not a change to production request limits.
Incomplete/timed-out probes remain explicit; they cannot count as passes. The
deep audit can take many minutes. Poll its progress and keep the user informed.
Do not repeatedly run the whole matrix when a focused check answers the question.

Exit **0** means every *selected* probe passed; exit **1** means review is needed,
including blocked credentials, filtered/empty results and coverage gaps within
the selected probes. An unadvertised host gets `not-tested`, not a false pass.
Offline failures stop live work until repaired. Missing dependencies are failures.
A successful smoke run does not establish that all deep integrations work.

The dedicated `verify_anime.py` also requires complete, consistent host-selection
evidence. A playable subset after a request/time-budget stop is a failed
verification, not proof of all-link coverage. Check published/attempted/remaining
counts and retry the affected case before changing production limits.

When unrelated origins fail together, check a small number of independent
network controls with the inherited proxy and TLS verification intact. Record
the time and error category; do not interpret a cloud tunnel failure as a domain
rotation. Once controls recover, repeat the affected probes rather than the
entire matrix. The [18 October full check](investigations/full-maintenance-2026-10-18.md)
records an example, verified alias recovery and remaining coverage gaps.

Reports contain bundle/config hashes, request counts, audio/quality observations,
selection/HTTP diagnostics and media/subtitle probe results. URL strings are
reduced to origins. Raw stdout (which can contain signed paths) stays in local
`*.private.log` files in a directory restricted to the current user. Never upload
those logs or commit the output directory. Only sanitized report.json/report.md
should be shared. JSON stores the full plan, source/config ownership and any
baseline differences; Markdown is the triage entry point.

`npm run audit` and `npm run audit:deep` are aliases. The manual **Upstream health
audit** GitHub Actions workflow provides the same reports as downloadable artifacts;
configure the repository secret `NUVIO_TMDB_API_KEY` for full live coverage. It
does not change code, publish, or run on a schedule. Ordinary PR CI stays offline
and deterministic. Codex Cloud performs the investigation and repairs.

## Adding or changing an integration

Keep documentation and audit coverage current **in the same change** as new or
changed providers, resolvers, backends, recovery routes, settings and tooling.
This also applies when modifying a contribution added by the repository owner.
Read its implementation first and document its actual behaviour and limitations.
Do not copy another provider's claims without verifying that they apply.

Before considering an addition complete:

1. Update README.md with its purpose, supported media, matching method, source
   selection and fallback behaviour. Document configuration fields and defaults
   in config/README.md; put shared domains in config/endpoints.json and dedicated
   Anime-Sama site/metadata settings in config/anime-sama.json.
   Explain credentials or runtime requirements and TV 1.0.0 limitations.
2. Add or update its row in the boundary table below. Describe its dependency
   chain and failure modes using the template below, either here or in a linked
   integration-specific document. Include the source/config repair locations.
3. Update config/maintenance.json and the audit runner when a new helper/protocol
   is needed. Include normal lookup and independently testable recovery paths,
   suitable movie/episode references and required credentials. Host families
   join the shared sweep automatically, but still need protocol fixtures and a
   documented way to obtain fresh real candidates.
4. Add relevant sanitized protocol regressions and native runtime coverage.
   Run affected live checks, record language/subtitle/quality evidence and
   request/time impact, and state which paths remain blocked or untested.
5. Update CHANGELOG.md and, for production changes, VERIFICATION.md and release
   versions as described below. Changes to existing behaviour must replace stale
   documentation. Removals must update inventory, commands and migration notes.

Use this short template for each new integration's maintenance notes:

```text
Integration and purpose:
Dependency chain: discovery -> catalogue/API -> player -> media/captions
Matching: IDs/title/year/type/season/episode checks and ambiguity handling
Configuration: domain/endpoint/host-pattern fields and defaults
Current-address evidence: directory/migration source and candidate validation
Fragile boundaries: domains, routes, methods/bodies, schemas, HTML selectors,
  redirects, player encoding/decoder, headers, grants/session expiry as applicable
Failure symptoms: empty inventory, parse error, wrong identity, challenge,
  HTTP errors, buffering, missing audio/captions or misleading quality/language
Expected non-errors: missing title, pending import, rate limit, unsupported or
  gated player, minimum-resolution filtering; distinguish these from breakage
Repair locations: exact source modules and configuration keys
Reproduction: normal and isolated fallback/resolver commands, fresh candidates
Verification: representative movies/episodes, media and caption checks,
  TV/mobile fixtures, healthy request count/timing and remaining coverage gaps
```

Only include failure modes supported by the implementation; mark uncertain
assumptions. The existing automated test checks provider inventory membership
and referenced files/config keys. It cannot prove that prose is current or all
branches have live coverage: reviewers and Codex must check these explicitly.

## What can break and where to look

The executable inventory is [config/maintenance.json](../config/maintenance.json).
It expands configured lists at runtime, so added mirrors/directories are included
without copying domain names into an audit script. Add an inventory entry when
adding a new provider/backend; the audit tests enforce provider coverage.

| Boundary | Deep check | Likely repair location |
| --- | --- | --- |
| Primary numeric-ID API | Isolated primary, then normal movie/episode samples | `purstream.wrapperApi`, `.wrapperSite`, `.playbackSite`; `src/purstream-provider.js` |
| Cached API media on an unreachable CDN | Jujutsu S1E20 normal recovery versus isolated primary/backup; readable master required even after network errors or HTTP 5xx | `src/hls.js`, `src/selection.js`; [buffering investigation](investigations/jjk20-buffering.md) |
| Backup host API | Isolated backup lookup | `src/purstream-provider.js`, shared resolvers |
| Direct API/title correspondence | Isolated search, identity-checked sheet and stream | `purstream.directApi`, `.status`; `src/purstream-api.js` |
| Movix current-domain recovery | Official directory → first-party bundle → API; known API mirrors separately | `movix.directory`, `.sites`, `.mirrors`; `src/movix-domains.js` |
| Vidzy routes | Both language routes, player extraction and HLS | `catalogue.vidzy`, `hosts.vidzy`; `src/vidzy.js`, `src/extractors.js` |
| HTML catalogue recovery | Each mirror and each directory separately, followed by exact title/episode matching | `catalogue.mirrors`, `.directories`; `src/catalogue.js` |
| Catalogue button uses a new supported-host alias | Inspect the actual button, eligibility and final player redirect; `lulu-alias` fixtures on both runtimes | `catalogue.lulu`, shared host identification; [verified recovery](investigations/full-maintenance-2026-10-18.md) |
| Frembed | Independent hosts API and ordinary premium recovery; a retired-origin redirect can retain a stale Referer and yield 403; distinguish that from an empty inventory or shared premium media | `frembed.base`; `src/frembed.js`; [current migration](investigations/maintenance-2026-10-24.md), [Jujutsu S1E1 diagnosis](investigations/frembed-jjk-first-episode.md) |
| Movix public lists | Wiflix/FStream/Coflix separately | `movix.catalogues`; `src/movix-catalogues.js` |
| Extra lists | Custom/Omega/SwiftFlow separately, with verified IMDb mapping where needed | `movix.extra`; `src/movix-extra.js` |
| Missing anime episode / backend numbering | Original query and useful backups first; isolated backend missing-response → identity/unique title/date match → own coordinates; assert mapping separately from fresh media | `episodeMapping`; `src/episode-mapping.js` and backend adapter; [policies/protocol/failure map](episode-mapping.md) |
| Yablom | Each configured site/search route; each directory separately | `yablom.mirrors`, `.directories`; `src/yablom.js` |
| Dedicated Anime-Sama | Source identity, canonical episode mapping, all host/edition candidates and media | `config/anime-sama.json`; `src/anime-sama/`; [failure map](anime-sama.md#what-can-break-and-how-to-debug-it) |
| Anime verification passes a playable subset while hosts remain | Inspect selection evidence and budget; run dedicated verifier regression and repeat the affected case | `scripts/verify_anime.py:selection_issues`; `tests/test_audit.py` |
| Anime metadata disagrees on seasons | Continuous Jujutsu S1E25 versus seasonal S2E1, then S1E48 versus S3E1; explicit IMDb correspondence and safe alternate failure | `src/anime-sama/catalog-context.js`, `episode-mapping.js`; [layout diagnosis](investigations/anime-season-layouts.md) |
| Cinemeta anime artwork/backend disagreement | Verify the explicit IMDb/TMDB correspondence, then reproduce S2E1 with the correct numeric ID versus isolated primary/continuous coordinates; separately read actual thumbnails (manual coverage) | Backend adapters and upstream artwork; [diagnosis](investigations/cinemeta-anime.md) |
| Video hosts | Shared-family sweep against real Movix catalogue candidates; observed/untested coverage | `hosts`, `catalogue.lulu`; `src/resolvers.js`, `src/extractors.js`, `src/seek.js` |
| HLS, captions, language, quality | Original-master inspection plus media sample and advertised caption probes | `src/hls.js`, `src/common.js`, `src/selection.js`, `src/media-validation.js` |
| Sendvid placeholder/binary bridge | Bounded MP4 prefix validation on binary-capable mobile; explicit TV 1.0.0 exclusion | `src/mp4.js`, `src/media-validation.js`, `src/anime-sama/transport.js` |
| Final link order / app label sorting | Resolution descending, then MULTI/VF/VOSTFR/other at equal resolution; unknown resolution last; padded ranks survive alphabetical titles | `src/common.js:presentStreams`; root `run` and Anime-Sama final delivery; `tests/stream-order.test.cjs` |

A normal lookup can succeed through a fallback while its preferred endpoint is
broken. Inspect `upstream-http-failure`, `endpoint-unavailable`, selection stops
and request-count changes even with playable media. Deep helper checks isolate
those branches; tests must also preserve the real production fallback ordering.
Direct API status recovery, Yablom entry/folder changes, alternate Movix site
fallbacks and challenge/error handling have deterministic offline tests; a healthy
live call will not automatically exercise every conditional recovery branch.
Use a temporary helper/override and another reference when one remains suspect.

Host sweep filters each family's candidates **before selection**, so the usual
three-source target cannot conceal a slower host behind faster alternatives.
It does not guess embed IDs or retain expiring player URLs as test fixtures.
A family absent from this title's Movix inventories stays `not-tested-live`.
ANSEmbed, Smoothpre and Sendvid also have dedicated Anime-Sama live cases; a
Movix-only host sweep does not cover their Anime-Sama request headers or mapping.
Find another current title or use Frembed/HTML inventory to obtain a real
candidate, then invoke `resolveHost` in a temporary verification bundle via
`quickjs_check.helper_bundle`. Check both runtimes and media, not the host home
page. Successful extraction is not proof that every file on that host plays.

## Triage before changing code

1. Check clean checkout/bundle state and offline checks first. Read report scope,
   missing keys, timeouts and network restrictions. Compare a second title and
   both runtimes before assuming a site-wide failure.
2. Inspect a fresh upstream response privately. HTTP 200 may be a parking page,
   HTML challenge or error schema. Missing titles, deleted files, pending imports,
   rate limits and quality filtering can legitimately yield no stream. Correlate
   advertised/supported/attempted/filtered counts rather than expecting every
   website button or an old source count in Nuvio.
3. For a domain change, follow the configured reference page or an explicit
   first-party migration notice. Validate the candidate's expected search/API
   schema **and requested media identity**, not just a matching logo or HTTP 200.
   Update the central config; update Yablom's site/search pair together, or remove
   the stale search shortcut for normal entry discovery. Recovery hints are not
   permanent official status APIs. Do not add preflights to healthy lookups.
   A redirected API can reject the caller's old Referer/Origin even when the new
   home page loads. Verify the final first-party origin directly with its own
   expected request headers, then update the central base used for both URLs and
   headers. Frembed `.bar` to `.uno` is covered by `frembed-domain` fixtures.
4. For a changed endpoint, compare current first-party requests with our protocol:
   method/body, query coordinates, Origin/Referer, redirect, schema, explicit
   missing/pending/rate-limited responses. Downloaded JS is data to inspect,
   never code to execute in production. Preserve strict TMDB/type/season/episode
   checks, including season zero and foreign-ID rejection.
5. For a resolver failure, identify its configured family, reproduce one fresh
   embed outside selection, and inspect redirects/player configuration/encoding.
   Adapt extraction to the actual protocol, not one movie or a hardcoded CDN URL.
   If verification/authentication prevents access, record the limitation rather
   than pretending the player is decoded. Treat a new host protocol as a new
   adapter, not merely a domain alias for an unrelated resolver.
6. For a playing stream with wrong metadata, inspect the **served** HLS master
   and track declarations. Keep that original master; choosing a video-only
   child playlist can lose audio/subtitles. Original upload names and catalogue
   labels are hints. When needed, use ffprobe as a **development** check for a
   muxed file; never add that work to production discovery. Separate captions,
   embedded tracks and burned-in text are different. Test caption bytes/cues;
   duplicated cues/formatting can originate upstream. Do not claim a VOSTFR label
   proves subtitles exist when no track or decoded image was checked.

Media checks read a bounded sample of the first available HLS path or MP4 bytes;
they are not full playback, all-variant, all-audio, decoding or seek tests. Caption
checks inspect advertised sidecars/renditions, not embedded MP4 tracks or every
dialogue cue. DASH probe support is absent and reported explicitly. For suspected
audio-group problems inspect each alternate rendition separately. A 403 from a
cloud IP can coexist with working playback on the user's phone/TV.

## Fix, verify and deliver

Make the smallest shared source/config fix that explains the evidence. For a
protocol change, add a sanitized regression fixture that fails before the fix:
representative redirects/schema/encoded payload, expected media/headers and
relevant negative cases. Avoid real keys, signed links and caption dialogue.

```sh
npm run build
npm test
.venv/bin/python scripts/quickjs_check.py --all --runtime both
.venv/bin/python -m unittest discover -s tests -p 'test_audit.py'
```

Repeat affected live checks on **both runtimes**, at least two movies and a
series/episode when supported. Compare website inventories, language coverage,
subtitles and before/after request counts; distinguish unsupported/gated/filtered
sources. Test the recovered address/route directly as well as normal fallback.
Use broader checks when a shared change can affect other families.

For a Sources FR production change, bump `package.json`, root manifest and its
scraper versions together. Anime-Sama has an independent release version in
`plugins/anime-sama/manifest.json`. Shared production changes require both
affected plugins to be versioned. Build again and verify generated bundles. Update CHANGELOG.md
and VERIFICATION.md with current evidence and limitations. Save only sanitized
relevant evidence; audit-tool/docs-only changes need no plugin release. Commit,
push/open a PR when requested or already authorized, and check GitHub CI. Do not
silently publish a release just because an audit found something suspicious.

Report confirmed breakages, fixes, tests/live samples, request/time impact and
remaining blocked or untested integrations. Always distinguish Python HTTP/runtime
compatibility from actual Android networking, decoding and physical TV playback.

## Deferred integration research

[Afterdark](investigations/afterdark.md) has a TMDB-based NDJSON source API, but
the 23 October 2026 checks encounter browser verification and HTTP 403. It is
not installed and has no production endpoint or executable audit-inventory entry.
Recheck its published directory, public site/settings and a known movie/episode
before revisiting; distinguish verification from domain failure. Do not rotate
mirrors, fabricate proof or execute downloaded challenges to evade the gate.
Only add it after supported access and actual media can be verified on both
runtimes, following the integration checklist above. No playable API latency or
French audio/subtitle availability has been established.

## Historical validation of this workflow

On 17 October 2026, 185 provider regressions, both native runtime fixture suites
and 23 maintenance regressions passed. Eight live samples passed: normal Matrix
and Office lookups, isolated official Movix discovery and an isolated Dark Knight
LuluStream host probe, each on TV and Mobile. The numeric-ID API kept its normal
two-request path. An isolated direct-API run without a metadata key correctly
returned `blocked` and a nonzero status. This validates the runner's selected
paths, not every upstream integration. Production providers remain version 1.8.2.

Sanitized evidence: [workflow validation](../tests/maintenance-workflow-2026-10-17.json).
