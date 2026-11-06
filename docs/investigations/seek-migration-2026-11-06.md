# SeekStreaming migration — 6 November 2026

The broad beta5 audit found repeated404s at `/api/v1/video` for fresh Movix
Custom links. This was a resolver protocol change, not proof of deleted files.
First-party player HTML now calls `/api/public/resolve?file1=<old-file>` and
redirects to TurboEmbed. Two movies (TMDB603/155) and a series (95479 S1E20)
confirmed the same schema and readable replacement playlists before changes.

## Recovery (preview beta6; stable Sources FR1.8.17 / Anime-Sama1.2.10)

Keep the healthy legacy AES path unchanged. Only legacy HTTP404/410 invokes the
new route; transport errors, auth errors and malformed successful legacy data
retain rejection. Require `ok:true`, `host1:seek`, exact original `file1`,
`host2:turbovio`, exact target-slug `file2` and a typed HTTPS URL on the configured
`seek.redirectHosts` allowlist. Unknown hosts, foreign IDs and malformed URLs
must not trigger arbitrary followups.

Read the target’s `/api/stream?s=<slug>` metadata, then the public encrypted
stream response at `/api/stream/tracking?c=<encrypted-slug>`. The player’s
published AES-CBC framing is independently implemented with existing MIT aes-js;
its generated key prefix fills32 hex characters before the appended date, so
that date does not change the effective key. The IV uses published salt and
hostname bytes. Read the bounded `x-tracking` response header even on204 with an
empty body; reject malformed frames/padding/JSON. Return the first valid stream
in the website’s tiktok/hls/direct transport preference, retaining its master,
Turbo Referer/Origin and advertised subtitle metadata. Do not return duplicate
parallel transports of the same file. Normal HLS validation still applies.

No downloaded player code is executed, and no DOM, WebCrypto, native timers or
binary bridge is needed. No ads, analytics beacons, thumbnails or player UI code
are fetched/executed. No grants/streams are cached across invocations. The normal
legacy path adds zero requests; a migrated link needs three additional protocol
reads after its old-route404 (resolve, metadata, encrypted header), plus the usual
HLS read. Some old origins may still return404 at the new route.

## Maintenance

Source: `src/seek.js`; editable target origins: `config/endpoints.json:seek.redirectHosts`.
Fragile boundaries: resolve route/echo/host names, allowed target origin and slug,
metadata schema, encrypted-header visibility, framing constants, response keys,
HLS delivery and subtitle schema. Inspect current first-party HTML/JS as data;
do not guess domains, execute downloaded code or weaken identity checks.

Tests: `selection.test.cjs` checks successful migration, exact encryption token,
file/host/slug mismatch, missing/corrupt header, bad decrypted schema and server
errors. `seek-modern` plus `test_preview_phone.py` executes the real compiled
helper on both literal bridges, including204 headers, final master/headers and
no native sleeps. Fixtures contain synthetic URLs/ciphertext only.

Live reproduction: `audit.py --skip-offline --provider movix-extra --case matrix
--case dark-knight --case seek-migration-episode --runtime both`. The shared-host
seek sweep also uses fresh advertised inputs. Metadata-free Omega coverage still
requires a TMDB key separately; its absence must not invalidate a recovered
Custom/Seek stream. Fresh media reachability is not physical playback/content
confirmation. See the dated maintenance report for results and remaining hosts.
