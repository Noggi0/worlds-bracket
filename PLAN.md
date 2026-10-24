# Page Worlds 2026

Créer une application locale en **TypeScript**, avec **React + Vite**, **Node.js + Fastify** et du CSS. Les libellés de l’interface seront en anglais.

## Design et affichage

- **Mode sombre uniquement**, avec une esthétique moderne et soignée inspirée de LoL Esports : fond anthracite, cartes sobres, typographie nette, espacements réguliers et accents colorés pour les matchs en cours.
- Leaguepedia sert uniquement de source de données ; son apparence ne sera pas reprise.
- Donner la priorité au bracket, sans grand bandeau décoratif. Afficher toute la phase sélectionnée **sans défilement dans une zone d’affichage de navigateur de 1366 × 768 pixels CSS, avec un zoom de 100 %**, en conservant une bonne lisibilité. Ne pas réduire globalement la page par un zoom ou une transformation pour contourner cette contrainte. Sur les écrans plus petits, autoriser le défilement pour préserver la lisibilité.
- Présenter logos, abréviations, scores, statut et horaires dans le fuseau local du navigateur. Distinguer les vainqueurs et les matchs en cours sans dépendre uniquement de la couleur.
- Utiliser des brackets connectés pour les Play-ins et Knockouts ; cinq colonnes de rounds regroupées par bilan pour le Swiss. Afficher **TBD** pour les équipes inconnues, sans suggérer de futurs adversaires avant les tirages.
- **Reprendre l’organisation visuelle du Swiss de [LoL Esports](https://lolesports.com/fr-FR/tournament/115660540725177488/stage/115660540725570706)** : progression de gauche à droite sur cinq colonnes, groupes selon le bilan avant la rencontre et cartes pour les affiches issues des tirages. Adapter les dimensions et les espacements pour afficher les **33 séries sur un seul écran à 1366 × 768** ; ne pas reproduire les débordements de la page de référence.
- Répartition des séries Swiss : tour 1, huit matchs à **0–0** ; tour 2, quatre à **1–0** et quatre à **0–1** ; tour 3, deux à **2–0**, quatre à **1–1** et deux à **0–2** ; tour 4, trois à **2–1** et trois à **1–2** ; tour 5, trois à **2–2**. Une victoire ou défaite correspond à une série, et les résultats des Play-ins ne comptent pas dans ces bilans.
- Ouvrir la phase actuelle par défaut selon les règles ci-dessous, avec des onglets pour consulter les autres.
- Au survol, au focus clavier ou au toucher, afficher une infobulle assortie montrant les gagnants des parties dans l’ordre : **X · X · Y · Y · X**. Prévoir trois ou cinq emplacements selon le format, distinguer les parties non jouées des résultats indisponibles et conserver l’infobulle dans la fenêtre.

## Construction des brackets

### Play-ins et Knockouts

Utiliser les colonnes et les connexions explicites fournies par l’opération GraphQL `GetSeasonTournamentDisplay`. Pour les Play-ins à quatre équipes et six séries, la structure de référence est :

```text
BRACKET HAUT

A ─┐
   ├─ M1 ─ vainqueur ─┐
B ─┘                 │
                     ├─ M3 ─ vainqueur ─────────────┐
C ─┐                 │                             │
   ├─ M2 ─ vainqueur ─┘                             │
D ─┘                                               ├─ M6 → qualifié
                                                   │
BRACKET BAS                                        │
                                                   │
perdant M1 ─┐                                       │
           ├─ M4 ─ vainqueur ─┐                     │
perdant M2 ─┘                 ├─ M5 ─ vainqueur ─────┘
                  perdant M3 ─┘
```

- Construire une table `structuralId → rencontre` et suivre `destinations.win` et `destinations.loss` lorsque leur `type` vaut `match`. Utiliser le `slot` de destination pour la liaison logique, sans l’assimiler automatiquement à l’ordre d’affichage de `matchTeams`. **Ne jamais déduire les connexions de l’ordre des ID, de réception des résultats ou des horaires.**
- Distinguer les rencontres répétées : KC–MVK apparaît à deux emplacements des Play-ins, à des dates différentes.
- Pour les Knockouts, utiliser les quatre quarts, deux demi-finales et la finale renvoyés par GraphQL. Les connexions 2026 sont déjà vérifiées même avec des équipes TBD : QF1 et QF2 alimentent SF1, QF3 et QF4 alimentent SF2, puis SF1 et SF2 alimentent la finale. Les identifiants exacts sont dans `API-INVENTORY.md`. Leaguepedia n’est pas nécessaire au placement des rencontres.
- Une destination `standing` indique un classement final et ne doit pas être dessinée comme une autre rencontre. Les destinations Swiss `decisionPoint` représentent des tirages, pas des adversaires prédéterminés.

### Emplacements Swiss avant les tirages

- Reprendre les cinq colonnes officielles de GraphQL : elles contiennent déjà les 33 séries, avec leurs `id` et `structuralId`, même lorsque les équipes sont **TBD**. Utiliser ces identifiants pour conserver des cartes stables à chaque actualisation.
- Lire le tour dans la colonne et le groupe de bilan dans `description`, par exemple `M1 (1-0)` ou `M5 (0-1)` au tour 2. Vérifier la cohérence avec la répartition attendue définie plus haut. Les bilans sont ceux d’avant la rencontre.
- Lorsque les équipes sont connues, contrôler le groupe avec leurs résultats Swiss antérieurs. Si la description devient inexploitable, ce calcul permet de classer les affiches connues ; pour les inconnues, conserver les emplacements TBD de la structure attendue sans inventer d’association.
- Remplacer les équipes **TBD** quand les affiches sont publiées. La présence d’un ID de match futur ne permet pas de prédire son adversaire ni de contourner un tirage.

## Sélection de la phase actuelle

La page concerne uniquement les Worlds 2026. Appliquer cette règle simple :

```text
Play-ins incomplets                    → Play-ins
Play-ins terminés, Swiss incomplet      → Swiss
Swiss terminé, Knockouts incomplets     → Knockouts
Knockouts terminés                      → bracket final terminé
```

Une phase est terminée uniquement si les **6 séries distinctes attendues des Play-ins, les 33 du Swiss ou les 7 des Knockouts**, selon la phase, sont présentes et ont chacune un résultat final exploitable et un vainqueur connu dans les données Riot. Dédupliquer les séries par leur ID : une réponse partielle ou une phase absente ne doit jamais être considérée comme terminée parce que tous les matchs reçus le sont. Les parties individuelles `unneeded` d’un BO5 gagné 3–0 ne bloquent pas sa clôture. La clôture de la phase ne dépend pas du délai de publication des historiques Leaguepedia. Avant le début du tournoi, les Play-ins sont incomplets et constituent donc la phase par défaut.

À chaque ouverture ou actualisation, y compris automatique, afficher la phase actuelle calculée avec ces règles, comme lors d’une nouvelle visite. Un choix manuel d’onglet ne persiste pas au-delà de l’actualisation suivante.

## Données et actualisation

- **Lire [API-INVENTORY.md](API-INVENTORY.md) avant d’implémenter les accès aux données. Ce fichier fait partie intégrante du plan et constitue la référence pour tous les appels API** : URL, paramètres, en-têtes, identifiants, champs des réponses, pagination, limites observées et appels à ne pas utiliser. Un agent chargé de l’implémentation doit disposer des deux fichiers.
- Utiliser uniquement **deux opérations GraphQL LoL Esports** pour les données Riot : `GetSeasonTournamentDisplay` fait autorité pour la structure, les phases, les colonnes, les groupes et les connexions ; `scheduleEvents` fait autorité pour les participants, scores, vainqueurs et états des séries, les horaires, les formats BO1/BO3/BO5 et les ID, numéros et états des parties. Les requêtes préenregistrées, en-têtes et variables sont dans `API-INVENTORY.md`.
- Les deux réponses peuvent refléter des instants différents. Utiliser exclusivement les résultats du calendrier pour afficher les scores, déterminer la clôture des phases et valider les historiques Leaguepedia ; ne pas compléter un résultat de calendrier manquant avec un score de la réponse de structure. Conserver dans ce cas le dernier résultat de calendrier exploitable en le signalant comme périmé, ou afficher le résultat comme indisponible sans cache.
- Joindre ces deux réponses par l’ID de série `match.id`. Utiliser `teamId` pour l’identité stable d’une équipe : l’`id` d’une entrée `matchTeams` du calendrier est composite et ne doit pas servir d’identifiant global d’équipe. Les équipes inconnues ont `teamId: "0"`.
- Pour le Swiss, récupérer les affiches via ces opérations et utiliser les colonnes/groupes publiés. Pour les contrôler, rejouer chronologiquement les séries Swiss terminées : le tour d’une équipe correspond à son nombre de séries Swiss antérieures plus un. Ne pas utiliser directement son bilan actuel pour classer une ancienne rencontre.
- Les résultats déterminent les groupes, mais pas les adversaires des tours suivants : de nouveaux tirages ont lieu entre équipes de même bilan, sans revanche pendant le Swiss. Garder les emplacements **TBD** tant que les équipes ne sont pas renseignées dans la source, puis les remplacer lors d’une actualisation. Ne pas dépendre d’un endpoint dédié au tirage ni promettre une mise à jour immédiate après son annonce. Le premier tirage a été vérifié dans l’API ; la publication des suivants reste à observer.
- Récupérer les gagnants par partie dans les pages de données Leaguepedia via l’API MediaWiki.
- Le calendrier GraphQL fournit déjà les métadonnées des parties nécessaires à l’affichage, sans requête supplémentaire par série. L’audit des opérations publiques n’a pas trouvé de vainqueur individuel ; `tournamentResult.matchResults[].winningTeamId` désigne le vainqueur d’une série. Conserver Leaguepedia pour la séquence des gagnants par partie.
- Charger les scores et les historiques à l’ouverture et actualiser toutes les **60 secondes**, sans requête au survol.
- Afficher un discret **Last checked**, un bouton Refresh et un indicateur de données périmées. **Mettre à jour Last checked uniquement après une actualisation entièrement réussie de toutes les données requises.** Si une source échoue, conserver l’horodatage précédent et signaler l’échec ; les données récupérées avec succès peuvent néanmoins être affichées.
- Une actualisation réussie exige des réponses exploitables : statut HTTP de succès, absence d’erreur applicative dans le JSON et contenu conforme aux champs nécessaires. Un HTTP `200` avec une erreur telle que `ratelimited`, une page manquante ou un contenu impossible à parser est un échec. Des équipes **TBD** ou un historique pas encore renseigné dans une page valide sont des données en attente de publication, pas un succès de l’historique ni, à eux seuls, un échec de la requête.
- Conserver un cache local pour les redémarrages et garder les dernières données réussies en cas d’échec ; proposer Retry si le premier chargement échoue sans cache.
- Garder Riot comme référence des scores de série et signaler les historiques manquants ou incohérents. Ne jamais déduire une séquence de gagnants à partir du seul score final ou des statistiques de jeu.
- Parser les modèles MediaWiki imbriqués et rapprocher les séries selon la directive ci-dessous. Leaguepedia peut être mise à jour avec un retard par rapport à Riot.
- Précharger les informations nécessaires aux infobulles et réutiliser les données terminées en cache, sans relire tout l’historique à chaque actualisation.
- Récupérer le calendrier avec les filtres Worlds 2026 et suivre sa pagination si nécessaire. Les deux opérations GraphQL et la requête MediaWiki constituent l’ensemble des appels métier ; ne pas conserver d’appels REST remplacés ni de double récupération systématique.
- Ne jamais figer dans le cache un historique incomplet sous prétexte que Riot marque la série terminée. Continuer à rechercher ses gagnants par partie à chaque actualisation jusqu’à obtenir un historique complet et validé. Associer chaque historique à la page Leaguepedia et à son identifiant de révision `revid`. À révision identique et résultat Riot inchangé, réutiliser un historique complet et validé. À nouvelle révision, reparcourir la page et revalider les historiques concernés, même si le score final Riot n’a pas changé : une correction peut modifier l’ordre des gagnants tout en conservant ce score. Revalider également si Riot corrige son résultat.

### Configuration GraphQL et futur script de maintenance

Centraliser dans un seul fichier de configuration backend les deux identifiants d’opérations préenregistrées et la version du client public, avec les valeurs de `API-INVENTORY.md`. L’application utilise cette configuration statique. Une erreur de requête conserve le cache et affiche un échec ; elle ne déclenche pas de recherche de nouveaux identifiants pendant le chargement ou les actualisations de 60 secondes. Une correction manuelle de la configuration reste possible.

**Un script de mise à jour de ces identifiants est prévu, mais son implémentation est hors scope de cette version de la page.** Ne pas le créer pour livrer le projet actuel. Un agent chargé ultérieurement de ce script devra suivre cette méthode :

1. Charger la page officielle du tournoi indiquée dans `API-INVENTORY.md` et relever les URL de ses scripts publics. Suivre leurs références de chunks, y compris les chargements dynamiques, pour retrouver le client Apollo et son `loadManifest`. Ne pas figer les noms de fichiers ou les numéros de modules observés : ils changent au déploiement.
2. Retrouver le manifeste `apollo-persisted-query-manifest`, puis sélectionner dans `operations` les entrées de type `query` nommées exactement `GetSeasonTournamentDisplay` et `scheduleEvents`. Utiliser leur champ `id`, pas le `__meta__.hash` des documents générés ni le hash d’une requête reconstruite.
3. Extraire également la version envoyée dans `apollographql-client-version` en suivant le code du client et `getAppVersion`. Lire les données et littéraux statiquement, avec un parseur JavaScript si nécessaire ; ne pas exécuter les bundles téléchargés et ne pas utiliser `eval`.
4. Construire une configuration candidate et tester réellement les deux opérations avec les variables et en-têtes de l’inventaire, en suivant la pagination du calendrier. Exiger des réponses sans erreur GraphQL et des données exploitables : bon tournoi, trois phases contenant 6/33/7 séries distinctes, connexions de type `match` résolues et couverture des 46 ID par le calendrier avec les métadonnées de parties attendues. Si le schéma a changé, signaler qu’une adaptation de l’intégration est nécessaire plutôt que valider les seuls identifiants.
5. Remplacer atomiquement le fichier de configuration uniquement après validation des deux opérations. En cas d’échec de découverte ou de validation, garder la configuration précédente, produire un diagnostic et terminer avec un code d’erreur. Ne pas modifier le cache du tournoi.

Ce sera une commande de maintenance exécutée explicitement, distincte du fonctionnement de la page et de ses trois appels métier. Les références de chunks de l’inventaire sont des exemples de recherche, pas des constantes du futur script. La date de déploiement du manifeste actuel n’est pas établie ; ne pas en déduire une garantie de stabilité des identifiants.

### Rapprochement Riot–Leaguepedia

- Normaliser les équipes vers leurs identifiants Riot avec une table explicite d’alias, notamment KC/KCORP/Karmine Corp, C9/Cloud9, DK/DPLUS et TLAW/TL.
- Chercher une correspondance par **phase, paire d’équipes sans tenir compte de leur ordre, et date de rencontre**. Comparer les dates dans le fuseau déclaré par Leaguepedia, en tenant compte du changement d’heure.
- Exiger **une correspondance unique** et utiliser le round comme contrôle supplémentaire lorsqu’il est connu. Ne pas rapprocher arbitrairement deux séries si plusieurs candidates subsistent.
- Une fois la série identifiée, associer les parties par leur numéro. Le gagnant Leaguepedia est relatif aux côtés bleu/rouge de chaque partie, pas à l’ordre des équipes de la série : `winner=1` désigne `blue`, `winner=2` désigne `red`.
- Si l’association reste ambiguë ou si les résultats contredisent Riot, afficher l’historique comme indisponible sans bloquer le bracket.
- Pour valider l’historique complet d’un **BO5**, Riot doit fournir un résultat final et un vainqueur connu, et Leaguepedia doit attribuer **exactement trois victoires de partie à cette même équipe**. Exiger aussi que le nombre de victoires de chaque équipe corresponde au score Riot, que toutes les parties jouées soient renseignées dans l’ordre et qu’aucun gagnant ne soit attribué à une partie `unneeded`. Appliquer la même règle aux BO3 avec deux victoires, et aux BO1 avec une victoire.
- Tant que la série est en cours, afficher seulement les gagnants de parties déjà explicitement connus et compatibles avec les données Riot, avec les autres emplacements en attente. Ne jamais présenter cet historique partiel comme complet. Une victoire de série connue sans historique Leaguepedia complet reste affichée dans le bracket ; seul l’historique continue d’être recherché.
- Cas de contrôle vérifié : KC–C9, gagné 3–2 par KC, donne **C9 · KC · C9 · KC · KC**.

## Vérification et livraison

- Vérifier la lisibilité et l’absence de défilement ou de contenu masqué sur les trois phases dans une zone d’affichage de **1366 × 768 pixels CSS, zoom 100 %**, ainsi que le positionnement des infobulles.
- Tester les historiques BO3/BO5 terminés et en cours, les interactions clavier/tactiles, les phases à venir et la finale terminée.
- Vérifier les alias d’équipes, les correspondances entre sources, les résultats manquants, les erreurs réseau et la récupération du cache.
- Vérifier les connexions vainqueur/perdant des Play-ins et le placement des Knockouts par leurs destinations GraphQL, la stabilité des cartes Swiss avec leurs ID officiels avant les tirages, les deux séries KC–MVK, la séquence KC–C9 et la clôture d’une phase malgré les parties `unneeded`.
- Tester un échec de Leaguepedia avec Riot disponible : le bracket peut recevoir les nouvelles données, l’historique reste indisponible ou provient du cache, l’échec est signalé et **Last checked** ne change pas. Vérifier qu’un succès complet ultérieur met bien l’horodatage à jour.
- Tester une réponse partielle de cinq séries Play-ins terminées : la phase ne doit pas être déclarée terminée. Tester le recalcul de la phase actuelle après une sélection manuelle puis une actualisation.
- Tester un BO5 terminé côté Riot dont Leaguepedia ne renseigne que deux victoires du vainqueur : l’historique reste incomplet et est recherché de nouveau, puis devient complet lorsque la troisième victoire et le score du perdant concordent avec Riot. Tester aussi un HTTP `200` avec une erreur applicative et vérifier que **Last checked** ne change pas.
- Tester un désaccord entre les scores ou états des deux réponses GraphQL : seuls ceux du calendrier servent à l’affichage, à la clôture des phases et à la validation Leaguepedia. Tester une nouvelle révision Leaguepedia qui corrige l’ordre des gagnants sans changer le score final : le cache doit intégrer la correction après validation.
- Livrer le projet local avec les commandes de lancement/build et un exemple de configuration. Aucun hébergement prévu.
- Aucun compte ni clé API n’est requis pour les appels retenus. Livrer la configuration centralisée avec les identifiants de requêtes préenregistrées et la version du client public documentés dans `API-INVENTORY.md`. Le futur script de maintenance décrit plus haut reste hors scope ; signaler un échec de configuration au lieu d’afficher un tournoi vide.
- Conserver les appels détaillés, les identifiants et les résultats des vérifications dans [API-INVENTORY.md](API-INVENTORY.md).
