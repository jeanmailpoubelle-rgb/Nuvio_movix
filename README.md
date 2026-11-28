# Sources pour Nuvio

Plugins natifs et hôte Android, développés dans le même dépôt sur `main`.
Deux variantes restent disponibles : **native** pour la numérotation TMDB / de
référence, et **+** pour traduire les épisodes depuis AIOmetadata ou Xperience,
notamment les anime TVDB avec identifiants IMDb.

Ordre des fournisseurs FR : Vodix, Frembed, Purstream API/Cpasmal,
Movix/Catalogues, Movix/Extra, Nakios, Yablom. Les API passent avant les
catalogues HTML ; la vitesse dépend aussi de chaque hébergeur vidéo.

Sources FR inclut désormais **Movix / Vodix** pour le catalogue UHD disponible.
Filtre :720p minimum, qualité inconnue conservée, aucune limite haute. Les films
fonctionnent dans les deux variantes. FR+ accepte les épisodes de séries vérifiés
en coordonnées TMDB via AIOmetadata ou Xperience Auto/TMDB. La traduction TVDB
vers Vodix reste indisponible ; conserver Xperience sur Auto pour un profil mixte. Voir le [bilan Vodix](docs/investigations/vodix-2026-11-27.md).

## Plugins : URL à copier dans Nuvio

Dans **Plugins → Ajouter un dépôt**, coller l’URL correspondant au profil.
Les versions natives n’exigent aucun manifeste personnel.
Actualiser le dépôt dans chaque profil Nuvio utilisé : le code téléchargé et les
réglages des fournisseurs sont propres au profil.

**Sources FR** — natif · 1.8.31

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/manifest.json
```

**Anime-Sama** — natif · 1.2.21

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/plugins/anime-sama/manifest.json
```

**Sources FR+** — correspondance des épisodes · 1.9.0-beta.31

```text
https://raw.githubusercontent.com/jeanmailpoubelle-rgb/Nuvio_movix/main/plugins/sources-fr-plus/manifest.json
```

**Anime-Sama+** — correspondance des épisodes · 1.3.0-beta.27

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

[Sources Host](android/addon-host/README.md) héberge **Anime-Sama+, Sources FR+
et Sources EN+** dans une seule application Android téléphone/TV. Télécharger
l’[APK signé 0.3.1](https://github.com/jeanmailpoubelle-rgb/Nuvio_movix/releases/download/anime-host-v0.3.1/Sources-Host-0.3.1.apk).
Installer par-dessus la version précédente pour conserver configuration, clé SSH
et URL existante. Les addons s’installent dans **Addons**, les plugins ci-dessus
gardent leurs propres URL.

L’interface sépare **Addons**, **Metadata**, **Connection** et **Updates** :
identifiants partagés, configuration par addon, pause/suppression et accès local
ou HTTPS ngrok. Les moteurs partagent transport/caches bornés et gardent leurs
règles de correspondance indépendantes. Les mises à jour de moteur authentifiées
peuvent arriver sans nouvel APK ; voir la [publication et sa configuration CI](docs/host-engine-updates.md).
Voir le [guide Pixel](docs/pixel-integrated-host.md) et les
[profils synchronisés](android/addon-host/README.md#shared-profiles-and-network-access).

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

Maintenance complète : lancer **Upstream health audit**, profil `deep`, runtimes
`both`. Le programme couvre aussi Vodix, les contrôles natifs, EN avec les deux
manifestes, les ajouts du site Movix déployé et l’exécution réelle des mises à jour
quotidiennes. Aucun contrôle du dépôt public Movix n’est ajouté.
Voir le [guide de maintenance](docs/maintenance.md#complete-maintenance-orchestration--27-november2026).
