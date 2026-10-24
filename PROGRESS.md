# Suivi de l’implémentation

Mis à jour le 24 octobre 2026. Implémentation locale terminée et vérifiée. Documents de référence inchangés.

## Hébergement Vercel et cache Upstash — 24 octobre 2026

### Correction du démarrage Vercel

- Erreur de déploiement rapportée : `@fastify/static` charge `content-disposition` avec `require()`, rejeté par le runtime Vercel pour ce module ESM.
- Import de `@fastify/static` déplacé dans la branche servant les fichiers statiques en production locale. La fonction Vercel utilise la branche API seule et ne charge plus ce plugin au démarrage.
- Test de régression simulant un plugin statique impossible à charger : initialisation API et health HTTP 200 réussies. TypeScript, lint, 28/28 tests et build réussis ; frontend compilé et health vérifiés HTTP 200 via Fastify inject en mode production locale. `git diff --check` réussi. Correction non déployée ; confirmation sur Vercel après redéploiement encore nécessaire.

- Ajout de `api/[...path].ts` : adaptateur HTTP Node vers les routes Fastify existantes, sans serveur permanent ni fichiers statiques dans la fonction. `vercel.json` conserve le frontend Vite dans `dist/client` et configure une durée maximale de 120 secondes.
- Cache extrait derrière une interface : fichier local atomique conservé ; Redis REST sur Vercel, sans nouvelle dépendance. Variables Upstash standard, Vercel KV et préfixe utilisateur `CACHE_WORLDS_` reconnus. `.env.local` reste ignoré par Git.
- Snapshot partagé validé et relu par requête, verrou Redis entre instances, réutilisation des données récentes et temporisation de 55 secondes. Cache sans expiration ; clés Production/Preview séparées ; réponses API `no-store`. Échecs de persistance signalés, collecte des sources tentée même si Redis est indisponible.
- README et exemple de variables actualisés. Script `scripts/verify-cloud.ts` pour tester l’adaptateur HTTP avec la vraie base dans des clés temporaires nettoyées en fin de test.
- Vérification réelle avec `.env.local` : Redis PONG, health et refresh HTTP 200, 46 séries, aucune erreur ni alerte, snapshot de 149 509 octets relu sans nouvelle collecte. Clés de vérification supprimées, aucun secret affiché.
- TypeScript, lint, build et `git diff --check` réussis. 27/27 tests métier/backend (dont cinq nouveaux tests Redis/cloud) et 13/13 tests Chromium sur le build local de production au port 3004 réussis, avec sources réelles.
- Aucun commit, push ou déploiement. Fonctionnement sur Vercel à vérifier après publication du code et présence des variables Upstash dans Production. Documents de référence inchangés.

## Livré

- React/Vite, Fastify, TypeScript strict, contrats partagés et validation Zod des sources externes.
- Trois phases, sélection automatique, 33 cartes Swiss stables regroupées par bilan, connexions explicites des brackets haut/bas et Knockouts.
- Résultats Riot séparés de la structure ; historiques Leaguepedia ordonnés, validés et associés à leurs révisions, accessibles au survol, au clavier et au toucher.
- Actualisation toutes les 60 secondes par la page ouverte, Refresh/Retry, dédoublonnage, Last checked conditionnel, erreurs et données périmées explicites.
- Cache disque versionné et atomique, restauration après redémarrage, réutilisation des révisions inchangées, revalidation des historiques incomplets/corrigés.
- Configuration statique GraphQL dans server/config.ts, exemple .env.example, commandes et limites dans README.md.

## Vérifications observées

- TypeScript, lint et build : réussis.
- Métier/backend : 22/22 tests réussis, dont routes Fastify inject() et erreurs des sources.
- Chromium : 7/7 tests réussis en développement, puis 7/7 sur le build de production.
- 1366 × 768 CSS à échelle 1 : trois phases entièrement visibles, 33 cartes Swiss, textes sans débordement et infobulles dans la fenêtre. Trois captures inspectées visuellement.
- Données réelles : 46 séries, 14 historiques complets validés, phase actuelle Swiss, aucune erreur ni alerte lors du dernier contrôle. KC–C9 : C9 · KC · C9 · KC · KC. Deux séries KC–MVK distinctes.
- Audit npm complet : 0 vulnérabilité signalée.
- Détails et limites des contrôles dans VERIFICATION.md.

## Décisions et limites

- SVG/CSS sans bibliothèque de bracket. Connexions issues uniquement des structuralId et destinations/slots GraphQL, sans assimiler les slots à l’ordre des équipes.
- Leaguepedia numérote séparément les rounds haut/bas ; le rapprochement suit cette convention observée. Alias supplémentaires vérifiés : AL CN, TSTW, LYON24.
- Node 24.22.1 installé via fnm pour les outils ; défaut global fnm inchangé.
- Aucune fixture utilisée comme solution de repli de l’application. Les cas artificiels restent dans les tests.
- Pas de blocage fonctionnel observé. Disponibilité des sources, retard Leaguepedia et stabilité des ID GraphQL restent externes. Script de maintenance hors périmètre.
- Chromium headless et tactile émulé vérifiés ; autres moteurs et appareil tactile physique non testés.
- Aucun commit, push ou déploiement.

---

## Review — 24 octobre 2026

- `REVIEW.md` lu : sept demandes concernant le Swiss sur grands écrans, la conservation de l’onglet lors des actualisations, les mentions inutiles, les infobulles, le titre de phase et les transitions.
- État à la réception de la review : Refresh réinitialisait l’onglet ; chaque carte gérait sa propre infobulle avec une fermeture différée ; les dimensions Swiss étaient fixes.
- La review autorise le changement de comportement du Refresh par rapport au plan initial. `PLAN.md` et `API-INVENTORY.md` restent inchangés.
- Les résultats de livraison ci-dessus décrivent l’état antérieur à cette review. Les sept demandes sont désormais implémentées et vérifiées ci-dessous.

### Modifications observées

- Swiss dimensionné selon la hauteur et la largeur disponibles : cartes, logos, typographie et espacements adaptatifs.
- Onglet initialisé à Current au chargement, puis conservé lors des actualisations manuelles/automatiques, même si Current change. Rechargement navigateur testé séparément.
- Mention Auto-refresh retirée de la navigation ; point vert et Live retirés du footer ; phase-heading conservé mais masqué.
- Infobulle active centralisée : les fermetures différées d’une ancienne carte ne ferment pas la nouvelle. Placement latéral et fermeture Échap ajustés pour éviter l’interception des cartes voisines et la réouverture sous un pointeur immobile.
- Transition directionnelle entre phases, désactivée avec prefers-reduced-motion. Les actualisations et les clics sur l’onglet déjà actif ne relancent pas la transition.
- Premier passage TypeScript, lint, 22 tests métier/backend et build réussi, puis vérification finale après les ajustements d’infobulles.

### Vérifications après corrections

- Dernier contrôle TypeScript, lint, 22/22 tests métier/backend et build : réussis après les corrections d’infobulles.
- Chromium en développement : 11/11 tests réussis, dont le parcours réel et quatre tests dédiés à la review.
- Trois phases contrôlées à 1366 × 768, 1600 × 900, 1920 × 1080 et 2560 × 1440 CSS : aucun débordement du document, aucune carte masquée par le conteneur, aucun débordement de texte détecté.
- Hauteur occupée par le Swiss vérifiée dans le round le plus dense (moins de 5 px inutilisés) ; police et hauteur des cartes augmentent avec le viewport. Captures 1366, 1920 et 2560 inspectées visuellement.
- Actualisations manuelle/automatique conservant l’onglet malgré un changement de Current, échec de transport, retour à Current après rechargement, conservation des cartes lors d’un Refresh, mouvement directionnel et réduction des animations vérifiés.
- Survols rapides suivis par MutationObserver : jamais plusieurs infobulles simultanées ; focus, fermeture Échap et tactile également vérifiés.
- Nouveau build de production local sur 3002 : **11/11 tests Chromium réussis**, dont le parcours sans interception des sources réelles. Les attentes du parcours réel sont synchronisées sur les réponses réseau, avec validation de chaque récupération.
- Dernier contrôle TypeScript et lint après mise à jour des tests : réussis. `git diff --check` réussi ; aucun changement de `PLAN.md` ni d’`API-INVENTORY.md`.
- Aucun blocage restant observé. Aucune dépendance ajoutée ; aucun commit, push ou déploiement.

### Ajustement après review — suppression de phase-heading

- Suppression définitive autorisée par l’utilisateur après le masquage demandé dans `REVIEW.md`.
- Bloc JSX, calcul du compteur et import dédié retirés de `App.tsx` ; styles exclusifs `.phase-heading`, `.phase-summary` et `.eyebrow` supprimés. Styles `h2` conservés pour les états de chargement et d’erreur.
- Tests navigateur adaptés pour exiger l’absence du bloc tout en conservant les contrôles de finale terminée et de disposition des trois phases. README actualisé.
- Vérifications exécutées après suppression : TypeScript, lint, 22/22 tests métier/backend et build réussis ; **11/11 tests Chromium réussis sur le nouveau build de production local**, dont l’absence du bloc, la finale terminée et la disposition des trois phases à 1366 × 768 et aux grandes résolutions.
- Capture Swiss à 1366 × 768 inspectée visuellement : disposition conservée. Recherche dans les sources : aucun style ni bloc dédié restant ; styles `h2` toujours présents. `git diff --check` réussi ; documents de référence inchangés.

### Ajustement après review — logo Worlds dans le header

- Logo de l’URL utilisateur récupéré sans slash final (HTTP 200). Réponse WebP de 792 × 213 pixels, 5 458 octets, noire et transparente ; copie locale conservée sans modification et source documentée.
- Header adapté avec inversion CSS blanche pour le fond sombre, dimensions réservées et nom accessible. L’ancienne version est conservée dans `LegacyBrand`, réactivable via `HeaderBrand variant="legacy"`, et utilisée en secours si l’image échoue.
- Hauteur du header conservée à 62 px. Chargement local, dimensions de l’image, nom accessible et retour à l’identité d’origine en cas d’échec vérifiés dans Chromium.
- Vérifications finales : TypeScript, lint, 22/22 tests métier/backend, build et **13/13 tests Chromium sur le nouveau build de production local** réussis. Capture `test-results/header-worlds-official-1366.png` inspectée visuellement ; les 33 cartes Swiss restent visibles à 1366 × 768 et les autres résolutions de la suite passent.
- README et provenance du visuel documentés. `git diff --check` réussi ; documents de référence inchangés, aucune dépendance ajoutée.
