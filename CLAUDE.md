# Stacks — Claude Code Reference

## Project at a Glance

Stacks is a local-first, privacy-focused project management app with a kanban-style workflow. It's a **Yarn workspaces monorepo** with 9 packages.

**Tech stack:** TypeScript • Hono • Sequelize/PostgreSQL • React 18 + Blueprint v6 • Expo • Playwright

## Monorepo Structure

```
packages/
├── types/        # Shared TypeScript types (single source of truth)
├── db/           # Sequelize models, migrations, seeders
├── server/       # Hono API server (port 3000)
├── app/          # React web client (Webpack dev on port 3001)
├── mobile/       # Expo / React Native client
├── email-service # Outbound email worker
├── translations  # i18n runtime
├── license       # Dev license verification
├── locales-tui   # Terminal UI for editing locale JSON
```

## Development Commands

| Command | Description |
| --- | --- |
| `yarn setup` | Clean install + build internal packages. **Run first.** |
| `yarn build:internal` | Build types, db, license, translations |
| `yarn dev` | Full dev: libs + app (3001) + server (3000) |
| `yarn dev:server` | Server only (rebuilds libs first) |
| `yarn dev:app` | Web app only |
| `yarn dev:email` | Email service worker |
| `yarn dev:mobile` | Expo mobile app |
| `yarn build` | Full production build |
| `yarn test:server` | Server tests (vitest) |
| `yarn test:e2e` | Playwright E2E tests |
| `yarn format` | Prettier all files |
| `yarn lint` | Lint the web app |

## Critical Constraints

1. **License key required** — Server exits at startup if `packages/server/license.key` is missing. Get a free dev key at getstacksapp.com/dev-program.
2. **Port 3001 is hardcoded** — The server's reverse proxy for `/app/*` and `/static/*` targets `localhost:3001`. The Webpack dev server **must** run on 3001. Never change the app's port.
3. **Access via server (3000)** — The server proxies to the app. Visiting port 3001 directly skips auth/cookies/API routes.
4. **Env files** — Copy from `packages/db/env.example` and `packages/server/env.example`. Never commit `.env` files.
5. **Auth** — JWT (HS256) via `auth_token` cookie or `Authorization: Bearer` header
6. **Realtime** — WebSocket at `/ws` for server → client polling updates; client uses `window.updatePoller` and `useUpdates()` hook

## Code Conventions

- **Prettier:** 4-space indent, semicolons, double quotes, trailing commas, print width 110
- **App imports:** Use `app/...` prefix (e.g., `import { TasksAPI } from "app/api"`), not relative paths
- **Store mutations:** Always through actions (`src/app/store/actions/`), never `Store.set()` directly in components
- **Store subscriptions:** Use `Store.use()` in renders, not `Store.get()`; use `shallowEqual` or custom equality for object/array selectors
- **Styles:** Global tokens in `_vars.scss`, per-component in `_X.scss` next to the component, no CSS-in-JS
- **Test IDs:** All interactive elements need `data-testid` attributes
- **Types:** Use `@stacks/types` for shared type imports
- **Dark mode:** Body class `.bp6-dark`
- **i18n:** Locale JSON files under `src/app/locale/`, edit with `yarn workspace @stacks/locales-tui start`

## Server Conventions

- Routes: `src/routes/<domain>.ts`, one file per domain
- Schemas: `src/routes/schema/<domain>.ts` (Zod)
- Loaders: `src/loaders/<domain>.ts` (DB access layer)
- Auth: `mountAuthenticated()` for authenticated routes (not `app.route()`)
- Don't call `c.get("user") as User` — `requireAuth` guarantees presence
- Write paths call `invalidateApiCacheForCurrentRequest()` to evict stale cache entries

**Adding a new route:**
1. Create handler in `src/routes/<domain>.ts`
2. Add Zod schema in `src/routes/schema/<domain>.ts`
3. Add loader in `src/loaders/<domain>.ts`
4. Mount via `mountAuthenticated("<domain>", router)` in `src/api.ts`

## App Conventions

- API clients: `src/app/api/<domain>.ts`, one file per domain
- Store slices: `src/app/store/<domain>.ts`
- Actions: `src/app/store/actions/<domain>.ts`
- Hooks: `src/app/hooks/<domain>.ts`
- Views: `src/app/views/<Domain>/` (PascalCase folders)
- Use `window.toaster.show()` for notifications
- HashRouter (`#/...` URLs)

**Adding a new feature:**
1. API client in `src/app/api/<domain>.ts`
2. Store slice in `src/app/store/<domain>.ts`
3. Actions in `src/app/store/actions/<domain>.ts`
4. Hook in `src/app/hooks/<domain>.ts`
5. View in `src/app/views/<Domain>/`
6. Route in `src/app/App.tsx`
7. Add `data-testid` attributes on all interactive elements

## Database Conventions

- Models: `src/entities/`
- Migrations: `migrations/` (zero-padded prefix: `001_`, `002_`, ...)
- `.cjs` extension required (package is `"type": "module"`)
- Wrap multi-statement migrations in transactions
- Never edit `000_init_schemas.cjs` by hand — it's regenerated at build time

**DB commands:**
```
yarn workspace @stacks/db migrate              # apply pending
yarn workspace @stacks/db migrate:create --name=<slug>  # generate new migration
yarn workspace @stacks/db demo:install          # load demo data
yarn workspace @stacks/db reset-password:dev    # dev-only password reset
```

## E2E Testing Rules (Playwright)

1. **Selectors must use `data-testid`** — never tag/class/text/role/CSS
2. **All DOM access goes through Page Object Models** (`playwright/pages/`) — specs never call `page.getByTestId()` directly
3. **Reusable actions belong on the POM** — if used in 2+ specs, extract to a named method

## Branching Strategy

```
main  (production-ready, protected)
 └── dev  (integration branch — target PRs here)
      ├── feature/*
      ├── fix/*
      ├── docs/*
      └── hotfix/*  (from main)
```

- PRs target `dev`, not `main`
- One feature or fix per PR
- Merge: **squash and merge** into `dev`, **merge commit** into `main`
- Commit format: `type: short description` (feat, fix, docs, refactor, test, chore, hotfix)

## What to Avoid

- Don't commit `.env`, `license.key`, or build artifacts
- Don't select test elements by text/class/CSS — only `data-testid`
- Don't call `Store.set()` in components — use actions
- Don't use `Store.get()` in renders — use `Store.use()`
- Don't edit `000_init_schemas.cjs` — add new migrations
- Don't visit port 3001 directly or change it
- Don't use relative imports in the app — use `app/...` prefix
- Don't manually `.toISOString()` dates in API calls — Axios handles it

## Documentation

- Server internals: `packages/server/docs/` (onboarding, loaders, caching, AI, permissions, realtime, embedded integrity)
- App internals: `packages/app/docs/` (onboarding, architecture, API client)
- General: `docs/` (installation, E2E, Docker, contributing, per-package guides)
- Full contributing guide: `CONTRIBUTING.md`
- Agent-specific instructions: `AGENTS.md`
