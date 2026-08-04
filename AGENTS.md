# Agent Instructions

## French Content

- Write French content in Canadian/Quebec French with proper accents.
  Do not strip diacritics.
- Preserve code identifiers, filenames, paths, URLs, anchors, shortcodes,
  config keys, command examples, and reviewer IDs exactly as written
  (e.g. `business-continuity`, `/wgo_onboard`, `install.sh`).
- For terminology, prefer official Canadian and Quebec sources:
  - Grand dictionnaire terminologique / Vitrine linguistique, OQLF:
    <https://vitrinelinguistique.oqlf.gouv.qc.ca/>
  - TERMIUM Plus, Government of Canada:
    <https://www.btb.termiumplus.gc.ca/tpv2alpha/alpha-eng.html?lang=eng>
- Avoid untranslated English business or technology terms in French prose
  when an accepted Canadian/Quebec French term exists.
- Project terminology:
  - Use `logiciel-service` for SaaS when the delivery model matters.
  - "Startups and SMBs" → « jeunes pousses et PME ».
  - Keep the product name **Whats.Going.On.** / **WGO** untranslated.
- Prefer natural French phrasing over literal translation from English.

## Site conventions

- All page copy is data-driven: edit `data/home.en.yml` and `data/home.fr.yml`,
  not the templates. Every key must exist in both languages.
- No client-side analytics. Page analytics are server-side in `src/worker.mjs`.
- Design tokens (teal `brand` scale, semantic fact/unknown/conflict colours,
  fonts) live in `assets/css/main.css` under Tailwind v4 `@theme`. There is no
  `tailwind.config.js`.
