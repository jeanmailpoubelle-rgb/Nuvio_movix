# Dood duplicate cards and unverified resolution — 28 November 2026

Kalki2898 AD (TMDB801688) advertises Dood through both FStream's VOSTFR and Default
groups. The wrappers differ, but both redirect to the same known Dood origin and
upload ID. Resolving each player generates a new randomized signed media URL;
URL-only deduplication therefore misses the duplicate. The user supplied two
playback URLs with the same published token, corroborating the shared upload.
Dark Knight155 exposes a different Dood upload through Frembed.

The previous shared resolver inferred1080p from the upload filename or catalogue
hint. A host can transcode that upload, so those strings do not certify served
resolution. This is separate from the existing HLS inspector, which reads actual
playlist dimensions. No readable Dood media was obtained to confirm the user's
observed720p: fresh players show challenges on this runner, and the supplied
three signed CDN URLs returned identical14-byte non-media responses with HTTP200.
One response was explicitly classified `error_wrong_ip`. HTTP200 alone is not
video or resolution proof. URLs, public source tokens and player/media bodies
are not retained in evidence.

## Change

FR1.8.32/+beta32 use the provenance/quality repair below. Anime-Sama1.2.22/+beta28
share the corrected Dood quality policy; their separate outer edition deduplication
is unchanged:

- Dood MP4 output clears unverified upload/catalogue resolution hints. Preserve
  upload descriptions, host provenance and existing audio labels; leave quality
  unknown rather than asserting720p. HLS measured metadata/other hosts are unchanged.
- A non-serialized resolver-owned identity binds known resolved Dood origin,
  canonical upload route/ID and published pass_md5 source token. Within-worker
  dedup additionally requires matching format, language and all canonicalized
  playback headers. Different/unrecognized origins, uploads, tokens, languages
  and credentials remain separate. No cross-entry identity store was introduced.
- Retain the first complete original signed media URL and merge subtitle
  inventories using existing normalization. No URL parameter stripping, grant
  cache, per-title mapping table, additional HTTP request or MP4 probe is shipped.

This repair removes duplicate cards without promising fewer player requests:
both aliases can still resolve before their identity is known. Counting one
unique result can also let existing selection continue to another useful source
rather than counting duplicate cards toward its target.

## Verification and limits

The native/+ Node fixtures model the exact alias pattern, independent signed
URL suffixes and1080p upload/API hints. They retain genuine differences in upload,
language, origin, token or header credentials. Literal Mobile/TV fixtures cover
same-upload aliases versus different uploads without fetching CDN media. Existing
Dood challenge handling and URL bytes remain unchanged.

Live source-only probes used the actual generated native FStream/Frembed workers
with a development filter isolating Dood candidates. Both Kalki wrappers reached
the same upload and challenge; Dark Knight reached a different upload/challenge.
No private metadata manifest, external challenge solver or downloaded JavaScript
execution was used. The development-only bounded media reads of user URLs could
not inspect video because of CDN IP binding. Physical Nuvio playback and served
resolution still need a check on the user's network.

[Sanitized evidence](../../tests/evidence/dood-duplicates-quality-2026-11-28.json).
