# Maintenance started 31 October 2026

Baseline: Sources FR **1.8.9**, dedicated Anime-Sama **1.1.5**, commit
`193de3738874f6664e3982413cbe1dcb7f7db205`. Repair: Sources FR **1.8.10** and
Anime-Sama **1.1.6**. The latter contains the shared configuration rebuild;
its independent catalogue, episode mapping and selection behavior are unchanged.

## Confirmed Yablom backup migration

The branded `https://yablom.com/` address page and `https://pirvab.com/`
announce **dokimov.com**. These are migration evidence, not proof of a working
search or player. Direct checks then followed Dokimov's actual entry link
`174e409`, its redirect, and its same-origin POST form at
`https://dokimov.com/174e409/home/dokimov`.
The scoped FMHY parser still selects Pirvab with the production User-Agent;
recovery there depends on following its migration announcement. A bare Python
User-Agent gets 403, which is not a directory-parser regression.

The old configured POST shortcut on Pirvab returns **404**. Existing recovery
still reaches the new catalogue: old search → Pirvab announcement → Dokimov
landing → entry/form → new POST search → exact film page → player → HLS.
Replacing the backup site/search pair avoids the first four requests on that
isolated route. The healthy Xatobam search/form was checked separately and stays
first, so normal lookups gain no preflight or extra request.

The repair changes only `config/endpoints.json:yablom.mirrors[1]`. It preserves
lazy migration/directory recovery, exact title/year/film verification, fresh
player extraction, signed bytes, measured quality/audio and source limits.
Every generated bundle was compared with the baseline: only the version and
this backup pair differ. There is no new resolver algorithm or media cache.

Fresh isolated-backup comparisons use supplied known title/year metadata, so
these counts exclude the unchanged TMDB request. Each sample returns one VF
ShareCloudy stream, with unknown resolution and no separate advertised captions.
All eight bounded media samples pass. Network timings are observations, not a
phone/TV performance guarantee.

| Film / wrapper | Old requests / seconds | New requests / seconds |
| --- | --- | --- |
| Matrix / TV | 8 / 9.27 | 4 / 4.21 |
| Matrix / Mobile | 8 / 11.70 | 4 / 5.98 |
| Hunger Games / TV | 8 / 8.93 | 4 / 4.40 |
| Hunger Games / Mobile | 8 / 11.65 | 4 / 5.99 |

The literal fixture also includes the metadata call and two unavailable-primary
attempts: the old migration takes eleven requests versus seven with the repair.

Both native wrappers exercise a literal retired-search/announcement/relative-entry
fixture. It and the Node regression fail against the actual 1.8.9 bundle because
the old default spends four additional requests. Existing entry-folder, directory,
ambiguity, foreign-origin and fresh-stream regressions remain in the suites.

Repair this boundary next time by following the first-party migration evidence,
then validating the actual entry/form, echoed search, exact film identity and
fresh media. Change the `site` and `search` pair together. If the shortcut cannot
be established, omit it and let entry discovery run. Do not infer the new folder
or brand from the domain name. The executable `yablom-mirrors` audit expands the
configured list automatically; no copied domain in the audit registry is needed.

## Metadata credential coverage

The repository secret `NUVIO_TMDB_API_KEY` works in GitHub Actions. The completed
[25 October keyed audit](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/40146437810)
ran **232/232** jobs: **64 pass, 152 attention, 16 not-tested**, with no
missing-key blocks. In particular, production Yablom and isolated HTML catalogue
searches ran with real TMDB metadata. This closes the former credential gap for
that audit, not every failure or today's upstream state.

A GitHub Actions secret does not become a local Codex runtime secret. The fresh
local audit therefore marks its credential-dependent jobs blocked. A separate
[fresh keyed Actions audit](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/41253413131)
completed the unchanged baseline at **1 November 00:19 UTC**: **232/232**, with
**47 pass, 169 attention, 16 not-tested**, no missing-key blocks, worker failures
or probe timeouts. No key value was retrieved or copied locally.

All ten normal Yablom movie/wrapper checks pass; both directory recoveries pass.
The retired isolated backup recovers but reports its failed upstream request,
matching the migration repaired here. HTML recovery checks return results with
failed/gated sibling candidates. No parser/identity issue is logged. The two
isolated direct-backend numbering assertions remain unverified alongside HTTP
failures; a missing assertion there is not proof of an episode-engine defect.
Do not claim those direct recovery checks passed merely because a key is present.

The complete sanitized JSON/Markdown artifact **13063390988** is available in
Actions until **15 November**. The local cloud tunnel prevents downloading its
bytes. Instead, completed masked job logs were parsed into exact per-job status
and issue rows and matched, in order, to all 232 planned IDs. The parser was also
checked against the earlier downloaded 25 October JSON artifact and reproduces
its counts exactly. Fresh keyed source counts, timings, language/quality and
individual media/caption detail are not reconstructed from those logs. The
committed evidence explicitly retains this detail gap and the artifact identity;
the successful earlier local/rebuilt samples have their actual detailed data.

Focused development checks can supply known title/year metadata to exercise the
downstream protocol. Their evidence explicitly distinguishes that from testing
the real app-injected key and TMDB HTTP step. Only sanitized reports are retained;
private player bodies, signed media paths and caption text are excluded.

## Local cloud-network interruption

The local runner completed its 232 planned jobs with 26 pass, 156 attention,
34 credential-blocked and 16 not-tested observations. Its late phase coincided
with a cloud tunnel failure. At **1 November 00:05 UTC**, independent GitHub,
Nuvio Catalog, Movix API and Frembed controls all return identical 215-byte HTTP
503 bodies, SHA-256
`971f01aae81a63c435e602a1a728c8894b1527150a621d70d735aaca6ff930ea`,
identifying `cloudflare_https_tunnel` / remote Envoy tunnel failure.

Starting at the first controlled-origin 503, **51 non-credential jobs** are
flagged environment-blocked in the evidence; their original runner classifications
are retained. This includes apparent host-not-advertised observations made after
inventory requests failed. They cannot establish actual source absence or a
provider regression. The 34 missing-local-credential jobs are a separate scope.
Earlier successful rebuilt-release checks and the separate GitHub Actions runner
do not depend on this late local network state. Proxy settings and TLS validation
were preserved; no domain was changed to work around the cloud failure.

The maintenance tooling now recognizes this specific 503 body signature during
discovery. It records only the `cloud-tunnel` category and marks the selected
lookup blocked with `environment-transport-failure`. A failed inventory query
therefore cannot masquerade as a verified absent host. Ordinary upstream 503s,
Cloudflare pages, different statuses and unrecognized failures are not relabelled.
Two new regressions fail against the old tools; all 36 maintenance tests pass,
including both bridge runtimes. Two actual focused live checks during the outage
now report the expected environment-blocked state. The earlier full baseline is
retained with its original classifications and external outage annotations.
This tooling change adds no provider requests, embeds no private body, and does
not alter either shipped bundle. Media-only errors still need manual controls.

## Findings that do not justify a domain or resolver change

- Dark Knight's fast API supplies an HLS playlist returning **404**. Ordinary
  premium recovery supplies the same unavailable playlist. The provider excludes
  it; there is no verified replacement URL to substitute. Frembed's independent
  host provider still returns alternatives, with some rejected/gated candidates.
  The direct sheet verifies TMDB 155/movie and its fresh streaming response has
  exactly the same URL. The media still returns 404 without a Referer and with
  the current `.sh` Referer/Origin. Matrix and Chihiro control playlists return
  200 through the same API/CDN family. No alternate playback header was verified
  as a repair.
- Jujutsu S1E20's primary cache still references an unavailable origin. The
  existing fallback executes and returns VOE alternatives. Failed CDN samples,
  filtered lower-quality uploads and missing/pending inventories remain findings;
  they do not authorize a season offset or a guessed media-domain rewrite.
- The configured direct `.id` API and its `.sh` counterpart return matching
  Matrix streaming data from this workspace. Status advertises `.sh`, while
  `.club` redirects to the wiki. A runner-specific 403 in the earlier keyed audit
  does not establish that the configured API is retired. Playback Referer and
  public catalogue address remain distinct settings.
- Nakios and Purestream address parsers still select `nakios.live` and
  `purestream.cc`. Movix directory/API discovery passes on both wrappers.
- A failed advertised host, deleted file, challenge, source below 720p, unreadable
  CDN or catalogue with no matching title is not automatically a parser defect.
  Attention counts include working results with a failed sibling candidate.

## Scope and limits

Reports record source counts, declared audio, measured HLS tiers, selection stops,
bounded media samples and advertised subtitle probes. No separate caption track
was advertised in the focused Matrix/Hunger Games Dokimov samples; captions were
not invented. Anime-Sama keeps all editions/hosts within its own budget, with no
minimum resolution. Sources FR keeps 720p and unknown resolution without a label.

Network failures, gates and budget stops remain explicit coverage gaps. These
checks do not certify uninterrupted playback, every audio rendition, subtitle
content/timing, embedded MP4 captions, or physical Android TV playback.

Rebuilt Jujutsu S2E1, Your Name and Bleach checks have no remaining published
candidates and retain both VF/VOSTFR editions; some later media samples return
403. The original full-baseline Jujutsu S3E1 checks hit the time budget. Do not
describe those S3 samples as complete all-host verification or increase the
budget to hide the coverage gap. One caption-probe failure is an HTTP error on a
fresh master read, not evidence that subtitle dialogue was decoded incorrectly.

See the [maintenance runbook](../maintenance.md), [release verification](../../VERIFICATION.md)
and dated sanitized evidence for the complete results and request comparisons.
