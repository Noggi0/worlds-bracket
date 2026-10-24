# Review

C'est une liste de modifications demandées.

### Responsive
Le plan initial stipulait :
"Afficher toute la phase sélectionnée **sans défilement dans une zone d’affichage de navigateur de 1366 × 768 pixels CSS, avec un zoom de 100 %**, en conservant une bonne lisibilité. Ne pas réduire globalement la page par un zoom ou une transformation pour contourner cette contrainte. Sur les écrans plus petits, autoriser le défilement pour préserver la lisibilité."

Sur une résolution 1366x768, l'affichage est parfait.
Pour les résolutions plus grandes, l'affichage des Play-ins et des Knockouts est parfait.
Mais on pourrait se permettre d'utiliser toute la hauteur de l'écran pour le Swiss Stage. Actuellement, il y a un espace vide
en bas de la page. On peut facilement agrandir un peu la police pour faire en sorte que tout l'espace soit utile.

### Refresh
Pour les utilisateurs, il serait préférable que le bouton Refresh et que l'actualisation automatique ne ramène pas à l'onglet "Current"
Par contre, si on actualise la page (via F5 ou bouton du navigateur) alors on affiche le bracket Current.

### Footer
Dans le Footer, le point vert et "Live" ne correspondent à rien. Ce n'est pas non plus dans le plan.
Si ça ne correspond à rien, on peut le supprimer.

### Navigation
Dans <navigation>, la mention "Auto-refresh 60s" ne sert à rien, on peut l'enlever.

### Hover
Si l'utilisateur bouge rapidement la souris, il voit plusieurs hover en même temps. Répare ce comportement.

### Phase-Heading
Cette section n'est pas très importante, et prends de la place. Cache la pour l'instant, sans la supprimer.

### Boards
Ce serait bien qu'il y ait une transition entre les boards.
Par exemple, si on regarde le Swiss Stage, et qu'on sélectionne l'onglet Knockouts, avoir un mouvement de droite à gauche.