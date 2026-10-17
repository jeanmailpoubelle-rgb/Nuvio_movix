# Sources FR

Version **1.8.2** supplies six active providers for Nuvio Android TV **1.0.0**
and Nuvio Mobile, using one shared host-resolver registry.

| Provider | Normal lookup | Recovery |
| --- | --- | --- |
| French Catalogue / Vidzy | VF and VOSTFR player routes using the TMDB ID | Strict catalogue matching on Nakios Live, Purestream CC or Movix ZIP; shared host resolvers |
| Purstream API / Cpasmal | Fast TMDB-to-stream API | Verified direct API on wrapper failure; Cpasmal hosts; ordinary Frembed premium grant if no working stream remains |
| Frembed / Hosts | Frembed film/episode API using the TMDB ID | Shared host resolvers for its returned player links |
| Movix / Catalogues | Public Wiflix, FStream and Coflix lists using the TMDB ID | Shared host resolvers; current API discovery through Movix's official directory |
| Movix / Extra | Public custom links, Omega and SwiftFlow availability | Native SeekStreaming and shared host resolvers; gated/unsupported players are diagnosed |
| Yablom / Films | French/original title search, release-year and film-page verification | Xatobam/Pirvab entry discovery, explicit migration notices, branded address page, then FMHY; shared ShareCloudy resolver |

Bowd was tested with an authorized account on 16 October 2026. Its tested
playback requests returned a preroll challenge, and its download route required
premium access. It is not an installed provider; see the
[authenticated feasibility checks](docs/investigations/bowd.md).

Stigstream/VidSrc is also deferred: the tested anime audio could not be verified
through its blocked media hosts, and its current binary decoder transport is
incompatible with TV 1.0.0's text-only network bridge. See the
[anime and TV feasibility findings](docs/investigations/stigstream.md).

## Install or update

Refresh the existing repository until the providers display **1.8.2**. The new
**Yablom / Films** entry is enabled in the manifest; check its switch after refreshing.
For a new installation, add this same stable URL:

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/refs/heads/main/manifest.json
```

Disable equivalent All-in-One providers and the separate Nuvio_frembed repository
while comparing results, to avoid duplicate requests/results. Reopen or refresh
the movie/episode stream list after updating.

Existing `movix-tv` and `nakios-tv` IDs remain unchanged. The new provider uses
`french-frembed-hosts`, avoiding a collision with the separate Frembed repository.
The old `purstream-tv` remains disabled and inert: TV 1.0.0 retains removed entries,
so this migration marker performs no requests even when called. There are six
active providers plus that retirement entry.

Yablom / Films uses the verified Xatobam catalogue first, with Pirvab as a known
mirror. It supplies **movies only**; series requests return immediately without
network traffic. Search uses TMDB's French title, then its original title if
needed, with release-year checking. Poster correspondence can establish an
alternate title, but both the result and film page must match. Ambiguous entries
are rejected. It does not enumerate the catalogue or guess film identifiers.

Frembed's premium path is a recovery route within the API provider. A live Matrix
check returned the exact same media URL through both discovery APIs; exposing
both as normal premium providers would duplicate that result. Its host discovery
runs independently, so slow mirrors do not hold up the existing fast providers.

Movix College and Movix Cash currently serve the same application as the official
site linked by `movix.online`, currently **movix.dog**. Its fast API already
supplies the existing API provider. The additional catalogue worker exposes three
other public lists from that application without repeating its primary API.
The extra worker keeps custom-link, IMDb correspondence and additional host work
independent of both the fast provider and the core catalogue provider.
Movix ZIP belongs to the separate HTML catalogue family; it is not a College mirror.

## Matching and fallback

Nuvio supplies a numeric **TMDB ID**, media type and explicit season/episode.
Omega obtains its IMDb correspondence from TMDB's explicit external ID; it does
not search IMDb titles. No guessed anime episode conversion is performed. Frembed queries
use `id/idType=tmdb` and exact `sa/epi` coordinates. Season zero is preserved.
Movix's core public lists must match the requested TMDB ID and exact episode key;
declared type, season or episode mismatches are rejected. A missing episode never
selects the first episode instead. API links requiring VIP access are not requested.
Custom TV rows must match the requested series ID, season and episode. Omega TV
entries must also declare the matching TMDB ID; the live API has returned a
different show's cached data, which is rejected before host extraction.

Catalogue recovery uses the app-injected `TMDB_API_KEY`, searches French/original
titles, checks type/year/title or poster, and rejects ambiguous matches. Direct
Purstream recovery also verifies the returned sheet's TMDB ID and type. No
provider substitutes another episode when the requested one is unavailable.

The catalogue provider requests both Vidzy language routes and deduplicates an
embed if a missing VOSTFR route selects the VF player. **Zero qualifying Vidzy
streams triggers catalogue recovery.** Metadata inspection and the minimum
resolution policy run before this decision. Empty/filtered catalogue results can
continue through configured mirrors within the same budget. A qualifying source,
including an unknown-resolution source, retains the fast path. A playback failure
after selection does not call the plugin again automatically.

The shared **720p minimum** is applied after metadata inspection, both when
deciding fallback and when collecting host results. A low-resolution source does
not satisfy the result target or prevent recovery. Unknown resolution stays.

An explicit missing-title/episode HTTP 404 skips a repeated direct Purstream
backend query. Empty/filtered primary results try Cpasmal. Confirmed unavailable
HLS masters (401/403/404/410), and non-playlist bodies returned as HTTP 200, are
removed; other working alternatives are preserved. Transport/503 metadata failures
retain upstream hints rather than inventing measured metadata. If no qualifying primary
or backup remains, the ordinary Frembed premium grant/source API is tried. Grant
denials or empty source responses return no fabricated player or browser fallback.

For host lists, identical player URLs are resolved once. A page advertising VF
and VOSTFR for the same URL does not prove two different copies. Declared HLS
audio languages can identify the actual file as MULTI.

Host-list searches aim for **three qualifying alternatives**, not six attempted
players. Failed, unavailable and below-minimum players lead to later candidates.
Direct media and configured preferred hosts are attempted first. VF/MULTI and
VOSTFR candidates get opportunities before one category satisfies the target.
Actual inspected audio determines coverage, so a misleading VOSTFR hint corrected
to French audio does not hide a later genuine VOSTFR candidate. Already-started
batches and multiple outputs from one host can yield more than three results.
Duplicate media URLs do not inflate the target, and duplicate player links merge
their caption metadata. Deduplication is scoped to each provider lookup; separate
providers can still discover overlapping media.

## Shared host coverage

All provider families use **[src/resolvers.js](src/resolvers.js)**:

| Resolver | Protocol handled |
| --- | --- |
| Vidzy | Known public player encoding and literal media data |
| LuluStream / Livavid | Packed JWPlayer sources |
| ShareCloudy | Literal/packed JWPlayer playlists and caption tracks; native media headers |
| Uqload | Literal or packed JWPlayer sources, including multiple media entries |
| VOE | Literal player redirect and F7 JSON data; HLS and optional direct MP4 |
| Dood | Public pass_md5 flow on pages that expose it |
| Vidmoly | Public player paths and JWPlayer data |
| StreamWish | Packed/literal JWPlayer data and host-specific playback headers |
| MixDrop | Public file/embed path conversion and packed wurl data |
| Vidara | Public stream API with baseline codec negotiation |
| SeekStreaming | Public video API, local AES-CBC decoding and native HLS transport |
| Dropload | Public literal/packed JWPlayer data when exposed; challenge-only pages are skipped |

The registry selects hosts by centrally configured domains or a Frembed-provided
host label for rotating mirrors. Automatic redirects reuse their final body;
redirects that already return an HLS master seed metadata inspection without
another GET. Known literal player data is parsed; downloaded scripts are never
executed. No DOM, WebView, cookie fabrication or challenge solver is used.

Host failures are isolated. A host family being implemented does not establish
that every current player works. For example, The Storm's Dood page currently
requires an interactive CAPTCHA and returns no stream. See
[VERIFICATION.md](VERIFICATION.md) for live results and exact coverage.

SwiftFlow's current iframe host is unsupported. Its SwiftFlux direct-file path
requires a browser verification token; availability is logged, with no request to
the gated resolver and no fabricated native stream. SeekStreaming uses local
MIT-licensed aes-js, requires neither WebCrypto nor an external decrypting service,
and prefers its declared `cfNative` transport over duplicate IP transport URLs.

## Audio, quality and subtitles

All six providers discard known quality tiers below **720p** and keep unknown
resolution. The one setting is `streams.minimumResolution` in
[config/endpoints.json](config/endpoints.json); `0` disables filtering. No wheel
settings are required, so the same repository policy runs on phone and TV.

Each distinct HLS source is inspected once per lookup using its playback headers.
Declared distinct audio languages determine MULTI; repeated codec groups and
regional aliases do not inflate the count. Known French-only audio corrects a
misleading MULTI hint to VF. Single foreign audio is VO, preserving upstream
VOSTFR where supplied. Missing/unknown HLS audio metadata and MP4/DASH sources
retain upstream language hints; those hints are not a measured track inventory.

An embed player's upload title cannot establish **MULTI**: hosts can retain
the original filename after transcoding to one audio track. The shared resolver
keeps the catalogue/API language hint instead; actual HLS audio languages can
still establish MULTI or correct that hint. An unlabelled source stays without
a language when MULTI appears only in its upload title. Direct API language
metadata remains a separate upstream hint. No media probes are added to lookup.
For The Dark Knight, the reported Wiflix/Lulu stream has one AAC audio track;
its retained upload title says `Multi (VFF+VFQ)`, referring to French dub variants.
The plugin preserves the original master and cannot restore tracks absent from
the host's supplied stream.

Yablom defaults to **VF** for unlabelled films, following the requested site
language assumption. `yablom.defaultLanguage` controls this hint; an empty string
disables it. Explicit VOSTFR badges and measured HLS audio take precedence.
Copied MULTI upload titles cannot establish a track inventory. This default
does not assert that a file has only French audio.
ShareCloudy's tested media playlists do not declare dimensions, so their results
keep no resolution label. Inspecting video data would require extra work beyond
the current fast playlist-only lookup.

The same master read determines the highest advertised video tier. Cropped
cinema uses familiar width-based tiers: 1920×800 is labelled 1080p and 864×360
480p. Exact dimensions are logged. Iframe-only variants are excluded. Original
adaptive masters and all their audio/subtitle renditions remain intact; playback
can select a lower rendition. Missing resolution metadata retains the upstream
quality hint.

If no numeric resolution is available, the plugin omits the resolution from its
name and does not send a quality field: for example, **Frembed / Voe | VF**.
The former generic HD default was misleading for unmeasured direct MP4 sources,
including VOE. Discovery does not download MP4 files to measure their resolution. A VOE
MP4 can be a different encode from its HLS alternative, so it does not inherit
the HLS resolution. Nuvio's playback information shows the decoded dimensions.
TV 1.0.0's native stream mapper appends its own localized Unknown when quality
is absent. That app-added text cannot be suppressed by omitting plugin metadata.

Real API/HTML/JWPlayer subtitles and raw caption-file URLs in HLS masters are
passed to Nuvio with language and playback headers. Proper segmented subtitle
playlists remain native HLS tracks. Wrapped Vidzy loadTracks URLs are handled;
thumbnail tracks and the JWPlayer Upload captions menu placeholder are excluded.
Duplicate streams merge their caption files. Labels such as **Français** remain
unchanged, without provider prefixes. Discovery never downloads caption bodies
or video segments to make labels.

Integrated subtitles are not rewritten. Jujutsu Kaisen 0's original French file
contains 264 duplicate timed cues, including the reported line at 12:28.289; that
is an upstream content defect. Some VOSTFR copies instead have burned-in French
subtitles and provide no selectable caption file. MULTI describes audio languages,
not subtitle availability. File accessibility/timed-cue validation does not
certify subtitle content or synchronization.

## Speed and native runtime

Healthy API discovery remains **two requests** including its HLS master. Vidzy
normally uses **four** for one shared embed or **six** for two distinct embeds.
Yablom normally uses **five**: TMDB metadata, one POST title search, the selected
film page, its player and the HLS playlist. A second title query is needed only
when the French title has no match. There is no landing-page or directory preflight.
Its own worker leaves existing fast API workers independent.
Frembed host discovery adds one source-list request plus bounded extraction and
metadata reads. Movix catalogue discovery makes three useful public-list requests,
then resolves candidates toward the result target. The extra worker queries the
public custom/SwiftFlow lists and, when a TMDB key is available, obtains IMDb
correspondence and queries Omega. Premium recovery needs a fresh ordinary grant, one source API
request and, for HLS, one master read. No availability/configuration preflight is
added to healthy paths. Premium playback uses a browser User-Agent without
inventing a site Referer/Origin; exact signed URL bytes are retained.

Host attempts run in batches of at most **three** on asynchronous transports.
The target is shared across each provider's lists and language groups. Searches
stop on the target with language coverage, exhausted candidates, or the budget.
A **24-request/45-second** elapsed
budget is checked between requests. **No timers are created**: Nuvio Mobile can
keep coroutine-backed sleeps alive after clearTimeout. Native HTTP timeouts remain
authoritative; the plugin cannot cancel an in-progress native call.

TV 1.0.0's fetch bridge is synchronous, so host HTTP calls inside one scraper
serialize. Separate provider workers keep catalogue/host extraction independent from fast
API/Vidzy results. Media URLs, premium grants and subtitle URLs are never cached
across lookups. Request-local extraction/metadata reuse avoids duplicate work.
TV 1.0.0 streams individual scraper completions into its result list, so the fast
worker can appear while the longer catalogue searches continue. See its
[streaming collector](https://github.com/NuvioMedia/NuvioTV/blob/1.0.0/app/src/main/java/com/nuvio/tv/data/repository/StreamRepositoryImpl.kt#L430).

## Domains and diagnostics

Edit **[config/endpoints.json](config/endpoints.json)**, run `npm run build`, and
publish the rebuilt providers. It contains Vidzy/Lulu origins, catalogue mirrors
and directories, API origins, `frembed.base`, host-family domain patterns and
request limits. Host patterns are explicit domains or domain stems ending in `.*`.
The build validates HTTPS endpoints and rejects stale generated bundles in CI.
The [configuration guide](config/README.md) maps every domain field and explains
how to publish changes. Vidzy player-domain recognition also uses this config.

Catalogue directories are lazy recovery: after a site failure, inspect the
labelled catalogue link on `nakios.org`, then the site button on `purstream.org`,
then remaining configured mirrors. Candidate content must pass normal parsing.
A valid site with no qualifying result can try remaining configured mirrors;
directories are consulted on endpoint/parser failures. Vidzy has
no verified directory; Frembed's configured origin is not polled for domain hints
on each lookup. Domain changes belong in configuration, not title-specific rules.

Movix uses the configured current API first, then its known API mirror on endpoint
failure. Only after those fail does it consult `movix.online`, fetch the linked
site and parse its first-party application bundle for the API origin. Downloaded
JavaScript is never executed. Known sites provide recovery when the directory is
unavailable. Only a successful endpoint's origin is cached for ten minutes;
media URLs and grants are always fresh. Missing titles, JSON upstream failures,
pending responses and rate limits do not fan out across domain aliases. Pending
retrievals are logged for a later stream-list refresh, without background polling.
The direct API also has a separately configured status URL for domain recovery.

Yablom's optional configured `search` URLs are fast-path shortcuts. On endpoint
failure, it reads the site's entry link and POST search form to rediscover a
changed internal folder. Explicit new-address notices can lead to another site.
Known mirrors follow; only after those fail are `yablom.com` and the French
section of FMHY consulted. Candidates must expose the expected search form and
echo the actual query before use. A valid missing title, ambiguous match,
unsupported player or filtered stream does not trigger directory/mirror fanout.
The verified search address is cached for 30 minutes when the app reuses the JS
context; film pages and signed media are always fetched anew.

No permanent official domain-status API was found. `yablom.com` is a branded
address page, currently still linking Pirvab; FMHY is an independent directory
with the same link. Both are recovery hints, not guarantees of future migrations.
Xatobam's catalogue was verified separately. Edit `yablom.mirrors` in the central
configuration when a migration is known; update both `site` and `search`, or omit
`search` to let entry discovery obtain the new route.

Optional host-supplied `SCRAPER_SETTINGS` overrides include existing API/catalogue
settings, `frembedBaseUrl`, `frembedRecovery: false` to disable the last recovery
route, `movixFailover: false` to disable Movix/direct-API domain discovery, and
`inspectHls: false` to skip audio/quality/caption-file inspection. An explicit
`apiBase` override disables automatic Movix domain roaming. No
custom settings UI is assumed on TV 1.0.0.

Logs include provider ID/version, stage, HTTP host/status/time, host family/result,
challenge-required status, catalogue advertised/supported/distinct counts, audio
languages, exact resolutions and final result counts.
`audio-hint` records ignored MULTI upload-title hints without logging filenames
or signed URLs. `audio-label` reports labels established by HLS audio metadata.
Filtered-source counts and quality tiers are logged as `resolution-filter`.
`selection` records incoming candidates, invalid/unsupported/duplicate entries,
attempted players, failed attempts, resolved/unavailable/filtered media, duplicate
media outputs, returned languages, remaining candidates, request use and the stop
reason. The selector's `advertised` count describes its incoming queue; use
`movix-catalogue`, `extra-inventory` or `catalogue-inventory` for the website/API's
full advertised and unsupported inventories. `yablom-search` records candidate
and match counts; `yablom-inventory` records advertised and supported players.
`source-unavailable` explains gated
sources; `source-rejected` identifies mismatched Omega TV data.
Provider diagnostics omit query strings, grants, keys and signed media URLs.
The native app may log URLs:

```sh
adb logcat -d | rg 'movix-tv|nakios-tv|french-frembed-hosts|french-movix-catalogues|french-movix-extra|french-yablom|PluginRuntime'
```

## Develop and verify

Source files are bundled into standalone files; edit `src/`, not `providers/`.
No Node imports or npm runtime dependencies are shipped to Nuvio.

```sh
npm run build
npm test
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
.venv/bin/python scripts/quickjs_check.py --all --runtime both
```

CI uses literal JavaScript runtime fixtures from NuvioTV tag **1.0.0** and Nuvio
Mobile commit `808272dcec4be02397282600b70a07111576e0c7`, including POST bodies,
redirects, source headers, serialization and zero pending native timer jobs.

For live checks, supply your own `NUVIO_TMDB_API_KEY` to emulate app injection for
catalogue matching. Normal direct APIs need no metadata key:

```sh
.venv/bin/python scripts/verify_live.py --runtime both --report live-report.json
.venv/bin/python scripts/verify_live.py --case 1623256 --case 2316 --report live-report.json
.venv/bin/python scripts/verify_live.py --provider movix --provider movix-catalogues --case 603 --case 108978 --report live-report.json
.venv/bin/python scripts/verify_live.py --provider movix-extra --case 108978 --season 4 --episode 1 --report extra-report.json
.venv/bin/python scripts/verify_movix_discovery.py --report directory-report.json
.venv/bin/python scripts/verify_shared_resolvers.py --report shared-report.json
```

The directory command directly exercises the production official-directory,
first-party bundle discovery and primary API helpers through both runtime fixtures.
The last command directly exercises the shared premium recovery helper in a
**temporary verification bundle**, plus the actual catalogue-mode provider.
This tests recovery without making working API routes artificially fail. Normal
recovery ordering is separately covered by regression tests. Reports contain
hashes and sanitized counts, not signed URLs or caption dialogue.

QuickJS and Python HTTP are development stand-ins. **Physical TV playback remains
unverified**: Android networking, hardware decoding, selection UI and continuous
playback need a device test. HLS/MP4 samples are probed; DASH is accepted from
explicit source metadata but its live media probe is not implemented.

## License and attribution

**GPL-3.0-only**, selecting GPL version 3 for earlier GPL-3.0-or-later components.
See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
Frembed provider/host protocols were adapted from
[Nuvio_frembed](https://github.com/jeanmailpoubelle-rgb/Nuvio_frembed) at `ace5453`
and its documented CloudStream references. Original authors retain their rights.
The original repository was reviewed without modification.
