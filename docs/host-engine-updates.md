# Hosted engine releases

Sources Host0.3.0/API1 separates Android runtime updates from discovery/mapping/
resolver updates. Phone plugins and hosted engines consume the same generated
production bundles. `scripts/build.cjs` maintains `hosted-engines/bundled.json`;
never hand-edit hashes or resolver assets.

## Trust and delivery

The APK pins `hosted-engines/release-public.pem`. Its corresponding RSA3072
private key is outside the repository. Signed channel metadata lives at
`hosted-engines/stable.json`; its payload includes a monotonic sequence, exact
40-character tested source revision, API/minimum-app requirements, independent
family versions, entries/types and immutable GitHub bundle URLs with SHA256.
The signature authenticates the exact decoded payload bytes, not reserialized JSON.

An update downloads all required files into private staging storage, verifies
bounds/hashes, loads every unique bundle in QuickJS without network capabilities,
checks `getStreams`, renames the complete directory and atomically replaces its
state pointer. No clients can specify executable URLs. Source/player pages do not
become executable downloaded code. No playlist decoding, token stripping or media
proxy is introduced.

Checks are single-flight, nonblocking for lookup, startup/on-use with a six-hour
persisted cooldown, and manual on demand. No idle timer/wake lock. One lookup
captures one package. Generation+file+entry keys prevent stale bytecode reuse.
A shared transport/cache is retained; sessions stay inside individual JS lookups.

Startup authenticates installed metadata and rehashes code before use. A damaged
current package falls back to a verified previous package or the APK. Interrupted
staging/state writes are never activated. Failed checks retain current code.
**Use previous verified engines** explicitly rolls back, preserves all addon URLs,
and blocks reinstallation of that release until a higher sequence appears.
Empty/missing/contradictory metadata and source outages never trigger rollback.

## CI publishing

`.github/workflows/host-engine-release.yml` follows a successful Android host
workflow on main. It tests maintained plugin distributions and Python runtime
fixtures, reruns host ABI/authentication tests and signs only that checked commit.
Publishing verifies that main still has the tested catalogue/key; documentation or
mapping-data-only advancement is allowed. Stale jobs never overwrite newer engine code.
Only the authenticated channel metadata is committed. Bundle URLs point to the
immutable tested commit, so a later push cannot mutate an installed release.
Unchanged family versions/hashes do not create redundant releases.

One-time repository secret: **HOST_ENGINE_SIGNING_KEY**, containing the PEM private
key corresponding to the public key already pinned in this APK. Do not paste it
into chat, source, release assets, job logs or public issues. The task's GitHub
connection cannot create Actions secrets (HTTP403). Until an administrator saves
that secret, publishing can be done locally with the retained private release key;
the Android updater is functional, but CI cannot sign future releases unaided.
The retained private workspace copy is
`/workspace/shared/host-engine-signing/release.pem`; retrieve it privately for
enrollment/backup, not through public GitHub assets. Do not generate a different
key without coordinating a new trusted APK.

For a tested local release:

```sh
python scripts/publish_host_engines.py \
  --revision FULL_TESTED_COMMIT_SHA \
  --sequence MONOTONIC_RELEASE_NUMBER \
  --key /private/path/release.pem
```

Commit/push only `hosted-engines/stable.json`. The first manually published
sequence should be below the next GitHub workflow run ID. The helper verifies its
own signature against the pinned public key before writing channel metadata.
For CI secret enrollment from a trusted local machine with admin credentials:

```sh
gh secret set HOST_ENGINE_SIGNING_KEY --repo jeanmailpoubelle-rgb/Nuvio_movix < /private/path/release.pem
```

This uses a distinct key from the APK certificate and ngrok SSH identity. APK
updates retain package identity and original certificate. A runtime API mismatch
or higher minimum-app release requires updating the APK; it is never forced into
an incompatible runtime. Phone-only plugins continue their Nuvio refresh path.

## Maintenance acceptance

Check channel signature, immutable-file hashes, active family versions, compatible
API/app requirements and the source revision's completed tests. Exercise bad
signature, changed code, unsupported host, missing export, offline GitHub,
concurrent check/lookup, interrupted writes, startup corruption, previous-release
rollback and a later update. Also retain transport/media, per-entry dispatch,
missing-mapping and no-idle-work tests. Mobile addon subtitle headers are a known client limitation; preserve inline TV
tracks and explicit media types, and test the fresh selected-entry subtitle resource, including cross-preset and post-edit isolation.
Core regression coverage lives in
`HostedEnginesTest`; the normal plugin suites remain mandatory.

Physical Pixel hot-update lookup continuity, OEM reboot handling and cross-network
media playback are separate device acceptance; JVM/emulator success cannot prove
those conditions.

The existing daily AniBridge producer remains separate: data pointers/shards are
refreshed by `sources-en-mappings.yml` and consumed by engines as before. An engine
release changes executable discovery/mapping/resolver logic; it does not replace
the daily data workflow or cache signed media.
