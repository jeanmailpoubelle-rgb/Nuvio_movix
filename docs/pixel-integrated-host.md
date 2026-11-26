# Pixel: Sources Host with integrated HTTPS (0.3.0)

The Pixel runs **Sources Host**, one Android app for Anime-Sama+, Sources FR+ and
Sources EN+. Its optional ngrok SSH connection needs neither Termux nor a client
VPN. Local and remote media-session restrictions remain separate from discovery.

## Upgrade

Install the [signed0.3.0 APK](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/releases/download/anime-host-v0.3.0/Sources-Host-0.3.0.apk)
**over the existing app**. Do not uninstall/clear data. Package ID, APK certificate,
encrypted settings, registered SSH key, ngrok hostname, token and original addon
ID/URL remain intact. The old single configuration appears as an Anime-Sama+
card. Start the saved host if Android does not resume it.

## Configure

1. **Metadata** stores AIOmetadata, Xperience and TMDB credentials once. Each
   addon selects a saved provider independently. Visible fields/screenshots remain
   enabled; this does not make private manifest URLs safe to share.
2. **Addons → Add addon** selects a source family, metadata provider, episode
   order and access. For TVDB anime with IMDb compatibility, use automatic order
   verification for Anime-Sama/FR and TVDB Aired for EN. A TMDB-only FR/Anime-Sama
   preset can use reference numbering without a private manifest.
3. **Connection → Create/show ngrok public key** for a new installation only.
   Register it at [ngrok SSH keys](https://dashboard.ngrok.com/ssh-keys). Existing
   setups retain their already registered app key. The private RSA3072 half stays
   encrypted on Android. The old Termux Ed25519 key is independent.
4. Enter the assigned hostname without scheme/path. Stop any Termux tunnel on
   that domain. Enable/save the shared HTTPS connection.
5. Set each remotely available addon to **Local + HTTPS gateway**. **Home network**
   and **This device only** remain excluded from the tunnel. A dedicated loopback
   backend8766 enforces this even when another addon enables HTTPS;8765 is local/LAN.
6. **Start host**. Under **Manage addon → Show/copy installation URL**, choose HTTPS
   and paste into Nuvio Addons. Original migrated Anime-Sama URLs stay unchanged.
   New family/preset cards have independent private tokens.
7. Under **Connection → Open Android battery settings**, allow background use.
   First unlock/Force stop/OEM policies can still prevent automatic recovery.

Pause/resume/edit/delete only the selected card. Already accepted lookups retain
one captured configuration/version. Shared credential edits reconfigure active
addons without dropping an unchanged tunnel or caches. **Disconnect HTTPS** keeps
local service alive; **Stop host** disables all service/restart activity.

## Updates

**Updates → Check for engine updates** verifies authenticated project releases
without reinstalling an APK. Keep fallback/previous-release rollback available.
See [engine update trust, publishing and one-time CI secret](host-engine-updates.md).
Android service/UI changes still require an APK update. Metadata caches remain
bounded and signed playback URLs are fresh, regardless of engine delivery.

## Connection invariants and diagnosis

The integrated SSH transport uses the pinned official EU ngrok host, fixed
loopback forwarding, eight forwarded sockets,15s connection bound,30s heartbeat
and5–60s network retry. Forward setup overlaps the required `http` command;
connection success requires both replies. This preserves the0.2.1 repair confirmed
working by the user. Saving unrelated addon settings does not restart that tunnel.

Errors expose only safe stage (`FORWARD_REQUEST` / `HTTP_COMMAND`) and public
numeric `ERR_NGROK_…` identifiers. No raw upstream output, credential or request
path is logged. Authentication/pin/key/endpoint failures stop until explicit
reconnect/configuration; connectivity changes cannot restart an explicitly stopped
or hard-failed connection. A generic failure does not establish domain conflict.

Core tests exercise real local SSH authentication, delayed/immediate forwarding
acknowledgements, token access and lifecycle bounds. TV instrumentation exercises
remote setup/navigation and background local availability. These are separate from
physical Pixel ngrok acceptance, screen-off/reboot and mobile-data media playback.

The [Termux trial](pixel-remote-trial.md) remains historical fallback documentation.
For0.3.0 manual tunnel use, forward to127.0.0.1:8766 to preserve per-addon remote
restrictions; an old manual tunnel to8765 bypasses that ingress distinction.
