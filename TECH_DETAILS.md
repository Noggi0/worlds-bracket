## Déploiement Vercel avec Upstash

Le même projet Vercel héberge le frontend Vite et les routes Fastify `/api/board`, `/api/refresh` et `/api/health`. `vercel.json` configure le build, la sortie `dist/client` et la fonction Node dans `api/[...path].ts`. Ne pas définir `server/` comme Root Directory : garder la racine du dépôt. Le serveur local reste disponible avec les commandes habituelles et son cache disque.

1. Dans le projet Vercel existant, connecter le storage Upstash depuis Storage et sélectionner l’environnement Production (Preview également si souhaité).
2. Vérifier la présence des variables serveur `CACHE_WORLDS_KV_REST_API_URL` et `CACHE_WORLDS_KV_REST_API_TOKEN`, correspondant au préfixe choisi pour ce projet. Les paires `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` et `KV_REST_API_URL` / `KV_REST_API_TOKEN` sont aussi reconnues. Utiliser le token en écriture, pas le token read-only. Aucun préfixe `VITE_` pour ces secrets.
3. Publier les modifications du code puis relancer le déploiement. Le fichier local `.env.local` n’est pas envoyé à Vercel et ne remplace pas ses variables d’environnement.
4. Vérifier `/api/health` (`{"ok":true}`), puis ouvrir le site pour vérifier les données et Last checked. Health valide le routage ; une actualisation valide aussi Redis et les sources.

Redis conserve le même snapshot versionné et validé que le fichier local, sans expiration automatique afin de garder le dernier état en cas de panne prolongée des sources. Un verrou Redis limite la collecte à une instance, avec réutilisation des données récentes pendant 55 secondes et temporisation après échec. Une autre instance peut afficher le cache avec une indication d’actualisation en cours. Si Redis échoue, la collecte des sources reste tentée et l’échec de persistance est signalé. Les réponses API sont `no-store` pour éviter un cache HTTP obsolète.

Les clés Production et Preview sont séparées via `VERCEL_ENV`. `REDIS_CACHE_KEY` permet de définir explicitement une clé pour un autre projet ou tournoi. Les previews partagent leur clé par défaut ; choisir des bases/identifiants distincts si une isolation complète est nécessaire.

Pour tester localement l’adaptateur Vercel avec la vraie base et les sources, après avoir enregistré les variables dans `.env.local` :

```powershell
node --env-file=.env.local --import tsx scripts/verify-cloud.ts
```

Cette commande utilise une clé temporaire indépendante, la supprime en fin de test et n’affiche pas les secrets. Les quotas gratuits restent dépendants du trafic et du volume des snapshots échangés.

Application locale React, Vite, TypeScript et Fastify. Interface en anglais, mode sombre. Les trois phases affichent les données Riot et les historiques Leaguepedia, sans données de démonstration dans l’application.

## Installation et développement

Prérequis : **Node.js 24 LTS** et npm. Avec fnm : `fnm install 24`, puis `fnm use 24`.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Ouvrir **http://127.0.0.1:5173**. Vite transmet `/api` à Fastify, par défaut sur `127.0.0.1:3001`. Arrêter les serveurs avec Ctrl+C.

## Build et lancement local

```powershell
npm run build
npm start
```

Ouvrir **http://127.0.0.1:3001**. Fastify sert alors le frontend compilé et l’API, sans Vite. Aucun compte, aucune clé API, aucun hébergement requis. Une connexion Internet est nécessaire pour actualiser les sources et charger les logos.

## Configuration

`.env` est facultatif et chargé par les commandes de développement et de production :

```dotenv
HOST=127.0.0.1
PORT=3001
CACHE_PATH=.cache/worlds-2026.json
REQUEST_TIMEOUT_MS=20000
```

Les deux identifiants GraphQL et la version du client public sont centralisés dans `server/config.ts`, avec les valeurs de l’inventaire. Leur mise à jour reste manuelle. Une erreur de requête est affichée et conserve le dernier cache ; aucune exploration automatique des bundles n’est implémentée.

Ne pas lancer deux backends avec le même `CACHE_PATH`. Le cache est un fichier JSON versionné, validé à la lecture et remplacé atomiquement à l’écriture. Un cache absent ou invalide ne produit jamais de faux tournoi.

## Comportement des données

- La structure GraphQL fournit les colonnes, les ID stables et les destinations vainqueur/perdant. Seul le calendrier fournit les équipes, les scores, les horaires et les états affichés.
- Le Swiss utilise les 33 emplacements officiels, les bilans avant la rencontre et le contrôle chronologique des résultats Swiss. Les adversaires futurs restent TBD jusqu’à publication ; aucun tirage n’est prédit.
- La phase actuelle est recalculée à chaque récupération des données. À l’ouverture ou au rechargement navigateur (F5), elle détermine l’onglet affiché. Refresh et l’actualisation automatique conservent ensuite l’onglet sélectionné, même si Current change. Ce comportement suit `REVIEW.md`, qui remplace sur ce point la règle initiale du plan. La clôture nécessite les 6, 33 ou 7 séries distinctes attendues, avec des résultats finaux exploitables. Un calendrier partiel ou périmé ne permet pas de confirmer la clôture d’une phase.
- Les appels sont parallélisés et les actualisations concurrentes partagent la même requête serveur. La page ouverte actualise toutes les 60 secondes et propose Refresh. Il n’y a pas de requête au survol.
- Last checked avance uniquement après récupération exploitable de toutes les sources requises. Les erreurs réseau, HTTP, GraphQL, MediaWiki et de parsing restent visibles. Un historique pas encore publié dans une page valide reste en attente.
- Les historiques sont rapprochés par phase, paire d’équipes, date Leaguepedia et round connu. Les gagnants sont lus selon les côtés bleu/rouge de chaque partie et contrôlés contre Riot. Aucun ordre de victoires n’est reconstruit à partir d’un score.
- Les révisions inchangées réutilisent le parsing ; les historiques complets sont réutilisés seulement si la révision et le résultat Riot concordent. Les historiques incomplets sont revalidés à chaque actualisation. Une nouvelle révision ou une correction Riot déclenche une nouvelle validation.
- Survol, focus clavier ou clic/toucher ouvrent un unique historique actif ; clic/toucher épingle, deuxième clic/toucher, clic extérieur ou Échap ferme. `?` signifie résultat indisponible ; `—` distingue une partie non jouée ou inutile, avec un libellé explicite.

Le Swiss adapte ses cartes, espacements et polices à la place disponible sur les grands écrans, tout en gardant ses 33 séries visibles à 1366 × 768. Le bloc de titre de phase a été supprimé. Les changements d’onglet affichent une transition dans le sens de navigation ; la préférence système de réduction des animations la désactive.

Le header utilise le logo Worlds fourni, inclus dans les fichiers locaux du build. L’ancienne identité reste disponible dans `LegacyBrand` : pour la rétablir, utiliser `<HeaderBrand variant="legacy" />` dans `App.tsx`. Elle sert également de secours si le logo ne peut pas être chargé. La source de l’image est documentée dans `src/assets/README.md`.

## Vérifications

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
# Dans un autre terminal, laisser npm run dev en cours :
npm run test:browser
```

La suite métier utilise des captures réelles dans `tests/fixtures`, avec des modifications explicites pour les cas d’erreur. La suite Chromium comporte un parcours **REAL SOURCES** sans interception des données et des scénarios **TEST FIXTURE** dédiés aux erreurs, à la finale terminée et aux interactions. Le parcours réel nécessite que les sources soient disponibles.

Pour vérifier le build de production, lancer `npm start`, puis définir `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001` avant `npm run test:browser`.

Les résultats exécutés sont consignés dans `VERIFICATION.md` et le suivi dans `PROGRESS.md`. Les captures et traces navigateur sont produites dans `test-results/` ; le rapport HTML se trouve dans `playwright-report/`.

## Limites des sources

Les requêtes GraphQL préenregistrées peuvent changer lors d’un déploiement de LoL Esports. Leaguepedia peut publier les gagnants en retard ou utiliser de nouveaux alias ; dans ce cas, l’historique reste explicitement indisponible ou partiel, sans bloquer l’affichage des scores Riot. Les futurs tirages et résultats ne peuvent pas être vérifiés avant leur publication. Sous les dimensions de référence, le défilement est autorisé pour conserver la lisibilité.
