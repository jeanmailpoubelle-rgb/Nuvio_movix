# Handoff — mis à jour le 27 novembre 2026

## État et décisions

- `main` est la source commune. Les plugins natifs et les versions « + » restent
  deux produits distincts ; aucune migration forcée des profils TMDB.
- FR et Anime-Sama sont générés depuis les mêmes sources et domaines. Seule la
  capacité de traduction et l’interface associée diffèrent entre les profils.
- Noms retenus : **Sources FR+ / Anime-Sama+** ; EN utilise **Sources EN+**.
  Les identifiants et partitions d’hébergeurs restent inchangés.
- `aiometadata-input` sert les anciennes URL, par export des artefacts « + ».
  Toute modification de source se fait sur `main`, jamais dans cet export.
- Application : **Sources Host 0.3.0**, dans `android/addon-host/`, avec interface
  télécommande TV, tunnel SSH ngrok intégré et APK universel téléphone/TV. Même application ID, stockage et
  certificat pour préserver les mises à jour. FR/EN hébergés sont intégrés, avec UI par addon et mises à jour de moteurs authentifiées. Voir [livraison des moteurs](host-engine-updates.md) : le secret CI de signature nécessite encore une configuration administrateur (connexion actuelle403).
- L’utilisateur utilise Nuvio TV **1.1.0** et Mobile. Les fixtures TV historiques
  modélisent aussi 1.0.0 ; elles ne remplacent pas les tests physiques.

## Où intervenir

Voir l’[architecture](architecture.md), les [règles de développement](../AGENTS.md)
et le [runbook](maintenance.md). Modifier les sources/configurations, reconstruire
les deux profils ensemble. Ne pas modifier les bundles générés à la main.

```sh
npm run build
npm test
python3 -m pip install -r tests/requirements.txt
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/quickjs_check.py --all --runtime both
```

Les suites existantes avec traduction ciblent les chemins « + ». Les tests
`test_distributions.py` exécutent les deux contrats natifs, y compris des réglages
privés injectés dans un bundle natif : données vidéo et nombre de requêtes doivent
rester identiques au contrôle sans traduction. Les tests d’export vérifient chaque
manifeste et son bundle aux anciens chemins.

```sh
# Audit avec les paramètres et références de la variante + :
python3 scripts/audit.py --track plus --list
# Même inventaire de maintenance, artefacts natifs :
python3 scripts/audit.py --track native --list
# Android (JDK 21 + SDK, voir le guide du projet) :
cd android/addon-host
./gradlew :core:test :app:lintRelease :app:assembleRelease
```

Le registre de maintenance contient aussi des cas privés. Pour une vérification
native, sélectionner les cas sans `input_metadata` ; ces cas privés sont exclus
quand `--track native` est utilisé. Les essais live dépendent des sources et des
secrets disponibles : un succès des fixtures n’est pas un résultat live.

## Publication et retour arrière

1. Modifier les versions du manifeste concerné et de toutes ses entrées si le
   comportement livré change ; le paquet npm suit la version FR+.
2. Construire, valider les deux profils et les chemins relatifs, puis publier sur
   `main`. La CI vérifie les bundles, les documents, Node, Python et QuickJS.
3. Après validation, le workflow **Legacy plugin URL compatibility** exporte les
   seuls manifestes/bundles/data publics dans `aiometadata-input`, avec un commit
   en avance rapide. Il n’efface pas l’historique Git et n’utilise pas de force push.
   Il peut aussi être relancé manuellement sur `main`.
4. Les mises à jour quotidiennes EN publient leurs données validées sur `main`,
   puis rafraîchissent explicitement l’export historique. Garder les révisions
   immuables pour les anciens clients. Une donnée absente n’autorise pas à reprendre
   une ancienne correspondance contradictoire.
5. Pour un retour arrière, rétablir le commit de distribution voulu sur `main`,
   reconstruire/valider et republier l’export. Ne pas changer les identifiants
   d’entrées ni transformer une URL native en URL « + ».

Pour inspecter l’export sans publier :

```sh
node scripts/release/export-compat.cjs /tmp/sources-compat-inspection
```

La destination doit être vide et hors du checkout. Le script de publication
`scripts/release/publish-compat.sh` modifie la branche distante : il est réservé
à une publication après validation.

Android : la CI produit un APK **non signé**, pas une mise à jour à installer.
Les APK de release doivent être signés avec le certificat d’origine, dont la clé
reste hors dépôt. Le workflow de publication APK est spécifique à 0.3.0 ; le mettre à jour pour
chaque nouvelle release. Le déplacement de fichiers
ne justifie pas de republier cet APK sous le même numéro.

## Travail restant et précautions

- Pixel 6, accès distant sans VPN client, clés révocables, essai ngrok et matrice
  inter-réseaux des hébergeurs : [plan complet](plans/pixel-remote-addon-host.md).
  Document de préparation, pas une fonction déjà livrée. L'utilisateur confirme
  que des liens privés révocables suffisent : aucune vérification matérielle.
  Ajouter des préréglages AIOmetadata/Xperience par profil Nuvio avec URL dédiée,
  sans bascule globale affectant les autres clients ni détection supposée via IMDb.
  Auditer aussi la différence entre ID de flux et coordonnées affichées.
  Commencer par le socle Anime-Sama ; FR/EN et les caches prolongés restent séparés.

- Livraison du code de recherche depuis GitHub vers le Pixel : voir la section
  [mises à jour du moteur](plans/pixel-remote-addon-host.md#engine-updates-github-to-pixel-without-reinstalling-every-apk).
  Prévoir des paquets versionnés/signés après CI, vérifiés par l'hôte, des contrôles
  au démarrage/à la demande/sur requête avec délai minimal, une activation atomique
  et un retour à la version valide précédente. Pas de scrutation continue au repos.
  Ce mécanisme n'existe pas encore ; l'APK actuel embarque son moteur.

- Coupures de courant et redémarrages : [reprise et URL stable](plans/pixel-remote-addon-host.md#power-outage-recovery-and-url-continuity).
  Conserver domaine ngrok, clés et identifiants de préréglage ; ne pas régénérer
  l'URL au démarrage. Vérifier la reconnexion, le premier déverrouillage et la
  remise sous tension du Pixel après batterie vide. Une réinitialisation ou un
  remplacement d'appareil nécessite une restauration protégée distincte.

- Cache de métadonnées plus long et reprise ciblée pour les nouveaux épisodes :
  voir [HOST-02](limitations.md#host-02--longer-metadata-caching-with-new-release-recovery).
  Proposition : identités 7 jours, informations générales 24 h, inventaires
  terminés 24 h / en cours ou inconnus 15 min. Une donnée d’épisode obsolète
  déclenche une seule lecture fraîche ciblée avant de conclure à l’absence.
  Direction enregistrée, pas encore implémentée ; aucun cache de liens signés.

- Héberger FR et EN dans la même application : registre de moteurs, un addon par
  famille, configuration partagée, admission réseau/mémoire globale, tests
  d’isolation et de concurrence. Ne pas mutualiser aveuglément le mapping.
- Mapping Anime-Sama quand plusieurs saisons recommencent à 1 : voir les
  [limitations](limitations.md). Le rang absolu ne suffit pas sans correspondance
  vérifiée entre groupes et saisons ; aucune table de décalages par titre.
- Mesures physiques TV : veille/redémarrage, mémoire/CPU au repos, navigation,
  latence, profils synchronisés et changement de réseau restent à valider.
- Les caches existants sont bornés et sans liens signés ; pas de préchargement,
  polling ni cache média ajouté par cette réorganisation.
- Les investigations et preuves datées sont conservées. Les worktrees/branches
  locaux contenant du travail non publié ne sont pas supprimés par le nettoyage.


UI follow-up: the user confirmed Host0.2.1 tunnel operation on26 November and
requested a later redesign with central saved metadata credentials, an add-addon
setup flow and a manageable list of configured addons. See the
[recorded UI brief](plans/pixel-remote-addon-host.md#future-ui-redesign--user-brief-26-november2026).
This is planned work; the app still hosts only Anime-Sama with one active global configuration.


Mapping research26 November: [multi-anime route comparison](investigations/anime-mapping-routes-2026-11-26.md)
covers44 positions/9 anime with both saved providers,40 current-result agreements
per profile and Witch E8 recovery candidates. Keep the current route/source mapper;
proposed next work is a bounded directional AniBridge fallback with separate
validated data tables, not an immediate pipeline replacement or TVDB HTML scraper.
No production fallback/APK change was shipped from the comparison.


Implementation follow-up: Anime-Sama+beta26 keeps the current route first and adds
[guarded AniBridge recovery](anime-mapping-fallback.md), backed by separate daily
immutable buckets. FR/EN policies remain unchanged. Host0.2.2 bundles the same
engine. Historical Witch metadata is tested separately from its now-working live
metadata; healthy/native paths make no new mapping-data calls.

## Sources Host0.3.0 delivery —26 November2026

All three source families, compact addon/preset management, shared credentials,
local/HTTPS ingress separation and authenticated engine updates are implemented.
See [implementation/evidence](investigations/host030-2026-11-26.md). Source APK commit
`60e01911bf0c7ba8c2c11e483e5a2fee7e35f72f`; original application ID/certificate and
private setup migrate. Public engine channel release1 points to exact + bundles
from tested8eb6085. Local public download/load/restart/rollback passed.

52 core /451 Node /103 Python tests; local Android lint/release assembly passed.
Configured Xperience Hunter S1E1 checks passed for Anime-Sama/FR/EN (run45860471753).
Physical cross-network media, reboot/battery acceptance and Mobile caption-header
support remain limits. CI automatic engine publishing still needs the private
HOST_ENGINE_SIGNING_KEY secret; connector enrollment was rejected403. No key was
put in source/assets. Final Android CI45862730510 passed52 core tests, lint/assembly and9 TV tests on
60e0191. Signed upload45863055455 verified the0.3.0 draft before publication.
[Public APK](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/releases/download/anime-host-v0.3.0/Sources-Host-0.3.0.apk)
was downloaded and hash-checked against the local signed binary. SHA256:
`23405b6fdbf5d014bdad8b1e6b31eaa7c9243534b0c71f5099c02712599d0464`. The original0.2.2 public APK was restored/hash-verified after a
mistargeted upload; the publisher now checks package/version and refuses published
release overwrites. No signing private key was uploaded.

## Vodix —27 November2026

Read-only investigation: [findings](investigations/vodix-2026-11-27.md) and
[sanitized evidence](../tests/evidence/vodix-2026-11-27.json). Separate public
TMDB-keyed Movix API; snapshot84 titles (60 films,24 series). Two HLS masters
advertise3840-wide HEVC/PQ with FR/EN tracks/captions. Anonymous exchanges worked,
but intermittent403 and unresolved media/range sampling prevent a native playback
claim. Existing plugins do not query Vodix; no production code/version changed.

Before hosting Vodix, fix [HOST-06](limitations.md#host-06--post-request-bodies-in-the-android-http-bridge):
Host0.3.0 drops POST bodies/rejects POST, which also limits existing Vidara. This
is an APK transport prerequisite, not an engine-only repair. Keep new backend
episode verification and real ExoPlayer/libmpv acceptance separate from metadata
discovery and4K catalogue labels.

###27 November: Vodix integration

Sources FR1.8.27 / FR+1.9.0-beta.25 add their own grouped Vodix entry. Source and
proof are in `src/vodix*.js`; maintenance inventory owns positive/empty controls.
Actual ranged GoT video/audio samples pass ffprobe; other cases intermittently403.
Mapped TV intentionally skips unverified Vodix layout. Host0.3.1/code10 adds POST
transport and accepts engine APIs1–2; new packages require API2/minApp10. Preserve
the original APK certificate and retain the API1 package rollback path. See the
[Vodix investigation](investigations/vodix-2026-11-27.md) for scope and open coverage.

Release verification: source55e605b passed GitHub provider checks46018496705
and Android build/lint +9 TV navigation tests46018496749 (55 core tests). Signed
Host0.3.1 retains the original certificate; publisher46018600796 checks exact
code10/version/hash before attaching the APK. Engine release2 signs that immutable
source with API2/minApp10; old Host0.3.0 retains its API1 engines. Public APK SHA256:
`ebf3c6bbe3e2519a0fcc1d476972e39e6577fc39437fbaf5cf53f9b96d20c89e`.

### Vodix FR+ TMDB-order compatibility

FR+beta.26 removes its blanket TV skip only for verified same-coordinate TMDB
input. `src/vodix.js:vodixCoordinates` reuses the private adapter and official
episode helper; no shared mapping policies or backend layout targets change.
Keep the TVDB guard and Xperience Auto TVDB-identity guard. Verify cold3 metadata
reads versus unchanged native/movie paths. The new private-input workflow
checks both saved manifests without producing playable diagnostic rows. This is
an engine-only update for existing Host0.3.1/API2; no APK rebuild is required.

FR+beta.26 release evidence: source83df9ae, provider CI46023010138 and private
input CI46023010355. All12 live cases passed (both adapters and both wrappers):
GoT S1E1/S2E3 accepted; Hunter S2E72 kept the TVDB guard. Xperience's observed
+25h broadcast timestamp uses the scoped official-title/coordinate proof window;
no shared date rules changed.486 Node /104 Python /55 host core tests pass.
Signed engine release3 uses API2/minApp10 and requires no new APK over0.3.1.
See `tests/evidence/vodix-tmdb-input-2026-11-27.json`. Playback403 remains a
separate availability issue; metadata proof does not certify physical playback.

###27 November maintenance coverage and catalogue cleanup

The user explicitly declined Movix repository monitoring. The maintenance program
now inspects only its deployed website, plus our own scheduled mapping job's
actual execution/gates. `health.yml` includes native controls, both EN adapters
and Vodix private input independently. HLS ranges skip cover prefixes and verify
HTTP206 offsets; Vodix also checks FR/EN audio. Unsupported domains remain visible
even when another stream works. See the
[completed maintenance report](investigations/maintenance-2026-11-27.md).

Initial full run46056353067 completed574 probes; EN19/19 per adapter, input12/12,
range/media8/8 and local codec8/8 controls pass. Broad attention/not-tested rows
remain, including upstream gates, low-resolution-only sources and unadvertised
hosts. Do not treat the merge job's success as full playback acceptance.
`purstream.org` is parked; remove only that discovery address. Keep direct
Purestream CC and the verified Nakios directory. FR1.8.29 / FR+beta.27 ship the
configuration change; the existing Host0.3.1/API2 can receive an engine update.

Signed engine release4 targets tested source b5ddcb17bac682f26e74270b00ad38b17297d7af
(API2/minApp10). All9 immutable assets match their SHA256 before channel
publication. Provider checks46060076737 and legacy export46060143136 pass;
55 host core tests pass with the rebuilt bundles. Existing Host0.3.1 can use
**Check engine updates**; no new APK is needed.

Android workflow46060076685 completed successfully: APK build/lint and9 TV
navigation tests pass. The initial TV attempt hit a null-view focus assertion in
one existing test; the failed-job rerun passed without code changes. This is
emulator coverage, not physical TV playback acceptance. Public signed channel4
was fetched back and matches the locally verified metadata exactly.

###27 November FR+ generic batch-release fix

FR+beta28 restores Xperience's TMDB reference proof for generic/batch episodes and
Vodix discovery with AIOmetadata or Xperience. Strong unique official-still proof
is FR-only; native, Anime-Sama/EN matching and the Vodix TVDB guard stay unchanged.
Cinemeta requires the official TVDB episode ID and remains unverified for this
title; primary API is empty in native controls too. Do not claim full link parity
or a wholly green live workflow. See
[the investigation](investigations/fr-batch-episodes-2026-11-27.md).
492 Node /115 Python, both literal runtimes and55 fresh host core tests pass.
Signed engine5 pins source a2a02e8 (API2/minApp10), no APK upgrade required.

###27 November Coflix comparison followup

The user's screenshots show5 native versus4 plus links: only Coflix/Vidmoly720p
VF was missing. This is an unverified-native-backend skip, separate from the
Cinemeta identity gap. FR+beta29 shares the Vodix same-coordinate input checker
through `src/native-tmdb-input.js` and permits the standard Coflix query only
after proof; its target remains native. Explicit source coordinates must match.
Live Coflix input controls12/12 and Vodix regression12/12 pass. Actual Coflix
discovery returns1 link in native, AIOmetadata and Xperience.497 Node /115 Python,
both full literal wrappers and55 fresh core tests pass. Engine6 pins source
9b94c9d (API2/minApp10), no APK update required. Broader live report intentionally
retains primary-API/Cinemeta gaps. See [evidence](../tests/evidence/coflix-tmdb-input-2026-11-27.json).

Public FR+beta29 and signed engine6 were fetched back and verified. Android
workflow46071646272 passed APK build/lint; its unchanged TV navigation suite
hit the previously observed focus assertion and a failed-job rerun was requested.
No UI change or new APK was published. Do not count that initial UI run as a pass.
Configured Coflix adds the request-local series/private/official input proof;
native/movie paths and the existing Vodix request counts remain unchanged.

### Xperience profile followup — stale downloaded provider code

The user confirmed the Xperience profile's Frembed/Catalogues entries were older
than beta29, despite the AIOmetadata profile being updated. They must refresh
FR+ with the affected profile active, keeping saved manifest/Auto/IMDb settings.
No production ID-parser/mapping change was released; a speculative local IMDb
fallback was discarded. New diagnostic tooling compares bounded configured
catalogue search -> actual ID -> metadata and supports The Body live controls.
Xperience catalogue IDs/rows match direct probes. Current The Body discovery
returns Coflix3 / Vodix1 with Xperience and native. Primary API remains empty in
native too; saved AIO metadata +25h dates remain a separate strict-proof gap.
Phone retest after refresh is pending. See
[evidence](../tests/evidence/xperience-profile-cache-2026-11-27.json).

###27 November API-first FR entry order

User-requested priority: Vodix, Frembed, Purstream API/Cpasmal, Movix/Catalogues,
Movix/Extra, Nakios, Yablom. Both FR1.8.30 and FR+beta30 use that order; all IDs,
settings keys, enabled states and the disabled retired Purstream entry remain.
Quality/audio sort still wins; manifest order breaks equal-rank ties. Nuvio
controls global scheduling, so this is not a guaranteed first-result latency.
497 Node /117 Python tests, both full literal runtimes and55 fresh host core
tests pass. Lookup/resolver/mapping code and request counts are unchanged; no
new live media acceptance was claimed. Engine7 pins source c2c2265, API2/minApp10;
all9 immutable files were fetched and SHA256-verified. No new APK is needed.
Refresh the repository separately in each Nuvio profile, or use the host's
engine update check. See [evidence](../tests/evidence/fr-provider-order-2026-11-27.json).

###28 November Ani.pm candidate API origin

The user requested testing and saving the announced new domain for a future
cutover, not changing current configuration. `https://anipm.pk` directly passes
20 combined old/new-origin endpoint controls: Hunter AniList11061 E1 and
Apothecary Season2 AniList176301 E1, bootstrap, Standard SUB/DUB, Beta availability
and fresh copy grants. All returned expected owned Settlar players and stayed
on the tested origin. No grants/URLs/cookies/raw responses retained. API-only
evidence does not certify Settlar sessions, media/audio/captions or device
playback; repeat these before a migration. Canonical note:
[Sources EN domains](sources-en.md#finding-the-current-anipm-domain),
[evidence](../tests/evidence/anipm-origin-2026-11-28.json). Configured ani.pm,
embed/media origins, plugin versions and signed engine channel stay unchanged.
A future domain-only engine change can reach Host0.3.1 without an APK update.

###28 November Anime-Sama S3E9 host discrepancy

Apothecary source S3E9 exposes four advertised players. Site label Vidmoly is
actually ANSEmbed; Uqload already returns. Owned inline VOE response advertises
voe.sx and returns known caseyseemavoid.com, previously rejected by exact-host
comparison. Native1.2.21 / plus beta27 permit only known VOE-to-VOE handoffs;
other families remain exact-host-only. No new domains, source mapping or quality
policy changes. Old published VOE control0 sources/2 requests; repaired2 sources
through the existing resolver. All four direct source audit jobs (production/
helper on both wrappers) pass media reachability. Tests499 Node /118 Python,
both full literal suites,12 compiled native/+ mirror/foreign controls and55 fresh
core pass. Engine8 pins source9f322de, API2/minApp10,9 immutable hashes checked;
no new APK needed.

Earnvids/minochinos resolves but its CDN playlists returned503/502; user confirms
it also fails on the website on the same phone/network. These errors remain
visible, with no media-validation bypass. S3E9 -> reference S1E57 is expected
continuous numbering, not an Anime-Sama S1 selection. Protocol tests deliberately
use source S3E9/index8, bypassing private input metadata. A separate numeric native
reference control failed title discovery and was not counted as a pass; this fix
does not repair title aliases. Maintenance case apothecary-voe-inline-source-9
is the focused direct source control. See
[evidence](../tests/evidence/anime-sama-voe-mirror-2026-11-28.json).


## 28 November — SwiftFlow disabled

FR1.8.31 / FR+beta31 remove `swiftflow` from `movix.extra`; Custom and Omega stay
active. This is default scheduling/configuration only. No new source or media
probe. Historical SwiftFlow helpers explicitly opt in to the dormant adapter;
installed calls must never query it, including empty and recovery paths.
