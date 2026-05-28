# Stacks — Agent Instructions

## Table of Contents

-   [Project overview](#project-overview)
-   [Prerequisites](#prerequisites)
-   [Development commands](#development-commands)
-   [Important constraints](#important-constraints)
-   [Environment setup](#environment-setup)
-   [Architecture overview](#architecture-overview)
-   [E2E testing conventions (Playwright)](#e2e-testing-conventions-playwright)
-   [Branching strategy](#branching-strategy)
-   [Commit message format](#commit-message-format)
-   [Code style](#code-style)
-   [File and directory conventions](#file-and-directory-conventions)
-   [What to avoid](#what-to-avoid)
-   [Documentation](#documentation)
-   [CI (future)](#ci-future)
-   [Security](#security)

## Project overview

Stacks is a local-first, privacy-focused project management app with a kanban-style workflow. It's a Yarn workspaces monorepo built with:

- **Web app**: React 18 + TypeScript + Webpack 5 + Blueprint UI
- **API server**: Hono (Node 20) + Sequelize + PostgreSQL
- **Mobile**: Expo / React Native
- **Email service**: React Email worker
- **Shared types**: `@stacks/types` (single source of truth for entity shapes)
- **i18n**: `@stacks/translations` + locale JSON files

Tech stack: TypeScript • Hono • Sequelize/PostgreSQL • React • Expo • Playwright

## Prerequisites

- Node.js 18+ (20 recommended)
- Yarn 3.6.4 — enable via `corepack enable`
- PostgreSQL 15
- Development license key at `packages/server/license.key` (required — server exits without it)

## Development commands

From the repo root:

| Command | Description |
| --- | --- |
| `yarn setup` | Clean install + build internal packages (types, db, license, translations). **Run this first.** |
| `yarn dev` | Full local dev: internal libs + web app + server in watch mode |
| `yarn dev:server` | API server only (rebuilds internal libs first) |
| `yarn dev:app` | Web app dev server on port 3001 (webpack) |
| `yarn dev:email` | Email service worker (optional) |
| `yarn dev:mobile` | Expo mobile app |
| `yarn build` | Full production build |
| `yarn test:server` / `yarn test:server:unit` | Server tests (vitest) |
| `yarn test:e2e` | Playwright E2E tests |

## Important constraints

### License key

The server **exits at startup** (`process.exit(1)`) if `packages/server/license.key` is missing or invalid. Obtain a free dev key at [getstacksapp.com/dev-program](https://getstacksapp.com/dev-program/). Save it as `packages/server/license.key`.

### Port 3001 is hardcoded

The server's reverse proxy target for `/app/*` and `/static/*` is hardcoded to `localhost:3001`. The webpack dev server **must** run on port 3001. Never change the app's port — free up 3001 instead.

The server port (`3000` by default) is configurable via `APP_PORT` in `packages/server/.env`. Visit `http://localhost:<APP_PORT>/login` in dev.

### No direct access to port 3001

The webpack dev server at 3001 serves the SPA shell without auth, cookies, or API routes. Always access via the server at 3000 (or your configured `APP_PORT`).

## Environment setup

Required `.env` files (copy from examples, then edit):

```bash
cp packages/db/env.example     packages/db/.env
cp packages/server/.env.example packages/server/.env
```

Optional (for email features):

```bash
cp packages/email-service/env.example packages/email-service/.env
```

Never commit `.env` files — they are in `.gitignore`.

## Architecture overview

### Monorepo structure

```
packages/
├── types/        # Shared TypeScript types (single source of truth)
├── db/           # Sequelize models, migrations, seeders
├── server/       # Hono API server
├── app/          # React web client
├── mobile/       # Expo / React Native client
├── email-service # Outbound email worker
├── translations  # i18n runtime
├── license       # Dev license verification
└── locales-tui   # Terminal UI for editing locale JSON
```

### Server (`packages/server`)

- Routes under `src/routes/` — one file per domain
- Zod schemas under `src/routes/schema/`
- Loaders under `src/loaders/` — database access layer
- Auth: JWT (HS256) via cookie `auth_token` or `Authorization: Bearer`
- WebSocket at `/ws` for real-time updates
- i18n via `@stacks/translations`

**Adding a new route** (see `packages/server/docs/ONBOARDING.md` for full detail):
1. Create route handler in `src/routes/<domain>.ts`
2. Add Zod schema in `src/routes/schema/<domain>.ts`
3. Add loader in `src/loaders/<domain>.ts`
4. Mount via `mountAuthenticated("<domain>", router)` in `src/api.ts`

**Important**: Authenticated routes **must** use `mountAuthenticated()`. Using `app.route()` for a route that needs auth will silently mount it unauthenticated.

### Web app (`packages/app`)

- HashRouter (`#/…` URLs) — server serves the app from the same origin
- State: custom entity store (immer-backed), one slice per domain under `src/app/store/`
- API client: single Axios instance, one file per domain under `src/app/api/`
- Realtime: WebSocket client (`window.updatePoller`) → `useUpdates()` hook
- UI kit: Blueprint v6 primitives + app-local components
- i18n: `@stacks/translations` + JSON files under `src/app/locale/`

**Adding a new feature** (see `packages/app/docs/ONBOARDING.md` for full walkthrough):
1. API client in `src/app/api/<domain>.ts`
2. Store slice in `src/app/store/<domain>.ts`
3. Actions in `src/app/store/actions/<domain>.ts`
4. Hook in `src/app/hooks/<domain>.ts`
5. View in `src/app/views/<Domain>/`
6. Route in `src/app/App.tsx`
7. Add `data-testid` attributes on all interactive elements

**Conventions**:
- Import paths use `app/…` prefix (e.g. `import { TasksAPI } from "app/api"`), not relative paths
- All store mutations go through actions — never call `Store.set()` directly in components
- Use `shallowEqual` (or custom equality) in `Store.use()` for object/array selectors
- Use `window.toaster.show()` for user notifications — don't roll your own
- Dark mode: body class `.bp6-dark`
- No CSS-in-JS — use SCSS modules (`_X.scss`) next to components
- Use `@stacks/types` for all shared type imports

### Database (`packages/db`)

- Sequelize models under `src/entities/`
- Migrations under `migrations/` — zero-padded numeric prefix (001_, 002_, …)
- `.cjs` extension required (package is `"type": "module"`)
- Always wrap multi-statement migrations in transactions
- Never edit `000_init_schemas.cjs` by hand — it's regenerated from `src/init_schema.ts` at build time

Commands:
```bash
yarn workspace @stacks/db migrate              # apply pending
yarn workspace @stacks/db migrate:create --name=<slug>  # generate new migration
yarn workspace @stacks/db demo:install          # load demo data
yarn workspace @stacks/db reset-password:dev    # dev-only password reset
```

### Shared types (`packages/types`)

Single source of truth for all entity shapes. Any change here ripples through every package. After editing types, run `yarn build:internal` before starting dependent dev processes.

## E2E testing conventions (Playwright)

Tests at `playwright/`. Three non-negotiable rules:

1. **Selectors must use `data-testid`** — never select by tag, class, text, role, or CSS path. Every testable element in React components must have a `data-testid` attribute.
2. **All DOM access goes through a Page Object Model (POM)** — specs never call `page.getByTestId()` or any Playwright DOM API directly. They only call methods on POM classes in `playwright/pages/`.
3. **Reusable actions belong on the POM** — if a flow is used in more than one spec, put it on the POM as a named method.

The spec should read like English; the POM is the dictionary.

Run: `yarn test:e2e` (headless), `yarn test:e2e:headed` (visible), `yarn test:e2e:ui` (interactive).

## Branching strategy

```
main                  — always production-ready (protected)
 └── dev              — integration branch
      ├── feature/*   — new features
      ├── fix/*       — bug fixes
      ├── docs/*      — documentation changes
      └── hotfix/*    — critical production bugs (from main)
```

- Target PRs at `dev`, never `main`.
- One bug fix or one feature per PR.
- Merge strategy: **squash and merge** into `dev`, **merge commit** into `main`.
- At least 1 maintainer approval required.

## Commit message format

```
type: short description (max 72 chars)

Optional longer explanation if needed.
Reference issues or PRs: Closes #42
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `hotfix`

## Code style

- Prettier is the formatter — run `yarn format` before committing
- 4-space indentation (editorconfig)
- Semicolons required
- ES5 trailing commas
- Single quotes for strings (Prettier default with `singleQuote: false` means double quotes — but Prettier will auto-format)
- Print width: 110 characters

## File and directory conventions

- **Server routes**: one file per domain under `src/routes/`, schemas under `src/routes/schema/`
- **App API**: one file per domain under `src/app/api/`
- **App stores**: one slice per domain under `src/app/store/`
- **App actions**: one namespace per domain under `src/app/store/actions/`
- **App hooks**: subscriber hooks under `src/app/hooks/`
- **App components**: `PascalCase` folders matching component names
- **App views**: top-level routed pages, `PascalCase` folders
- **App styles**: global tokens in `_vars.scss`, per-component in `_X.scss` next to the component
- **Entity files**: `_X.scss` next to the component, not in a separate styles folder

## What to avoid

- Don't commit `.env` files, `license.key`, or build artifacts (`dist/`, `build/`, `node_modules/`)
- Don't access the DOM directly in E2E specs — always go through POMs
- Don't select test elements by text, class, or CSS — only `data-testid`
- Don't call `Store.set()` in React components — always use actions
- Don't use `Store.get()` inside component render — use `Store.use()` for subscriptions
- Don't call `c.get("user") as User` in authenticated routes — `requireAuth` guarantees it's present
- Don't re-query `RoleEntity` in admin middleware — `requireAuth` already loaded it
- Don't edit `000_init_schemas.cjs` — add new migrations instead
- Don't visit port 3001 directly — the server at 3000 proxies to it
- Don't change port 3001 — it's the hardcoded proxy target
- Don't manually `.toISOString()` dates in API calls — the Axios layer handles round-tripping
- Don't import from relative paths in the app — use `app/…` prefix

## Documentation

Per-package deep dives live in:
- `packages/server/docs/` — onboarding, caching, AI assistant, embedded bundle integrity
- `packages/app/docs/` — onboarding, architecture, API client
- `docs/` — installation, E2E, Docker, contributing

Always check these docs before asking questions about package internals.

## CI (future)

When CI is added, the recommended job shape:
1. Spin up Postgres as a service container
2. Provide `license.key` from a repository secret
3. `corepack enable && yarn install && yarn setup`
4. `yarn playwright install --with-deps chromium`
5. `yarn test:e2e`
6. Upload `html-report/`, `results/reports/playwright.xml`, and `test-results/` as artifacts

## Security

- Report vulnerabilities per [SECURITY.md](SECURITY.md) — email `customers@getstacksapp.com` with `SECURITY:` prefix
- Never expose `COOKIE_SECRET` or `JWT_SECRET` in logs or commits
- The `reset-password:dev` script refuses to run with `NODE_ENV=production`
