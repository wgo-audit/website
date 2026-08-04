---
title: "Privacy notice"
description: "What this website collects, why, and the rights you have over it."
date: 2026-08-03
lastmod: 2026-08-03
aliases:
  - "/en/privacy/"
---

This website is built to collect as little about you as practical. It loads no
cookies, no client-side JavaScript analytics, no advertising, and no social
tracking. Fonts are served from our own infrastructure, not a third party.

Two things worth stating plainly first:

- **The WGO audit tool is not this website.** The tool runs locally, in your own
  AI account. Your repositories, evidence, and findings stay on your machine. We
  never receive them and could not access them if we wanted to.
- **There are no accounts here.** Nothing on this site asks you to sign up, log
  in, or create a profile.

## Website visitors & analytics

We measure traffic with a privacy-first analytics processor, fired **server-side**
by our Cloudflare Worker. There is no tracking script in your browser, no cookie,
no fingerprint, and no cross-site identifier.

For each page view, the data is limited to:

- **Country only, from your IP address.** Your IP is forwarded to the analytics
  processor to resolve a country, then discarded. We keep no log of it.
- **The page path visited.** Query strings are stripped and never stored.
- **The referring URL**, only if your browser sends one.
- **Your language preference**, from the first value of your `Accept-Language`
  header (e.g. `fr-CA`), so we can show the site in the right language.

The providers involved are listed on the
[Sub-processors & third-party services](/en/legal/sub-processors/) page.

## The choice you set

If you switch between the light and dark theme, that choice is stored in your
browser's `localStorage` under the key `theme`. It never leaves your device, is
never sent to us, and holds no identifier. With JavaScript disabled, the site
follows your operating system's `prefers-color-scheme` instead.

## The contact form

If you write to us through the contact form, it asks for your name, your email
address, and your message. Here is what happens to a submission:

- It is delivered to us **as an email**, through Cloudflare Email Routing (see the
  [Sub-processors](/en/legal/sub-processors/) page). Your email address becomes
  the reply address so we can answer you.
- It is **not written to a database, a spreadsheet, or a log.** There is no copy
  on this website. The message lives in our mailbox and nowhere else, so its
  retention is simply the retention of our email.
- Submissions are rate-limited to blunt automated abuse. That check is transient
  and no record of it is kept.

We use what you send only to answer you. We do not, and will never, sell it or
share it for advertising.

## Your rights

Our practice is based in Montreal, but we extend the same standard to everyone,
whether you are covered by Quebec's Law 25, the GDPR, the CCPA, or another
framework. You have the right to access, correct, or delete the personal data you
have provided, and to object to or restrict its processing.

To exercise any of these rights, or for any privacy question, contact the person
responsible for data protection:

- **Benoît H. Dicaire** — <privacy@wgo-audit.com>

We answer verified requests within the legally required timelines, typically 30
days. We may keep information where the law requires us to.

## Changes

This notice will evolve as the project does. Any update is posted here with a new
revision date.
