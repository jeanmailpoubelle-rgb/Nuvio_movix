# Sources Host — Android phone and TV

One Android app hosts **Anime-Sama+**, **Sources FR+** and **Sources EN+** as
independent, stream-only Stremio addons. Install their private URLs in Nuvio
**Addons**. Phone plugins remain a separate installation option.

[Download the signed universal 0.3.0 APK](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/releases/download/anime-host-v0.3.0/Sources-Host-0.3.0.apk).
Android 8+, phone and TV, ARM32/ARM64/x86/x86_64. Install **over the existing app**;
do not uninstall or clear data. The historical `local.animesama.host` application
ID, signing certificate, encrypted credentials, SSH key and original addon URL
are preserved. The launcher name is now Sources Host.

## Setup

1. **Metadata**: save both personal AIOmetadata/Xperience manifests and your TMDB
   key once. Complete `https://` and `stremio://` manifest URLs are accepted;
   query/path bytes are retained. GitHub plugin URLs are not metadata manifests.
   Fields stay visible and screenshots are enabled, as requested.
2. **Addons → Add addon**: select Anime-Sama+, Sources FR+ or Sources EN+. Choose
   its display name, saved metadata provider, episode order and access mode.
   Anime-Sama/FR support a TMDB/reference profile without a private manifest.
   EN series require a selected manifest and explicit TVDB Aired/TMDB order.
   For the existing TVDB-anime/IMDb setup, keep automatic verification for
   Anime-Sama/FR and TVDB Aired for EN. EN retains original/French/English audio,
   FR/EN captions and complete multi-audio masters.
3. **Save addon**, then **Start host**. Up to twelve configurations are supported,
   including multiple instances of one family with different metadata presets.
4. **Select an addon → Show / copy installation URL**. Select the appropriate device,
   home-network or HTTPS URL and paste it into Nuvio Addons.

Each addon groups its video hosts. There is no installation per host. FR combines
six maintained entries; EN runs Standard and Beta independently under one banner.
TV accepts inline subtitle tracks with headers. A separate Stremio `subtitles`
resource supports Mobile's addon importer: the opaque filename selector refreshes
only the selected backend, never another server/edition, and never caches signed
caption URLs. Missing/ambiguous selectors return empty without guessing. Some
Mobile versions ignore subtitle request headers; header-protected external captions
may therefore need a client fix. Embedded HLS audio/subtitle groups stay intact.
Explicit HLS/DASH/MP4 types and filename hints are retained for opaque media URLs.

The addon response contains completed entries after discovery, rather than
progressive plugin callbacks. A stalled entry is bounded; other completed results
are retained. Native phone plugins and their stable/+ URLs are unchanged.

**Edit configuration**, **Pause/Resume** and **Delete** affect only that addon.
Editing/pause preserves its token; deleting revokes its URL without deleting
shared credentials. Already running lookups finish with the configuration they
captured. **Stop host** stops all discovery and automatic restart, keeping setup.
Saving settings on a running host updates routing without clearing caches or
reconnecting an unchanged tunnel.

## Shared profiles and network access

- **This device only** accepts local loopback requests.
- **Home network** also accepts home-network clients, but is excluded from HTTPS.
- **Home network + HTTPS gateway** is available locally and through the shared ngrok
  gateway. Configure and enable that connection separately. **This device + HTTPS**
  excludes LAN clients and preserves older remote-only installations.

Synced Nuvio profiles need a URL reachable from every client. `127.0.0.1` means the
client's own device; use the Pixel's LAN address at home or its HTTPS URL remotely.
The host must remain running to discover links. Media plays directly from its
original server to Nuvio: there is no video proxy/transcoding. Some upstream
sessions may be IP/network restricted; successful discovery does not prove
cross-network playback.

A separate loopback listener on8766 serves only HTTPS-enabled configurations to
ngrok; the local/LAN listener is8765. Thus knowing a local-only addon token does
not make it reachable through another addon's tunnel. Installation URLs are bearer
capabilities: keep the entire URL private. No device enrollment or client VPN.

## Connection and background operation

Under **Connection**, create/show the app's public SSH key and register it once at
[ngrok SSH keys](https://dashboard.ngrok.com/ssh-keys). Enter the assigned hostname
without scheme/path and enable the shared connection. Stop any old Termux tunnel
using that domain. Existing installations retain their registered app key/domain.
See [Pixel connection details](../../docs/pixel-integrated-host.md).

Reconnect/Disconnect HTTPS leave local discovery running. Allow background battery
use through Android settings. Foreground service, enabled-only boot/package-update
recovery and bounded network retry are retained; force-stop, first unlock and OEM
power controls still affect availability. No permanent wake lock, idle polling or
next-episode preload. Worker threads expire when idle.

## Engine updates without APK reinstall

**Updates** shows active engine versions, checks for updates and offers rollback.
The APK contains exact generated + bundles as its fallback. The host accepts only
this project's RSA-SHA256 authenticated release metadata with immutable source
URLs, file hashes and a compatible runtime API/minimum app version.

Checks run asynchronously on startup and during use with a persisted six-hour
cooldown, or immediately from the button. Discovery uses the active package while
an update downloads. Every file is bounded, verified and load-tested with actual
QuickJS before atomic activation. Each lookup retains one complete snapshot;
bytecode is generation-scoped. Previous verified engines and the APK fallback
remain available. Rejected/offline/incomplete updates leave working code intact.
Normal empty results, upstream outages or mapping contradictions never cause an
automatic rollback. Manual rollback waits for a newer release before updating again.

Android UI/service/transport/permission changes still need a signed APK. Pushing a
plugin alone updates an installed host only after a compatible authenticated host
release is published. See [engine release procedure](../../docs/host-engine-updates.md),
including the one-time CI signing-secret setup. No private keys are bundled.

## Resource and cache policy

All families share one HTTP pool with six concurrent transfers and narrowly scoped
metadata caches. At most two family lookups and three QuickJS contexts execute
concurrently; each entry retains its own resolver/mapping policy. Queue/deadline
bounds apply globally. Shared private responses are keyed by full URL and headers;
series identities also include type/credential identity. Source grants, signed
playback URLs and captions are fetched fresh on every lookup.

Verified public title identities: six hours,128entries/64KiB. General TMDB title
details: five minutes. Episode inventories and configured metadata:30seconds,
24entries/4MiB. Expiry is lazy; low-memory events clear caches without stopping
service. UI_HIDDEN alone preserves them. Longer completed-series caching remains
[planned](../../docs/limitations.md#host-02--longer-metadata-caching-with-new-release-recovery).

## Build and verification

JDK21 and Android SDK are required:

```sh
npm run check:build
cd android/addon-host
./gradlew :core:test :app:lintRelease :app:assembleRelease
```

CI artifacts are **unsigned**, not user updates. Public releases use the original
prototype certificate; its private key stays outside git/artifacts. On a disposable
Android TV emulator only, run `bash scripts/test_android_tv.sh`. Fixtures replace
local app settings. Core tests exercise real QuickJS/HTTP/SSH, all production
bundles, signature/hash rejection, migration, update/restart/rollback, endpoint
isolation and media preservation. TV tests cover D-pad navigation, keyboard,
selectors, visible credentials, configuration preservation and background hosting.
Physical Pixel/Xiaomi playback, battery use, reboot and remote delivery still need
user/device acceptance.
