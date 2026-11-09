# Attack on Titan — explicit source identity, 2026-11-02

Both TMDB 1429 and IMDb tt2560140 S1E1 returned zero links in Anime-Sama 1.2.2.
Metadata calls the series Attack on Titan. The source page is
`/catalogue/shingeki-no-kyojin/`; its aliases contain longer English variants,
but omit the plain title. Cinemeta uses the same plain title, so alternate-name
recovery alone cannot solve this case.

The source's “Sur les autres sites” section explicitly links to TMDB TV 1429.
Version 1.2.3 parses `.oe-liens a[href]` into typed TMDB/IMDb identities and uses
that evidence alongside exact text aliases. Only canonical HTTPS URLs on exact
TMDB/IMDb hosts qualify. Ads, lookalike origins, season/episode subpaths, missing
IDs and malformed IDs cannot create correspondence. Conflicting relevant IDs
reject the page even with matching text; duplicate copies of the same ID are
deduplicated. Existing year checks still apply.

Numeric input supplies the TMDB ID directly. IMDb input uses the existing
same-IMDb Cinemeta fallback and its explicit `moviedb_id`. The fallback borrows
identity/names only, never episode inventories or dates. No Attack on Titan IDs,
names, source paths or fixed offsets are hardcoded in production. The source's
MAL/AniList links are not used yet. Search must still discover the candidate;
this change does not introduce a catalogue-wide index or extra identity requests.

## Maintenance

```sh
node --test tests/anime-external-ids.test.cjs
.venv/bin/python scripts/quickjs_check.py --all --runtime both
.venv/bin/python scripts/audit.py --skip-offline --provider anime-sama --case aot-anime
.venv/bin/python scripts/verify_anime.py --case aot-1 --case aot-imdb-1 --runtime both --report reports/aot.json
```

Repair locations: `pages.js:detail` for external-link markup/URL schemas,
`native.js:sourceIdentity` for comparison and conflict handling, and
`catalog-context.js` for metadata identity schemas. `anime-identity` exercises
the literal native wrappers without an extra metadata read. The live reference
is source season 1, index 0; it is a test expectation, not a production mapping.
Always inspect actual player/media findings separately from title matching.
Physical Android playback remains a device test.

## Results

Version 1.2.3 returns eight S1E1 links (four VF/four VOSTFR) for numeric and
IMDb input on both native wrappers. All six entries have complete partition
and selection evidence; all returned links pass bounded media sampling. Initial
slug 404s remain recorded HTTP findings. No separate subtitle tracks are
advertised; embedded/burned-in captions were not visually inspected. Ace of
Diamond controls retain one VOSTFR result on both wrappers. See the
[sanitized release evidence](../../tests/evidence/anime-external-ids-1.2.3-2026-11-02.json).
