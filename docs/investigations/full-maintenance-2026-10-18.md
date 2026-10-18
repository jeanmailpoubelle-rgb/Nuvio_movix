# Full maintenance check — 18 October 2026

The deep audit completed all **220 planned baseline jobs** on Sources FR 1.8.7
and dedicated Anime-Sama 1.1.3, using literal TV 1.0.0 and Mobile wrappers.
It recorded **34 pass, 138 attention, 32 blocked and 16 not-tested**. Attention
includes fallback HTTP errors, filtered sources and gated/deleted files even
when another result plays; these counts are not 138 demonstrated code defects.
The user chose to continue without a TMDB key. Raw pages, player data, signed
paths and logs stay ignored; see [sanitized evidence](../../tests/live-full-maintenance-2026-10-18.json).

## Verified repairs

### Lulu entry alias — Sources FR 1.8.8 / Anime-Sama 1.1.4

Fresh first-party Matrix and Hunger Games HTML pages advertise `luluvid.com`
as a player button. The existing `catalogue.lulu` list omitted it. Catalogue
selection discarded the unfamiliar origin before fetching its redirect, so
the otherwise supported resolver never ran. Matrix's alias redirects to
`luluvdo.com` and returns the expected packed JWPlayer protocol. The Hunger
Games file on the same alias is unavailable; recognizing a domain does not
repair a deleted file.

The fix adds that verified alias to [central configuration](../../config/endpoints.json).
No parsing, matching, lookup limits or episode policies change. Both compiled
plugins receive the same registry. A Node regression fails on 1.8.7; the new
`lulu-alias` TV/Mobile fixture verifies one fetch for duplicate buttons, final
Referer, original master URL, measured 1080p and declared FR/EN audio.

The earlier temporary-alias experiment recovered Matrix at **1080p VF** and
Chihiro at **720p VF**, each in **five requests** on both wrappers, with readable
media samples. Known title/year metadata was supplied directly to the production
helper, excluding the app's TMDB key/metadata request. This is downstream adapter
coverage, not full normal metadata-path coverage. Neither recovered HLS master
advertises a separate subtitle track or audio language group; VF remains an
upstream catalogue hint. Hunger Games and Reacher S4E1 did not gain a qualifying
source; supported Reacher copies were 480p and remain filtered.

After the build, all four Matrix/Chihiro checks were repeated against 1.8.8's
compiled configuration without endpoint overrides. They returned the same
qualities and request counts, and all four media samples passed. The known-title
metadata substitution still applies; the normal app-key step remains unverified.

For a future alias, inspect a fresh first-party button, its redirect and actual
player before editing `catalogue.lulu`. Check eligibility before assuming a
working redirect will be fetched. Run the Node regression, both native suites
and a fresh isolated host/catalogue check. Preserve the final player's headers;
do not add guessed domains or weaken the resolution policy.

### Dedicated anime verifier

A mobile Jujutsu S2E23 check returned four playable sources after attempting
seven of eight published hosts and stopping on the time budget. The dedicated
verifier previously called that a pass. It now rejects budget stops, remaining
candidates and absent/inconsistent selection counts. A regression of the full
verifier main fails against the old script and passes after this correction.
Three maintenance regressions cover partial, complete and invalid evidence.

A focused recheck attempted all eight candidates on both wrappers and returned
ten sources each. Mobile media samples passed; one TV Smoothpre VF segment
returned HTTP 403. These are independent observations: complete discovery does
not guarantee every returned media sample succeeds. No production budget was
increased. Slow native calls can exceed the elapsed threshold because the limit
is checked between calls and cannot cancel an in-progress bridge request.

## Other boundaries checked

| Dependency | Observation and maintenance consequence |
| --- | --- |
| Catalogue directories | Production parsers find Nakios Live from `nakios.org` and Purestream CC from `purstream.org`; all three configured HTML mirrors return expected pages. |
| Yablom discovery | Branded address page and FMHY currently identify Pirvab; configured Xatobam/Pirvab roots respond. Known-title helpers recover ShareCloudy films, but normal key-dependent matching remains blocked. |
| Movix discovery | Official directory/site/API helper and configured API mirror succeed on both wrappers. Its inspected first-party bundle is 489,764 bytes and contains the configured literal API origin; downloaded scripts are treated as data. |
| Direct API status | Status advertises `purstream.sh`; both configured `.id` and advertised `.sh` APIs return matching TMDB sheets and stream schemas for Matrix, Dark Knight and Jujutsu. No evidence requires replacing the working configured origin. |
| Direct episode route | Both domains return a Jujutsu S1E1 source, but exact S1E20, S1E25 and S2E1 stream routes return 404. A generic series stream inventory cannot replace exact episode selection. |
| Premium recovery | Matrix's ordinary fresh grant works on both wrappers. Dark Knight's primary/premium media playlist is 404; changing an API domain cannot restore that file. |
| Fast API | Healthy sampled production lookups retain two requests including HLS inspection. No new domain/availability preflight is added. |
| Metadata numbering | Rechecked isolated backend mapping after a cloud outage; only verified correspondence permits a retry. Pending data, empty Frembed inventories, filtered Vidzy copies and unreachable media are distinct outcomes. See [episode policies](../episode-mapping.md). |
| Extra hosts | Fresh Dragons Vidmoly candidate resolves and passes bounded media checks on both wrappers; another candidate does not. The Storm Dood candidates require a browser challenge; Hunger Games MixDrop is gated/unavailable. Do not generalize one file's result to an entire host. |

Additional known-title tests cover Matrix, Hunger Games and The Office through
direct, HTML, Yablom and Omega helpers on both wrappers. They preserve actual
identity/extraction/validation code but supply metadata directly and therefore
do not replace the 32 credential-blocked jobs. Missing titles and filtered-only
results remain failures/limitations in the evidence. Unsupported player families
such as Filemoon/Streamtape are not newly supported by adding an alias.

## Network and coverage limits

The baseline's late phase encountered identical HTTP 503 cloud tunnel errors
across unrelated GitHub, metadata, directory and provider origins. This is
environment evidence, not proof that each upstream simultaneously changed.
The inherited proxy and TLS settings were retained. Independent controls later
recovered, allowing focused rechecks; baseline failures remain recorded rather
than silently converted to passes.

The rebuilt release's normal Matrix and Office lookups pass on both wrappers at
two requests each, with readable media and advertised French caption checks.
Matrix premium, official-directory discovery and configured API-mirror checks
also pass. Fresh Dragons Vidmoly checks return one working result per wrapper;
another advertised candidate fails, so those audits correctly retain attention.
Custom's S2E1 mapping returns its working 1080p source in six requests on both
wrappers. Rechecked Frembed includes a transport failure; this remains a live
limitation instead of being relabelled as an empty inventory or a mapping defect.

The baseline's Coflix/Matrix caption check failed while re-reading the HLS
master, despite no separate caption track being advertised. The focused mobile
recheck returns the same 720p Lulu source and its caption probe passes. This is
not evidence of malformed subtitle content or a missing caption extractor.
The verifier also re-reads masters to check embedded subtitle declarations;
a timeout during that step can produce a caption-check failure without any
advertised sidecar. Preserve the failure and its scope rather than declaring
all subtitles broken or claiming a translation was tested.

Further 1.1.4 Jujutsu S2E1/Your Name checks retain budget stops, host gates and
media/master HTTP 403/503 failures. The earlier complete boundary run is
historical evidence, not a guarantee of complete discovery on each later call.
The shipped resolver/mapping algorithms are unchanged; the evidence does not
establish a new parser repair. The corrected verifier must keep these findings
visible instead of passing whichever subset happened to respond.

- Without a runtime TMDB key, normal Yablom/HTML matching, direct search and
  Omega IMDb correspondence are not fully verified. Known-title helper checks
  do not establish Nuvio's actual key injection or metadata HTTP behavior.
- Dood and MixDrop probes reach gates/unavailable files rather than playable
  results. No fresh advertised Dropload or StreamWish candidate was found in
  the chosen inventories; those families retain live coverage gaps.
- Isolated backup numbering receives pending data, so a successful missing-episode
  conversion is not exercised there. Native/unverified backend layouts remain
  native. Public metadata outages can still prevent safe correspondence.
- HLS master inspection and bounded media/caption HTTP checks do not certify
  physical Android TV playback, uninterrupted decoding, all audio tracks,
  subtitle content/synchronization, burned-in translation or metadata artwork.
- Anime-Sama still has no quality minimum and must attempt all candidates within
  its separate budget. Sources FR still removes known sub-720p tiers and retains
  unknown quality without a label. Missing upstream audio/captions are not invented.

## Reproduce future checks

Use [the full maintenance runbook](../maintenance.md) and its setup instructions.
The new Dragons reference permits a fresh Vidmoly host check without storing
expiring embed IDs:

```sh
.venv/bin/python scripts/audit.py --profile deep --runtime both
.venv/bin/python scripts/audit.py --skip-offline --host lulu --case matrix
.venv/bin/python scripts/audit.py --skip-offline --host vidmoly --case dragons
.venv/bin/python scripts/verify_anime.py --case jjk-s2e23 --runtime both --report reports/jjk-boundary.json
```

Record findings and remaining coverage for every repair. Domain changes belong
in configuration; new protocols require a shared resolver and meaningful native
fixtures. Every addition must update the failure inventory, runbook and release
evidence in the same change.
