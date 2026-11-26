# Pixel 6: first remote Anime-Sama trial

The user confirmed local-network operation on26 November2026. This supervised
trial adds ngrok HTTPS access through Termux on that same Pixel. Anime-Sama Host
0.1.4 and its private access token stay unchanged; no new APK or client VPN is
needed for this trial. FR/EN hosting, profile presets, managed tunnel startup and
engine updates remain separate stages in the [project plan](plans/pixel-remote-addon-host.md).

## Why this connector

ngrok officially supports [SSH reverse tunnels](https://ngrok.com/docs/gateway/agent/ssh-reverse-tunnel-agent).
Termux provides Android-native OpenSSH, so this route avoids installing a Linux
ngrok binary or depending on the Java SDK's open Android/JNI issues. This is a
trial choice, not a claim that the SDK can never work. References:
[Android support issue](https://github.com/ngrok/ngrok-java/issues/60),
[native loading issue](https://github.com/ngrok/ngrok-java/issues/50), and
[page alignment issue](https://github.com/ngrok/ngrok-java/issues/66).

ngrok's [free plan](https://ngrok.com/docs/pricing-limits/free-plan-limits)
currently includes an assigned stable dev domain,20,000 HTTP requests/month and
1GB outgoing transfer/month. Only addon JSON crosses this gateway. Videos,
audio and subtitles go directly from their hosts to Nuvio. Cross-network media
playability still needs host-by-host testing.

## 1. Prepare the Pixel

Keep Anime-Sama Host running with the metadata settings that worked on LAN.
Copy its home-network addon URL locally for step4. Do not publish that URL.

Create a [free ngrok account](https://dashboard.ngrok.com/signup) and find the
assigned **dev domain** in its dashboard. Save the hostname locally, for example
`your-assigned-name.ngrok-free.app`; do not invent a new hostname or buy a domain.

Install Termux from [its official distribution links](https://github.com/termux/termux-app#installation).
Use Android settings to allow unrestricted background battery usage for both
Termux and Anime-Sama Host. This helps screen-off operation; it is not a guarantee
that Android will keep both processes alive.

In Termux:

```sh
pkg update
pkg install openssh curl
curl --fail --location --output ngrok-tunnel.sh https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/scripts/pixel/ngrok-tunnel.sh
bash ngrok-tunnel.sh setup
```

The [reviewable helper](../scripts/pixel/ngrok-tunnel.sh) generates a dedicated
Ed25519 key in Termux private storage, then validates the EU ngrok SSH server's
RSA fingerprint against the value published in its official documentation. A
network/pin failure stops setup; retrying preserves the private key. Do not bypass
a fingerprint failure with disabled host checking.

## 2. Register the public key

Copy the **public** key printed by setup to ngrok's
[SSH Public Keys page](https://dashboard.ngrok.com/ssh-keys). It begins with
`ssh-ed25519`. The private key stays on the Pixel. This SSH method does not use an
ngrok authtoken, and neither credential belongs in GitHub or chat.

## 3. Generate the remote addon URL

Replace the example hostname below with your assigned dev domain:

```sh
bash ngrok-tunnel.sh url your-assigned-name.ngrok-free.app
```

At the prompt paste the existing addon manifest URL copied from Anime-Sama Host.
The helper replaces only the address with HTTPS and preserves the32-character
access token and `/manifest.json` path. It prints the new **private installation
URL** for Nuvio; it does not save the URL/token. Keep this URL private.

## 4. Start the tunnel

Use the same assigned hostname:

```sh
bash ngrok-tunnel.sh start your-assigned-name.ngrok-free.app
```

Leave that Termux session running and use Home to open Nuvio. The tunnel accepts
HTTPS through ngrok and forwards HTTP only to `127.0.0.1:8765` on the Pixel.
The host continues requiring its private token on manifest and stream routes.
No router port forwarding or change to the host's inbound-address policy is used.

The helper saves only the public hostname, host keys and its dedicated SSH key.
Subsequent starts can use:

```sh
bash ngrok-tunnel.sh start
```

The same saved domain and original addon token keep the installation URL stable.
The SSH key is independent of the addon token; neither rotates on restart.

## 5. Verify actual Nuvio access

Add the generated HTTPS manifest URL under **Addons** in a test Nuvio profile.
Temporarily disable the duplicate local Anime-Sama addon/native entries when
comparing results, so another provider cannot hide a tunnel failure.

1. First fetch links over the local network through the **HTTPS** installation.
2. Put the client phone on mobile data, keeping the Pixel on home Wi-Fi, and
   repeat the lookup. Test Hunter S1E1 and S2E72 with the matching metadata setup.
3. Open a source and check playback, seeking, audio and subtitles. A successful
   manifest or returned list alone is not playback acceptance.
4. Turn the Pixel screen off, wait, then request another episode on the client.
   Test a new lookup, not just an already playing video that bypasses the tunnel.
5. Stop/restart the tunnel and confirm the same installed URL works again.

ngrok's free interstitial can affect browser-like requests. A browser showing a
warning is not conclusive evidence that Nuvio is blocked, and clicking through in
the browser is not a Nuvio fix. Test Nuvio itself without a browser cookie or a
special header. If it receives HTML instead of JSON, record this as a failed
trial gate before choosing a different delivery path; do not assume a paid upgrade
or silently modify Nuvio.

## Stop, recovery and limits

- **Ctrl+C in the tunnel session** stops remote access. Anime-Sama Host can keep
  serving local/LAN clients. Stop the host separately with its existing button.
- Short disconnects retry with capped backoff. Six consecutive short-lived
  failures stop the helper, so auth/configuration failures cannot spin forever.
  A connection lasting60 seconds resets that failure count. SSH keepalives every
 30 seconds are tunnel traffic, not addon/source polling; measure idle impact on
  the actual Pixel before unattended use.
- This first trial does not install Termux:Boot or promise reboot recovery. After
  a reboot/Android kill, reopen Termux and start again. After an unclean kill a
  `running` directory may remain under `~/.local/share/nuvio-ngrok`; remove **only
  that directory**, and only after confirming no tunnel session is running. Keep
  the key and domain files. Managed cleanup/startup is later work.
- The current host has one shared access token. The first trial uses it unchanged;
  independently named/revocable profile keys and presets are not implemented.
- Stop the live tunnel to immediately disable remote access. Removing a public
  SSH key from ngrok prevents future authentication but must not be assumed to
  terminate an already established session. No remote settings editor is exposed.
- Key files are protected by the Termux app sandbox and restrictive permissions;
  they are not stored in the host app's Android Keystore. Clearing Termux data
  loses this connector key/configuration and needs re-enrollment. Do not include
  the private state directory in public reports or unencrypted exports.

## Maintenance and development evidence

Code: `scripts/pixel/ngrok-tunnel.sh`. The fixed EU SSH hostname/fingerprint comes
from ngrok's official SSH documentation. Recheck that first-party source before
changing a pin. Do not accept a key merely because `ssh-keyscan` returned it.
Only the loopback host and port are forwarded; no source URL is decoded/rewritten.
Remote stdout/stderr are suppressed because request paths could contain access
keys. Connection exit status/backoff messages contain no private URLs or keys.

```sh
bash -n scripts/pixel/ngrok-tunnel.sh
.venv/bin/python -m unittest discover -s tests -p test_pixel_tunnel.py
npm run check:docs
```

The six regression tests exercise actual SSH key generation/fingerprint checks,
private-key preservation on rejected server identity, URL preservation without
persistence, invalid hostnames, bounded retry/strict forwarding options and
termination cleanup. Network forwarding is simulated in the lifecycle tests.
The cloud environment could not reach the public SSH endpoint, and no ngrok
account was supplied. Successful authenticated tunneling, Nuvio's HTTP behaviour,
cross-network media, screen-off operation, idle cost and reconnect acceptance
remain **physical Pixel/client tests**, not proven by these regressions.

[Recorded scope and test evidence](../tests/evidence/pixel-ssh-trial-2026-11-26.json).
