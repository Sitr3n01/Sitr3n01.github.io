---
categoria: Web · Client project
card: Development and operation of two production websites for a real client, with an editorial workflow for writing, approval, and scheduling.
tags: In production · Since June 2026
papel: End-to-end development and operations
periodo: Since June 2026
status: In production
---

Two production websites for a real client: [Komuniki](https://komuniki.com.br), a school of communication and arts, and [Blog da Kelly](https://kellyfarias.com.br/news/), a news portal. I built both on a single codebase and have been responsible for the entire lifecycle, from code to infrastructure, since June 2026.

## The challenge

Two websites with distinct identities usually mean two systems, two servers, and twice the maintenance. A news portal also needs an editorial routine with several people publishing, in which nothing goes live without review.

## Deliverables

- **One codebase, two websites.** Komuniki and Blog da Kelly run on the same code: every improvement reaches both at the same time.
- **Editorial dashboard in daily use.** The reporter writes, the editor approves, and the system publishes at the scheduled time. Only approved content is published.
- **Visual identity with motion.** An animated 3D opening and text revealed as the reader scrolls, with a version without animations for visitors who enabled reduced motion on their system.
- **Security.** Google sign-in, protection against bots and repeated password attempts, and an internal audit that identified 7 vulnerabilities, all fixed and covered by tests.
- **Low infrastructure cost.** The entire operation runs on a server with 1 virtual CPU and 4 GB of memory, protected by Cloudflare.

## Key figures

- **2** production websites from a single codebase
- **823** automated tests
- **7** security vulnerabilities fixed, 3 of them severe
- **−98%** in build cache size (23.95 GB → 442 MB)
- **83.5%** of code paths covered by tests (required minimum: 82%)

## Technical overview

- **Foundation:** Django 5.2 + Wagtail 7.4 on PostgreSQL. The Django admin (Unfold) and the Wagtail admin were unified into a single dashboard, with an editorial workflow for review and scheduling.
- **Interface:** a WebGL hero built with three.js and custom shaders, and text reveals with GSAP, with a static alternative under `prefers-reduced-motion`.
- **Security:** the review covered five categories. CSP with nonces, extension and MIME checks on uploads, django-axes, and Cloudflare Turnstile.
- **Operations:** Docker Compose behind Cloudflare. The VPS pulls each deployment from an approved tag, so the CI does not store server credentials. CodeQL, pip-audit, secret scanning, and a protected `master` branch.
- **Maintenance:** I identified and fixed a deployment that had been running in a loop for two months, as well as Docker images that grew quadratically with the database dumps. That fix reduced the build cache from 23.95 GB to 442 MB.

## Next steps

Run the test suite against PostgreSQL in CI and migrate to Wagtail 8.
