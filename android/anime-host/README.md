# Anime-Sama Host — Android prototype

An independent stream-only Stremio-compatible addon hosted on Android, initially
for Nuvio Mobile testing and then Nuvio TV 1.1.0. Existing stable and Preview
native plugins stay unchanged. Sources FR and EN are not included.

This is a running lookup server, not the earlier installation-only companion:
keep it enabled while Nuvio searches for links. Already playing video travels
directly from the video host to Nuvio; this app does not proxy or transcode it.

## Phone test

1. Install the signed APK from [GitHub releases](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/releases) and open **Anime-Sama Host** (Android 8 or newer).
2. Paste your configured AIOmetadata and/or Xperience manifest. Select the active
   adapter; inactive configuration is never substituted. Choose **Automatic verification** for episode
   order for the existing TVDB-anime/IMDb setup. Keep editions **All — VF and VOSTFR** for VF/VOSTFR.
3. **Translate using my metadata addon** uses the selected configured addon,
   including Xperience. **TMDB / reference numbering** is the native control
   and needs neither private manifest. This prototype requests IMDb metadata IDs.
4. Enter your own TMDB API key/read token if available. A hosted addon cannot
   inherit Nuvio's injected key. Some verified TVDB translations require that key;
   a missing key must not trigger guessed episode offsets.
5. Press **Save and start / restart**, allow notifications, then **Copy addon URL
   for this device**. Paste it under Nuvio **Addons**, not native plugin repositories.
6. Search an episode and compare it with the existing Anime-Sama plugin. Disable
   the native Anime-Sama entries temporarily when comparing duplicate results.
7. Return to this app to read link count, lookup duration and a sanitized failure
   code. No signed URLs, private manifest addresses or API keys appear in its logs.

The URL is generated locally and contains a random access token. It is not a
public GitHub installation URL. Settings are stored using Android Keystore
AES-GCM encryption and excluded from backups. By user request, manifest/key
fields display their contents and screenshots are allowed.
Changing/saving settings restarts the service. No per-host setup is needed.

The notification has a Stop action. While enabled the service requests restart
following process eviction and startup after reboot. This cannot override Android
force-stop, box-specific autostart policy, deep sleep or revoked permissions.
Battery/autostart exemptions may be needed. No wake lock is held just for idling.

## Shared profiles and network access

Localhost (`127.0.0.1`) always refers to the device running Nuvio. A phone-hosted
localhost URL synced to TV will not reach the phone. For a shared profile enable
**Allow devices on my home network**, save/start and copy the home-network URL.
Reserve the host's LAN address in the router before relying on that URL on TV.

This prototype binds IPv4 only. LAN access is HTTP and bearer-token protected;
keep it on a trusted home network. No remote settings endpoint, port forwarding
or public hosting is provided. Nuvio may sync/log installed addon URLs, so treat
the generated URL as private even though it does not contain metadata credentials.

A hosted addon must be reachable for every new stream lookup. Unlike cached native
plugins, this addon will not fetch links away from home when its host is at home
and unreachable. External access/VPN and device-specific synced-profile behavior
are future work. Same-public-IP resolution helps signed media URLs, but does not
remove per-host session/IP restrictions. Do not cache links across network changes.

## Efficiency and limits

- IMDb catalogue IDs first resolve through TMDB's exact IMDb `/find` route using
  your key; the engine receives the verified series ID. This leaves displayed
  season/episode numbers untouched until the existing metadata adapter maps them.
  TMDB input adds no identity request. Empty/ambiguous/auth-failed identity lookups
  stop with distinct codes. The successful response shares the short metadata cache.
- Reuses the exact checked-in Anime-Sama engine and its existing source identity,
  episode mapping, VF/VOSTFR editions, all-resolution and validation policies.
  Empty scraper scope is deliberate here: one addon aggregates all host families.
- Coroutine-backed QuickJS uses asynchronous OkHttp; six transfers at most across
  two active lookups. One lookup retains the engine's 64-request/45-second budget
  and 20-second cooperative host budget. Native calls have real cancellation,
  7-second connect, 10-second read and 15-second total HTTP limits.
- Requests for the same episode/config share work only while pending. Results are
  not kept afterward. Queueing plus lookup has a 52-second hard deadline; the HTTP
  handler allows 55 seconds. HTTP admission is bounded to four workers/four queued
  connections. Nuvio may impose an earlier timeout; test on the actual versions.
- The connection pool and compiled local engine bytecode are reused. JS state is
  isolated per lookup: 64 MiB memory/1 MiB stack and 5-second initialization limit.
  The 52-second lookup interrupt includes awaited network time, matching the
  overall cancellation deadline; it is not a separate CPU-only clock.
- Only complete successful JSON from tightly scoped metadata routes is cached:
  30-second TTL, 24 entries/4 MiB serialized limit, no disk persistence. Concurrent
  identical metadata reads share work. Missing/failed upstream data is not cached.
- Site HTML, episode pages/tokens, player documents, signed links, HLS playlists,
  captions and video grants are never cached across lookups. This is important for
  episodes released today and for links tied to network/session state.
- HTTP responses are bounded to 1 MiB decompressed. Outbound HTTPS only; public DNS
  destinations only, including redirects. No downloaded player JavaScript is run.
- HLS master bytes, request headers, subtitle tracks and existing display ordering
  are retained. Header delivery uses Stremio `behaviorHints.proxyHeaders.request`.
  The full response completes after the attempted hosts; it is not streamed as
  individual links. Faster total work does not guarantee faster first visible link.

## Build and verify

JDK 21, Node 20+, Android SDK platform 37.0 and build tools selected by AGP 9.5.1.
The app targets Android 15 (API 35); its minimum is API 26. Compile SDK 37 is a
requirement of the current QuickJS Android library, not a device requirement.

From the repository root:

```sh
npm run check:build
cd android/anime-host
./gradlew :core:test :app:lintRelease :app:assembleRelease
# Optional public native control (network dependent; no private configuration):
./gradlew :core:liveCheck -PprobeId=46298 -PprobeSeason=1 -PprobeEpisode=1
```

The CI artifact is `app/build/outputs/apk/release/app-release-unsigned.apk`.
It is an unsigned build for verification/signing, not an installable update.
Install signed **GitHub release APKs**. Releases use the original direct-download
certificate so existing settings survive updates; the private signing key stays
outside the repository. Never upload a signing keystore as an artifact or source.
The prototype certificate has no Play Protect reputation or Play Store approval.

A manual workflow run with `configured_check=true` additionally checks Hunter
S1E1 using its actual hosted IMDb ID and the saved Xperience/TMDB Actions secrets.
It prints sanitized counts/status only and must return links. Normal CI/PR builds
remain independent of private configuration and upstream availability.

Core integration tests use real QuickJS and the exact published engine, synthetic
HTTP, temporary local server sockets, metadata expiry/coalescing and original
stream/header/caption comparisons. Synthetic timings are development evidence,
not a physical Android or Internet speed guarantee. Public live checks report
only counts/status; they do not prove configured TVDB mapping or device playback.

Before declaring TV support, verify installation in Nuvio Mobile, actual playback
and mapping (Hunter S1E1/S2E72, Vinland S1E1, Haikyuu S2E15), fresh releases,
refresh after network switching, notification Stop/restart, screen-off/reboot,
TV directional navigation, account/profile sync and real TV 1.1.0 latency.

## Repair points

- Discovery/mapping/resolvers: existing `src/anime-sama/`, shared `src/` and
  [maintenance guide](../../docs/maintenance.md). Rebuild the native provider
  normally; the Android asset task copies it without editing generated code.
- Transport/cache: `core/.../HttpBridge.kt`, `MetadataCache.kt`. Never widen the
  cache to arbitrary URLs or replay signed media to improve a benchmark.
- Runtime/admission: `Engine.kt`, `AddonServer.kt`. Preserve cancellation and
  bounds. No WebView, embedded Node server or per-host settings replication.
- Lifecycle/configuration: `app/.../HostService.kt`, `SecretStore.kt`, `MainActivity.kt`.
  Stored URLs must never be copied to build resources, public artifacts or logs.
- No links: check service status, selected configuration and failure code; compare
  the same episode using the native plugin on the same network. Mapping success
  and an HTTP 200 playlist do not alone prove playback on the device.

The application and reused provider follow the repository GPL-3.0-only license;
QuickJS-KT is Apache-2.0, OkHttp Apache-2.0, coroutines Apache-2.0 and QuickJS MIT.
Keep upstream notices and full source available when distributing builds.
