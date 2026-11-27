# Sources FR+ — generic batch episodes,27 November2026

Reported case: The Remarried Empress (L’impératrice remariée), TMDB279246,
IMDbtt39325975, S1E1 on the phone with Xperience. The user reports that selecting
AIOmetadata restores some sources, but not Vodix.

## Cause

The saved Xperience response omits a metadata-provider stamp and an external
TVDB episode ID. E1–4 share3 November's release, and later episodes also arrive
in groups. Generic names such as Episode1 cannot identify an episode across
catalogues. Existing unique-name/release and unique-stream/release fallbacks
therefore reject these rows. AIOmetadata explicitly stamps TMDB, so its normal
TMDB-coordinate/release route succeeds. Vodix separately requires an official
meaningful name and also rejects the generic names with AIOmetadata.

## Change

FR+1.9.0-beta.28 adds a final opt-in proof for the FR reference route. The source
and reference must have a unique identical still at the exact trusted TMDB image
origin. The official episode record must confirm its still, coordinates, release
and translated name. All source/reference series identities, stream suffixes,
coordinate rows and stills must remain unique/consistent. The fallback is limited
to the same coordinates, not a new season-offset heuristic. It never fetches an
image or accepts a generic title/date alone. Known TVDB episode identities remain
outside this fallback. Anime-Sama and EN do not opt into it.

Vodix reuses this pure proof after its existing official-name proof fails, for
both AIOmetadata TMDB and Xperience Auto/TMDB. Its TVDB guard is retained.
Cinemeta-ordered backups additionally require the official TMDB episode's TVDB
ID and a unique matching Cinemeta row/release. Missing IDs remain unavailable;
correct TMDB coordinates do not establish a different backend's episode order.

Healthy routes add no requests. A missed FR reference match can add one official
episode request; per-lookup caching shares it across backends. Vodix already
requests that record. Its existing input catalogue read is reused. App API2 and
Host0.3.1 remain compatible; no APK upgrade is required.

## Evidence and limits

The saved private metadata probe confirmed both configurations independently;
only sanitized identities, counts, dates and trusted public-still fingerprints
are retained. No private manifest URLs or raw responses are published.

Live primary mapping of S1E1/E4/E5 succeeds with both manifests on both app
bridges:12 controls. S1E1 Vodix discovery returns one link with AIOmetadata,
Xperience and native mode. Primary API discovery is empty with all three modes
from the runner, including native: availability there is not established.
Cinemeta backup correspondence remains unverified for this title. The private
workflow intentionally remains attention/failed for those gaps; a passing Vodix
result is not a claim of full source parity or physical playback.

492 Node tests,115 Python tests and both complete literal-runtime suites pass.
The new batch fixture covers20 compiled Mobile/TV variants and rejects reused
stills, conflicting records and TVDB input. Pure tests also exercise independent
Cinemeta coordinates only when the official TVDB ID exists.55 fresh host core
tests pass. Provider CI46070254791, EN CI46070254893 and configured Xperience
CI46070254848 succeed. Android build/lint succeeds; TV instrumentation is reported
separately because the unchanged navigation suite had an intermittent focus failure.

Source engines pin tested revision a2a02e8ac1c76ff0057ed88fc595f5e641663015.
Signed engine release5 uses API2/minApp10 and all9 immutable assets were fetched
and SHA256-verified before publication. Phone users refresh Sources FR+; existing
Host users can use **Check engine updates**. Native FR remains1.8.29.

Final diagnostic46070639120 confirms the official TVDB episode ID is absent for
E1/E4/E5. This specifically prevents the new Cinemeta proof from activating.
The12 primary mappings pass and all3 Vodix discovery controls return a link.
See the [sanitized evidence](../../tests/evidence/fr-batch-input-2026-11-27.json).
The overall workflow remains failed/attention because the backend/availability
gaps were retained; they are not passed by using the successful Vodix result.
