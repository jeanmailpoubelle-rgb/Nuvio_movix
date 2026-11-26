> Distributions: the default maintenance inventory targets **+** artifacts on
> `main`. Use `--track native` for native bundles; private-input cases are excluded.
> See [architecture](architecture.md) and [handoff](handoff.md). Dated results below
> retain the names and branch paths actually tested.

# Maintaining Sources FR, Anime-Sama and Sources EN

The dedicated **Sources EN+** has a separate installed-entry audit:
`scripts/verify_sources_en.py` / **Sources EN private live check** Actions workflow.
Include it when checking this branch's plugins; the FR/Anime-Sama deep matrix
does not run it automatically. Read [its failure map and data update procedure](sources-en.md)
and `config/sources-en-maintenance.json`. Keep its no-minimum/language policies
separate, and never treat a mapping pass as a working media/caption check.

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

Start with the [documentation map](README.md) and [current limitations](limitations.md).
Historical release evidence lives in `tests/evidence/`; executable fixtures stay in
`tests/fixtures/`. Run `npm run check:docs` after editing or moving documentation.

For CPU/request improvements, use the [performance comparisons](performance.md)
and preserve exact playback data and request counts before sampling live hosts.

For Anime-Sama host latency, compare installed-entry completion with individual
request timings: an unknown VOE mirror may resolve inside Other and wait for an
unrelated CDN. Verify redirects and branded player data before adding exact
aliases to `config/endpoints.json`; retain Other as recovery for unknown mirrors.
The [24 November routing investigation](performance.md#anime-sama-host-routing--24-november-2026)
records S3E4 source controls, batch latency and the remaining coverage gaps.
The subsequent [shared host-rule optimization](performance.md#shared-host-recognition--24-november-2026)
has no request/scheduling change. Compare CPU separately from host waits, test the
bounded rule cache and both native/+ distributions, and keep Ani.pm out of this
live sweep. Failed/absent movie hosts are coverage gaps, not speed improvements.

## Android-hosted Anime-Sama prototype

The [Android host](../android/addon-host/README.md) has an independent build and
`Anime-Sama Android host` workflow. Run its real QuickJS/server/transport tests,
Android lint and APK assembly after changes. Copy the checked-in native engine
through its asset task; do not maintain a second mapping/resolver implementation.
Its public live control uses native metadata and prints counts/status only.
Hosted requests need separate IMDb coverage: unlike native plugins they receive
catalogue IDs directly. The manual `configured_check` workflow option tests the
actual Hunter IMDb request with existing private Actions secrets. Signed GitHub
releases and unsigned CI artifacts are different; never publish signing keys.
Phone/TV installation, foreground recovery and playback need device acceptance;
a passing JVM test is not physical TV evidence. It does not include FR or EN.

## Current maintenance scope — 24 November 2026

| Scope | Installed code / tooling | What must stay separate |
| --- | --- | --- |
| Native FR1.8.26 / Anime-Sama1.2.20 | `main`; shared resolvers/source discovery | Native metadata; no private manifest requirement |
| Sources FR+1.9.0-beta.24 / Anime-Sama+1.3.0-beta.25 | Canonical + manifests; `audit.py`, configured-input workflow | Per-backend reference mapping and per-entry settings |
| Sources EN+0.1.0-beta.22 | Own manifest, `sources-en-maintenance.json`, `verify_sources_en.py` | AniBridge mapping, ani.zip veto, independent Standard/Beta playback |
| Settings diagnostics | Episode diagnostic and EN diagnostic manifests/entries | Informational rows, never successful media |

Use dated verification/evidence for the scope actually tested. The24 November
maintenance records the initial deep sweep separately from focused repair checks;
it does not claim all hosts or physical playback pass. Xperience has an explicit + adapter; other metadata addons remain
unverified. A valid-looking manifest alone does not establish episode identity.
Read [Xperience setup and evidence guards](xperience.md) before a migration.

The24 November repairs update Frembed's verified canonical origin, Yablom's
published backup search form, and Anime-Sama's complete alias-detail search bound
from four to eight candidates. See [address validation](../config/README.md),
[source matching](anime-sama.md) and the [maintenance evidence](../tests/evidence/maintenance-2026-11-24.json).
No source resolution floor, identity rule, host budget or playback check is removed.
EN's verifier now prints safe player/media/caption/audio failure counters for
attention cases; its plugin bytes remain unchanged. A single caption timeout
requires a fresh same-case retry, not a change to mapping or signed URLs.

Some deep samples flag expected failed guessed slugs or unavailable optional
editions even when their verified source succeeds. Inspect the request stages and
returned media rather than treating every attention row as a new regression.
Keep raw failure evidence visible; do not hide actual extraction/CDN failures to
make an audit green. GitHub's artifact connector can retrieve sanitized report
archives when the cloud shell cannot reach Actions' temporary blob downloads.

Completed evidence: the initial deep workflow covered552 probes across all12
installed entries on both wrappers (124 pass,292 attention,136 not tested,
primarily unadvertised hosts). This is the pre-repair snapshot, not a claim that
all source availability issues are fixed. Final published native/+ bytes returned
links in16 focused controls;35/36 initial media samples passed and both samples
passed a fresh retry of the one segment403. The four backup-only movie controls
and both ordinary Frembed grant controls passed. Xperience's configured workflow
passed; all15 EN cases passed on the fresh full run after the initial caption
timeout. Node439, Python90, both literal-wrapper suites, build/docs checks and
plugin publication passed. The Android build passed; the installed APK is unchanged.

### EN maintenance checklist

1. Check the actual installed version/entry and saved AIO settings. Standard,
   Beta and diagnostic have independent settings. Verify the selected metadata
   provider/order, not just the IMDb series ID. For Xperience missing-ID failures,
   beta.22 uses one guarded Cinemeta identity read; inspect `EN_INPUT_FALLBACK`
   and the reference HTTP stage. Run Jujutsu S1E1–3/S1E1 Beta plus S2E1 and
   Hunter. Duplicate/batch-date or absent evidence must remain empty.
2. For no links, inspect the settings-only diagnostic. No usable AniBridge map
   returns nothing in ordinary results. Do not add missing-map warning links.
3. Inspect `data/current.json`, the chosen immutable revision and its index/hash.
   The daily workflow is installed on the default branch, runs at05:17UTC and
   publishes data only to Preview after regression gates. Check Actions for actual
   execution; the schedule is not a guarantee. Preserve older snapshots.
4. Missing ani.zip records/network responses are non-vetoing. Only known
   identity/episode/release contradictions stop discovery and may show optional
   warning rows. Never retry an older map to erase a valid missing rule/conflict.
5. Separate mapped-episode availability from Settlar grants/session access, HLS
   master readability, video/audio segments and captions. EN must emit `type:hls`
   for opaque URLs. Do not cache grants or signed playback data.
6. Run EN’s own installed-entry verifier, including Beta preferred audio probes.
   Standard must not wait for or request Beta. MULTI requires actual HLS language
   evidence; single editions show SUB/DUB beside quality. Keep all master tracks.

```sh
# EN offline checks (the broad suite also includes updater/delivery regressions):
npm test
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
.venv/bin/python scripts/quickjs_check.py --all --runtime both
# Public live source control; does not verify a private metadata configuration:
.venv/bin/python scripts/verify_sources_en.py --public-controls --case your-name --case hunter-72-beta
# Full configured live check needs runtime TMDB/AIO secrets:
.venv/bin/python scripts/verify_sources_en.py
```

The last inspected daily-mapping run on21 November completed successfully
(run44919063573, a no-op because the validated rows were unchanged). This records
workflow delivery, not new physical playback or complete host availability.
For data publication/rollback and compiled-baseline releases use the
[EN runbook](sources-en.md#mapping-policy-daily-data-and-warnings).

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

Anime-Sama’s native path uses Nuvio Catalog/Cinemeta/Kitsu without a mandatory
TMDB key. Preview configured translation and official TMDB alias coverage can
require the injected key. It has its own manifest, configuration and references;
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
.venv/bin/python scripts/audit.py --skip-offline --provider movix --provider anime-sama --entry-id movix-tv --entry-id anime-sama --case haikyuu-native-2-15 --case haikyuu-input-2-15 --case haikyuu-input-3-1 --runtime both
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --case jjk-season2-22
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --entry-id anime-sama-voe --case jjk-season2-22
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --entry-id anime-sama --case jjk-season2-22
.venv/bin/python scripts/verify_anime.py --case jjk-s2e22 --case jjk-s2e23 --runtime both --report reports/jjk-late-season.json

# Controlled native processing/request comparison; no real network requests.
.venv/bin/python scripts/benchmark_anime.py --baseline-ref HEAD --episodes 1000 --repeats 7 --output reports/anime-benchmark.json

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
`--provider anime-sama` now expands all six installed host entries, even though
they share one filename. `--entry-id` selects an exact manifest ID; the legacy
`anime-sama` ID is ANSEmbed. Native IDs are passed through to each isolated run.
The integration inventory describes the shared Anime-Sama protocol once and
expands its family when creating jobs. An entry with a successful inventory but
no owned candidates is `not-tested / host-not-advertised`, not an empty-result
failure; failed prerequisites and advertised-but-unplayable candidates remain
failures. Root Sources FR provider selectors retain their existing names.

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

For an Anime-Sama title mismatch, use the owned `ace-diamond` case (2013 series,
S1E1, source season 1 index 0). It covers the verified alternate-name dependency:
Nuvio Catalog identity → Cinemeta names → exact Anime-Sama match. Repair
`catalog-context.js:sourceTitleAliases` / `native.js:resolveSelection` if identity
or name schemas change. Never borrow alternate episode inventories or relax
identity/year/ambiguity guards. Healthy exact matches must skip the extra read.

```sh
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --entry-id anime-sama --case ace-diamond
.venv/bin/python scripts/verify_anime.py --case ace-1 --runtime both --report reports/ace.json
```

The latter exercises all six installed entries. Inspect alias-recovery, source
group/index, partition evidence and media checks separately: a rejected guessed
slug or an absent VF edition may yield expected 404s even when the VOSTFR link
works. Keep these HTTP observations visible. See
[the diagnosis and coverage gaps](investigations/ace-title-aliases.md).

For a translated source title with explicit external correspondence, use
`--provider anime-sama --case aot-anime` (add `--entry-id anime-sama` to isolate
ANSEmbed). The dedicated verifier supports `--case aot-1 --case aot-imdb-1`.
Inspect `.oe-liens` in the actual detail page, canonical TMDB TV/movie or IMDb
links, the metadata identity, and source season/index independently. Repair
`pages.js:detail`, `native.js:sourceIdentity` or `catalog-context.js` if those
schemas change. No ID-to-slug service or MAL/AniList conversion is implemented;
search candidate omissions remain a coverage gap. Do not accept a conflicting
ID just because the title matches. See [the diagnosis](investigations/aot-source-identity.md).

When unrelated origins fail together, check a small number of independent
network controls with the inherited proxy and TLS verification intact. Record
the time and error category; do not interpret a cloud tunnel failure as a domain
rotation. Once controls recover, repeat the affected probes rather than the
entire matrix. The [18 October full check](investigations/full-maintenance-2026-10-18.md)
records an example, verified alias recovery and remaining coverage gaps.

The development HTTP bridge recognizes the observed HTTP 503 response containing
both `upstream connect error` and `envoy://cloudflare_https_tunnel/`. It retains
only `transport: cloud-tunnel`, never the error body, in `http_failures`. The audit
marks that lookup **blocked / environment-transport-failure**, even when a helper
reaches its host-not-advertised branch after failed inventories. Discovery and
media observations remain available; the selected lookup cannot establish
absence, bad mapping or a provider defect. An ordinary upstream 503 or Cloudflare
page is still attention. This detection adds no requests and changes no shipped
plugin. Media-only failures or unrecognized proxy errors still need the
independent controls above; this is not a universal network-outage detector.
Repair locations: `scripts/quickjs_check.py:transport_failure` and
`scripts/audit.py:classify`; regressions cover real bridge handling and the
absence/partial-result classification. See the
[31 October investigation](investigations/maintenance-2026-10-31.md).

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
| Frembed | Independent hosts API and ordinary premium recovery; a retired-origin redirect can retain a stale Referer and yield 403; distinguish that from an empty inventory or shared premium media | `frembed.base`; `src/frembed.js`; [current migration](investigations/maintenance-2026-11-17.md), [Jujutsu S1E1 diagnosis](investigations/frembed-jjk-first-episode.md) |
| Movix public lists | Wiflix/FStream/Coflix separately | `movix.catalogues`; `src/movix-catalogues.js` |
| Extra lists | Custom/Omega/SwiftFlow separately, with verified IMDb mapping where needed | `movix.extra`; `src/movix-extra.js` |
| Missing anime episode / backend numbering | Original query and useful backups first; isolated backend missing-response → identity/unique title/date match → own coordinates; assert mapping separately from fresh media | `episodeMapping`; `src/episode-mapping.js` and backend adapter; [policies/protocol/failure map](episode-mapping.md) |
| Yablom | Each configured site/search pair; entry folders and migration notices; each directory separately. Dokimov/Pirvab now announce Trimav; a readable announcement is not a verified catalogue | `yablom.mirrors`, `.directories`; `src/yablom.js`; [31 October check](investigations/maintenance-2026-10-31.md) |
| Dedicated Anime-Sama | Source identity, canonical episode mapping, all host/edition candidates and media | `config/anime-sama.json`; `src/anime-sama/`; [failure map](anime-sama.md#what-can-break-and-how-to-debug-it) |
| Anime-Sama performance | Compare the generated bundle against a committed baseline with `benchmark_anime.py`, then live movie/episode probes. Script/page parse reuse and TV transport skips must preserve choices and fresh playback data | `src/anime-sama/provider.js`, `pages.js`; [benchmark and limits](anime-sama.md#measuring-speed-without-dropping-links), [1 November evidence](investigations/anime-speed-2026-11-01.md) |
| Anime-Sama mobile scheduling / slow hosts | Check native promise detection and `hostWorkers` (six Mobile/four sync or unknown); exercise held asynchronous requests, retained healthy links, fresh retries, shared limits and `hostBudgetStops`. Live Mobile HTTP must overlap via futures while all QuickJS callbacks stay on the interpreter thread; a serial harness can falsely expire healthy hosts. CPU benchmark HTTP remains deliberately synchronous | `config/anime-sama.json:limits`, `src/anime-sama/transport.js`, `host-context.js`, `provider.js`; `scripts/quickjs_check.py`; controlled Node and six-party HTTP barrier tests; [scheduling evidence and app limitation](investigations/anime-mobile-2026-11-01.md) |
| Independent Anime-Sama dispatch, migration or lost/duplicate links | Run all installed IDs and prefixed TV/Mobile variants; compare the full disjoint union with the unscoped fixture. Hold one entry while others finish. Settings are per entry and metadata reads repeat; all names stay identical for merged quality/audio ordering | `config/anime-sama.json:hostEntries`, dedicated manifest, `host-groups.js`; `scripts/anime_entries.py`; [timeout investigation](investigations/jjk-s2e22-intermittent.md) |
| Anime verification passes a playable subset while hosts remain or an entry fails | Inspect per-entry selection evidence, budgets, HTTP failures, `entry_evidence_complete` and combined `partition_complete`; a playable subset cannot certify the missing entry. Scope/ID mismatches and discovery drift remain gaps | `scripts/anime_entries.py`, `scripts/verify_anime.py`, `scripts/audit.py`; `tests/test_audit.py` |
| Anime-Sama intermittently returns no links after about a minute on Mobile | Compare the failing episode with its neighbour, numeric and IMDb IDs; separate successful cloud mapping from an app-owned native call still pending at the 60-second plugin limit. Do not treat a recovered CDN 503 or a passing lookup as the confirmed device cause | [S2E22 investigation](investigations/jjk-s2e22-intermittent.md); Mobile runtime/native HTTP timeouts; held-host regression in `tests/anime-plugin.test.cjs` |
| Anime metadata disagrees on seasons | Continuous Jujutsu S1E25 versus seasonal S2E1, then S1E48 versus S3E1; explicit IMDb correspondence and safe alternate failure | `src/anime-sama/catalog-context.js`, `episode-mapping.js`; [layout diagnosis](investigations/anime-season-layouts.md) |
| Cinemeta anime artwork/backend disagreement | Verify the explicit IMDb/TMDB correspondence, then reproduce S2E1 with the correct numeric ID versus isolated primary/continuous coordinates; separately read actual thumbnails (manual coverage) | Backend adapters and upstream artwork; [diagnosis](investigations/cinemeta-anime.md) |
| Video hosts | Shared-family sweep against real Movix catalogue candidates; observed/untested coverage | `hosts`, `catalogue.lulu`; `src/resolvers.js`, `src/extractors.js`, `src/seek.js` |
| VOE direct MP4 buffers in Nuvio while HLS plays | `--provider frembed-hosts --case voe-your-name`, existing movie/episode probes, then actual device/player requests. HTTP samples are insufficient; compare ranges, codecs and short bounded decoding. Do not infer bad media from missing quality | `src/resolvers.js:voeSources`, native app playback; [multi-title diagnosis](investigations/voe-direct-mp4.md) |
| HLS, captions, language, quality | Original-master inspection plus media sample and advertised caption probes. Check LANGUAGE codes and full names (french/english), deduplicate aliases, retain unknown tracks. `--provider movix-extra --case spiderverse-labels` and `verify_live.py --case 324857 --provider movix-extra --runtime both`; distinguish metadata-free MP4/media playlists from parser defects | `src/hls.js`, `src/common.js`, `src/selection.js`, `src/media-validation.js` |
| Uqload returns a short promotional clip | `--provider nakios --case flash-uqload`; inspect actual embed final URL and homepage `/static/hero.mp4`; native `uqload-homepage` plus healthy Uqload/Anime-Sama controls. Full catalogue discovery requires the injected TMDB key | `src/resolvers.js:uqloadPromotionalAsset`, `resolveHost`; [diagnosis](investigations/uqload-promotional-clip.md) |
| Sendvid placeholder/binary bridge | Bounded MP4 prefix validation on binary-capable mobile; explicit TV 1.0.0 exclusion | `src/mp4.js`, `src/media-validation.js`, `src/anime-sama/transport.js` |
| Final link order / app label sorting | Merge independent entries with the actual lowercase ordinal app comparator; quality before audio, unknown last, stable ties and no visible numeric codes. All active root names on Preview must be Sources FR+; sourceLabel preserves provider wording. Refresh cached names after migration | `src/stream-order.js`, `src/fr-presentation.js`, root manifest/build; `tests/fr-group-order.test.cjs`; [presentation runbook](source-fr-ordering.md) |
| Anime-Sama labels show sort codes or lose merged order | Installed labels use invisible VS1–VS16 prefixes. Verify raw JSON preservation, clean `display_name`, decoded `sort_priority`, the app's ordinal lowercase comparator and rendering; locale comparison ignores these characters and is not an equivalent test | `src/stream-order.js:sortPrefix`; `quickjs_check.py:visible_label/label_priority`; `tests/anime-host-groups.test.cjs`; [presentation contract](anime-sama.md#result-policy-and-presentation) |

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
   headers. Frembed `.uno` to `.shop` is covered by `frembed-domain` fixtures.
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
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
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

Sanitized evidence: [workflow validation](../tests/evidence/maintenance-workflow-2026-10-17.json).

## Configured input metadata

The Preview-default AIOmetadata adapter and its failure map are documented in
[aiometadata.md](aiometadata.md). Run the private metadata workflow when diagnosing
numbering; a successful host resolver cannot prove episode identity. Runtime
secrets stay outside job/report files. Cases flagged `input_metadata` require the
personal manifest runtime secret and a TMDB key. Missing either is a coverage gap.
Stable native defaults and explicit Preview native controls remain independently testable. Adding a backend requires verified
input and target episode identities plus its own fixture/audit; unknown layout
policies are deliberately skipped in configured mode.


## Phone-preview diagnostic report

See [setup and failure map](aiometadata.md). `config/maintenance.json:diagnostic_tools`
owns the settings-only report dependency chain and `scripts/verify_input_metadata.py`
executes its actual generated bundle. It is deliberately outside media-provider
audits; do not classify diagnostic: rows as streams or call media probes on them.
Run all Python test_*.py tests and the configured-input Actions workflow. What can
break includes the app's empty-type filtering/Test provider UI, unsaved select
defaults, per-entry settings, private manifest routes, ID schemas, date mismatches,
source positions and job timeouts. Never turn a failed diagnostic into a fake
playable URL. Only actual phone results can close the on-device coverage gap.

### Missing TVDB episode identity in configured preview

AOT S4E1–E13 require the shared IMDb-stream/unique-release fallback because
opaque artwork omits TVDB episode IDs and input/target title languages differ.
Inspect `src/input-metadata.js` and run `aot-input` on both wrappers, then the
private metadata workflow (`playback=true`). Its paired native/configured S4E1
cases separate missing inventory from translation failure. Preserve rejection
for duplicate IDs/dates, foreign series, existing conflicting TVDB IDs and
unverified backend layouts. See [the investigation](investigations/aot-preview-season4.md).

The private workflow accepts optional public `cases` keys (for example
`hunter:2:32,aot:4:16`) for focused retries. Unknown keys fail instead of silently
passing an empty selection. Retain the original failed evidence and distinguish
network retries from code repairs. HTTP failure facts include only host/status/
transport; configured metadata remains redacted. Fact/media steps run after a
translation failure so one failed read cannot hide independent coverage.

For a catalogue-versus-translation diagnosis, the private input workflow accepts
`trace_case` using a public case name from `scripts/probe_input_metadata.py`
(for example `ippo`). With `facts_only=true`, it skips the full regression matrix
and compares actual main API/ANSEmbed Mobile entrypoints in native/configured
modes at the first three regular-season starts. Reports retain public IDs,
redacted summaries and media reachability only; no private URL or raw logs. This
is discovery/transport evidence, not decoded-video content confirmation.

Hajime no Ippo has two separately evidenced boundaries: an empty TMDB external
episode association despite a valid TVDB episode ID, and undiscovered source
aliases (Fighting Spirit/Hajime no Ippo). See [the investigation](investigations/ippo-preview.md).
Do not classify missing later-season main links as video unavailability or shift
season numbers; distinguish source discovery from host extraction and403 delivery.

Preview beta5 repairs the Ippo boundaries above: confirmed-empty TVDB finds use
exact external-ID/stream/date corroboration before canonical title/date mapping;
unhelpful source aliases can use official TMDB alternatives with typed TMDB and
IMDb checks. Healthy paths stay unchanged. Missing keys, empty/malformed alias
schemas, ambiguous cards and conflicting episode IDs remain explicit failures.

Owned deep references `ippo-native-2-1` and `ippo-input-2-1` compare main API and
all installed Anime-Sama host entries after the empty-find/official-alias repair.
Both require the TMDB key for complete alias coverage; configured mode also needs
the personal manifest. Retain media403 and absent-host coverage as separate facts.

## Parallel cloud maintenance reports

The health workflow runs offline checks once, then audits each active installed
entry independently with at most three jobs in flight. `scripts/audit_matrix.py`
proves that partitioned plans exactly match the complete selected scope, including
owned integration helpers. Plugin request limits/concurrency are unaffected.
Each shard uploads sanitized reports even when findings make its job fail.
The final `upstream-health` artifact combines them, rejects duplicate/foreign or
mixed/stale snapshots, preserves attention statuses and marks missing results
`not-tested / missing-shard-result`. A green aggregation step does not turn
upstream failures into passes. Regressions cover all profiles/runtimes and missing
partitions. Repair matrix planning/merging and manifest discovery if an entry or
recovery helper disappears; never omit a slow provider to obtain a clean report.

SeekStreaming’s legacy404 can now recover through its verified public mapping
and TurboEmbed encrypted response header. The owned `seek-migration-episode`
reference supplements two movie controls and the shared-host Seek sweep. See
[protocol, repair locations and native fixtures](investigations/seek-migration-2026-11-06.md).
Do not turn an unknown public mapping into a domain alias or suppress real gates.

Generic isolated protocol helpers select native controls unless an integration
explicitly owns a configured-input case. They do not inherit another backend’s
episode expectation from case ordering. Dedicated mapping helpers and production
lookups retain their own expectations. This prevents an Omega/SwiftFlow/backup
helper from being judged against Custom/primary coordinates it never translated.
Older baseline reports can contain that false `episode-mapping-differs` warning;
retain the observation, explain its scope and use owned mapping checks separately.

Movix has a separate title-based anime discovery feed not currently installed as
an integration. Ordinary Purstream/Custom feeds can miss episodes the website
shows through Anime-Sama. See [Apothecary S3 investigation](investigations/movix-anime-feed-2026-11-07.md)
before diagnosing another mapping defect or claiming direct TMDB API support.

## November 2026 Anime-Sama link API and Yablom address

Anime-Sama’s new inline `lien:` IDs need the edition page’s literal token/host
metadata and the same-origin `/api/lien.php` JSON response. Missing an old script
is no longer proof that the source has no episodes. Preserve the selected sparse
slot, partition by published host before resolving and verify the returned host.
Never persist/log tokens, fetch every episode’s URLs or execute player/page JS.
Inspect safe `anime-link-unavailable` reasons and host failures even when another
source plays. Run the owned `witch-inline-6` case on both wrappers/all six entries,
plus `verify_anime.py --case jjk-s2e22 --case your-name --runtime both`. Literal
`anime-inline` regressions independently compare the full installed union.
See [protocol and fragile boundaries](anime-sama.md#inline-player-id-api--november-2026).

Dokimov and Pirvab now explicitly announce Trimav. The verified secondary
search shortcut is configured as a site/search pair in `config/endpoints.json`;
Yablom still validates the POST form and requested movie/year. Recheck the
`yablom-mirrors` isolated integration with Matrix and another movie before
changing it again. The primary Xatobam path is unchanged. Evidence and current
coverage: [14 November maintenance](investigations/maintenance-2026-11-14.md).

Shared audit cases can supply `episode_references` keyed by exact provider ID
or family (for example `anime-sama`) when their expected evidence differs. This
overrides the case’s legacy `episode_reference` for that worker; an explicit
isolated-integration reference still wins. Never judge Anime-Sama source-slot
events against a Sources FR backend-mapping event. The shared-case regression
checks all installed entries and rejects a wrong slot; reclassification of saved
live observations is not a new network test. See the November14 report.

## Frembed migration — 17 November 2026

The configured `.uno` origin redirects to `.shop`, whose API rejects the old
Referer/Origin. Update `frembed.base` to the verified first-party destination,
then test inventory and ordinary premium grants independently with movie and
episode references. An explicit `frembedBaseUrl` setting still overrides config;
update it separately if pinned to the retired domain. No redirect preflight,
request-limit or matching policy change is needed. Movie/episode regressions and
the `frembed-domain` literal fixture now reproduce `.uno` → `.shop`. Recheck
headers as well as HTTP status after the next domain change.

Movix’s official directory currently names `.miami` and its first-party bundle
names `api.movix.miami`. The configured website fallback follows that evidence;
healthy numeric-ID requests keep `api.movix.dog` and their normal request count.
[Current maintenance evidence](investigations/maintenance-2026-11-17.md).

## HTML catalogue mirror migration — 19–20 November 2026

`movix.zip` issues301 redirects to `movix.free`, including `/search/Matrix`.
The third `catalogue.mirrors` origin is updated directly after validating the
production search/title parser, matched movie inventories and Flash S1E1.
Old/new Matrix player inventories are identical. The previous configuration
already followed redirects; this is preventive address maintenance, not a claim
that the resolver was broken. Nakios/Purestream priority and the separate Movix
fast API remain unchanged.

What can break: retired-domain DNS/redirects, search-card fields, title/year/type
matching, episode route slugs, `const videos` payloads, player aliases, media
access and minimum-resolution filtering. Repair domains in `config/endpoints.json`
and parsing in `src/catalogue.js`. The existing generic catalogue/native fixtures
cover the unchanged protocol; audit `catalogue-mirrors` with actual TMDB metadata
and inspect host/filter events even when a title has no qualifying links.
[Current evidence and limitations](investigations/maintenance-2026-11-20.md).

## Xperience metadata investigation probe

The manual/push-triggered `Xperience private metadata probe` workflow reads
`NUVIO_XPERIENCE_MANIFEST_URL` and optionally the AIOmetadata control secret.
It runs `scripts/probe_xperience.py`, checking the actual pure input parser on
Hunter, Apothecary, Haikyuu and Office episode facts in both IMDb/TMDB namespaces.
The mixed-profile verifier adds Hunter and Office boundary controls through the
generated FR bundle on both wrappers. Auto matching must not infer a provider
from IMDb suffixes or use coordinate/date equality alone. Diagnose25-hour
broadcast/reference-midnight differences separately from missing episode identity.
The guarded official TMDB episode/translation proof requires unique regular
episode titles/releases, ignores specials only for those peer checks and keeps
stream IDs globally unique. Never widen the shared24-hour guard.
Its artifacts separate sanitized input facts, generated-bundle translation and
EN Standard/Beta media probes. Inspect each scope; metadata alone is not playback. Do not upload raw metadata, private manifests or image
URLs. Run `test_xperience_probe.py` for redaction, schema and identity guards.
See [investigation status](investigations/xperience-compatibility-2026-11-21.md)
before treating another addon’s manifest as supported input.

## Saved private manifest slots

Check `Manifeste actif` and that addon’s own saved field when one profile works
but another has no links. The selected slot is authoritative; never query the
inactive addon to hide an empty/invalid field. Old single-field settings remain
supported only before dedicated slots are saved. These slots are per entry and
device; no app/profile synchronization is introduced. Repair selection and URL
validation in `src/input-metadata.js:selectedManifestUrl/configuration`, and EN’s
visible presence report/filter in `src/sources-en/native.js`. Node and both
literal runtime fixtures verify switching, no inactive/legacy requests and
private-result redaction. Mapping/playback protocols are unchanged.

## Untouched input-order defaults — Hunter S1E1

The phone report `INPUT_METADATA_PROVIDER_REQUIRED` can originate before any
metadata request when an untouched select is absent from saved settings. Runtime
configuration must apply the same defaults shown in the gear: auto for shared
FR/Anime-Sama input, TVDB Aired for EN. Preserve explicit valid choices and reject
invalid values. `scripts/verify_xperience_defaults.py` deliberately omits order,
query format and legacy URL while supplying both dedicated slots.
It explicitly enables configured metadata because the development harness
otherwise injects native mode into nonempty settings. It exercises actual
installed Hunter S1E1 entrypoints and checks that the inactive
manifest is not requested. Existing offline fixtures cover both literal bridges.
Do not require the user to toggle away/back or repaste a valid active URL.

The native live harness redacts all three manifest storage keys (legacy and both
saved slots). Keep private paths out of HTTP logs even for inactive-slot probes.

## Vinland season-specific missing episode IDs

When native/TMDB works and a configured season fails, inspect sanitized artwork
shape and external episode ID, not only the season number. TVDB uses multiple
episode image path families; `tvdbEpisode` must recognize exact trusted shapes.
Vinland S1 demonstrates `/banners/series/{show}/episodes/{episode}.jpg`, while
S2 uses v4. Keep all three native/probe parser forms synchronized and retain
foreign-origin and batch-release regressions. Compare the private Vinland S1/S2
installed-entry reports with explicit native controls. [Diagnosis and evidence](investigations/vinland-tvdb-artwork-2026-11-21.md).

### Signed Android APK delivery

`anime-host-publish.yml` attaches an already-signed public APK to the prepared
versioned draft release. Manual inputs identify a repository Git blob and its expected
SHA-256. The job verifies both payload hash and the original public certificate
fingerprint before uploading. It never receives the private signing key or user
metadata configuration. The blob is a binary delivery object, not a source-tree
file; keep APKs out of the source branch. Publish the draft only after app checks
and the uploaded asset digest pass. The ordinary Android workflow produces
unsigned verification artifacts and must not be advertised as an app update.

For host cache/idle work, run `CachePolicyTest` with the existing native-engine
integration suite. The configured cold/warm probe reports lookup HTTP counts,
cache hits and fresh source requests; do not substitute cached media to improve
those numbers. Check actual TV idle CPU/PSS using the app's one-shot measurement,
and test memory-pressure recovery and screen-off behavior on the device.

## Pixel supervised remote connector — 26 November2026

The local/LAN Pixel baseline is user-reported working. The separate
[ngrok SSH trial](pixel-remote-trial.md) uses Android-native OpenSSH in Termux
instead of bundling the ngrok Java SDK while its Android issues remain open.
This adds no plugin/engine/APK change. Run `bash -n scripts/pixel/ngrok-tunnel.sh`
and `test_pixel_tunnel.py`, then verify actual authorized Nuvio manifest/stream
requests over a different network without browser cookies or special headers.
Recheck the official SSH host pin and free-plan/interstitial rules. Never infer
remote operation from the local/mock tests, bypass host verification, log addon
paths or replace the existing access token. Accounts, public-key registration and
physical screen-off/reconnect tests remain user-side setup; gate status is in
the [Pixel plan](plans/pixel-remote-addon-host.md#pixel-baseline-update--26-november).

## Integrated Pixel tunnel — Host0.2.0

Follow the [migration/acceptance guide](pixel-integrated-host.md). Repair
`android/addon-host/core/.../RemoteTunnel.kt` for pinned SSH/auth/forwarding and
single-attempt backoff; Android `HostService.kt` for network/boot lifecycle;
`SecretStore.kt` for atomic encrypted identity/settings preservation. Test the
real local SSH server path and strict token enforcement, wrong pins before auth,
stop preserving local access, transient retries versus terminal errors, rapid
reconfigure/late callbacks and stable keys/URLs across settings saves. The
original certificate and higher versionCode are required for upgrade delivery.
Run core tests, lint/assembly and the disposable TV helper. No live credentials
belong in APKs, tests, logs or workflow inputs. Physical ngrok, screen-off/reboot,
idle cost and media portability are separate acceptance gates; keep Termux as a
fallback until the user validates them. Native plugin/source mappings are unchanged.


### Host0.2.1 SSH setup diagnostic

Do not diagnose a domain collision from the old0.2.0 generic endpoint message.
Compare the bounded overlapping forwarding/exec handshake with OpenSSH; retain
both immediate-ack and command-dependent-ack local SSH tests. A terminal report
may include only FORWARD_REQUEST/HTTP_COMMAND and an allowlisted ERR_NGROK code,
never arbitrary server text or request paths. Ask for this safe stage/code when
live ngrok is unavailable; local tests cannot establish its real account error.
Preserve the already enrolled key, domain, token, original certificate and settings.

### Fresh Anime-Sama episodes

For newly published episodes available on the site/native plugin but absent with
configured metadata, compare the selected addon row, TMDB external-ID lookup,
reference inventories and canonical names before changing caches or mapping.
`scripts/probe_anime_fresh_episode.py` and the manual **Anime fresh episode
investigation** workflow use saved private Actions secrets, emitting only public
episode facts, safe error codes and selection coordinates. The current workflow
focuses on Witch S1E7/E8; CLI public IDs/episodes can target a later investigation.
The probe overrides only the entry point to stop after source-slot selection:
no host extraction or successful physical playback is claimed. Compare both
Xperience auto/TVDB and AIOmetadata, plus native numbering. Raw private metadata,
manifest URLs, API keys, upstream bodies and signed player URLs stay out of reports.

### Comparative mapping research

`config/anime-mapping-study.json` is a research inventory, never a production
numbering table. The **Anime mapping route study** workflow executes current pure
Input/EN modules through `scripts/compare_anime_mapping_routes.py` and its Node RPC
worker. It compares live selected metadata/current reference mapping, published
EN ranges/ani.zip vetoes, direct upstream TVDB→TMDB ranges and explicit forward
TVDB→AniList→TMDB composition. No reverse link is inferred. Multiple candidates,
missing rows and unknown corroboration stay explicit; they are not playback
approval. Private URLs/raw metadata remain in memory and reports contain only
public episode fields/codes. Supplement with actual Anime-Sama selection checks
before recommending changes to its source mapper. The paired
`scripts/check_anime_mapping_slots.py` injects candidate reference correspondence
only into a temporary generated-bundle copy, retaining strict TargetContext and
all real source title/group/slot checks on Mobile/TV wrappers. Pass the normal
TMDB key for official alternate-title discovery; keyless alias failures are not
mapping contradictions. Report the injected scope and rejected targets explicitly.
No plugin version bump for this research tooling alone.


## Anime-Sama+ beta26 fallback maintenance

See [runtime/data contracts and regression commands](anime-mapping-fallback.md).
The shared daily job now stages separate Anime-Sama fallback buckets from the
same v3 snapshot as EN, then publishes both only after validation/tests. Keep the
EN schema/policy and old snapshots intact. Use `validate_anime_mappings.cjs`, the
Node proof/candidate tests, the actual generated Mobile/TV regression and the
**Anime bridge fallback live check** workflow. A historical metadata simulation
is explicitly labelled; the user reports live Witch E8 already recovered upstream.
Do not misreport that healthy control as a live failure. New engine bytes require
a signed Host APK update; refreshing a phone plugin does not update an old APK.


## Ani.pm startup latency after links appear

Separate discovery, master, variant/init/segment, audio, native captions and player
initialization. Use the EN source verifier plus
`scripts/benchmark_sources_en_startup.py`; see the
[26 November protocol and limits](investigations/anipm-startup-2026-11-26.md).
Record cold/later samples without assuming CDN cache state. Headless desktop
PLAYBACK_RESTART is not a physical Android displayed-frame time. Preserve raw
signed URLs/headers/masters/captions in memory only, suppress native logs and
retain all master tracks. Fast128KiB samples do not establish complete segment
throughput. Diagnostic MPV options must not become production recommendations
without a repeatable benefit and full track/seek/device checks. A faster Exo
comparison alone does not establish a resolver bug or justify a domain switch.

## Sources Host0.3.0 and authenticated engines

Run the host core suite, lint/release assembly and disposable TV instrumentation
alongside the normal plugin Node/Python suites. Check generated
`hosted-engines/bundled.json` with `npm run check:build`; compare every APK engine
asset with its maintained + bundle. Exercise each family/entry and preserve
independent EN channels, per-backend mapping and exact playback fields.
Check migration of existing addon URL/ID and encrypted credentials/key, per-addon
pause/delete, local-only versus8766 HTTPS ingress, unchanged-tunnel updates and
global transport/context/queue bounds. Also verify authenticated channel signature,
immutable-file hashes, API/minimum-app requirements, bad/partial update rejection,
restart corruption recovery, previous-release rollback and one-snapshot lookups.
See [publishing and CI secret status](host-engine-updates.md). A passing build does
not prove physical Pixel/Xiaomi ngrok, playback, reboot or idle battery acceptance.
