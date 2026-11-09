# Repository organization — 9 November 2026

Documentation link validation,337 Node tests,52 Python tests and both native
wrapper suites pass after the cleanup. All62 relocated evidence files retain
their original bytes. Runtime source, manifests, generated bundles and fixtures
are unchanged. Preview code remains on its separate branch; no plugin release
or new live availability claim is implied.

# Stable maintenance backport — 6 November 2026

Sources FR1.8.17 / Anime-Sama1.2.10 backport Seek migration and verified official
source aliases only. Native metadata/episode mapping, existing settings and
plugin names remain stable. No AIOmetadata module, configuration, default or
preview diagnostic plugin is included. 337 Node tests,52 Python tests and both
complete native wrapper suites pass. Shared migration tests cover public204
headers, bound targets, bad frames and subtitle-origin preservation.
[Stable-specific live evidence](tests/evidence/live-stable-backport-2026-11-06.json)
records22 native probes with matching production hashes. All six Anime-Sama
Ippo season-start probes return two reachable editions. Seek recovers movie and
episode samples on the stable bundles; gated/filtered Dark Knight Mobile and
primary upstream404/429 observations remain explicit. CI passes. Preview
metadata/translation is absent; no preview result is treated as stable proof.

[Older records](docs/archive/verification-history.md). Historical results do not guarantee current upstream availability.
