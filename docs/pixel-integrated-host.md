# Pixel: integrated HTTPS host (0.2.0)

Anime-Sama Host0.2.0 adds an in-app ngrok SSH tunnel. The Pixel runs one host app;
Termux is retained as an optional fallback. Nuvio clients need no VPN. This
release still hosts Anime-Sama only and uses one global metadata configuration.

## Upgrade the working setup

1. Install the [signed0.2.0 APK](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/releases/download/anime-host-v0.2.0/Anime-Sama-Host-0.2.0.apk)
   **over the existing app**, preserving settings and the addon token. Do not
   uninstall or clear data. The application ID and original signing certificate
   are unchanged. Keep the working Termux configuration for rollback.
2. Open **Create / copy ngrok public key**. The app creates its own RSA3072 key
   once, encrypts its private half with the existing Android Keystore storage and
   copies/displays only the public half. Register this key at
   [ngrok SSH Public Keys](https://dashboard.ngrok.com/ssh-keys). The Termux
   Ed25519 key is separate; the app does not import it or require an authtoken.
3. Enter the **same assigned ngrok hostname** used by the successful trial,
   without `https://` or a path. Leave the working metadata/API-key settings.
4. Stop the Termux tunnel with Ctrl+C, so two agents do not compete for that
   endpoint. Leave Anime-Sama Host running.
5. Enable **HTTPS remote access**, then **Save and start / restart**. The status
   shows the local server and SSH tunnel separately. If registration/domain was
   corrected afterward, use **Reconnect saved tunnel** without restarting the
   source engine or discarding its metadata caches.
6. **Copy HTTPS addon URL** gives the same hostname/token/path as the existing
   installation. Compare it privately if desired; clients do not need a new URL
   when these values are unchanged. The manifest version updates to0.2.0.
7. Open **Background battery settings** and allow unrestricted usage for this
   app on the Pixel. This is a manual Android setting; the app does not silently
   change exemptions or hold a permanent wake lock.

The private SSH key never appears in the UI, APK, logs or addon JSON. The existing
user preference for visible manifest/API-key fields and screenshots is retained.
Public SSH keys are safe to register; the full addon URL remains a bearer secret.

## Controls and recovery

- **Save and start / restart** saves edits and starts local/remote components
  according to the switches. **Start saved server** reuses the stored setup.
- **Stop tunnel — keep local server** disables saved remote access and closes SSH,
  leaving local/LAN lookups and engine caches alive. Re-enable/save to resume.
- **Stop server** and the notification Stop action stop both components, cancel
  retries and disable automatic restart until explicitly started again.
- Transient failures reconnect with capped5–60s backoff. A newly available default
  network can wake a pending retry. Authentication, invalid-key, changed-host-key
  and refused-endpoint errors stop with distinct messages until corrected.
- An established SSH session blocks on network input, with30s keepalives and no
  app-side idle polling. At most one connection attempt runs across reconfiguration;
  forwarded sockets are capped at8, to `127.0.0.1:8765` only. Existing HTTP admission,
  lookup deadlines, global source concurrency and metadata-cache limits remain.
- While previously enabled, the foreground service attempts recovery after
  process eviction, BOOT_COMPLETED and MY_PACKAGE_REPLACED. Android may require
  first unlock or opening the app; Force stop, power-off and OEM restrictions
  cannot be bypassed. The stored domain/key/token survive normal restart.

“SSH tunnel connected” establishes transport setup, not full video acceptance.
If the local server is running but the tunnel reports a fault, local/LAN clients
can still work. Remote stream extraction and actual media playback are separate:
video/audio/subtitle requests go directly from the client to the video host.
No IP/session-bound stream fix, video proxy, URL stripping or media cache is added.

## First Pixel acceptance

Retain the working Termux setup until all of these pass:

1. With the app key registered and Termux stopped, request Hunter S1E1 and S2E72
   through the installed HTTPS addon in Nuvio on mobile data; include a recent
   episode with the configured metadata provider. Check actual episode identity.
2. Play and seek a known cross-network-working ANSEmbed/Uqload link. Check the
   expected audio/subtitles. Record other failing hosts separately; returning
   links is not proof they play on another public IP.
3. Turn the Pixel screen off and open another app, then make a **new lookup** on
   the client. Already playing video does not exercise the addon/tunnel again.
4. Disable/re-enable Wi-Fi, then repeat a lookup after reconnection. Confirm no
   duplicate endpoint/session and the same installation URL.
5. Stop/restart the tunnel, restart the host, then reboot/unlock the Pixel. Record
   any manual app-start requirement and recovery delay. Verify explicit Stop is
   respected. Do not deliberately discharge or interrupt device updates.
6. Use the optional idle CPU/PSS sample after settling. It includes the tunnel;
   keepalives are real background traffic. Record load rather than assuming zero
   CPU, an unkillable service or a fixed RAM bound for the whole process.

No real ngrok credentials/device were available to the cloud tests. The user's
Termux trial demonstrates that their domain/account can work; the integrated
Android connection and its screen-off/reboot behaviour still need these physical
checks. The free ngrok interstitial/quotas also remain provider constraints.

## Fallback and maintenance

To return to the trial connector, stop/disable the app tunnel, leave the local
server enabled, then start the existing Termux script. It uses its original key
and the same public domain/token path. Do not try to install a lower versionCode
APK over this release or uninstall it to “roll back”; a binary rollback would
need a newly signed higher-versionCode release.

Repair `core/.../RemoteTunnel.kt` for the pinned EU host, SSH policy, bounded
forwarding and controller; `HostService.kt` for lifecycle/network callbacks;
`SecretStore.kt` for atomic encrypted updates and key preservation; and
`MainActivity.kt` for setup/status/TV controls. The maintained SSH library is
`com.github.mwiede:jsch:2.28.8` (BSD-3-Clause, notice included). The native ngrok
SDK is not bundled. Recheck the host fingerprint against
[ngrok's official SSH documentation](https://ngrok.com/docs/gateway/agent/ssh-reverse-tunnel-agent)
before changing it; never disable verification to bypass a failure.

Run the core tests, Android lint/assembly and the disposable TV emulator helper.
Core coverage includes real SSH public-key authentication and HTTP forwarding to
a token-protected test addon, pin rejection before authentication, local access
surviving tunnel close, network backoff/wakeup, stop/reconfigure races and invalid
key rejection. These are a local SSH server plus lifecycle fixtures, not a live
ngrok/Pixel acceptance claim. The [full project plan](plans/pixel-remote-addon-host.md)
retains shared metadata presets, revocable per-profile keys, FR/EN integration,
authenticated engine updates, longer metadata caching and cross-network host tests.

[Release checks and artifact evidence](../tests/evidence/android-pixel-tunnel-0-2-0-2026-11-26.json).
