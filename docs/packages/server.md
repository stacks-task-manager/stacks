# `@stacks/server`

The Stacks backend. A [Hono](https://hono.dev/) HTTP server on Node that exposes the REST API, serves static app assets in production, talks to Postgres via Sequelize, and provides a real-time WebSocket endpoint.

> **⚠ Development license required.** The server calls `initializeLicense()` early in `bootstrap()` ([`src/index.ts:131`](../../packages/server/src/index.ts)) and exits with code `1` if `license.key` is missing or invalid. Place a key at `packages/server/license.key` before starting. See [`license.md`](license.md).

## Environment

`packages/server/.env` from [`packages/server/env.example`](../../packages/server/env.example):

```bash
cp packages/server/env.example packages/server/.env
```

Key variables:

- `APP_PORT` — HTTP port (default `3000`)
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — database connection
- `COOKIE_SECRET`, `JWT_SECRET` — auth / session secrets (must be strong in production)
- `DEBUG_DB` — set to `true` to log Sequelize SQL
- `DELETE_FILES` — whether deletes via the API also remove files from disk

Optional:

- `CORS_ORIGINS` — comma-separated list of allowed origins; if unset, CORS is permissive
- `REQUIRE_SECRETS=1` — enforce strong secrets outside production
- AI assistant: `AI_OPENAI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_CHAT_ENABLED`, `AI_CHAT_AUTO_REDIRECT`

## Development

```bash
yarn dev:server   # rebuilds internal libs, then `tsx watch` with --inspect
```

The server listens on `APP_PORT` (`3000` by default). The web app's dev server (`yarn dev:app`, port `3001`) proxies API requests to it.

## API overview

Routes are registered in [`src/api.ts`](../../packages/server/src/api.ts) and grouped under `/api/<resource>`. The current set:

| Prefix | Purpose |
| --- | --- |
| `/api/boot` | Initial client bootstrap payload |
| `/api/people`, `/api/companies` | Contacts directory |
| `/api/projects`, `/api/stacks`, `/api/tasks` | Core kanban entities |
| `/api/documents`, `/api/files`, `/api/notepads` | Files and notes |
| `/api/bookmarks`, `/api/tags`, `/api/preferences` | Per-user metadata |
| `/api/events`, `/api/activities`, `/api/notifications`, `/api/reminders` | Activity feed / scheduling |
| `/api/home`, `/api/search`, `/api/reports` | Aggregations |
| `/api/timelogs` | Time tracking |
| `/api/permissions`, `/api/roles` | RBAC |
| `/api/export` | Data export |
| `/api/google` | Google OAuth callbacks |

Legacy / public routes outside `/api`: `/auth`, `/login`, `/register`, `/ping`.

Handler implementations live under [`packages/server/src/routes/`](../../packages/server/src/routes/) (one file per route group). Zod schemas in [`packages/server/src/routes/schema/`](../../packages/server/src/routes/schema/).

### WebSocket

Endpoint **`/ws`** ([`packages/server/src/routes/socket.ts`](../../packages/server/src/routes/socket.ts)), upgraded via `@hono/node-ws`. Used for real-time updates, heartbeats, presence, and broadcasts. Authentication is required (same JWT as the HTTP API).

### Auth model

Sessions are signed JWTs (HS256). Two transports are accepted, in order:

1. **Signed cookie** `auth_token` (cookie signature uses `COOKIE_SECRET`)
2. **Authorization header** `Bearer <jwt>`

Token extraction lives in [`src/middleware/utils.ts`](../../packages/server/src/middleware/utils.ts) (`getAuthTokenWithSource`); verification in [`src/middleware/auth.ts`](../../packages/server/src/middleware/auth.ts). Payload fields: `uid`, `email`, `role`, `tenant`, `iat`, `exp`.

## Build

```bash
yarn build:server    # tsc -> dist/, then esbuild bundle via `bundle`
yarn release         # produces the runnable releases/server bundle
```

`yarn release:server` also copies `public.pem` next to the bundle so the production license check can find it.

## Related

- [`@stacks/db`](db.md) — models, migrations, seeds
- [`@stacks/types`](types.md) — request/response shapes shared with the client
- [`@stacks/license`](license.md) — startup license validation
- [`@stacks/translations`](translations.md) — bundled i18n strings
