---
title: "Responsible disclosure"
description: "How to report a security vulnerability in this website or the WGO project."
date: 2026-08-03
lastmod: 2026-08-03
aliases:
  - "/en/responsible-disclosure/"
  - "/en/security/"
  - "/en/vdp/"
---

If you believe you have found a security vulnerability in this website or the WGO
project, thank you for reporting it responsibly. We would rather hear it from you
than read about it later.

This page is the human-readable policy behind our
[`security.txt`](/.well-known/security.txt) file.

## Scope

In scope:

- `wgo-audit.com`, `brand.wgo-audit.com`, and the Cloudflare Worker that serves
  them;
- the contact form and how it handles what you submit;
- published machine-readable files such as `security.txt` and `robots.txt`; and
- the open-source code at [`wgo-audit/code`](https://github.com/wgo-audit/code).

Out of scope:

- the third-party services listed on our
  [Sub-processors](/en/legal/sub-processors/) page — report those to the provider,
  though a note to us is appreciated;
- denial-of-service or load testing of any kind;
- social engineering of the maintainer, contributors, or users;
- spam, phishing, or credential-stuffing; and
- findings that only affect outdated or unsupported browsers.

## Rules of engagement

Please:

- report promptly, with enough detail to reproduce the issue;
- use only your own data and your own test submissions;
- avoid accessing, changing, or deleting data that is not yours;
- avoid persistence, lateral movement, and destructive testing; and
- give us a reasonable chance to respond before disclosing publicly.

The contact form is rate-limited. Please describe an issue rather than working
around that limit to demonstrate it.

## How to report

Report privately through
**[GitHub Security Advisories](https://github.com/wgo-audit/code/security/advisories/new)**,
or use the contact address in
[`/.well-known/security.txt`](/.well-known/security.txt). Include the affected
URL or component, the vulnerability type, steps to reproduce, the impact you
believe it has, and how you would like to be credited, if at all.

## What to expect

WGO is a small open-source project, not a staffed bug-bounty programme. We aim to
acknowledge good-faith reports within **five business days** and to keep you
informed while we investigate; timelines depend on severity. There is no monetary
bounty, but we are glad to credit you publicly where a report leads to a fix, if
you want that.

## Safe harbour

We will not pursue or support legal action against good-faith security research
that follows this policy, respects privacy, avoids harm to people and data, and
does not degrade the service. If you are unsure whether something is in scope, ask
first — a question costs nothing. This safe harbour covers systems we operate; it
cannot authorise testing against the third-party services we depend on.
