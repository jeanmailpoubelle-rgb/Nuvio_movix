# Pixel-hosted addons: remote access and validation plan

Written 23 November 2026. **Planning document; implementation has not started.**
This records the intended outcome, proposed sequence and unresolved decisions.
It does not change the APK, publish a service, create an account or schedule tests.

## 1. Intended outcome

Use a spare **Pixel 6** as an efficient, persistent addon host. Nuvio Mobile and
Nuvio TV, including the user's Xiaomi TV Box S 3rd gen, should be able to request
sources both at home and on other networks, **without installing a VPN on clients
or modifying Nuvio itself**.

Access should be private and revocable. The initial proposed mechanism is a long
random key in an HTTPS addon URL. This authorizes possession of the key, not an
uncloneable physical device. Device-bound attestation/certificates are outside the
initial scope because our addon cannot require unsupported Nuvio credentials.
This trade-off must be explicit before public deployment.

The Pixel resolves sources; **video should travel directly from the video host
to the playback device**. Do not silently introduce video proxying/transcoding.
Aim for one maintainable Android app, shared infrastructure and one addon per
family rather than a separate addon for each video host.

Start with the existing Anime-Sama engine. Sources FR and Sources EN are later
stages, preserving their independent source, mapping and language policies.
Existing native and + plugins remain available and unchanged by this project.

## 2. Current state and evidence

- Android Host 0.1.4 provides Anime-Sama only, with local/LAN HTTP, encrypted
  settings, bounded HTTP/concurrency/caches, TV controls and safe setup errors.
  It has no integrated ngrok connector, HTTPS gateway or per-client key registry.
- One host currently has one token. The service is IPv4, loopback by default;
  opt-in LAN binding accepts local/private-LAN clients. A tunnel agent forwarding
  to loopback is a different approach from the earlier Tailscale proposal.
- Five TV-emulator tests and 28 core tests pass for 0.1.4. The user reports that
  setup works but remote navigation needs later polish. This is not acceptance of
  unattended Pixel hosting, all physical-TV playback or remote-network operation.
- The user reports ANSEmbed/Uqload playback surviving Wi-Fi-to-mobile switching.
  An independently tested supplied link returned a valid master, child playlist
  and a small media-segment sample from the cloud. A supplied Ani.pm/Settlar Beta
  link also served playlists and a segment sample from a different network.
- These are individual examples, not proof that every host/CDN/link is portable,
  that a full episode decodes correctly, or that links remain valid indefinitely.
- Decoding an embedded upstream URL and stripping timestamp-like parameters is
  **not** the selected strategy. Preserve signed URL bytes, headers, original HLS
  masters and embedded tracks. Parameter names alone do not prove expiry rules.

## 3. Proposed architecture

```mermaid
flowchart LR
    N[Nuvio on approved clients] -->|HTTPS with private access key| G[Public gateway: ngrok trial]
    G -->|Outbound tunnel initiated by Pixel| H[Pixel addon server on loopback]
    H --> M[Configured metadata and provider discovery]
    H -->|Source results through gateway| N
    N -->|Direct video / audio / subtitle requests| V[Video hosts and CDNs]
```

Only addon JSON travels through the gateway. There is no inbound router port to
open. The Pixel must be online, and both the connector and addon server must be
running. A stable gateway URL should work across client networks and Nuvio sync.

A working tunnel does not remove a media host's IP/session restrictions. If a
host requires video requests to share the Pixel's public IP, direct remote
playback may remain unsupported. Do not solve that by automatically relaying
video: it would change bandwidth, heat, cost, quotas and architecture, and needs
a separate decision.

### Metadata profiles and synced URLs

Keep access authorization separate from episode-order configuration. The host
must know which metadata configuration applies to the requesting installation;
an IMDb ID alone cannot establish TVDB versus TMDB episode numbering.

For the first trial, use one known metadata configuration shared by the selected
Nuvio profile. Later mixed profiles may need explicit configuration presets/URLs
(native TMDB, configured AIOmetadata or Xperience), without changing another
profile's interpretation when one setting changes. Reuse verified public identity
and transport data where safe; isolate private manifests and episode inventories.

Nuvio sync can copy an addon URL, including its access key, to other devices.
A shared synced profile therefore normally shares its authorization. Per-device
revocation is only honest when installations can retain separate keys. Otherwise
issue keys per installation/profile/group and describe revocation at that scope.
Do not promise device-specific keys while silently syncing the same key everywhere.

## 4. Phase A: establish a reproducible Pixel baseline

1. Install the current signed APK on the Pixel, retaining the existing application
   ID/certificate. Configure the selected metadata manifest and TMDB key locally.
   Keep secrets out of GitHub source, reports, APK resources and chat.
2. Verify manifest access and a real stream lookup separately. A manifest200 does
   not prove mapping or source extraction. Test a TMDB/native control and the
   configured TVDB-anime/IMDb path, including known season-boundary fixtures.
3. Test local/LAN playback from phone and Xiaomi TV: start, seek, available audio
   and subtitles. Reuse the current output and host coverage as the baseline.
4. Measure cold/warm lookup latency, HTTP counts, memory and idle CPU on the real
   Pixel. The existing hosted addon returns a complete JSON list, not per-host
   partial results. Measure time until links actually appear in Nuvio; do not
   promise native per-entry progressive behaviour from one hosted endpoint.
   No numerical speed promise before these measurements.
5. Check screen off, opening other apps, service stop/restart, reboot, Wi-Fi loss
   and recovery. Keep it powered and ventilated; evaluate Android background
   restrictions and charging/battery behaviour without promising unkillable service.

**Gate A:** reproducible correct episode discovery and acceptable idle behaviour
on the Pixel. Record unresolved device/setup failures before adding a tunnel.

## 5. Phase B: test ngrok feasibility without changing the engines

The user's preferred first experiment is **ngrok Free**. Documentation reviewed
23 November 2026 describes one assigned stable development domain, 20,000 HTTP
requests and 1 GB outgoing transfer per month. Treat those as a dated reference;
recheck [limits](https://ngrok.com/docs/pricing-limits/free-plan-limits) and
[domain behaviour](https://ngrok.com/docs/gateway/domains) before deployment.
Quotas cover gateway traffic, not the separate upstream discovery requests made
by the Pixel. They are not a reason to route video through this gateway.

- Prove a supported/reproducible connector can run on the Pixel's Android system.
  Do not assume a Linux ARM64 binary automatically works on Android. Evaluate a
  separate Android-compatible companion first; integrate only after lifecycle,
  licensing, update and secret-storage requirements are established.
- The user creates/configures their own gateway account and supplies its token
  locally. No account credentials compiled into code or public Actions inputs.
- Start with loopback forwarding to the existing server. Do not broadly relax
  its inbound-address filter or expose its LAN socket to the public internet.
- Test actual Nuvio requests: manifest JSON, stream JSON, URL path encoding,
  relevant methods, redirects, CORS where needed, timeouts and error status.
- The free browser interstitial/login/challenge must not replace JSON for Nuvio.
  Do not depend on a browser session or a client header Nuvio cannot supply.
- Verify stable address after connector restart, token-path preservation and the
  connector's backoff/reconnection behaviour. Measure its additional idle cost.
  A tunnel may require keepalives even though the addon does no content polling.

**Gate B:** remote Nuvio can reliably reach the existing token-protected addon
without a VPN/client modification or browser login, within the free plan's limits.
If ngrok is unsuitable, record the failure before choosing a fallback. Cloudflare
Tunnel with an owned domain is an alternative; its domain cost and Android
connector feasibility require review. Temporary Quick Tunnel addresses are for
experiments, not the default persistent installation URL.

## 6. Phase C: private access and operational controls

Before treating the endpoint as a regular public service:

- Require a cryptographically random secret on every manifest and stream route.
  The existing 128-bit token is the minimum baseline; do not rely on a secret
  hostname. No unauthenticated source lookups or remote settings editor.
- Add named, revocable/rotatable installation or profile keys as needed. Revoke
  one key without changing other configurations. Never describe a copied bearer
  URL as physical-device verification.
- Account for Nuvio sync before assigning key scopes. Start with the user's own
  devices; no implicit invitation or publication to third parties.
- Retain bounded connections, body sizes, queues and lookup deadlines. Add limits
  by logical access key; a loopback tunnel makes raw socket IPs unsuitable as the
  sole client identity. Do not trust arbitrary forwarded-IP headers.
- Redact tokens/queries in logs and diagnostics; explain that Nuvio sync and the
  HTTPS gateway provider can see/store URLs. Do not publish private manifests,
  signed media links, session cookies, caption dialogue or raw HTTP bodies.
- Test missing/wrong/revoked keys, malformed requests, queue saturation and
  recovery. Invalid authorization must not trigger metadata/provider requests.
- Provide clear local status and stop/reconnect controls without continuous
  monitoring. Preserve visible manifest/key fields and screenshots as requested.

**Gate C:** access is limited to holders of explicitly issued keys, denial and
revocation work, and normal clients remain usable under the bounded load tests.
Gateway requests can still consume free quota before app authorization; a secret
URL is not a guarantee against service exhaustion.

## 7. Phase D: host-by-host cross-network validation

Build a matrix from actual configured/resolved providers. The shared resolvers
currently recognize ANSEmbed, Uqload, Smoothpre, Voe, Vidmoly, Sendvid, Vidzy,
Dood, Streamwish, MixDrop, Vidara, Seek, Dropload and ShareCloudy. This recognition
list does not establish that every host has an available sample today.

Start with Anime-Sama's independent entries, then extend to FR and Ani.pm using
the existing native test engines. Hosted FR/EN need not exist to test their media
URLs; do not confuse these protocol probes with completed Android integration.

For each available provider/host/CDN/format combination:

1. Obtain fresh links for at least two representative titles where available;
   cover an episode/movie, old/recent releases and useful editions as applicable.
   Confirm selected episode identity before interpreting media failures.
2. Establish the issuing-network baseline using original URLs and headers. Check
   master/child playlists, init/encryption-key resources when present, bounded
   beginning/middle/end media samples and advertised preferred audio/subtitles.
   For direct MP4, check range support and bounded media readability. HTTP200
   alone is not enough; do not download entire episodes as a default probe.
3. Test the **same issued URL and headers** from a genuinely different public
   egress. Do not regenerate it on the second network. Cloud plus GitHub Actions
   can supply automated locations after verifying their egress differs.
4. Repeat selected links at known elapsed ages, initially around 1h, 12h and 24h.
   These are controlled test retention, not a production playback-URL cache.
   If an old link fails, compare a fresh same-source link to distinguish expiry
   from a current host outage. Do not infer lifetime solely from query arguments.
5. Protect the cross-network handoff before automating: ephemeral encrypted/private
   transfer, bounded retention and cleanup, no plaintext signed URLs in public
   workflow inputs, logs, source or artifacts. If that cannot be arranged, record
   the gap rather than publishing tokens. No deferred jobs are scheduled by this plan.
6. Separate extraction failure, source absence, HTTP restriction, expiry, missing
   tracks and decode failure. An unavailable sample is **untested**, not proof of
   IP binding. Cloud blocking is not proof the user's host is broken.

Report only sanitized title/episode IDs, provider/host/format, test locations,
link age, HTTP stages/status, sample results and limitations. Classify outcomes
as cross-network working, restriction suspected, expiry observed, unavailable or
untested; retain supporting fresh controls before asserting the cause. Never
promise every future link from a host will behave like one successful sample.

### Physical checks and division of work

Codex can build the harness, reuse discovery/mapping regressions, perform bounded
network probes, compare independent environments and prepare the report.

The user supplies Pixel/account setup and real Nuvio acceptance: phone on mobile
data, TV on its network, start/seek/audio/subtitles, and ExoPlayer/libmpv where
relevant. The user already reports libmpv startup failing on some Ani.pm streams
while ExoPlayer plays them; classify player compatibility separately from remote
URL accessibility. Cloud HTTP success does not diagnose that failure.

Ask for an individual fresh playback URL only if cloud discovery cannot obtain
a representative source. Do not ask the user to copy every host's links or expose
personal metadata manifests/API keys. Follow-up is only for genuinely unavailable
credentials, account actions or physical-device observations.

**Gate D:** required initial hosts have real cross-network evidence plus device
playback checks, with unsupported/untested combinations explicitly listed. Do not
claim universal remote playback. Keep a local hosting option for unsupported cases;
video proxying, VPN routing or replacing a host are separate future decisions.

## 8. Phase E: shared app architecture and additional engines

Preserve the current Anime-Sama asset pipeline and exact resolver behaviour.
Introduce a provider registry when implementing FR/EN, with shared configuration,
verified public identity cache, HTTP pool/admission, memory limits and lifecycle.
Keep metadata presets explicit and isolate private inventories by manifest/order.

Add one hosted addon per family, not per host. FR keeps its resolution/backend
rules; EN keeps AniBridge authority, ani.zip contradiction-only veto, language
eligibility and multi-audio masters. Neither may borrow Anime-Sama episode
coordinates merely because the transport is shared. Standard/Beta EN routes and
slow hosts must not accidentally gate independent lookups or multiply global
resource limits. Expose only implemented engines and keep stable native URLs.

Deliver FR and EN separately, with mapping, media, installed-addon and Android
acceptance tests for each. This phase can follow a successful remote Anime-Sama
trial; it is not a prerequisite for that first trial.

## 9. Phase F: longer metadata caches without stale new episodes

Implement the separately agreed [HOST-02 policy](../limitations.md#host-02--longer-metadata-caching-with-new-release-recovery):
verified title IDs 7 days, general information 24h, explicitly completed episode
inventories 24h, ongoing/unknown inventories 15min as proposed starting limits.
Mixed responses need the shorter policy unless separated safely.

When cached episode metadata blocks a newly requested episode or season, perform
one targeted fresh inventory/selected-addon read and re-run normal identity
checks. Keep unrelated titles and stable identities cached; do not retry forever
or weaken matching. A valid episode followed by no uploads is not a metadata-cache
failure. Preserve bounded memory, lazy expiry and no background preload/polling.

Measure request reductions and cold/warm latency before selecting final durations.
Keep this a separate release from gateway/source fixes where possible, so a
regression can be isolated. No signed playback/token caching or argument stripping
is included. Shared transport optimizations must not alter another engine's policy.

## 10. Delivery sequence and acceptance

Suggested order: **A → B/C → D → first remote Anime-Sama release**. E and F are
independent follow-ups after the baseline, not reasons to delay the first trial.

For each implementation, update architecture, host instructions, maintenance
coverage and evidence. Run applicable Node/Python/native and JVM/Android tests;
add synthetic regressions for protocol changes. Exercise installed addon URLs,
not only numeric-ID internal controls. Measure no-search idle separately from
actual lookup load and tunnel keepalives on the real Pixel.

Publish signed APKs using the existing certificate, increasing versionCode.
Preserve saved metadata, access tokens, application ID and working install URLs
or provide an explicit migration/alias. Keep native stable/+ distributions intact.
A rollback to older behaviour must still use an installable higher-versionCode
update if Android would reject downgrading; preserve the original signing key.
Do not claim that an older APK can always be installed over a newer release.

The first real remote deployment is accepted when the Pixel survives normal
screen-off/reconnect conditions, authorized Nuvio devices on different networks
reach a stable HTTPS URL without VPN/browser authentication, selected episodes
map correctly, validated hosts play with their expected tracks, and access can
be revoked without wiping the host configuration. Record outstanding OEM reboot,
player, quota and host restrictions rather than claiming complete reliability.

## 11. Decisions to settle before implementation/deployment

- Confirm that revocable possession-based URLs satisfy the access requirement;
  strict physical-device verification remains outside this client integration.
- Decide whether the initial shared Nuvio profile uses one household key, or
  whether distinct installations/profiles can retain separate keys/presets.
- Confirm Pixel-only connector feasibility and acceptable free-tier behaviour;
  an account, private connector token and physical setup are user-side actions.
- Choose the initial host/format coverage needed for the first trial. No need to
  wait for every legacy host to become available, but list all remaining gaps.
- Decide actual lifetime-test scheduling and supported unattended Pixel behaviour
  after the baseline. This plan does not start or authorize arbitrary background
  jobs, buy a domain, introduce a paid service or proxy video.

These are design choices for the next implementation, not a request to send
secrets or block documenting the plan now.
