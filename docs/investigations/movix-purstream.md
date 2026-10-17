# Movix and Purstream integration

Checked on **17 October 2026**. Movix's College/Dog application family exposes
Purstream as an upstream source through its own API. This establishes a technical
integration; shared ownership or administration has not been established.

## First-party evidence

The current public Movix source explicitly mounts `/api/purstream` in
[`API/Mainapi/app.js`](https://github.com/movixstream/MovixOpenSource/blob/main/API/Mainapi/app.js).
Its [`routes/purstream.js`](https://github.com/movixstream/MovixOpenSource/blob/main/API/Mainapi/routes/purstream.js)
defines `https://api.purstream.id/api/v1` as a fallback API base, reads
`https://purstream.wiki/api/status` for its current domain, maps TMDB titles to
Purstream catalogue IDs and calls `/stream/<purstream-id>` (or the episode route).
It returns those sources through `/api/purstream/movie/<tmdb-id>/stream`.

## Live cross-check

- `https://movix.online/` linked `https://movix.dog/`.
- `https://api.movix.dog/api/purstream/movie/603/stream` returned one source and
  `purstream_id: 2633` for Matrix.
- The `.id` API's `/media/2633/sheet` identified Matrix as movie, TMDB **603**.
- `/api/v1/stream/2633` on both `api.purstream.id` and `api.purstream.sh`
  returned one source. Its media URL matched the Movix wrapper's URL exactly.
  Comparison was in memory; no signed media URL is stored here.
- The status endpoint returned `domain: purstream.sh`. The configured `.id`
  API also continued to return the expected JSON.
- A fetch of `https://purstream.club/` returned a **Purstream - Wiki officiel**
  page. The plugin's `playbackSite` field is a playback Referer setting, not a
  discovery assertion about the current public catalogue domain.

The config groups these fields because one provider uses Movix for fast TMDB
mapping and Purstream's direct API as recovery. Wrapper requests use the Movix
site Referer; returned media uses the configured playback Referer. Direct recovery
can consult the status service on an endpoint failure. The static `.id` address
need not equal the currently advertised public site when both APIs remain usable.

This integration is distinct from the HTML catalogue family configured under
`catalogue.mirrors` (Nakios Live, Purestream CC and Movix ZIP). Similar branding
does not establish identical infrastructure or ownership.

## What can break

Movix wrapper domains/routes, upstream Purstream API domains/schema, the status
response, TMDB-to-catalogue correspondence and CDN Referer requirements can change
independently. Diagnose the wrapper and direct API separately. A status-domain
change alone is not proof that a working configured API or playback header is
broken. Verify actual search/sheet identity and media access before changing them.

Repair locations are `config/endpoints.json`, `src/movix-domains.js`,
`src/purstream-provider.js` and `src/purstream-api.js`. Relevant audit selectors
are `primary-api`, `direct-api`, `movix-discovery` and `movix-mirrors`; direct
title search requires a runtime TMDB metadata key. Use the
[maintenance workflow](../maintenance.md) for isolated and normal-path checks.
The comparisons above confirm discovery/source correspondence, not continuous
playback or a physical TV test. No production settings were changed.
