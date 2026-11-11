# The World's Strongest Witch E6 — 11 November 2026

Investigation only; no runtime, numbering policy or plugin version changes.
User reports stable can find today's S1E6 while Anime-Sama Preview cannot.
Series identity is TMDB321518 / IMDb tt43691408 / TVDB477424; Anime-Sama's
catalogue page explicitly links that TMDB TV ID.

## Confirmed dependency mismatch

- Anime-Sama has the selected season1 VOSTFR episode6. Actual stable1.2.13 and
  Preview1.3.0-beta.10 in explicit native control mode both select index5 and
  return one reachable1080p ANSEmbed VOSTFR stream. E5 controls also work.
- The saved private AIOmetadata configuration returns TVDB episode12023447 for
  displayed S1E6, titled “J'ai essayé de devenir une déesse”, released
  2026-11-11T13:00:00Z. Thus AIO's selected episode is present.
- Nuvio Catalog's TMDB route includes S1E6 with the proper English title
  “I Tried Becoming a God!”, dated2026-11-11. The IMDb route and Cinemeta instead
  still call that episode “Episode 6”; Cinemeta has the same TVDB ID12023447.
- TMDB's authenticated `/find/12023447?external_source=tvdb_id` returns an empty
  `tv_episode_results` list. E5's ID12023446 resolves correctly to TMDB episode
  7903444, show321518, S1E5. This is missing external-ID association data, not a
  missing TMDB episode row or an HTTP/network error.
- Configured Preview S1E6 stops after four metadata requests with
  `INPUT_METADATA_EXTERNAL_ID_UNAVAILABLE`, before host discovery. The shared
  Sources FR main entry stops at the same mapping stage; this does not establish
  whether its own backends have media for this title.
- Configured E5 maps successfully and reaches the exact source slot. Its cloud
  ANSEmbed playlist returned403, a separate media-access failure; local native
  controls reached that edition. Do not conflate this with E6's mapping failure.

## Why Preview differs

Preview verifies the configured TVDB episode's correspondence before selecting
source coordinates. Its confirmed-empty external-ID fallback can corroborate the
same TVDB/IMDb episode through Cinemeta and match a unique meaningful title/date
against the reference inventory. “Episode 6” is deliberately not a meaningful
identity signature. Therefore this fallback cannot finish yet. The stable/native
control does not perform that TVDB translation.

The Haikyuu reference-inventory repair does not apply: the target episode exists
here, while its external association and canonical fallback title are incomplete.
This is consistent with newly published episode data reaching services at different
times. No cache history or upstream refresh schedule was measured; no guaranteed
recovery time can be stated.

## Present handling and possible future work

Keep the existing stable/native metadata profile as the temporary control for
this episode. Do not globally switch a TVDB profile's Preview entries to native
mode; other titles can require translation. Recheck the external-ID association
and canonical title when upstream metadata updates. Either a valid association
or sufficient verified fallback title information may restore the current path.

Do not hardcode this title, bypass verification for recent releases, or equate
TVDB/TMDB/source episode numbers just because the file exists. Any additional
fallback needs independent episode evidence, negatives for different season
boundaries and batch releases, and tests retaining generic-placeholder rejection.
See [META-02](../limitations.md#meta-02--fresh-episode-associations-and-placeholder-titles).

[Sanitized public facts, bundle hashes and runtime controls](../../tests/evidence/witch-new-episode-2026-11-11.json).
Private manifest URLs, raw player responses and signed streams are excluded.
The temporary configured probe is isolated on
`investigate/witch-episode6-2026-11-11`; it is not installed provider code.
