# Ace of Diamond: exact-title recovery — 2026-11-01

The affected title is Ace of Diamond (2013), TMDB 60761 / IMDb tt3105422,
not the separate Act II series. Nuvio Catalog returns **Ace of the Diamond**;
Anime-Sama and Cinemeta use **Ace of Diamond**. The source does not list the
primary spelling among its aliases. Strict matching therefore stopped before
episode/host discovery with `NO_EXACT_SOURCE_ALIAS`. Both numeric and IMDb
lookups returned zero links in 1.2.1.

Anime-Sama 1.2.2 tries alternate names only after a primary exact-title miss.
`catalog-context.js:sourceTitleAliases` requests Cinemeta through the primary
catalogue's explicit IMDb correspondence and requires the response to identify
the same title. `native.js:resolveSelection` retries matching once with those
names. Original dates, episodes and numbering remain authoritative. There are
no production Ace IDs, source paths, article-removal rules or fixed offsets.
Ambiguity, missing identity and conflicting years still fail closed.

The live source is `/catalogue/ace-of-diamond/saison1/vostfr/`, script index 0
of 75 slots. It publishes ANSEmbed and Sendvid. All six installed entries were
checked separately on TV and Mobile: both return one ANSEmbed 720p VOSTFR link
with a passing bounded media sample and correct complete partition. No VF is
published for this season. Sendvid's Mobile candidate fails validation; TV 1.0.0
cannot safely perform its binary placeholder check and deliberately skips it.

Healthy exact matches add no requests. A recovered mismatch adds one metadata
read per entry and one bounded normal matching retry, reusing per-lookup page
data. The six contexts still repeat prerequisites: this live Ace sample used
63/65 total extraction requests on TV/Mobile, first link at 7.59/6.72 seconds.
These cloud timings are not phone/TV performance guarantees.

## Repeat and repair

```sh
node --test tests/anime-title-aliases.test.cjs tests/anime-plugin.test.cjs
.venv/bin/python scripts/quickjs_check.py --all --runtime both
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --entry-id anime-sama --case ace-diamond
.venv/bin/python scripts/verify_anime.py --case ace-1 --runtime both --report reports/ace.json
```

Inspect `anime-alias-recovery` or `anime-alias-unavailable`, then `anime-source`,
`anime-episode` and per-entry selection/partition evidence. If this breaks again,
check `metadata.cinemeta`, the echoed IMDb fields and names, source aliases/year,
and source edition/script routes. Alternate names must not replace episodes or
dates. Maintenance group/index coordinates are test expectations only.

Expected 404s for the first guessed slug and absent VF variants remain recorded;
do not classify a playable VOSTFR result as missing merely because these reads
failed. Conversely, one working link does not prove every host is healthy.
Jujutsu Kaisen S2E22 and Suzume control lookups retain ten and two links per
wrapper, but their remaining media/caption failures are still coverage gaps.
Physical Android playback was not tested. See the
[sanitized evidence](../../tests/evidence/anime-title-aliases-1.2.2-2026-11-01.json).
