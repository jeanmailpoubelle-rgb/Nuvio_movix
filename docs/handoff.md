# Handoff — mis à jour le 23 novembre 2026

## État et décisions

- `main` est la source commune. Les plugins natifs et les versions « + » restent
  deux produits distincts ; aucune migration forcée des profils TMDB.
- FR et Anime-Sama sont générés depuis les mêmes sources et domaines. Seule la
  capacité de traduction et l’interface associée diffèrent entre les profils.
- Noms retenus : **Sources FR+ / Anime-Sama+** ; EN utilise **Sources EN+**.
  Les identifiants et partitions d’hébergeurs restent inchangés.
- `aiometadata-input` sert les anciennes URL, par export des artefacts « + ».
  Toute modification de source se fait sur `main`, jamais dans cet export.
- Application : **Anime-Sama Host 0.1.4**, dans `android/addon-host/`, avec interface
  télécommande TV et APK universel téléphone/TV. Même application ID, stockage et
  certificat pour préserver les mises à jour. FR/EN hébergés restent à faire.
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
reste hors dépôt. Le workflow de publication APK est spécifique à 0.1.4 ; le mettre à jour pour
chaque nouvelle release. Le déplacement de fichiers
ne justifie pas de republier cet APK sous le même numéro.

## Travail restant et précautions

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
