---
title: "Déclaration d'accessibilité"
description: "Ce qui est en place, ce qui est imparfait, et comment signaler un obstacle."
date: 2026-08-03
lastmod: 2026-08-03
aliases:
  - "/fr/accessibilite/"
  - "/fr/a11y/"
---

Nous voulons que ce site soit utilisable par le plus grand nombre, quelles que
soient les capacités ou la technologie d'assistance. Cette déclaration est
honnête sur ce qui est en place et ce qui ne l'est pas.

## Cible de conformité

Nous visons le **niveau AA des WCAG 2.1**. D'après notre propre examen — analyse
automatisée et tests manuels au clavier et de structure —, nous estimons que le
site y répond en grande partie, avec les lacunes indiquées ci-dessous. Nous n'avons
pas encore commandé d'audit indépendant ni testé avec de véritables technologies
d'assistance.

## Ce qui est en place

- **Accès au clavier.** Chaque commande interactive — liens de navigation, sélecteur
  de langue, bascule de thème, bouton de menu — est atteignable et utilisable au
  clavier. Un lien « Passer au contenu » est le premier élément focalisable de
  chaque page.
- **Focus visible.** Le focus est montré partout au moyen de `:focus-visible` : un
  contour de 2 px décalé de l'élément. Il apparaît à l'usage du clavier, pas au
  clic de souris.
- **Structure sémantique.** Le site utilise des éléments de repère (`<header>`,
  `<main>`, `<nav>`, `<footer>`) et un ordre de titres qui ne saute pas de niveau.
- **Langue correcte.** Chaque page définit sa langue (`en-CA` ou `fr-CA`) et
  déclare sa traduction au moyen d'attributs `hreflang`.
- **Contenu non textuel.** Les commandes à icône seule portent un nom accessible;
  les SVG décoratifs sont marqués `aria-hidden`.
- **Couleur.** La palette associe un texte encre foncé sur des surfaces claires (et
  l'inverse en mode sombre) pour garder le corps du texte et les titres bien
  au-dessus du seuil de contraste AA. Les couleurs de preuves — faits, inconnues,
  conflits — sont toujours accompagnées d'une étiquette textuelle, jamais de la
  couleur seule.
- **Thèmes.** Les thèmes clair et sombre sont pris en charge, et le site respecte
  la préférence de votre système d'exploitation en l'absence de choix.

## Lacunes connues

Nous les énumérons franchement plutôt que de revendiquer une conformité que nous
n'avons pas.

- **Le menu mobile exige JavaScript.** Avec JavaScript désactivé, le bouton de menu
  sur petit écran ne s'ouvre pas. Chaque page s'affiche tout de même, chaque lien
  dans la page fonctionne, et le lien d'évitement ainsi que le contenu demeurent
  atteignables sans script — mais pas le menu lui-même. Priorité : moyenne.
- **Aucun test formel avec lecteur d'écran.** Les signalements de personnes qui
  utilisent VoiceOver, NVDA, JAWS, TalkBack ou Narrateur sont les bienvenus,
  surtout avec des étapes de reproduction.

## Signaler un obstacle

Si vous rencontrez un obstacle d'accessibilité, dites-le-nous à
<privacy@wgo-audit.com>, ou ouvrez un signalement sur
[GitHub](https://github.com/wgo-audit/code/issues). Indiquez l'URL de la page, ce
qui n'a pas fonctionné, ainsi que le navigateur et la technologie d'assistance que
vous utilisiez.

Nous visons à accuser réception des signalements en **7 jours** et à corriger les
problèmes confirmés en **30 jours**.
