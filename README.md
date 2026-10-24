# Worlds 2026 — tournament board

## Explications
Même si je me sers de l'IA tous les jours, je ne l'avais jamais laissée faire un projet de A à Z. Ce projet est mon expérimentation à ce sujet. Pendent ces Worlds, je m'agaçais à devoir scroll sur [lolesports.com](https://lolesports.com/fr-FR/tournament/115660540725177488/stage/115660540725570706), alors j'ai eu l'idée de me faire mon propre board des Worlds. Et le scope du projet étant assez restreint, c'était l'occasion parfaite pour expérimenter. J'ai passé un certain temps avec Codex à construire le [plan](/PLAN.md), ainsi que la [liste des API à utiliser](/API-INVENTORY.md). Avec Codex, on l'a peaufiné avec la directive "écrit le plan pour qu'un autre agent, sans contexte, puisse le lire et l'implémenter correctement". J'ai donc ensuite lancé un nouvel agent pour implémenter le plan. Son avancée est documentée dans [PROGRESS.md](/PROGRESS.md) et [VERIFICATION.md](/VERIFICATION.md), et mes commentaires après la première livraison sont dans [REVIEW.md](/REVIEW.md).

J'ai finalement déployé le projet sur Vercel, [disponible ici](https://worlds-bracket-umber.vercel.app/)

Les détails pour build et lancer le projet localement sont disponibles dans [TECH_DETAILS.md](/TECH_DETAILS.md).

Modèle utilisé : GPT-6.1 Sol (Low pour le plan, Medium pour l'implémentation)