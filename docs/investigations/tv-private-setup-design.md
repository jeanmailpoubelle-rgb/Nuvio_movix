# Private TV plugin setup — design for review

Reviewed 21 November 2026. User device: Nuvio TV **1.1.0**. The user requested a
design review before building. **No companion app, APK or private-code generator
has been implemented by this investigation.** Existing public plugins/settings
and stable remain unchanged.

## Goal

Run the current configured Preview plugins on TV with the user’s AIOmetadata and
Xperience manifests. Keep TVDB anime/IMDb IDs, TMDB regular-series setup, source
mapping, quality/audio layout and both saved-manifest choices. Leave Nuvio itself
unchanged. A companion app supplies configuration through a private downloaded
copy because the inspected TV UI has no native-JS settings editor.

## Verified Nuvio TV 1.1.0 contract

Pinned release commit: `12d96bced9821bdf4bc233039ffb1ccd1795e55b`.
The observations below concern its full build with native JavaScript plugins,
not an on-device test or a promise about Play Store variants.

- [Plugin settings/runtime](https://github.com/NuvioMedia/NuvioTV/blob/12d96bced9821bdf4bc233039ffb1ccd1795e55b/app/src/full/java/com/nuvio/tv/core/plugin/PluginManager.kt):
  `executeJsScraper` loads saved code and per-entry settings, then passes both to
  the runtime. `downloadJsScrapers` resolves relative filenames, performs HEAD
  then GET, rejects files above 5 MiB and persists the downloaded text. Explicit
  repository refresh downloads code again. HTTP/HTTPS repository URLs are accepted.
- [Persistent code storage](https://github.com/NuvioMedia/NuvioTV/blob/12d96bced9821bdf4bc233039ffb1ccd1795e55b/app/src/main/java/com/nuvio/tv/data/local/PluginDataStore.kt):
  `saveScraperCode`/`getScraperCode` use app-private files. Playback reads these
  files; it does not need the installation server to serve every episode.
- [Network policy](https://github.com/NuvioMedia/NuvioTV/blob/12d96bced9821bdf4bc233039ffb1ccd1795e55b/app/src/main/res/xml/network_security_config.xml)
  permits cleartext traffic, including the proposed local HTTP installation path.
- [Runtime key injection](https://github.com/NuvioMedia/NuvioTV/blob/12d96bced9821bdf4bc233039ffb1ccd1795e55b/app/src/full/java/com/nuvio/tv/core/plugin/PluginRuntime.kt):
  the app injects `SCRAPER_SETTINGS` and its TMDB API key. The companion need not
  ask the user for another TMDB key for the existing plugin contract.
- [Profile settings importer](https://github.com/NuvioMedia/NuvioTV/blob/12d96bced9821bdf4bc233039ffb1ccd1795e55b/app/src/main/java/com/nuvio/tv/core/sync/ProfileSettingsSyncService.kt):
  `importPluginSettings` imports only `group_streams_by_repository`. The inspected
  [plugin screen](https://github.com/NuvioMedia/NuvioTV/blob/12d96bced9821bdf4bc233039ffb1ccd1795e55b/app/src/main/java/com/nuvio/tv/ui/screens/plugin/PluginScreen.kt)
  and viewmodel expose repository management/testing rather than an `onSettings`
  editor. Phone gear values therefore cannot be assumed to reach TV.

Current generated bundles are below 250 KiB per file, well within the observed
size limit. Source inspection establishes feasibility; physical installation,
cache persistence and playback must still be tested.

## Hosting choices

| Choice | Setup | Update/address implications |
| --- | --- | --- |
| Phone companion | Enter settings on phone; TV installs from its LAN URL | Phone must serve during installation/refresh. A changed phone IP can invalidate saved URLs unless the home network reserves that address |
| TV companion + phone browser | Install companion on TV; scan QR to enter settings from phone | Nuvio installs from stable loopback URLs. LAN IP changes affect only a freshly generated configuration QR, not the saved plugin URLs |

**Recommendation for review: TV companion with a phone configuration page.**
It provides stable installation URLs while retaining convenient typing on the
phone. No choice is treated as approved for implementation yet.

## Proposed user flow

1. Open the companion on TV and choose a named metadata setup.
2. Scan its QR code with a phone on the same home network.
3. Save AIOmetadata and Xperience URLs once, choose the active manifest and keep
   IMDb query format. Use verified mixed-profile matching for FR/Anime-Sama and
   TVDB Aired for EN with the current anime setup.
4. The companion exposes three private repositories: Sources FR, Anime-Sama and
   Sources EN. Preserve separate repositories so Nuvio keeps useful source groups;
   preserve entry IDs, source labels and independent host toggles.
5. Add those URLs in Nuvio TV. Its existing phone/QR repository-management page
   can be used to enter them. Nuvio downloads the personalized code into its own
   storage. The companion remains running through this installation step.
6. Stop the local setup server after installation. TV contacts metadata services
   and video hosts directly during playback. No companion stream proxy is needed.

Illustrative TV-facing URL (placeholder only):

```text
http://127.0.0.1:8765/<private-install-id>/anime-sama/manifest.json
```

The phone configuration page uses the TV’s current LAN address and a separate
session token. Loopback addresses in installation URLs refer to the TV itself;
the phone config page must display/copy these TV-facing URLs deliberately.

## Configuration and update behavior

The companion builds a private settings wrapper around the same published plugin
code. It supplies the saved metadata configuration before that code executes.
Keep TV runtime entry-ID dispatch, injected API key, signed streams, headers and
original media masters intact. No per-host manual settings editor is required.

A change to the active manifest does **not** instantly change a downloaded TV
copy. Open the companion, change/save the selection, then refresh the three
repositories in Nuvio. Both metadata URLs remain saved. The same process applies
to provider code updates: fetch a coherent public code version in the companion,
then refresh Nuvio’s private copies. No daily companion rebuild is needed for EN’s
existing validated mapping-data pointer.

Named setups should have distinct stable repository URLs. A user must install
the matching set in the relevant Nuvio profile; do not claim automatic profile
detection or phone/account synchronization. Repository inheritance and duplicate
public/private installations require a clear setup check on the real TV.

## Private data and local-server boundaries

- Public APK/assets contain generic source only. Personal manifests are entered
  locally and must never appear in public GitHub files, build logs or reports.
- Personalized downloaded JavaScript contains those private URLs. Nuvio stores
  that private copy in its app storage; the companion cannot encrypt code that
  Nuvio must execute. Treat the generated files as personal configuration.
- Protect phone setup with an unpredictable short-lived session token, bounded
  requests and CSRF checks. Serve installation/code routes only to loopback for
  the TV-hosted design; do not expose code listings or arbitrary files on LAN.
- Store companion secrets in app-private encrypted storage, omit them from
  backups/diagnostic exports and keep HTTP request bodies/routes out of logs.
- The local phone configuration page uses HTTP unless a trusted TLS setup is
  added. Tokens control access but do not encrypt LAN traffic. Scope it to the
  home network and an explicitly started, temporary setup session.
- A foreground service is needed while switching from the companion to Nuvio or
  the phone browser; stop controls must be visible. No port forwarding, public
  hosting, root/ADB modification or Nuvio APK patch is part of this proposal.

## Proposed build/acceptance stages

1. Verify a private wrapper using synthetic manifests in the literal runtime,
   including TV 1.1.0’s actual bindings, HEAD/GET installation and origin/route
   restrictions. Keep current public artifacts untouched.
2. Build the companion’s start/stop host and QR configuration flow. Prove one
   personalized Anime-Sama ANSEmbed entry on the user’s TV with Hunter S1E1 and
   Vinland S1E1. Stop the server, restart Nuvio and confirm cached execution.
3. Add the complete FR/Anime-Sama/EN repositories, optional diagnostics, two-slot
   switching and named setups. Verify fresh TV-origin links, HLS type/headers,
   EN Standard/Beta audio/subtitles, cold starts and explicit code refresh.
4. Verify updates, failed downloads retaining the installed code, app/server
   restarts, changed LAN address and the user’s Nuvio profile/inheritance choices.
   Document actual device/app versions and unresolved hosts.

This addresses configuration delivery. Nuvio’s scheduling, HTTP bridge, decoder,
per-entry timeouts and unverified hosts remain separate concerns. Existing
QuickJS success is useful compatibility evidence, not physical TV playback.
