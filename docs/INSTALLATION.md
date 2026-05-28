# Installation Guide

This guide provides comprehensive instructions for installing Stacks and running it locally for development. For an overview and a 5-minute summary, see the root [README](../README.md#quick-start).

## Table of Contents

-   [Prerequisites](#prerequisites)
-   [Development license required](#development-license-required)
-   [Installing dependencies](#installing-dependencies)
-   [Setting up environment variables](#setting-up-environment-variables)
-   [Setting up the database](#setting-up-the-database)
-   [Running the application](#running-the-application)
-   [Ports](#ports)
-   [Scripts](#scripts)
-   [Troubleshooting](#troubleshooting)

## Prerequisites

| Requirement | Version / Notes |
| --- | --- |
| **Node.js** | 18.0.0 or higher (20 recommended) |
| **Yarn** | 3.6.4 — activated via `corepack enable` (ships with Node) |
| **PostgreSQL** | 15 — running locally or reachable from your machine |
| **SMTP server** | *(optional)* only needed for outbound email features (password reset, verification). `yarn dev` does **not** start the email worker, so you can run Stacks without configuring SMTP first. [MailHog](https://github.com/mailhog/MailHog) or [Mailpit](https://github.com/axllent/mailpit) work great when you do want it |
| **OpenAI-compatible API** | *(optional)* for the chat assistant — e.g., [LM Studio](https://lmstudio.ai/) or [llama.cpp](https://github.com/ggerganov/llama.cpp) exposing an OpenAI-compatible endpoint |
| **Disk / RAM** | 5 GB free disk, 2 GB free RAM minimum |

## ⚠️ Development license required

> **The server will `process.exit(1)` on startup unless `packages/server/license.key` exists.** This applies to AGPL / open-source use as well as commercial use during development.

To obtain a key:

1. Register at **[getstacksapp.com/dev-program](https://getstacksapp.com/dev-program/)** with the email address you want to use for development.
2. You will receive `license.key` via email. The license is issued for that same registration email — on first server start it seeds an admin account whose login email matches it.
3. Save the key as `packages/server/license.key` — e.g. `cp /path/to/license.key packages/server/license.key` (the file is read from `process.cwd()` at server start — see [docs/packages/license.md](packages/license.md) for the exact lookup logic, payload schema, and failure modes).

**First login:** after the server starts and seeds the database, sign in at `/login` with your registration email and the default password `$Pa$$w0rd`. Change the password after your first login.

> If you ever forget the password you set, run the dev-only reset:
>
> ```bash
> yarn workspace @stacks/db reset-password:dev -- --email=you@example.com
> # or with a custom password:
> yarn workspace @stacks/db reset-password:dev -- --email=you@example.com --password='MyNewPass1'
> ```
>
> The script writes directly to the `users` table using `packages/db/.env` and is excluded from release bundles. See [`docs/packages/db.md`](packages/db.md#migrations).

The license check gates *server startup only*; it does not phone home at runtime.

## Installing dependencies

```bash
# Activate Yarn 3 (ships with Node via corepack)
corepack enable

# Clean install + build internal packages (types, db, license, translations)
yarn setup
```

`yarn setup` is the first-time bootstrap: it cleans any existing build artifacts, installs workspace dependencies, and compiles the internal packages the server and app import. You don't need a separate `yarn install` first — `yarn setup` runs it internally (and a leading `yarn install` would be discarded by the `yarn clean` step inside setup).

## Setting up environment variables

Most packages have their own `.env` file. For first run you only need the db and server envs — copy the examples and edit:

```bash
# From the root of the project — required for first run
cp packages/db/env.example     packages/db/.env
cp packages/server/env.example packages/server/.env
```

Customize each with your local Postgres credentials and secrets:

- `packages/db/.env` — `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
- `packages/server/.env` — `APP_PORT`, `COOKIE_SECRET`, `JWT_SECRET`, CORS origins, optional `AI_OPENAI_BASE_URL` / `AI_OPENAI_API_KEY` / `AI_MODEL`

Keep the `POSTGRES_*` values consistent across every `.env` that has them — the server, the migration tooling, and (if you set it up) the email service all read independently and must agree.

### Optional `.env` files

- **`packages/email-service/.env`** — only needed if you want outbound email features (password reset, verification). `yarn dev` does **not** start the email worker, so you can skip this for first run. When you do want it:

    ```bash
    cp packages/email-service/env.example packages/email-service/.env
    # SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL, EMAIL_PROCESS_INTERVAL
    ```

    The defaults in `env.example` point at `smtp.example.com:587` — the worker will idle until you replace them. See the [local SMTP capture](#setting-up-the-database) section below for a Mailpit recipe.

- **`packages/app/.env`** — there is no checked-in `env.example`; create it manually only if you need to override the Webpack dev server defaults (e.g. `BROWSER=none`, `GENERATE_SOURCEMAP=false`). Do **not** change `PORT` — the server's proxy target is hardcoded to `3001`. Full key list in [`docs/packages/app.md`](packages/app.md#environment).

## Setting up the database

The server expects a Postgres 15 instance reachable with the credentials in `packages/db/.env`, and a database (default name `stacks`) that already exists.

The fastest path is Docker:

```bash
docker run -d --name stacks-postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=stacks \
    -p 5432:5432 postgres:15
```

> If host port 5432 is already in use (another Postgres on your machine, etc.), bind to a free port instead — e.g. `-p 5433:5432` — and set `POSTGRES_PORT=5433` in **both** `packages/db/.env` and `packages/server/.env` so the server and migration tooling agree. The same applies to `packages/email-service/.env` if you set that up.

If you already run Postgres locally (Homebrew, Postgres.app, etc.), just create the database manually:

```bash
createdb stacks   # or: psql -c 'CREATE DATABASE stacks;'
```

Either way, then apply the schema migrations:

```bash
yarn workspace @stacks/db migrate
```

See [docs/packages/db.md](packages/db.md) for the full set of migration / seed / reset commands.

**Local SMTP capture (optional).** If you want to receive password reset / verification emails locally without sending real mail, run Mailpit and point `packages/email-service/.env` at it:

```bash
docker run -d --name stacks-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
# SMTP_HOST=localhost  SMTP_PORT=1025  SMTP_SECURE=false  (no auth)
# View captured mail at http://localhost:8025
```

## Running the application

### 1. Start the dev environment

The simplest path is one command that runs everything:

```bash
yarn dev
```

This spins up internal-lib watchers, the web app, and the API server concurrently. For finer-grained control, open multiple terminals and run individual services:

```bash
yarn dev:server   # API server only
yarn dev:app      # Web app only
yarn dev:email    # Email worker (optional for most flows)
yarn dev:mobile   # Expo dev server (optional)
yarn dev:locales  # Locale management TUI (optional)
```

### 2. Open the app

Visit **<http://localhost:3000/login>** — this is the API server (port `3000`), which serves the login HTML directly and reverse-proxies `/app/*` and `/static/*` to the Webpack dev server at `3001`. Don't visit `3001` directly; the auth and API routes only exist on the server.

Sign in with the email you used to register for the dev program and the default password `$Pa$$w0rd` (see [Development license required](#%EF%B8%8F-development-license-required)).

> **Port `3001` is hardcoded.** The server's proxy target is `localhost:3001` (see [`packages/server/src/api.ts`](../packages/server/src/api.ts)). You can change the *server* port via `APP_PORT` in `packages/server/.env` (then visit `http://localhost:<APP_PORT>/login`), but the Webpack dev server must still run on `3001` or the app shell won't load. Free up `3001` rather than reassigning it.

### 3. Mobile (optional)

`yarn dev:mobile` starts Expo. Scan the QR code with [Expo Go](https://expo.dev/client) on your phone, or press `i` / `a` in the Expo CLI to launch an iOS simulator or Android emulator.

## Ports

| Service | Default port |
| --- | --- |
| Web app (Webpack dev server) | `3001` (hardcoded — the server proxy target in `packages/server/src/api.ts`) |
| API server (Hono) | `3000` — configurable via `APP_PORT`; also serves the built app in production |
| Email service preview | `3005` (only when running `yarn workspace @stacks/email-service dev:email`) |
| PostgreSQL | `5432` (or whatever you configure) |

## Scripts

All commands run from the repo root with `yarn <script>`:

- `yarn setup` — clean install + build internal workspace packages and finalize workspace wiring.
- `yarn dev` — start a full local dev environment (internal libs + web app + server) in watch mode.
- `yarn dev:app` — start the web app dev server.
- `yarn dev:server` — start the API server in watch mode (builds internal libs first).
- `yarn dev:email` — start the email service in watch mode.
- `yarn dev:mobile` — start the Expo mobile app.
- `yarn dev:locales` — run the locales TUI tool.
- `yarn build` — build all packages (internal libs, app, server, email service).
- `yarn test:server` / `yarn test:server:unit` — run server tests.
- `yarn test:e2e` (`:ui`, `:headed`) — run Playwright end-to-end tests. See [E2E.md](E2E.md).
- `yarn release` — create a runnable `releases/` bundle (server + app + email service + db + Docker assets).
- `yarn run:docker` — run the generated `releases/` bundle via `docker-compose`. See [DOCKER.md](DOCKER.md).
- `yarn clean` — remove build artifacts and reset the workspace.

## Troubleshooting

- **Server exits immediately with `❌ No license file found`** — place a valid `license.key` at `packages/server/license.key`. See the [license callout](#%EF%B8%8F-development-license-required) above.
- **`yarn` is not found / wrong version** — run `corepack enable`. Confirm `yarn -v` reports `3.6.4`.
- **`yarn dev` fails with missing types from `@stacks/db` or `@stacks/types`** — you skipped `yarn setup`. Run it once.
- **Postgres connection refused** — verify the credentials in `packages/db/.env` and that Postgres is running on the configured host/port. If another Postgres is already bound to `5432`, change `POSTGRES_PORT` in all three `.env` files (db, server, email-service) and re-run `yarn workspace @stacks/db migrate`.
- **`EADDRINUSE` on port 3001** — the Webpack dev server port is **hardcoded** as the server's proxy target (`packages/server/src/api.ts`). Reassigning `PORT` in `packages/app/.env` will break the proxy. Find and stop whatever else is on `3001` (`lsof -i :3001` on macOS/Linux) rather than changing the app's port.
- **`EADDRINUSE` on port 3000** — another process owns the API server port. Either stop it, or set `APP_PORT` in `packages/server/.env` (e.g. `APP_PORT=3010`); then visit `http://localhost:3010/login`. Port `3001` must still be free for the Webpack dev server.
- **Tables missing / `relation "users" does not exist`** — run `yarn workspace @stacks/db migrate`. The first time after creating the database is the most common moment to forget.
