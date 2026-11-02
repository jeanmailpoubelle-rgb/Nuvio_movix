# Uqload promotional video mistaken for an episode — 2026-11-02

The Flash (2014), TMDB 60735, S1E1's catalogue page at
`https://nakios.live/episode/flash/1-1` publishes a Uqload embed. During diagnosis,
that embed redirects to `https://uqload.vc/`, the marketing homepage. Its HTML
video points to `/static/hero.mp4`. Generic video extraction accepted this asset
as the episode. A bounded development-only MP4 header/tail read establishes a
2.667-second duration. This is the host's promotional video, not the episode.

Sources FR 1.8.13 / Anime-Sama 1.2.6 share a narrow repair in `src/resolvers.js`:

- A Uqload homepage containing the known marketing video is unavailable.
- The host's own static hero asset is excluded from player extraction; an explicit
  direct URL on a recognized Uqload host is also rejected.
- Real files named hero.mp4, the same path on an unrelated CDN and otherwise valid
  short media remain eligible. Do not introduce a global duration threshold.

The exclusion happens before selection counts a source, so failed players cannot
satisfy the target and suppress alternatives. The guard uses the fetched page and
URL only: no extra request, video bytes or new binary bridge requirement. IDs,
sorting, quality minimums, headers, signed URL bytes and caption/audio tracks stay
unchanged. This is a host protocol repair, without Flash-specific production IDs.

## Repeat and repair

```sh
node --test tests/host-resolvers.test.cjs tests/anime-plugin.test.cjs
.venv/bin/python scripts/quickjs_check.py --all --runtime both
.venv/bin/python scripts/audit.py --skip-offline --provider nakios --case flash-uqload
.venv/bin/python scripts/verify_live.py --case 60735 --provider nakios --runtime both --report reports/flash.json
.venv/bin/python scripts/verify_anime.py --case jjk-s2e22 --runtime both --report reports/uqload-control.json
```

If it breaks again, inspect the actual catalogue button, its final embed URL,
homepage markup and advertised media paths. A changed promotional asset/path may
need a new sanitized fixture. A new host alias belongs in
`config/endpoints.json:hosts.uqload`. Do not blacklist all Uqload embeds after one
failure. Diagnostics use `host-unavailable` with `promotional-homepage` or
`promotional-asset`; keep HTTP failures distinct. The native `uqload-homepage`
scenario proves rejection plus a healthy alternative on both text/binary bridges.

## Evidence and limits

The isolated actual embed returns one promo before and zero sources after on both
wrappers, with one request in each run. It overrides only the development entry
point to isolate host extraction: metadata/title search was not exercised there.
The normal catalogue path requires Nuvio's TMDB key, unavailable in this workspace;
its audit retains attention/filtered-only after low-quality Vidzy and unavailable
metadata fallback. Do not call this a passing full Flash lookup.

Jujutsu Kaisen S2E22 installed-entry controls retain both Uqload VF/VOSTFR links
on both wrappers and all returned links pass bounded media probes. Other HTTP
findings remain visible. Physical playback was not tested. Raw pages, embed IDs,
partial video bytes and signed URLs stay in ignored private reports.
See [sanitized evidence](../../tests/uqload-promo-1.8.13-2026-11-02.json).
