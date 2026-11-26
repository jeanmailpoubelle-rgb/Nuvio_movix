# Sources pour Nuvio

Plugins natifs et hôte Android, développés dans le même dépôt sur `main`.
Deux variantes restent disponibles : **native** pour la numérotation TMDB / de
référence, et **+** pour traduire les épisodes depuis AIOmetadata ou Xperience,
notamment les anime TVDB avec identifiants IMDb.

## Plugins : URL à copier dans Nuvio

Dans **Plugins → Ajouter un dépôt**, coller l’URL correspondant au profil.
Les versions natives n’exigent aucun manifeste personnel.

**Sources FR** — natif · 1.8.26

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/manifest.json
```

**Anime-Sama** — natif · 1.2.20

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/plugins/anime-sama/manifest.json
```

**Sources FR+** — correspondance des épisodes · 1.9.0-beta.24

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/plugins/sources-fr-plus/manifest.json
```

**Anime-Sama+** — correspondance des épisodes · 1.3.0-beta.25

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/plugins/anime-sama-plus/manifest.json
```

**Sources EN+** — Ani.pm Standard et Beta · 0.1.0-beta.22

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/plugins/sources-en/manifest.json
```

**Diagnostic de correspondance** — facultatif, ne fournit pas de vidéo

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/plugins/episode-diagnostics/manifest.json
```

Pour les versions **+**, enregistrer le manifeste personnel dans les réglages de
chaque entrée utilisée, puis sélectionner AIOmetadata ou Xperience. Les deux URL
peuvent être conservées, mais seule celle sélectionnée sera interrogée. Voir les
[réglages AIOmetadata](docs/aiometadata.md) et [Xperience](docs/xperience.md).
Les paramètres des plugins natifs restent propres à chaque entrée ; ce dépôt
n’ajoute aucun service de synchronisation des paramètres.

Les anciennes URL de la branche `aiometadata-input` restent des alias de
compatibilité des versions **+**. **Une installation existante peut les garder** :
ses identifiants et ses chemins de fournisseurs restent conservés. Changer l’URL
du dépôt peut nécessiter de ressaisir les réglages. Ne pas installer deux copies
de la même variante dans un profil, sous peine de résultats en double.

## Application Android

[Anime-Sama Host](android/addon-host/README.md) héberge un addon local dans une
application Android. Il s’installe dans **Addons**, contrairement aux plugins
ci-dessus. Télécharger l’[APK signé 0.2.1](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/releases/download/anime-host-v0.2.1/Anime-Sama-Host-0.2.1.apk).
La version **0.2.1** ajoute un tunnel HTTPS ngrok intégré pour le Pixel, avec
statut et reconnexion, en conservant l’interface téléphone/TV. Voir le
[guide Pixel](docs/pixel-integrated-host.md).
Elle conserve l’identité Android et les réglages des versions précédentes.

L’application fournit actuellement **Anime-Sama seulement**. Sources FR et EN
pourront rejoindre la même application, avec configuration, transport et caches
communs ; leurs moteurs et règles de correspondance resteront distincts.
L’URL locale doit être joignable depuis l’appareil exécutant Nuvio. Voir les
[limites réseau et profils synchronisés](android/addon-host/README.md#shared-profiles-and-network-access).

## Développement et maintenance

- [Architecture et distributions](docs/architecture.md) : code partagé, frontières et chemins publiés.
- [Handoff](docs/handoff.md) : état actuel, commandes de validation, publication et travail restant.
- [Documentation](docs/README.md) : guides par composant.
- [Limitations](docs/limitations.md), [maintenance](docs/maintenance.md), [vérifications](VERIFICATION.md), [changements](CHANGELOG.md).

Modifier `src/` et `config/`, puis exécuter :

```sh
npm run build
npm test
python3 -m pip install -r tests/requirements.txt
python3 scripts/quickjs_check.py --all --runtime both
python3 -m unittest discover -s tests -p 'test_*.py'
```

`providers/` et `plugins/*/providers/` sont générés, jamais modifiés à la main.
Les tests des variantes natives vérifient qu’aucune configuration privée ne peut
y activer la traduction. Les tests QuickJS modélisent les contrats Mobile/TV ;
ils ne prouvent pas une lecture physique sur la TV.

Licence GPL-3.0-only. Conserver les licences et notices de `vendor/` et des
bibliothèques Android. Ne jamais publier de manifeste personnel, clé, session ou
URL vidéo signée dans le dépôt ou les rapports.
