# Xperience input metadata — Preview

Preview versions: Sources FR **1.9.0-beta.13**, Anime-Sama **1.3.0-beta.14**,
episode diagnostic **1.0.0-beta.13**, Sources EN **0.1.0-beta.13**.
Stable main is unchanged. This adapter preserves the existing AIOmetadata path;
settings default to AIOmetadata for existing installations.

## Profile and entry setup

In Xperience, start with TMDB regular series, TVDB anime metadata and IMDb anime
stream IDs. Seasonal numbering is the clearest presentation for this test; the
private profile check confirms seasonal episode fields for the sampled anime,
without establishing what changing the numbering option does to every response.

Refresh the Preview plugin repositories. In **each enabled entry’s gear**:

1. Keep configured episode metadata enabled (FR/Anime-Sama: the option labelled
   **Ma configuration AIOmetadata / Xperience**, not native).
2. Select **Xperience** as the personal metadata addon.
3. Paste your private Xperience manifest into **Manifeste personnel AIOmetadata /
   Xperience**. The existing storage key is retained so AIO settings are not lost.
4. Use **IMDb** query format. Select **TVDB — Aired Order** for this TVDB anime
   profile, then Save. Select TMDB only when that entry is used with actual TMDB
   episode metadata; the choice is explicit, not inferred from the stream ID.
5. Configure diagnostic and EN Standard/Beta entries separately when used. On the
   episode diagnostic, also leave its expected list at TVDB for this anime test.

These choices are per entry/device. Switching Nuvio profiles does not
necessarily switch a plugin’s saved manifest/order. Never paste your private URL
into GitHub issues, source code or reports. Actions secrets configure cloud tests,
not the phone. TV1.0.0 still lacks the private-settings editor.

## What is different from AIOmetadata

The tested Xperience responses expose IMDb identity and seasonal video rows but
omit AIOmetadata’s `_metaProvider`, `_tvdbId` and `_tmdbId` stamps. Silently treating
them as AIOmetadata leaves the provider unknown. The explicit Xperience adapter
uses the user’s declared episode provider and still validates series/stream
identity. An available conflicting provider stamp is rejected.

For TVDB input, the selected episode must have one unique extractable TVDB
episode ID, using an explicit supported field or a trusted TVDB artwork URL.
Missing/duplicate IDs stop the lookup; there is no source-length or same-numbered
season guess. This conservative restriction is specific to Xperience; the
existing AIOmetadata fallback for opaque artwork is unchanged. An opaque/custom
image service may therefore prevent Xperience translation until independently
verifiable episode identity is added.

FR/Anime-Sama then use their existing external-ID/title/release/reference mapping.
Xperience TMDB mode requires unique episode evidence rather than the AIO
provider-coordinate shortcut. EN retains AniBridge’s directional ranges and
ani.zip’s veto-only policy: absent ani.zip data still does not invalidate a map.
Known contradictory facts still stop lookup. Resolvers, original signed masters,
language filtering and stream ordering are unchanged. No new lookup request is
introduced by selecting the adapter; it normalizes already-read metadata.

## Evidence and maintenance

The first configured probe successfully read both IMDb and TMDB routes. Thirteen
selected anime episodes had the same TVDB episode identities as the configured
AIOmetadata control, including Hunter S2E1/S2E72 and the S2E62/E63 boundary,
Apothecary S1E1/S2E1/S3E1 and Haikyuu S2E15. Their dates are not byte-identical;
existing release/identity guards remain important. The regular Office control
has different season inventories between the two profiles and no extractable
TVDB IDs in the selected rows; do not label an entire Xperience profile TVDB
based only on anime success.

[Investigation](investigations/xperience-compatibility-2026-11-21.md) records the
public schema and configured probe. [Verification](../VERIFICATION.md) records
installed-entry live results when available. A metadata success alone is not
physical playback or complete catalogue coverage.

Repair settings/schema normalization in `src/input-metadata.js`, then test the
shared caller paths and EN independently. Missing Xperience TVDB episode evidence
reports `INPUT_METADATA_XPERIENCE_EPISODE_ID_REQUIRED`; an absent declared order
reports `INPUT_METADATA_PROVIDER_REQUIRED`. Preserve all AIO/native regressions.
The `Xperience private metadata probe` workflow uses
`NUVIO_XPERIENCE_MANIFEST_URL`, compares sanitized metadata and exercises focused
FR/Anime-Sama translation plus independent EN Standard/Beta media. Its reports
must never contain private endpoints, raw metadata, signed streams or captions.
