# AIOmetadata input-order adapter

The native interface supplies ID/type/season/episode, not the selected metadata
add-on. This integration uses an explicitly configured AIOmetadata manifest URL
as the input episode reference. Backend episode layouts remain independent.
No personal URL belongs in source, manifests or generated public bundles.

## Private diagnostic

Set the repository Actions secret `NUVIO_AIOMETADATA_MANIFEST_URL` to the exact
configured `https://.../stremio/.../manifest.json` URL (a `stremio://` install URL
is also accepted). Run **Private input metadata check** manually. It reads only
three public shows, comparing IMDb/TMDB query namespaces. Output is a strict
whitelist of public series IDs, provider names, episode stream IDs, titles,
dates and TVDB episode IDs found in trusted artwork paths. It never retains the
manifest URL, raw metadata, headers, config, account data or exception messages.
Artifacts expire after three days. No account/configuration is changed.

What can break: user configuration removal, changed routes, auth/rate limits,
input ID namespace affecting AIOmetadata detection, rewritten video IDs,
localized titles, missing episode IDs/dates and large metadata responses. A
successful series-ID lookup is not an episode-order conversion. Inspect provider
and per-video stream IDs before selecting an episode; do not guess from counts.

The native adapter and its migration/tests will be documented with its release.
Phone scraper settings are local; TV 1.0.0 reads settings but has no editor or
cross-device setting-sync path in the inspected app code. Runtime compatibility
does not establish a TV configuration UI. Do not embed a personal URL in a public
build to bypass that limitation.
