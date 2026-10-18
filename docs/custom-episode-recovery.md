# Movix Custom episode recovery

Sources FR 1.8.6 introduced the verified Jujutsu Kaisen correspondence:
Cinemeta S2E1/S2E2/S3E1 match Custom E25/E26/E48. It uses explicit IMDb/TMDB
identity plus unique episode titles and release times, without fixed offsets.
The user's working stream was **Movix / Custom / SeekStreaming | 1080p**;
unavailable cached Pulse uploads belonged to a separate API family.

Since **1.8.7**, the engine lives in `src/episode-mapping.js`. Configuration moved
from `movix.customEpisodeRecovery` to root `episodeMapping`. Default input is now
`auto`, rejecting ambiguous coordinates; Custom's target stays `nuvio-catalog`.
The native `customEpisodeRecovery: false` opt-out continues to work. Other backends
have independent policies and original queries.

See [current configuration, protocol and failure map](episode-mapping.md).
Custom still tries original coordinates first and only recovers a confirmed
missing regular episode. Healthy isolated discovery remains three requests;
a fresh mapped lookup uses six. Returned rows must match the series and target
episode. Seek/HLS resolution and playback metadata are unchanged.

```sh
.venv/bin/python scripts/audit.py --skip-offline --provider movix-extra --case jjk-custom-seasonal
.venv/bin/python scripts/audit.py --skip-offline --integration custom-episode-mapping
.venv/bin/python scripts/audit.py --skip-offline --provider movix-extra --case jjk-custom-continuous
```

The isolated helper excludes Omega and SwiftFlow and asserts S2E1 → S1E25.
[Historical 1.8.6 evidence](../tests/live-custom-episode-recovery-1.8.6-2026-10-18.json)
includes three episode pairs and two movies on both wrappers. Runtime fixtures
and HTTP samples do not establish physical Android playback.
