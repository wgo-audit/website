---
title: "Fichiers publics lisibles par machine"
description: "Fichiers de configuration destinés aux moteurs de recherche, aux robots et aux agents d'IA."
date: 2026-08-03
lastmod: 2026-08-03
aliases:
  - "/fr/fichiers-lisibles-par-machine/"
---

Cette page rassemble les fichiers publics lisibles par machine que ce site Web
publie.

> **Moisonnage par IA et forage de données.** La collecte automatisée, le forage
> de données ou l'entraînement de modèles en dehors des règles énoncées dans
> [`/robots.txt`](/robots.txt) ou par les en-têtes HTTP `X-Robots-Tag` standards
> n'est pas autorisé.

## Sécurité et contact

- [`/.well-known/security.txt`](/.well-known/security.txt) : métadonnées de
  divulgation de vulnérabilités et de contact de sécurité (RFC 9116).
- [`/security.txt`](/security.txt) : copie des mêmes métadonnées à la racine.
- [`/humans.txt`](/humans.txt) : les personnes derrière le projet, ainsi que les
  outils avec lesquels il est bâti.

## Robots et indexation

- [`/robots.txt`](/robots.txt) : préférences d'accès pour les robots.
- [`/sitemap.xml`](/sitemap.xml) : plan de site XML pour les moteurs de recherche
  et les robots.
