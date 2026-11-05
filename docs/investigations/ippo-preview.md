# Hajime no Ippo — preview/stable investigation, 2026-11-05

Investigation/report only. Playback source, generated bundles, settings defaults
and stable main are unchanged. Diagnostic tooling adds this series to the private
facts probe and supports bounded installed-entry traces.

Identity is TMDB42705 / IMDbtt0481256 / TVDB79685. Metadata calls the series
**Fighting Spirit**; Anime-Sama calls it **Hajime no Ippo**. The correct source
page `/catalogue/hajime-no-ippo/` explicitly links to TMDB TV42705 and contains
three normal seasons. Regular AIOmetadata/TVDB and Nuvio/TMDB inventories agree:
75,26,25 episodes. Cinemeta additionally lists a76th S1 episode; do not infer
season offsets from that difference or silently move specials.

## Reproduction and evidence

[Public sanitized evidence](../../tests/live-ippo-investigation-2026-11-05.json)
retains actual bundle hashes, metadata facts, mapping events, source selection,
media reachability and explicit control scopes. Configured Actions trace:
[42106262801](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/42106262801).
Exact stable Anime1.2.9 and preview1.3.0-beta.4 native controls fail the same way.
The local first catalogue probe omitted the required `tmdb:` route prefix;
its empty response was discarded, not classified as an upstream/plugin defect.

E1 of each regular season, actual Mobile main API/ANSEmbed entrypoints:

| Season | Native main sources / requests | Configured main sources / requests | Native Anime sources / requests | Configured Anime sources / requests |
| --- | --- | --- | --- | --- |
| 1 | 1 /2 | 1 /5 | 0 /4 | 0 /6 |
| 2 | 1 /2 | 0 /3 | 0 /4 | 0 /3 |
| 3 | 1 /2 | 0 /3 | 0 /4 | 0 /3 |

Main native samples for all three and configured S1 are media-reachable206.
Availability does not establish that the decoded video contains the selected
actual episode; the user has not confirmed that content.

## Failure 1: TVDB episode find is absent for sampled later seasons

The input has usable TVDB episode IDs; this differs from AOT’s missing-ID case.
TMDB `/find/<episode>?external_source=tvdb_id` returns correct matches for S1E1
and E75, but empty `tv_episode_results` for S2E1/E26 and S3E1/E25. For example,
S2E1 is TVDB380974 and S3E1 is TVDB4628176. Successful HTTP with no match is not
a failed API key or a video outage. All four tested later-season finds are empty;
we did not query every external episode association.

`src/input-metadata.js:resolve` stops with `INPUT_METADATA_EXTERNAL_ID_UNAVAILABLE`
before provider inventory. Its existing stream/date fallback applies only when
no external ID exists; these rows have IDs, so it does not run. This blocks both
preview main and preview Anime at S2/S3, even before Anime title discovery.

A development-only cross-check corroborates all26 S2 and25 S3 episodes through
an exact TVDB episode-ID match in Cinemeta, input/canonical date tolerance, and
unique canonical/target title+date. Every proven result retains its S/E numbers.
This is evidence for a generic recovery path, not a released change. Eleven S1
rows do not match through this candidate; preserve healthy external-ID paths.
S2E1 input date2009-01-07T11Z versus Nuvio2009-01-06T00Z differs35h; its Cine row
2009-01-06T15Z agrees within the existing24h tolerance with each. The exact TVDB
identity must corroborate that bridge; do not widen date tolerances or guess.

## Failure 2: source alias is undiscovered, stable as well as preview

Both versions read Fighting Spirit, try `/catalogue/fighting-spirit/` (404),
search that title and receive no matching source card. Cinemeta also says
Fighting Spirit, so the current alternate-name recovery adds no useful alias.
The real source page has the correct explicit TMDB ID but cannot be checked
until discovered. Trace ends `SOURCE_TITLE_NOT_FOUND`, before host extraction.
This is shared pre-host selection, not proof that the ANSEmbed resolver is broken.

An unscoped development sourceMap control bypasses discovery/mapping and starts
at the verified source group/index. It discovers four S1E1 candidates and three
for each S2E1/S3E1. Returned media: S1 three720p links, all403 in cloud; S2/S3
two1080p links each, VF/VOSTFR, all206. These controls prove available downstream
extraction, not an installed-entry partition test or decoded-content mapping.

## Recommended next change (not implemented)

1. On a successful, truly empty TMDB episode find, corroborate the exact same
   TVDB episode in independently identified Cinemeta, then use unique canonical
   title/date correspondence into the target. Keep foreign, conflicting and
   ambiguous responses rejected; distinguish transport/auth failures from empty
   results. Preserve existing successful paths and per-lookup reuse.
2. Improve verified alternate-title discovery on a source-title miss so Fighting
   Spirit can reach Hajime no Ippo. Retain exact source external-ID/year checks,
   bounded searches and fast healthy paths. Confirm any proposed metadata alias
   endpoint actually supplies that alias before adding it as a dependency.
3. Add installed-entry/both-wrapper regressions for these two generic cases and
   retain AOT/Hunter/Jujutsu/Apothecary controls. Do not add title offsets or
   lower quality rules. Investigate persistent S1 host403 separately.

Reproduce with the private input workflow on the preview branch:
`facts_only=true`, `trace_case=ippo`. Secrets remain Actions runtime inputs;
reports contain public facts only. Only Mobile was live-traced here; physical
playback, all season episodes, all Sources FR families and all installed Anime
host partitions remain outside the demonstrated coverage.
