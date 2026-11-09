# Sources FR

Two separate Nuvio stream plugins maintained in one repository: **Sources FR**
(French movie/series providers) and **Anime-Sama** (anime hosts). They share video
resolvers and validation. The episode diagnostic is a settings-only tool, not a
stream provider.

## Install or update

Stable and Preview remain separate. Refresh the repository already installed in
Nuvio; changing tracks requires its corresponding installation URL.

| Track | Sources FR | Anime-Sama | Metadata behaviour |
| --- | --- | --- | --- |
| Stable (`main`) | 1.8.17 | 1.2.10 | Native metadata path; no personal AIOmetadata configuration required |
| Preview (`aiometadata-input`) | 1.9.0-beta.7 | 1.3.0-beta.7 | Configured AIOmetadata episode translation for TVDB anime; separate settings per entry |

Copy the appropriate URL below and paste it into Nuvio's plugin repository URL field.

**Sources FR — Stable**

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/manifest.json
```

**Anime-Sama — Stable**

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/plugins/anime-sama/manifest.json
```

**Sources FR — Preview**

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/aiometadata-input/manifest.json
```

**Anime-Sama — Preview**

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/aiometadata-input/plugins/anime-sama/manifest.json
```

**Episode diagnostic — Preview** (1.0.0-beta.6; no playable links)

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/aiometadata-input/plugins/episode-diagnostics/manifest.json
```

For Preview, follow the [phone setup and diagnostic walkthrough](docs/aiometadata.md).
Start with the main API and ANSEmbed entries. A beta badge or a GitHub secret does
not configure the phone. Do not post your personal metadata manifest URL publicly.
TV1.0.0 cannot edit these private settings; see [limitations](docs/limitations.md).

## Dedicated Anime-Sama plugin

Anime-Sama has its own repository manifest and six independent host entries:
ANSEmbed, Smoothpre, VOE, Uqload, Vidmoly and other hosts. It is not another
Sources FR provider. Enable the relevant entries for host coverage; settings are
independent for each entry. See the [Anime-Sama guide](docs/anime-sama.md).

## Matching and fallback

Series IDs and episode identities are different concerns. Preview reads the
explicitly configured AIOmetadata episode and translates verified correspondence
before selecting a backend/source position. Beta7 can recover missing reference
episodes through Nuvio Catalog's linked IMDb route without changing the numbering
policy. Native recovery remains separate.

Continuous episodes, declared source episode ranges and some split-season layouts
are already supported. Unlabelled source seasons with incompatible boundaries
are not universally mapped. The [limitations and work list](docs/limitations.md)
distinguishes that remaining case from working Conan/Hunter layouts and the
repaired Haikyuu reference-data failure.

## Shared host coverage

Sources FR has six active provider entries plus an inert retirement marker needed
by TV1.0.0. Both plugins use the same host resolvers. See the
[provider and resolver inventory](docs/providers.md). Implemented protocols do not
guarantee that every upstream file is currently available.

## Audio, quality and subtitles

Sources FR keeps known resolutions of **720p or higher**, plus unknown resolution.
Anime-Sama has **no minimum resolution**. Unknown quality stays unlabelled.
Results sort by quality descending, then MULTI, VF, VOSTFR and other audio within
that quality. Invisible prefixes retain order across independent entries.

Audio labels prefer actual HLS language evidence; upstream hints are not proof of
multiple playable tracks. Headers, signed URL bytes and original HLS audio/subtitle
groups are preserved. See [playback rules](docs/playback.md) and
[result ordering](docs/source-fr-ordering.md).

## Speed and native runtime

Independent entries let completed providers appear while another host is pending.
Mobile supports concurrent host work; TV1.0.0's HTTP bridge remains synchronous
within an entry. Both runtimes have bounded request/elapsed budgets and cannot
cancel an outstanding native HTTP call. See [runtime limits](docs/playback.md).

## Domains and diagnostics

Edit domains and policies in [config/endpoints.json](config/endpoints.json) and
Anime-Sama settings in [config/anime-sama.json](config/anime-sama.json), then build.
The [configuration guide](config/README.md) owns the field descriptions.
Use the [maintenance workflow](docs/maintenance.md) to distinguish domain,
metadata, source discovery and playback failures. Additions must update their
failure modes, audit coverage and documentation.

## Develop and verify

Edit `src/`, not generated provider bundles. Published manifests and generated
bundles must stay at their installation paths.

```sh
npm run build
npm test
python3 -m venv .venv
.venv/bin/python -m pip install -r tests/requirements.txt
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
.venv/bin/python scripts/quickjs_check.py --all --runtime both
```

Start with [AGENTS.md](AGENTS.md) for repository invariants, the
[documentation index](docs/README.md) for navigation, and the
[maintenance runbook](docs/maintenance.md) for live checks. Current validation is
in [VERIFICATION.md](VERIFICATION.md); older records and dated evidence are
archived separately. Live results describe their recorded time, not today's
availability or physical Android playback.

## License and attribution

[GPL-3.0-only](LICENSE). Retain [third-party notices](THIRD_PARTY_NOTICES.md),
vendored licenses and upstream attribution when sharing or modifying the plugins.
