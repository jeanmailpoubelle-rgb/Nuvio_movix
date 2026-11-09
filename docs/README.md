# Documentation map

Start with the root [installation overview](../README.md). This branch contains
Preview; stable is maintained separately on `main`. Current limitations and
historical observations have separate homes.

| Need | Read |
| --- | --- |
| Open limitations and next work | [Limitations](limitations.md) |
| Preview phone setup and translation | [AIOmetadata](aiometadata.md) |
| Dedicated anime plugin and host entries | [Anime-Sama](anime-sama.md) |
| Provider and shared resolver inventory | [Providers](providers.md) |
| Domain, quality and budget configuration | [Configuration](../config/README.md) |
| Quality, audio, subtitles and runtime behaviour | [Playback](playback.md) |
| Stream display ordering | [Sources FR ordering](source-fr-ordering.md) |
| Native per-backend episode recovery | [Episode mapping](episode-mapping.md) |
| Measure processing/request improvements | [Performance](performance.md) |
| Debug, repair and verify integrations | [Maintenance](maintenance.md) |
| Development invariants | [AGENTS.md](../AGENTS.md) |
| Latest tested release | [Verification](../VERIFICATION.md) |
| Latest changes | [Changelog](../CHANGELOG.md) |
| Dated diagnoses and deferred research | [Investigation index](investigations/README.md) |
| Older release/implementation records | [Archive](archive/README.md) |
| Sanitized historical measurements | [Evidence](../tests/evidence/README.md) |

## Repository layout

- `src/`: editable production source; shared resolvers and metadata logic.
- `config/`: editable endpoints/policies and development audit inventory.
- `providers/`, `plugins/*/providers/`: generated, published artifacts. Keep their
  paths stable for installed clients; regenerate rather than hand-edit.
- `plugins/`: dedicated Anime-Sama and settings-only diagnostic manifests.
- `scripts/`: build, audit and verification tools.
- `tests/*.test.cjs`, `tests/test_*.py`: executable regressions.
- `tests/fixtures/`, `tests/helpers/`: synthetic inputs, literal runtime bridges
  and test support. These are not dated live reports.
- `tests/evidence/`: sanitized observations from dated live investigations.
- `docs/investigations/`, `docs/archive/`: diagnoses and versioned history.
- `vendor/`: licensed third-party code; retain attribution and licenses.
- `reports/`: ignored local output. Never publish raw responses, signed streams,
  credentials or personal configuration.

After documentation edits run `npm run check:docs`. When adding or changing an
integration, update the appropriate guide, limitations/failure modes and audit
coverage in the same change; follow the [addition checklist](maintenance.md#adding-or-changing-an-integration).
