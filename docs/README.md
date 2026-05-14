# Stacks documentation

This page is the navigation hub for everything under `docs/` and the per-package READMEs. Start from the section that matches what you're doing — each link points to the single source of truth for that topic.

## Getting started

| Doc | What you'll find |
| --- | --- |
| [Root README](../README.md) | Project overview, tech stack, 5-minute quick start |
| [Installation & local development](INSTALLATION.md) | Prerequisites, env files, Postgres / Mailpit setup, running `yarn dev`, troubleshooting |
| [Contributing](../CONTRIBUTING.md) | Branching, PR rules, CLA, commit message format |
| [Code of Conduct](../CODE_OF_CONDUCT.md) | Contributor Covenant |
| [Security policy](../SECURITY.md) | How to report a vulnerability |

## Per-package docs

The repo is a Yarn workspaces monorepo; each workspace has its own page under `docs/packages/`.

| Package | Doc |
| --- | --- |
| `@stacks/app` — React web client | [packages/app.md](packages/app.md) |
| `@stacks/server` — Hono API + WebSockets | [packages/server.md](packages/server.md) |
| `@stacks/db` — Sequelize models, migrations, seeds | [packages/db.md](packages/db.md) |
| `@stacks/email-service` — outbound mail worker | [packages/email-service.md](packages/email-service.md) |
| `@stacks/mobile` — Expo / React Native client | [packages/mobile.md](packages/mobile.md) |
| `@stacks/types` — shared TypeScript types | [packages/types.md](packages/types.md) |
| `@stacks/translations` — runtime i18n | [packages/translations.md](packages/translations.md) |
| `@stacks/license` — startup license validation | [packages/license.md](packages/license.md) |
| `@stacks/locales-tui` — terminal UI for locale JSON | [packages/locales-tui.md](packages/locales-tui.md) |

## Testing

| Doc | What you'll find |
| --- | --- |
| [E2E testing with Playwright](E2E.md) | Test layout, POM conventions, running the suite |

## Server internals (deep dives)

Living under `packages/server/docs/` so they sit next to the code they describe:

| Doc | What you'll find |
| --- | --- |
| [Server onboarding](../packages/server/docs/ONBOARDING.md) | Stack overview, bootstrap order, request lifecycle, how to add a route |
| [Caching system](../packages/server/docs/CACHING.md) | Multi-tenant response cache, invalidation, configuration |
| [Embedded bundle integrity](../packages/server/docs/EMBEDDED_INTEGRITY.md) | Build-time signing + boot-time verification |

## Operations & deployment

| Doc | What you'll find |
| --- | --- |
| [Docker / production deployment](DOCKER.md) | Building the `releases/` bundle and running `docker-compose` |
| [Adding Tiptap Pro extensions (optional)](TIPTAP_PRO.md) | Registry config when you need paid Tiptap packages |
