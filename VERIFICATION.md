# Vérifications exécutées — 24 octobre 2026

Les résultats de la livraison initiale figurent avant le séparateur. Les résultats de `REVIEW.md`, qui change notamment le comportement des actualisations, sont consignés dans la section finale.

Environnement : Windows, Node.js 24.22.1, Chromium 156 via Playwright, en mode headless. Aucun contrôle ci-dessous n’est déduit du seul succès du build.

| Contrôle exécuté | Résultat final |
| --- | --- |
| `npm run typecheck` | Réussi, TypeScript strict |
| `npm run lint` | Réussi, aucune erreur |
| `npm test` | 22 tests réussis dans 2 fichiers |
| `npm run build` | Réussi : frontend Vite et backend TypeScript compilés |
| `npm run test:browser` sur Vite/Fastify | 7 tests réussis |
| Même suite sur le build de production, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002` | 7 tests réussis |
| `npm audit` | 0 vulnérabilité signalée, développement compris |
| `npm start` avec port/cache distincts | Démarrage et service du frontend compilé réussis |

## Données réelles

Les deux opérations GraphQL et la requête MediaWiki documentées dans `API-INVENTORY.md` ont été exécutées sans authentification. Le parcours navigateur **REAL SOURCES** n’intercepte aucune réponse API et exige des sources sans erreur.

Dernier état contrôlé : `Last checked = 2026-10-24T02:05:27.387Z`, aucune erreur ni alerte.

| Phase | Séries officielles | Historiques complets validés | Phase terminée |
| --- | --- | --- | --- |
| Play-ins | 6 | 6 | Oui |
| Swiss | 33 | 8 | Non |
| Knockouts | 7 | 0 | Non |

La phase automatique est Swiss. Les autres historiques sont en attente de publication. La séquence KC–C9 a été vérifiée dans le navigateur : **C9 · KC · C9 · KC · KC**. Les deux séries KC–MVK restent distinctes par ID et date.

## Rendu et interactions

- Viewport mesuré : **1366 × 768 pixels CSS**, `visualViewport.scale = 1`. Largeur et hauteur du document n’excèdent pas le viewport. Les 6, 33 et 7 cartes restent au-dessus du pied de page, sans zoom global ni masquage des débordements.
- Absence de débordement des textes dans les lignes d’équipes et les métadonnées contrôlée par mesure DOM. Trois captures inspectées visuellement. Équipes Swiss à 14 px, métadonnées secondaires à 10 px ; cartes plus grandes pour les autres brackets.
- 8 connexions Play-ins, dont 3 de perdants, et 6 connexions Knockouts. Les destinations `standing` et `decisionPoint` ne dessinent pas de faux adversaires.
- Infobulles au survol, focus clavier et toucher ; séquence réelle KC–C9, formats BO3/BO5 partiels, parties en cours, non jouées et indisponibles. Position contenue dans le viewport, même avec un message périmé plus long.
- Épinglage tactile, fermeture au second toucher, clic extérieur et Échap. Pas de récupération des historiques au focus/survol.
- Retour à la phase actuelle après sélection manuelle puis actualisation manuelle et automatique.
- Scénarios artificiels explicitement nommés : source en erreur, premier chargement sans cache, finale terminée, séries en cours et écran 800 × 600 avec défilement autorisé.

Captures : `test-results/real-swiss-1366.png`, `test-results/real-play-ins-1366.png`, `test-results/real-knockouts-1366.png`. Rapport HTML dans `playwright-report/`. Ces artefacts sont locaux et ignorés par Git.

## Cas métier et erreurs couverts

- Déduplication et nombre exact de séries pour clore une phase ; cinq Play-ins terminés ne suffisent pas. Les parties `unneeded` ne bloquent pas la clôture.
- Autorité exclusive du calendrier sur les résultats, même si les scores de structure divergent ; pas de substitution par la structure en cas de calendrier absent.
- Colonnes et groupes Swiss, contrôle chronologique, fallback de description et conservation des ID.
- Parsing des modèles imbriqués et commentaires, alias, dates et DST, rapprochements ambigus et contradictions entre sources.
- BO5 terminé avec dernière victoire absente : historique partiel puis revalidation. Nouvelle révision corrigeant l’ordre à score identique et correction Riot revalidées.
- Parsing réutilisé à révision identique, invalidé à nouvelle révision.
- Leaguepedia en échec avec Riot disponible : données Riot actualisables, historique périmé signalé, Last checked conservé ; récupération complète ultérieure vérifiée.
- Erreurs HTTP, HTTP 200 avec erreur GraphQL/MediaWiki, page absente, structure invalide et pagination dans les deux directions avec prévention des cycles.
- Actualisations concurrentes dédoublonnées, restauration du cache après redémarrage et panne réseau, calendrier partiel, premier chargement en échec et cache corrompu.
- Routes Fastify testées avec `inject()`, dont rejet des requêtes invalides.

## Revue et limites

Revue des composants fondée sur le skill du projet et les [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) : accès direct au bracket, focus visible, annonces de statut, libellés de scores/horaires, dimensions d’images et interactions tactiles. La sélection d’onglet reste locale, conformément au retour imposé à la phase actuelle à chaque ouverture.

Les contrôles portent sur Chromium headless et le tactile émulé ; aucun appareil tactile physique ni autre moteur n’a été testé. Les futurs tirages et gagnants sont invérifiables avant publication. La disponibilité des sources, la stabilité des identifiants GraphQL et le retard Leaguepedia restent externes ; les erreurs et historiques incomplets sont signalés dans l’interface. Aucun résultat futur n’est simulé dans l’application.

`PLAN.md` et `API-INVENTORY.md` sont inchangés. Les nouveaux résultats sont consignés ici pour respecter la demande de ne pas modifier les documents de référence. Aucun commit, push ou déploiement.

---

## Vérifications après REVIEW.md — 24 octobre 2026

Les sept modifications demandées sont intégrées. Cette review remplace la règle initiale de retour à Current lors des actualisations, sans modifier le plan de référence.

| Demande | Preuve exécutée |
| --- | --- |
| Swiss utilisant la hauteur des grands écrans, avec police agrandie | Trois phases mesurées à 1366 × 768, 1600 × 900, 1920 × 1080 et 2560 × 1440 CSS, échelle 1. Aucun débordement du document ni de texte ; toutes les cartes restent dans leur conteneur et au-dessus du footer. Le round Swiss le plus dense conserve moins de 5 px inutilisés. Police et hauteur des cartes augmentent sur les grands viewports. |
| Refresh et actualisation automatique conservent l’onglet ; rechargement ouvre Current | Parcours réel et tests avec changement de Current entre deux récupérations. Rechargement navigateur distinct, erreur de transport et conservation des éléments de carte lors d’un Refresh vérifiés. |
| Suppression du point vert et de Live dans le footer | Absence du texte et de l’élément décoratif vérifiée dans Chromium. |
| Suppression d’Auto-refresh dans la navigation | Absence vérifiée dans Chromium ; les requêtes automatiques restent déclenchées après 60 secondes dans le test avec horloge contrôlée. |
| Une seule infobulle lors des mouvements rapides | Déplacements de souris répétés et MutationObserver : maximum d’une infobulle dans le DOM. Dernière carte, focus clavier, accès au contenu de l’infobulle, fermeture Échap, épinglage et fermeture tactiles vérifiés. |
| Phase-heading masqué sans suppression | Un élément conservé dans le DOM, masqué ; son contenu de phase terminée reste présent. |
| Transition entre les boards | Déplacement horizontal mesuré dans les deux sens dans Chromium. Préférence prefers-reduced-motion : aucune animation active. |

Résultats finaux :

- `npm run typecheck` et `npm run lint` : réussis, y compris après mise à jour finale des tests.
- `npm test` : **22/22 réussis**.
- `npm run build` : réussi après toutes les modifications applicatives.
- `npm run test:browser` : **11/11 réussis** sur le développement, puis **11/11 réussis** sur le nouveau build de production local sur 3002.
- Le parcours réel valide les réponses des sources à l’ouverture, au Refresh et au rechargement, sans interception des données. Ses attentes réseau tiennent compte du délai de récupération configuré.
- Captures inspectées visuellement à 1366 × 768, 1920 × 1080 et 2560 × 1440. Fichiers : `test-results/real-swiss-1366.png`, `test-results/review-swiss-1920.png`, `test-results/review-swiss-2560.png`.
- `git diff --check` réussi ; documents de référence inchangés. Les dépendances n’ont pas changé.

Les limites de moteurs de navigateur et de tactile émulé indiquées dans la livraison initiale restent applicables. Aucun commit, push ou déploiement.

### Ajustement ultérieur — suppression définitive de phase-heading

À la demande de l’utilisateur, le bloc précédemment masqué est supprimé, ainsi que ses styles exclusifs et l’import dédié à son compteur. Les styles `h2` des états de chargement et d’erreur restent présents. Les tests exigent désormais l’absence du bloc, avec maintien du contrôle de la finale terminée.

Contrôles exécutés après suppression : TypeScript, lint, **22/22 tests métier/backend**, build et **11/11 tests Chromium sur le nouveau build de production local** réussis. Les trois phases restent entièrement visibles à 1366 × 768 ; les autres résolutions et interactions de la suite passent également. Capture Swiss à 1366 × 768 inspectée visuellement, disposition conservée. `git diff --check` réussi ; documents de référence inchangés.

### Ajustement ultérieur — logo Worlds dans le header

Logo fourni récupéré puis inclus dans les assets locaux : réponse WebP de 792 × 213 pixels, affichée en blanc par CSS sur fond sombre. Provenance dans `src/assets/README.md`. Ancien header conservé dans `LegacyBrand`, sélectionnable avec `<HeaderBrand variant="legacy" />` et utilisé automatiquement si l’image échoue.

TypeScript, lint, **22/22 tests métier/backend**, build et **13/13 tests Chromium sur le nouveau build de production local** réussis. Les deux nouveaux tests vérifient le chargement depuis la même origine, les dimensions natives et l’accessibilité du logo, la hauteur du header de 62 px et le retour à l’ancienne identité si l’image ne charge pas. Les contrôles existants de phases, résolutions et interactions passent également. Capture `test-results/header-worlds-official-1366.png` inspectée visuellement. Documents de référence inchangés, aucune dépendance ajoutée.
