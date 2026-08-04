# WGO — Whats.Going.On. website

Source for the [wgo-audit.com](https://wgo-audit.com) marketing site, built with
[Hugo](https://gohugo.io/) and [Tailwind CSS v4](https://tailwindcss.com/),
hosted on a **Cloudflare Worker** with **server-side** [Umami](https://umami.is/)
analytics (no client-side JavaScript, no cookies).

WGO is an open-source, prompt-first, local-first audit tool for startups and
SMBs. The tool itself lives at **[wgo-audit/code](https://github.com/wgo-audit/code)**.

## Quick start

```bash
npm install
npm run dev      # http://localhost:1313/en/
```

## How it works

- **Content is data-driven.** All page copy is in `data/home.en.yml` and
  `data/home.fr.yml` (bilingual en-CA / fr-CA). Edit those, not the templates.
- **Design tokens** (teal `brand` scale, semantic fact/unknown/conflict
  colours, fonts) live in `assets/css/main.css` under Tailwind v4 `@theme`.
  There is no `tailwind.config.js`.
- **Fonts** are self-hosted variable `.woff2` (InterVariable + JetBrains Mono)
  in `static/fonts/`.
- **Analytics** are fired server-side by `src/worker.mjs` via `ctx.waitUntil()`.
  Set `UMAMI_WEBSITE_ID` and `UMAMI_ENDPOINT` as **runtime** secrets in the
  Cloudflare dashboard.

## Deploy

Every push to the connected branch triggers **Cloudflare Workers Builds**, which
runs `build.sh` (pinned Hugo + Tailwind) and deploys the Worker. Attach the
`wgo-audit.com` custom domain in the Cloudflare dashboard.

## Structure

| Path | Purpose |
| --- | --- |
| `layouts/index.html` | The single-page section stack |
| `layouts/partials/sections/` | One partial per section (modular; can graduate to pages) |
| `data/home.{en,fr}.yml` | All page copy |
| `i18n/{en,fr}.yml` | UI strings |
| `assets/css/main.css` | Tailwind v4 `@theme` + `@font-face` |
| `src/worker.mjs` | Cloudflare Worker + server-side Umami |
| `hugo.brand.yml` | Deferred brand-site stub |

## Licence

MIT © Benoît H. Dicaire.
