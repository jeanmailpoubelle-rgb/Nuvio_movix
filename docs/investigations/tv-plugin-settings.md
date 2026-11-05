# TV plugin configuration — 2026-11-05

The user confirmed **Nuvio TV1.0.0**. They accept configuring each phone entry
once; do not build a shared-settings service as an incidental convenience.

## Findings

TV1.0.0 can read per-scraper settings and inject them into the JS bridge. However,
its settings setter has no caller, there is no plugin `onSettings` editor, and
repository synchronization transfers repository information rather than the
phone's scraper-settings values. The profile-settings feature list also excludes
`plugin_settings`. Installing the preview URL on TV does not populate the personal
AIOmetadata URL. A successful phone test does not establish TV configuration.

Inspected source: tag1.0.0, commit `9f17e8bf4abc799dc8c832d2894a8b3b166e4353`:

- [Per-entry read/write storage](https://github.com/NuvioMedia/NuvioTV/blob/9f17e8bf4abc799dc8c832d2894a8b3b166e4353/app/src/main/java/com/nuvio/tv/data/local/PluginDataStore.kt#L223).
- [Repository synchronization](https://github.com/NuvioMedia/NuvioTV/blob/9f17e8bf4abc799dc8c832d2894a8b3b166e4353/app/src/main/java/com/nuvio/tv/core/sync/PluginSyncService.kt).
- [Profile-settings feature list](https://github.com/NuvioMedia/NuvioTV/blob/9f17e8bf4abc799dc8c832d2894a8b3b166e4353/app/src/main/java/com/nuvio/tv/core/sync/ProfileSettingsSyncService.kt#L186).

The latest published beta checked, **1.1.0-beta.11**, corresponds to default-branch
commit `1206736fd4322e1e8d4bd962188cf7e91ec9c1d5`. It adds a plugin-settings
feature to profile synchronization, but its import routine explicitly reads only
`group_streams_by_repository`. This is **the grouping toggle**, not the personal
AIOmetadata URL or arbitrary scraper settings. Do not recommend upgrading as a
fix for this issue based on the `importPluginSettings` name alone.

- [Group-only importer](https://github.com/NuvioMedia/NuvioTV/blob/1206736fd4322e1e8d4bd962188cf7e91ec9c1d5/app/src/main/java/com/nuvio/tv/core/sync/ProfileSettingsSyncService.kt#L439).
- [Latest storage setter](https://github.com/NuvioMedia/NuvioTV/blob/1206736fd4322e1e8d4bd962188cf7e91ec9c1d5/app/src/main/java/com/nuvio/tv/data/local/PluginDataStore.kt#L263), still without callers.

## Outcome and next verification

Keep the working phone configuration and independent entries. No shared storage,
account, hosted service, private bundle or application modification is introduced.
TV1.0.0 configured translation remains blocked by setup, not disproved by the
native-wrapper tests. Unconfigured preview entries correctly fail closed.

An app-side plugin editor, a supported import mechanism or actual per-entry
settings synchronization could resolve this. If revisiting after an app update,
check all of: editor/setter callers, exported fields, importer allowlist, runtime
ID mapping (phone uses repository URL; TV uses repository UUID), profile ownership
and the final injected `SCRAPER_SETTINGS`. Then test on physical TV. Do not infer
support from repository sync, grouping sync or a successful injected harness run.

The separate Sources FR provider-coverage question stays open. Entries returning
no links in both the stable TMDB profile and the configured preview have not
exercised their translation/playback paths. They are **unverified**, not established
translation regressions or proof of a universal upstream outage. Some configured
backend families are deliberately skipped until their target layouts are verified.
Find a stable working title before comparing the preview, preserving the backend
identity checks and quality/audio policies.
