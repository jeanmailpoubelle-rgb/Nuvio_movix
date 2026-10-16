# Nuvio French Providers

Two active providers for **Nuvio Android TV 1.0.0** and Nuvio Mobile. Version
**1.4.0** consolidates the previous three entries into two source families.

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

Refresh your existing repository until both active providers display **1.4.0**.
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

Purstream's healthy path needs **one HTTP request**. Vidzy normally needs
**four** for two languages, or **three** when both language routes select the
same embed. The actual returned version determines its language; a missing
VOSTFR route cannot create a fake VOSTFR result. No availability preflight,
remote configuration lookup or media validation request is added to these paths.
Asynchronous hosts run language paths concurrently; TV 1.0.0's fetch is synchronous.

The direct Purstream API is used after transport/HTTP/schema failures in its
wrapper, provided metadata is available. An explicit HTTP 404 skips that repeated
backend lookup and goes straight to Cpasmal. Empty primary results also go to
Cpasmal. Supported backups include static media, Vidzy and Uqload public player
data, with bounded attempts interleaving VF and VOSTFR.

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
provider; and `tmdbApiKey` for metadata. No custom settings UI is assumed.

## Subtitles and player coverage

Direct API subtitles, HTML `<track>` elements and literal JSON/JWPlayer caption
lists are passed to Nuvio with language and playback headers. Duplicate streams
retain their combined subtitle tracks. HLS audio/subtitle renditions stay in the
original master playlist so the native player can select them. Thumbnail tracks
are excluded. Subtitle extraction adds no HTTP request to source discovery.

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

Source layout:

| File | Responsibility |
| --- | --- |
| `config/endpoints.json` | Domains, directories and request limits |
| `src/common.js` | HTTP, diagnostics, matching and result normalization |
| `src/extractors.js` | Bounded public player parsing and subtitle extraction; no eval |
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

To repeat the six-title live check, supply your own `NUVIO_TMDB_API_KEY` environment
variable to emulate the app's injected key, then run:

```sh
.venv/bin/python scripts/verify_live.py --runtime both --report live-report.json
```

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
