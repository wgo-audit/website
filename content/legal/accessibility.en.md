---
title: "Accessibility statement"
description: "What we have implemented, what is imperfect, and how to report a barrier."
date: 2026-08-03
lastmod: 2026-08-03
aliases:
  - "/en/accessibility/"
  - "/en/a11y/"
---

We want this site to be usable by as many people as possible, whatever their
ability or assistive technology. This statement is honest about what is in place
and what is not.

## Conformance target

We aim for **WCAG 2.1 Level AA**. Based on our own review — automated scanning
plus manual keyboard and structure testing — we believe the site substantially
meets it, with the gaps noted below. We have not yet commissioned an independent
audit or tested with real assistive technology.

## What is in place

- **Keyboard access.** Every interactive control — navigation links, the language
  switcher, the theme toggle, the menu button — is reachable and operable with a
  keyboard. A skip-to-content link is the first focusable element on every page.
- **Visible focus.** Focus is shown everywhere through `:focus-visible`: a 2 px
  outline offset from the element. It appears for keyboard use, not mouse clicks.
- **Semantic structure.** The site uses landmark elements (`<header>`, `<main>`,
  `<nav>`, `<footer>`) and a heading order that does not skip levels.
- **Correct language.** Each page sets its `lang` (`en-CA` or `fr-CA`) and
  declares its translation with `hreflang` alternates.
- **Non-text content.** Icon-only controls carry an accessible name; decorative
  SVGs are marked `aria-hidden`.
- **Colour.** The palette pairs dark ink text on light surfaces (and the reverse
  in dark mode) to keep body text and headings well above the AA contrast
  threshold. The evidence colours — facts, unknowns, conflicts — are always
  paired with a text label, never colour alone.
- **Themes.** Light and dark themes are both supported, and the site respects
  your operating system's preference when no choice has been made.

## Known gaps

We list these plainly rather than claim conformance we do not have.

- **The mobile menu requires JavaScript.** With JavaScript disabled, the small
  screen menu button does not open. Every page still renders, every in-page link
  works, and the skip link and content remain reachable without script — but the
  menu itself does not. Priority: medium.
- **No formal screen-reader testing.** Reports from people using VoiceOver, NVDA,
  JAWS, TalkBack, or Narrator are very welcome, especially with reproduction
  steps.

## Reporting a barrier

If you hit an accessibility barrier, please tell us at
<privacy@wgo-audit.com>, or open an issue on
[GitHub](https://github.com/wgo-audit/code/issues). Include the page URL, what
went wrong, and the browser and assistive technology you were using.

We aim to acknowledge reports within **7 days** and to fix confirmed issues within
**30 days**.
