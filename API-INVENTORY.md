# Inventaire API — Worlds 2026

Vérifications effectuées le 24 octobre 2026. Ce fichier fait partie intégrante de [PLAN.md](PLAN.md). Il documente uniquement les sources retenues pour l’implémentation : **deux opérations GraphQL LoL Esports et une requête MediaWiki Leaguepedia**. Aucun appel aux anciennes API REST LoL Esports n’est nécessaire.

## Identifiants du tournoi

| Élément | ID |
| --- | --- |
| Tournoi Worlds 2026 | `115660540725177488` |
| Ligue Worlds | `98767975604431411` |
| Phase Play-ins | `115660540725570705` |
| Phase Swiss | `115660540725570706` |
| Phase Knockouts | `115660540725570707` |

Le tournoi contient 46 séries distinctes : 6 Play-ins, 33 Swiss et 7 Knockouts. Les identifiants sont connus et fixes pour cette page ; aucun appel de découverte de ligue ou de tournoi n’est requis.

## Accès commun au GraphQL LoL Esports

Endpoint : **`GET https://lolesports.com/api/gql`**.

En-têtes utilisés avec succès :

```text
Content-Type: application/json
apollographql-client-name: Esports Web
apollographql-client-version: b2972c5
```

Les deux opérations ont répondu HTTP 200 **sans clé API, cookie ni connexion à un compte**. Ne pas demander de clé Riot personnelle, de clé partagée LoL Esports ou de clé GRID pour cette approche.

Pour chaque requête, construire ces paramètres avec un générateur d’URL :

```text
operationName=<nom de l’opération>
variables=<objet sérialisé en JSON puis encodé dans l’URL>
extensions=<objet sérialisé en JSON puis encodé dans l’URL>
```

Le paramètre `extensions` a cette forme :

```json
{
  "persistedQuery": {
    "version": 1,
    "sha256Hash": "<identifiant préenregistré de l’opération>"
  }
}
```

Le serveur refuse les requêtes GraphQL libres. Utiliser les opérations préenregistrées ci-dessous, sans inventer une requête ni en modifier les champs. Les erreurs GraphQL peuvent être renvoyées dans `errors` : un statut HTTP de succès ne suffit pas.

## 1. Structure du tournoi et connexions

**Opération : `GetSeasonTournamentDisplay`**

Identifiant préenregistré :

```text
708d9dedda96c2a21518f4bf7a548b40e750f96394dc72135c2cace7086babfd
```

Variables :

```json
{
  "hl": "en-US",
  "tournamentId": ["115660540725177488"]
}
```

Chemin principal :

```text
data.tournaments[]
  .stages[]
  .sections[]
  .columns[]
  .cells[]
  .matches[]
```

Données utiles :

- Tournoi : `id`, `state`, `startTime`, `endTime`.
- Phases et sections : `id`, `name`, `slug`, `type`, colonnes et cellules nommées.
- Rencontre : `id`, `description`, `structuralId`, `state`, `matchTeams`, `destinations`.
- Équipe d’une rencontre : `teamId`, `code`, `name`, `slug`, `image`, `result.outcome` et `result.gameWins`.
- Classements disponibles : `standings` et `rankings`.
- Résultats de séries : `tournamentResult.matchResults[].id` et `winningTeamId`. Ces ID correspondent aux **séries**, pas aux parties.

Cette opération fait autorité pour la structure, les phases, colonnes, groupes et connexions. Ses scores et états sont présents mais ne servent pas à déterminer les résultats : utiliser ceux de `scheduleEvents`, y compris pour la clôture des phases et la validation Leaguepedia, afin de ne pas mélanger deux instantanés différents.

Construire une table `structuralId → rencontre`. Pour les brackets, suivre `destinations.win` et `destinations.loss`, sans déduire les connexions de l’ordre du tableau :

```json
{
  "id": "115660540726095097",
  "description": "QF1",
  "structuralId": "match_d6ae207aa0",
  "destinations": {
    "win": {
      "type": "match",
      "structuralId": "match_c09550107e",
      "slot": 1
    },
    "loss": {
      "type": "standing",
      "structuralId": null,
      "slot": 5
    }
  }
}
```

- `type: "match"` : connexion à une autre rencontre via son `structuralId`.
- `slot` : emplacement logique de destination. Ne pas assimiler automatiquement ce slot à l’ordre courant de `matchTeams`, qui peut afficher le vainqueur en premier.
- `type: "standing"` : classement final, pas une rencontre.
- `type: "decisionPoint"` : étape de tirage Swiss ; ne pas la transformer en adversaire prédéterminé.
- Les connexions sont présentes même lorsque les équipes sont TBD.

### Connexions Knockouts vérifiées

| Origine | ID de la série | Destination du vainqueur |
| --- | --- | --- |
| QF1 | 115660540726095097 | SF1, slot 1 |
| QF2 | 115660540726095103 | SF1, slot 2 |
| QF3 | 115660540726095109 | SF2, slot 1 |
| QF4 | 115660540726095115 | SF2, slot 2 |
| SF1 | 115660540726095121 | Finale, slot 1 |
| SF2 | 115660540726095127 | Finale, slot 2 |
| Finale | 115660540726095133 | Classement final |

Les Play-ins fournissent également les connexions des vainqueurs et des perdants. Les deux séries KC–MVK ont des ID et des emplacements distincts.

### Swiss avant les tirages

Les cinq colonnes officielles contiennent 8, 8, 8, 6 et 3 séries. Les groupes sont déjà indiqués dans `description`, par exemple `M1 (1-0)` et `M5 (0-1)` au deuxième tour, même si les équipes sont TBD.

Utiliser les colonnes pour le tour et le bilan entre parenthèses pour le groupe, avec contrôle de cohérence par les résultats antérieurs lorsque les équipes sont connues. Ne pas utiliser l’ordre numérique des ID. Si une description devient inexploitable, utiliser les bilans antérieurs pour les affiches connues ; conserver la structure de groupes prévue au plan pour les emplacements encore inconnus, sans inventer leur association.

## 2. Calendrier, formats et métadonnées des parties

**Opération : `scheduleEvents`**

Identifiant préenregistré :

```text
7e9af7acad0f697e265c1f2fa49e5ba6bbf409e35cf1700dc2202ff00169f715
```

Variables testées :

```json
{
  "hl": "en-US",
  "leagues": ["98767975604431411"],
  "eventDateStart": "2026-10-15",
  "eventDateEnd": "2026-11-15",
  "pageSize": 100
}
```

Chemins :

```text
data.esports.events[]
data.esports.pages.older
data.esports.pages.newer
```

La requête a renvoyé les 46 rencontres du tournoi en une page, avec les deux jetons de pagination à `null`. Implémenter néanmoins la pagination si un jeton est présent : le renvoyer dans la variable `pageToken`, dédupliquer par `match.id` et empêcher les boucles de jetons.

Données utiles par événement :

- `tournament.id` : vérifier qu’il correspond aux Worlds 2026.
- `startTime`, `state`, `blockName`.
- `match.id`, `match.state`, `match.strategy.type` et `match.strategy.count`.
- `match.games[]` : `id`, `number`, `state`, ainsi que VODs et récapitulatifs non nécessaires à l’affichage prévu.
- `matchTeams[]` : équipes, logos, `teamId` et résultats de série.

Joindre calendrier et structure par **`match.id`**, jamais par leur index. Le calendrier fait autorité pour les participants, scores, vainqueurs et états des séries, horaires, formats et métadonnées des parties. Ne pas remplacer un résultat manquant par celui de la réponse de structure : conserver le dernier résultat de calendrier exploitable en le signalant comme périmé, ou afficher le résultat comme indisponible sans cache.

Attention aux identifiants d’équipes : dans `scheduleEvents.matchTeams`, `id` est un identifiant composite propre à la rencontre, par exemple `115660588583171786:111692118851466302`. Utiliser **`teamId`** comme identité stable de l’équipe. Le participant TBD utilise `teamId: "0"`.

États de parties observés : `completed`, `inProgress`, `unstarted`, `unneeded`. Trier les parties par `number`. Aucun appel par série n’est nécessaire pour obtenir ces informations.

## 3. Gagnants des parties dans l’ordre — Leaguepedia

Endpoint : **`GET https://lol.fandom.com/api.php`**.

Paramètres :

```text
action=query
format=json
formatversion=2
prop=revisions
rvprop=ids|timestamp|content
rvslots=main
redirects=1
titles=Data:2026 Season World Championship/Play-In|Data:2026 Season World Championship/Main Event
```

Encoder les valeurs avec le générateur d’URL. La requête a fonctionné sans clé ni connexion.

Chemin du contenu :

```text
query.pages[].revisions[0].slots.main.content
```

Le contenu est du **wikitexte MediaWiki**, pas une liste JSON de résultats. Lire aussi `query.pages[].revisions[0].revid` et `timestamp`. Conserver la page source et son `revid` avec les historiques en cache : une nouvelle révision exige de reparcourir la page et de revalider les historiques concernés, même si les scores Riot n’ont pas changé.

- La page Play-In contient 6 séries ; Main Event contient les 33 séries Swiss et les 7 Knockouts.
- Parser les modèles imbriqués `MatchSchedule` et `gameN={{MatchSchedule/Game ...}}`.
- Pour chaque partie, `winner=1` désigne `blue`, `winner=2` désigne `red` ; le numéro vient de `gameN`.
- Ne pas interpréter ces valeurs par rapport aux équipes extérieures `team1/team2` de la série.
- Les modèles futurs peuvent contenir des champs vides, qui restent inconnus.
- Leaguepedia sert aux gagnants individuels ; la structure du bracket vient de GraphQL.

Normaliser les alias vers les `teamId` LoL Esports : KC/KCORP/Karmine Corp, C9/Cloud9, DK/DPLUS, TLAW/TL, et les autres équipes participantes. Associer une série par phase, paire d’équipes non ordonnée et date dans le fuseau déclaré par Leaguepedia avec son indicateur DST ; exiger une correspondance unique, avec contrôle du round lorsqu’il est connu. Les ID MediaWiki, de séries LoL Esports et de parties ne sont pas interchangeables.

Une correspondance ambiguë ou des résultats contradictoires rendent l’historique indisponible, sans bloquer le bracket. Pour un historique complet, les gagnants de toutes les parties jouées doivent correspondre exactement au score et au vainqueur Riot : seuil de 3 victoires en BO5, 2 en BO3, 1 en BO1. Ne jamais attribuer une victoire à une partie `unneeded`.

Exemple vérifié : **KC–C9, 3–2, séquence C9 · KC · C9 · KC · KC**. Ne jamais inférer cette séquence du score final, de l’or, des objectifs ou des côtés.

## Cycle de récupération

1. Au chargement puis toutes les 60 secondes, récupérer les deux opérations GraphQL et les deux pages Leaguepedia dans le backend.
2. Assembler les données par ID de série et appliquer les contrôles décrits dans le plan.
3. Précharger les historiques : survol, focus et toucher ne déclenchent aucune requête.
4. Réutiliser les historiques complets et validés en cache seulement à révision Leaguepedia et résultat Riot inchangés. Reparser et revalider les historiques concernés à chaque nouvelle révision, même à score final identique. Continuer à rechercher les historiques incomplets même après la fin d’une série, et revalider un historique si Riot corrige son résultat.
5. Ne pas lancer d’actualisations concurrentes. Garder le dernier cache exploitable en cas d’erreur, sans inventer de données.
6. Mettre à jour **Last checked** seulement si toutes les récupérations requises réussissent avec des données exploitables. Une erreur GraphQL ou MediaWiki dans un HTTP 200 reste un échec. Un historique encore vide dans une page valide reste en attente de publication.

## Maintenance des requêtes préenregistrées

Les valeurs d’identifiants d’opérations, de version du client et de noms de chunks sont liées au déploiement du site.

Centraliser les deux ID d’opérations et la version du client dans la configuration backend. **Un script de mise à jour est prévu, mais hors scope de l’implémentation actuelle.** Sa méthode est spécifiée dans la section « Configuration GraphQL et futur script de maintenance » de [PLAN.md](PLAN.md). La mise à jour reste manuelle pour cette version ; aucune exploration des bundles ne doit être déclenchée par le chargement de la page ou son actualisation périodique.

- Si le serveur renvoie `PERSISTED_QUERY_NOT_IN_LIST`, retrouver l’opération par son nom dans le manifeste public du site ; ne pas utiliser directement le `__meta__.hash` d’un document GraphQL généré, qui peut différer de l’ID enregistré.
- Un texte GraphQL libre est rejeté par `PERSISTED_QUERY_ID_REQUIRED`.
- Les deux en-têtes de nom et version client ainsi que le type JSON étaient nécessaires aux tests.
- Pour une mise à jour de configuration : lire les références de scripts de la page officielle, retrouver le `loadManifest` du client Apollo et son chunk dynamique, puis l’objet `operations` du manifeste. Retrouver `getAppVersion` dans le runtime public. Cette recherche est une procédure de maintenance, pas une nouvelle API métier.
- Références observées : manifeste `https://lolesports.com/_next/static/chunks/3ljhtmeypccge.js`, client `1a_d76bscees1.js` et version client dans `3by1_iis94mph.js`, sous le même répertoire.
- Pour le futur script, suivre les références des bundles sans figer ces noms, parser les littéraux sans exécuter le code téléchargé, tester les deux opérations et leur contenu avant de remplacer atomiquement la configuration. Un échec doit conserver l’ancienne configuration et produire un code d’erreur. La date de déploiement du manifeste actuel n’a pas pu être établie ; les en-têtes de cache ne permettent pas de la déduire.
- Ne jamais traduire une erreur de configuration en « tournoi vide ». Conserver le cache et signaler l’échec jusqu’à rétablissement de la configuration.

## Validation et limites de l’enquête

- Les deux opérations principales ont répondu HTTP 200 sans authentification et couvrent toutes les séries du tournoi. Équipes, états et scores des 46 séries ont concordé lors de la comparaison de sources.
- Le calendrier GraphQL a fourni les ID, numéros et états de toutes les parties, y compris les parties inutiles des séries terminées. Les deux BO5 KC–C9 et MVK–FUR ont été contrôlés individuellement.
- Réinspection des **125 requêtes publiques** du manifeste : aucun gagnant individuel trouvé dans les sélections de parties accessibles. Les opérations de résultats de tournoi et Pick’Em ont été testées ; leurs `winningTeamId` correspondent aux ID des séries. Les 13 résultats renvoyés au moment du contrôle correspondaient tous à des séries connues.
- Le détail VOD d’un BO5 terminé a également été testé : il fournit les côtés de chaque partie, mais pas son vainqueur. Cet appel n’est pas nécessaire pour le plan.
- Cette conclusion porte sur les opérations publiques inspectées et testées ; elle ne prouve pas qu’aucun champ ou service interne supplémentaire n’existe. Le serveur n’autorise pas de requêtes libres pour demander des champs supplémentaires.
- Lecture anonyme Leaguepedia vérifiée : Play-In révision 4550994 et Main Event révision 4552078. Les séquences des 12 séries terminées alors renseignées concordaient avec les scores de cette source.
- Les vainqueurs de matchs futurs ne peuvent pas être validés avant qu’ils soient publiés. Leaguepedia peut être en retard sur Riot.
- Les scripts de diagnostic et captures brutes ont été supprimés à la demande de l’utilisateur ; conserver les résultats de validation ici.

Sources primaires de cette intégration :

- https://lolesports.com/en-US/tournament/115660540725177488/stage/115660540725570707
- https://lol.fandom.com/wiki/Data:2026_Season_World_Championship/Play-In
- https://lol.fandom.com/wiki/Data:2026_Season_World_Championship/Main_Event
