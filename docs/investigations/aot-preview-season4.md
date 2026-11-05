# Attack on Titan season4 preview investigation — 2026-11-05

User report: AIOmetadata/TVDB profile returns no Anime-Sama links for S4E1,
while a TMDB-only profile works. Stable remains untouched. Installer-app work
and the discarded computer-host prototype are paused during this diagnosis.

Identity: TMDB1429 / IMDbtt2560140. Public target metadata has four regular
seasons; season4 has28 entries in Nuvio Catalog and30 in Cinemeta, including the
two final-chapter specials. S4E1 is The Other Side of the Sea, TVDB episode7771368.
Anime-Sama's source catalogue remains shingeki-no-kyojin, with a direct season4
route and an explicit external link to TMDB1429. No title/year/offset assumption
has been changed. The failure stage remains to be established from configured
AIOmetadata facts, source selection and native-wrapper tracing.

The private probe now includes both IMDb/TMDB queries for this series and
external-ID checks around season/part boundaries. Artifacts retain public IDs,
selected episode facts and dates only, never the personal manifest or raw bodies.

The private workflow offers `facts_only` for quick diagnosis before the complete
regression suite. The main provider currently still advertises S4E1, so the
preview's missing result cannot be explained by an empty main inventory alone.
Other families require per-backend comparison; do not infer their episode
identity or availability from the number of displayed links.
