# Anime-Sama parser fixtures

Reduced HTML from Nuvio_anime_sama 1.0.6 (`f8605f1`), GPL-3.0-or-later;
GPL version 3 is selected by this project. Domain placeholders and content
selectors are preserved from the upstream fixtures. See THIRD_PARTY_NOTICES.md.

The catalogue/search/title fragments exercise the local HTML reader and group
ordering. Egghead/Elbaf fragments exercise ongoing global episode numbering and
special positions. No page is executed; downloaded scripts are parsed as literals.
These are historical parser fixtures, not current-domain or availability evidence.

`season-layouts.json` is a reduced coordinate inventory observed on 17 October
2026. It captures the disagreement between Nuvio Catalog, Cinemeta and the source
season groups without retaining raw metadata/player responses. Its counts and
IDs are regression inputs only, never shipped title-specific mapping rules.
