# Android

Le projet commun est [addon-host](addon-host/README.md).
Il héberge actuellement Anime-Sama ; FR et EN restent à implémenter.

- `addon-host/core/` : serveur, QuickJS, transport, caches et modèles testables sur JVM.
- `addon-host/app/` : interface et intégration Android.
- Les moteurs vidéo viennent des bundles générés à la racine, sans fork Kotlin.

Voir l’[architecture](../docs/architecture.md) avant d’ajouter un moteur.
Conserver l’application ID `local.animesama.host`, le stockage et le certificat
pour mettre à jour les installations existantes.
