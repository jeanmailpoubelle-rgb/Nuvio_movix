# Nuvio French Providers

Two active providers for **Nuvio Android TV 1.0.0** and Nuvio Mobile. Version
**1.4.3** inspects HLS audio languages across every source path, including Vidzy
files with opaque names. Subtitle discovery uses the same shared inspection.

| Provider | Fast path | Recovery |
| --- | --- | --- |
| French Catalogue / Vidzy | Explicit VF and VOSTFR TMDB player routes | Nakios Live, Purestream CC and Movix ZIP catalogue interfaces; current-domain directories |
| Purstream API / Cpasmal | One TMDB-to-stream request through api.movix.cash | Direct Purstream API on wrapper failure; supported Cpasmal backup players |

`movix.cash` and `movix.zip` use different protocols. Likewise, the Purstream
API family is different from `purestream.cc`. The three HTML catalogue sites
share an interface and some identical player lists, but **their catalogues can
differ**. Vidzy's TMDB index can also have newer links than those pages.
See [VERIFICATION.md](VERIFICATION.md) for the tested counts and differences.

## Install or update

Refresh your existing repository until both active providers display **1.4.3**.
For a new installation, add:

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/refs/heads/main/manifest.json
```

The plugin name is **Nuvio French Providers**; the GitHub path stays compatible
with existing installations. Disable the All-in-One equivalents while comparing
results, then refresh the episode's stream list to replace cached results.

The old `movix-tv` and `nakios-tv` IDs are preserved, with clearer names. TV
1.0.0 retains entries removed from a manifest, so `purstream-tv` remains as a
**disabled retirement entry**, with no supported media types and an inert
implementation. It performs zero network requests even if an older installation
still calls it. Use **Purstream API / Cpasmal** instead. This is two active
providers plus one migration marker, not three providers doing duplicate work.

## Matching and speed

Nuvio supplies a **numeric TMDB ID**, media type and explicit season/episode.
These providers do not search IMDb. Direct API routes use that ID. Catalogue
recovery uses Nuvio's injected `TMDB_API_KEY`, searches French/original titles,
checks type/year/title or poster, and rejects ambiguous matches. Direct
Purstream recovery additionally verifies the media sheet's `tmdbId` and type.
It never substitutes another episode when the requested episode is unavailable.

Each distinct HLS source gets **one small master-playlist read** with its playback
headers. API lookup normally needs **two requests**; Vidzy needs **six** for two
distinct language versions, or **four** when both routes select the same embed.
Inspection runs even if subtitle files are already supplied. It applies equally
to catalogue recovery and backup players. Metadata is reused only within the
current lookup, so inspection at several stages does not repeat the HTTP request.
No video segments or subtitle bodies are downloaded during discovery.

The playlist's distinct audio languages determine MULTI. Repeated codec groups
and regional language aliases do not create extra languages. A known French-only
audio group corrects a misleading MULTI hint to VF. Single foreign-language audio
is VO, preserving VOSTFR when the upstream source already declares it. Files
without declared audio languages, MP4 sources and inconclusive metadata failures
retain upstream filename/category hints; the logs distinguish these from detected
languages. A missing VOSTFR route selecting the VF embed cannot create a fake
VOSTFR result. No availability or remote-configuration preflight is added.

Maintainers can set `inspectHls: false` on either provider to skip these reads.
That explicitly trades audio-label verification and HLS caption-file discovery
for fewer requests; it retains the older upstream hints.
Asynchronous hosts run language paths concurrently; TV 1.0.0's fetch is synchronous.

The direct Purstream API is used after transport/HTTP/schema failures in its
wrapper, provided metadata is available. An explicit HTTP 404 skips that repeated
backend lookup and goes straight to Cpasmal. Empty primary results also go to
Cpasmal. Supported backups include static media, Vidzy and Uqload public player
data, with bounded attempts interleaving VF and VOSTFR.

When playlist inspection receives **HTTP 404 or 410**, that source is removed
and the normal backup path can run. A second working primary is preserved. If
no backup exists, the provider returns no stream instead of listing the missing
playlist. Transient inspection failures retain the video candidate. This is
checked per lookup; there is no title blacklist or cached unavailable state.

Providers create **no timers**. Nuvio Mobile's coroutine sleep can remain active
after `clearTimeout`, delaying an otherwise completed result. Host HTTP timeouts
remain authoritative. A request/time budget is checked between requests; it
cannot cancel native HTTP already in progress. Signed media URLs are never cached.

## Change domains in one place

Edit **[config/endpoints.json](config/endpoints.json)** and run `npm run build`.
The build validates HTTPS endpoints and compiles them into standalone files.
Nuvio users only need to refresh the repository after the generated files are
published. Editing configuration without rebuilding is rejected by CI.

The catalogue recovery order is:

1. Search the first configured mirror and fetch the strictly matched title or exact episode.
2. If the site fails or serves an unexpected page, consult the labelled catalogue link on `nakios.org`, then the site button on `purstream.org`.
3. Validate a new candidate using the catalogue search/page parser. If directories fail, try the remaining configured mirrors.

Directory links must be HTTPS roots of the expected brand. Advertisements and
the informational `.info` link are ignored. No verified Movix ZIP directory is
configured. A missing title or unsupported player is not a domain failure: it
does not cause every mirror to be scraped. Healthy Vidzy/API lookups never read
these directories. Vidzy itself has no verified domain-discovery directory;
its base is configured separately.

For hosts exposing `SCRAPER_SETTINGS`, optional overrides are `apiBase`,
`siteBase`, `directApiBase`, `purstreamReferer` on the API provider; `vidzyBase`,
`siteBase`, `catalogueMirrors` and boolean `preferCatalogue` on the catalogue
provider; and `inspectHls` / `tmdbApiKey` on both. No custom settings UI is assumed.

## Subtitles and player coverage

Direct API subtitles, HTML `<track>` elements, literal JSON/JWPlayer caption
lists and Vidzy's wrapped `loadTracks` URLs are passed to Nuvio with language
and playback headers. Duplicate streams retain their combined subtitle tracks.
Original HLS audio/subtitle renditions remain intact. Raw caption-file links
in any HLS master are additionally exposed as explicit subtitle files and merged
with existing captions. Thumbnail tracks are excluded. Each master is read once
per lookup; discovery never downloads subtitle bodies. Existing subtitle names,
including **Français**, remain unchanged.

For **Spirited Away / Le Voyage de Chihiro (TMDB 129)**, both source masters
advertise **French and Japanese audio**, so both results are MULTI. Vidzy's file
is named with an opaque ID that contains no language information. The older
filename/category inference therefore kept VF; it had no title-specific rules.
Version 1.4.3 detects these languages from the playlist instead. Neither inspected
source advertises subtitle tracks or separate caption files for this film.
MULTI describes audio languages; selectable subtitles require separate tracks
or an external subtitle addon.

For **The Office S1E1 (TMDB 2316)**, both providers return **MULTI**, French and
English audio, and French/English subtitle files. Vidzy labels the catalogue
entry VF even though its release is MULTI. Its subtitle URLs are loaded by a
small URL-rewrite function that 1.4.0 did not parse. Purstream's caption files
are raw WebVTT URLs in its master, rather than proper subtitle playlists; 1.4.0
relied on native handling instead of exposing those files directly. Both cases
are fixed in 1.4.1. Select English audio and French subtitles separately in Nuvio.

For **The Dark Knight (TMDB 155)**, Vidzy's release uses underscores around
`Multi` and `1080p`; 1.4.2 recognizes these tokens. Its master exposes French and
English audio but no subtitle tracks, and the player advertises no subtitle
files. MULTI describes audio languages; subtitles are separate. Purstream's
current master returns HTTP 404, its direct API supplies the same URL, and
Cpasmal has no backup. That unavailable API entry is now omitted. A subtitle
addon can supply external subtitles when a host provides none.

Some VOSTFR sources have **burned-in French subtitles** rather than selectable
caption files. Reacher's Vidzy VOSTFR was visually checked at several dialogue
points. A VOSTFR label alone does not prove subtitle presence. Live checks also
fetch advertised caption files and validate timestamped cues.

The provider returns supported native media, not every browser player button.
Reacher lists six catalogue buttons: two Vidzy links and four other host links.
The fast Vidzy path resolves the two supported language versions without
visiting every catalogue. Those four player links are not implemented. Both API
backups and catalogue fallback report their actual coverage; no full player-parity
claim is made. Resolution in a source filename is an upstream claim.

## Debug and maintain

Stage logs include provider ID/version, host, HTTP status, elapsed milliseconds,
final source/language/subtitle counts and recovery decisions. Catalogue inventory
logs distinguish advertised, supported and unsupported links. Provider logs omit
full request URLs, query strings, TMDB keys and signed media URLs. Native app
logs can contain them, so review ADB output before sharing:

```sh
adb logcat -d | rg 'movix-tv|nakios-tv|purstream-tv|PluginRuntime'
```

`hls-tracks` records detected audio languages, unknown audio-track count, raw
caption files and native subtitle renditions. `audio-label` records corrections
with `evidence: "hls"`. Empty audio metadata means the displayed category is still
an upstream hint, rather than a confirmed audio-language inventory.

Source layout:

| File | Responsibility |
| --- | --- |
| `config/endpoints.json` | Domains, directories and request limits |
| `src/common.js` | HTTP, diagnostics, matching and result normalization |
| `src/extractors.js` | Bounded public player parsing and subtitle extraction; no eval |
| `src/hls.js` | Shared master metadata, caption-file merging, audio labels and request-local inspection reuse |
| `src/vidzy.js`, `src/catalogue.js` | TMDB language routes and HTML catalogue recovery |
| `src/purstream-provider.js`, `src/purstream-api.js` | Fast wrapper, direct API recovery and Cpasmal backup |
| `src/retired.js` | Inert TV migration entry |
| `providers/` | Generated standalone bundles; legacy filenames preserve upgrades |

```sh
npm run build
npm test
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
.venv/bin/python scripts/quickjs_check.py --all --runtime both
```

CI runs regressions and the literal JS polyfill/call wrappers from NuvioTV tag
**1.0.0** and Nuvio Mobile commit `808272dcec4be02397282600b70a07111576e0c7`.
Offline checks need no network or credentials. Each provider is self-contained,
exports `getStreams`, and uses no DOM, Node imports, browser cookies or timers.

To repeat the live check, supply your own `NUVIO_TMDB_API_KEY` environment
variable to emulate the app's injected key, then run:

```sh
.venv/bin/python scripts/verify_live.py --runtime both --report live-report.json
```

Use `--case 2316` to isolate The Office. That case tests both TMDB provider
paths; the HTML-catalogue inventory comparison is skipped.
Use `--case 155` for The Dark Knight. Its unavailable Purstream stream is
recorded as an availability failure in the live report; zero returned API
streams is the expected safe provider behavior until the upstream source recovers.
Use `--case 129` for Chihiro's French/Japanese MULTI audio without advertised
captions, or `--case 456` for The Simpsons' single-audio Vidzy and captioned API
source. These regressions test both provider paths without HTML inventory reads.

The report compares the three catalogue inventories, records language counts and
discovery time, probes playlists/media samples, and validates advertised subtitle
cues. It excludes signed URLs and credentials. Upstream outages are reported as
failures. **Physical TV playback remains unverified**: Python HTTP and QuickJS
fixtures do not reproduce Android networking, decoding or continuous playback.

## License and attribution

GPL-3.0-or-later; see [LICENSE](LICENSE). Protocols were reviewed against
wooodyhood's providers in [All-in-One-Nuvio](https://github.com/D3adlyRocket/All-in-One-Nuvio).
The implementation parses public player data without executing third-party scripts.
Runtime fixtures retain attribution to [NuvioTV](https://github.com/NuvioMedia/NuvioTV/tree/1.0.0)
and [NuvioMobile](https://github.com/NuvioMedia/NuvioMobile), under their GPL license.
No credentials, cookies or signed media URLs are committed.
