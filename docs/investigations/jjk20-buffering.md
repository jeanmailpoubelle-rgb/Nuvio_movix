# Jujutsu Kaisen S1E20: cached streams blocked recovery

Investigated on **17 October 2026**, reported with Sources FR **1.8.4**.

## Confirmed cause

The normal TMDB **95479**, TV **S1E20** wrapper response exposed two Pulse HLS
links, labelled 1080p MULTI and 720p VF. Both used `zebi.xalaflix.design`.
The transport could not retrieve either playlist. Google DNS and Cloudflare DNS
independently returned **NXDOMAIN** for that hostname; this is stronger evidence
than the cloud proxy's connection failure alone.

The wrapper reported catalogue ID **3816**. Its direct API sheet confirmed
TMDB **95479**, type `tv`, title Jujutsu Kaisen. The direct episode route on both
configured `.id` and current `.sh` APIs returned 404; no verified replacement
stream was obtained there. Movix's public server source reads cached stream
responses without expiration and refreshes in the background, explaining how a
working wrapper endpoint can continue returning obsolete media URLs.

Our shared HLS inspector previously removed selected HTTP errors and malformed
playlists, but preserved links after native network errors and HTTP 5xx. Those
unverified results blocked the existing Cpasmal recovery and could also consume
its useful-source target. An isolated backup check found playable VOE media and
an unavailable Netu HLS response (503) that was being retained by the same rule.

## Correction and limits

`src/hls.js` now excludes a source when its required playlist cannot be read.
The existing `src/selection.js` and API provider can then try their next route.
Readable playlists lacking optional audio/resolution metadata remain eligible;
healthy alternatives are not discarded with a failing sibling. Source ordering,
headers, signed bytes and both plugins' resolution policies remain intact.

There is no hardcoded replacement CDN, DNS lookup, new preflight or video probe
in production. The correction changes qualification of the playlist requests
already being made. Fresh lookups retry current data; an explicitly configured
`inspectHls: false` still opts out of these checks. Recovery does not resurrect a
deleted upload or guarantee the old MULTI audio choice exists in its backups.

## Debug this boundary again

The failure chain is wrapper cache → returned media origin → required HLS
playlist → media segments. Check the actual HTTP body and DNS only when relevant;
do not mistake a successful wrapper/API response for playable media, or a cloud
network denial for a confirmed domain deletion.

```sh
# Full normal lookup and existing recovery on both literal app wrappers.
.venv/bin/python scripts/audit.py --skip-offline --provider movix --case jjk-20

# Isolate the stale preferred backend and the independent numeric-ID backup.
.venv/bin/python scripts/audit.py --skip-offline --integration primary-api --case jjk-20
.venv/bin/python scripts/audit.py --skip-offline --integration backup-api --case jjk-20
```

The normal audit can still report `attention` for observed upstream errors even
when returned backup media pass. An isolated primary check can remain empty while
the upstream cache points to a dead domain. Inspect the report's media samples,
selection failures/unavailable counts and exact recovery stage before editing
domains. Use fresh playback links; never commit signed URLs or private bodies.

See [release verification](../../VERIFICATION.md) and the
[sanitized live report](../../tests/live-hls-recovery-1.8.5-2026-10-17.json).
