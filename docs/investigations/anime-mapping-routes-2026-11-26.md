# Anime-Sama mapping routes — comparison, 26 November2026

**Recommendation: preserve the current route and Anime-Sama source mapper; add
AniBridge as a bounded fallback for incomplete input-to-reference correspondence.**
Prefer this structured-data route over adding the proposed TVDB HTML-title scraper
first. This is research and advice, not a deployed fallback or APK update.

## What was executed

The [research inventory](../../config/anime-mapping-study.json) covers44 displayed
episode positions across9 anime: Witch, Hunter, Haikyuu, Apothecary Diaries,
Attack on Titan, Ippo, Vinland Saga, Jujutsu Kaisen and Detective Conan. Every
position was evaluated against the saved AIOmetadata and Xperience configurations:
88 profile evaluations. These are TVDB anime setups, not arbitrary provider/order
configurations. Xperience's current route uses auto; its EN comparison uses the
existing explicit-TVDB input guard and missing-ID recovery.

The comparison executes the actual current pure Input/EN modules against live
configured metadata, official TMDB identities/find results, Nuvio Catalog,
Cinemeta and ani.zip. Source checks additionally execute a temporary copy of the
actual generated Anime-Sama+ bundle: only input-to-reference correspondence is
replaced by the research candidate. Reference identity, unique target-row check,
strict TargetContext and all source-title/group/range/edition/slot logic remain
unchanged. Normal TMDB credentials enable the existing official alias discovery.

The final [Actions run](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/actions/runs/45749859787)
completed successfully without HTTP errors. It contains28 source-check records:
27 wrapper executions,26 successful selections, one expected rejection of a
nonexistent reference target, and one season-zero target explicitly not executed.
Five representative paths were exercised on both literal Mobile/TV wrappers.
These checks do not extract host streams, verify video content/frame identity,
measure physical device latency, or prove playback. No production plugin, APK,
source policy, cache lifetime or mapping-data pointer was changed.

[Persistent sanitized evidence](../../tests/evidence/anime-mapping-routes-2026-11-26.json)
records public episode IDs/candidates, profile outcomes, slots, code hashes and
scope; private manifests, API keys, raw metadata and signed URLs are excluded.

## Three routes and measured results

1. **Current:** configured episode → official TVDB-ID find and existing verified
   title/stream/canonical fallbacks → reference episode.
2. **Direct ranges:** explicit AniBridge TVDB-show-season → TMDB-show-season range.
3. **Explicit composition:** TVDB → AniList → TMDB, using two real forward entries
   from the same AniBridge snapshot. No mapping is reversed or guessed.

[AniBridge's schema](https://github.com/anibridge/anibridge-mappings#readme) states
that mappings are directional. Empty ID associations do not establish an episode
range. The study accepts only the existing EN parser's one-to-one supported
ranges; ratios and multi-segment mappings are not generalized.

Counts below apply **per metadata profile**, not88 different episodes:

| Measure | Result out of44 positions |
| --- | --- |
| Current route establishes a reference episode | 40 |
| Composed route agrees with those40 successful results | 40; no differing usable target |
| Direct TVDB→TMDB range available | 32 |
| Direct route yields one target present in the live reference | 30 |
| Explicit composition yields a candidate | 43 |
| Composition yields one target present in the live reference | 41 |

Whenever both direct and composed candidates exist (32 positions), their complete
candidate sets agree. Neither route's existence alone is playback approval.
Direct and composed routes can share inferred graph edges/upstream data, so their
agreement is not two independent votes. This is a boundary-focused sample, not an
exhaustive error rate or a promise that every AniBridge mapping is correct.

## Representative comparisons

“Reference” means the inventory actually used by Anime-Sama+, not an assumption
about every service calling itself TMDB.

| Displayed TVDB episode | Verified/candidate reference position | Existing Anime-Sama slot checked |
| --- | --- | --- |
| Witch S1E8 | S1E8 via both AniBridge routes; current route unavailable | season1 / episode8, both wrappers |
| Hunter S2E1 | S1E59 | season1 / episode59 |
| Hunter S2E4 → S2E5 | S1E62 → S2E63 | season1 / episode62 →63, continuous |
| Hunter S2E62 → S2E63 | S2E120 → S2E121 | season1 / episode120 →121 |
| Hunter S2E72 | S2E130 | season1 / episode130 |
| Haikyuu S2E15 | S2E15 | season2 / episode15 |
| Haikyuu S4E13 → S4E14 | S4E13 → S4E14; AniList entry changes, local episode resets13→1 | season4 / episode13 →14 |
| Apothecary S2E1 | S1E25 | season2 / episode1 |
| Apothecary S3E4 | S1E52 | season3 / episode4, both wrappers |
| Attack on Titan S3E12 → S3E13 | S3E12 → S3E13; AniList entry changes | S3E13 selects season3 / episode13 |
| Attack on Titan S4E16 → S4E17 | S4E16 → S4E17; AniList local episode resets16→1 | season4 / episode16 →17 |
| Ippo S2E1 / S3E1 | S2E1 / S3E1 | corresponding season / episode1 |
| Vinland S1E1 | S1E1 | season1 / episode1, VF/VOSTFR editions |
| Conan S20E1 | S1E606 | Anime-Sama season16 / episode606, array index4 |
| Conan S34E1 | S1E1187 | Anime-Sama season31 / episode1187, index0, both wrappers |
| Jujutsu S2E1 | S1E25 is present; alternate S2E1 is absent | season2 / episode1; nonexistent alternate rejected |

The Haikyuu/AOT examples show why an AniList-local episode number must never be
fed directly into Anime-Sama. Conan and Apothecary demonstrate why existing
flattened/ranged source-group mapping must be retained.

### Remaining failures and qualifications

- **Witch E8 is the useful recovery demonstrated here.** It has TVDB12023449,
  AniList211778 E8, a unique reference S1E8 and the correct source slot. ani.zip
  supplies no contradiction, with four checks under the existing EN policy. The
  current path still stops because TMDB find is empty and Cinemeta says Episode8.
- **Hunter/Conan direct ranges are incomplete.** Eight tested Hunter positions
  and three Conan positions lack direct TVDB→TMDB ranges, while explicit
  TVDB→AniList→TMDB composition supplies the existing correct reference result.
  A direct-only replacement would lose coverage.
- **Jujutsu has alternative targets.** Both S1E25/S2E1 are explicit candidates
  for displayed S2E1. Only the former exists in the tested reference inventory;
  both are not interchangeable source coordinates. A version that blindly takes
  the first candidate would be unsafe. If more than one target remains plausible,
  reject ambiguity rather than selecting one by availability or speed.
- **Attack on Titan S4E29/E30 remains unsupported for Anime-Sama+.** AniBridge
  targets S0E36/E37; neither is present in this reference and the plugin's ordinary
  series entry does not support season0. EN can reach distinct AniList entries,
  but that does not implement Anime-Sama's specials handling. E30's ani.zip
  episode row is missing in this check; that is absence, not a veto.
- **Ippo S1E76 is missing in both configured input inventories.** Neither route
  has a selected input episode to verify. Do not invent it or treat an unrelated
  special as regular episode76.
- **Dates are corroboration, not universal identity.** Correct Hunter examples
  differ by36 hours across provider/reference timestamps; Conan S20E1 differs
  by180 hours. Preserve the existing stronger episode-ID proof hierarchy rather
  than imposing a new blanket24-hour requirement. Title-only evidence retains
  its current strict date/uniqueness checks.

## Recommended pipeline and fallback rules

1. Keep the selected manifest and actual displayed episode as the starting point.
   Keep independent series-ID checks. An IMDb ID does not establish TVDB order;
   do not silently switch to the inactive manifest or apply TVDB ranges to a
   TMDB profile. Xperience auto needs positive input-order/episode evidence, not
   merely a matching series ID or an artwork filename.
2. Keep the complete current successful mapping route first, including its
   existing verified fallbacks. Add **no AniBridge requests to healthy lookups**.
3. Only on a classified absence of correspondence proof, try the bounded
   AniBridge fallback. First use supported direct TVDB→TMDB ranges, then explicit
   TVDB→AniList→TMDB ranges where needed. Validate the result against the exact
   expected show and real reference inventory. Reconcile overlapping paths;
   do not treat extra ambiguous/foreign targets as success.
4. Reuse EN's corroboration components with clear input-order requirements.
   ani.zip can veto known conflicting IDs/episodes/dates; missing data is not a
   contradiction. If a necessary input-order proof is itself missing, the lookup
   still cannot proceed: this is different from using absent ani.zip data as a
   veto. Do not extend EN's missing-ID policy into FR/Anime-Sama incidentally.
5. Require one supported, sufficiently verified reference episode, then pass it
   through **unchanged strict TargetContext and Anime-Sama source mapping**.
   Keep source-title identity, canonical group counting, explicit saga ranges,
   sparse/edition gaps, source-host resolution and presentation intact.
6. Refuse genuine contradiction, ambiguous or combined mappings, unsupported
   specials, absent input/reference rows and unverified source layouts. Do not
   convert all errors into fallback permission or use a different episode because
   it has playable media. A source/host failure must not trigger remapping.

The current `INPUT_METADATA_EXTERNAL_ID_UNAVAILABLE` code can represent multiple
causes. An implementation must distinguish confirmed-empty associations and
incomplete titles from foreign/invalid/contradictory find results; catching this
generic code alone is not a safe fallback trigger. Retain clear mapping basis and
safe diagnostic reasons for future debugging.

This route is preferable to adding the TVDB public-page parser first: the sample
Witch gap is covered by existing structured mapping data, and the EN update/
validation infrastructure is already maintained. Keep the exact-TVDB-title route
as a separately evaluated option for a later uncovered case, not an automatic
fourth network fallback added at the same time.

## Data delivery, cost and next implementation gate

EN currently publishes only **targets in AniList** from TVDB/TMDB source shards.
It discards direct TVDB→TMDB targets and AniList-as-source entries. These extra
relations cannot be read from today's installed EN shards. Extend the validated
daily producer with a separate compatible Anime-Sama fallback table; retain
existing EN tables, immutable revisions and old clients. Prefer precomputing the
bounded explicit two-edge composition during publication, preserving ambiguities
and unsupported cases, rather than downloading the whole dataset on the phone.

The source payload hash matches the published revision84ea1f561a1f3d9b. Scheduled
mapping jobs on23/24/25 November succeeded; an unchanged22 November pointer here
means mapping rows are unchanged, not that daily checks stopped. Use one immutable
revision throughout a lookup and never use an older rule to erase a contradiction.

A fallback could target one pointer plus one small shard and an optional ani.zip
read, with reuse inside a lookup. This is a design target, not a measured latency
claim. Research HTTP reuse and the extra source-test reference read make these
runs unsuitable as a cold/warm phone/TV speed benchmark. No background polling,
preloading, media cache or token stripping is proposed.

Before shipping a separate Anime-Sama+ trial: test foreign show/episode IDs,
unknown/contradictory providers, ambiguous duplicate reference rows, conflicting
routes, unsupported ratios/segments, batch dates, incomplete inventories, network
and revision failures, stale baseline rules and source failures. Require unchanged
native outputs/requests, unchanged healthy + requests, correct source slots on
both wrappers and measured bounded fallback cost. Preserve currently unsupported
season0/AS-01 cases. FR integration and changes to EN's primary/veto policy are
outside this proposed first trial. An Android-host engine change would require
its own signed APK delivery until the planned engine updater exists.
