# Installation Guide

This guide provides comprehensive instructions for installing Stacks and running it locally for development. For an overview and a 5-minute summary, see the root [README](../README.md#quick-start).

## Prerequisites

| Requirement | Version / Notes |
| --- | --- |
| **Node.js** | 18.0.0 or higher (20 recommended) |
| **Yarn** | 3.6.4 — activated via `corepack enable` (ships with Node) |
| **PostgreSQL** | 15 — running locally or reachable from your machine |
| **SMTP server** | for outbound email; [MailHog](https://github.com/mailhog/MailHog) or [Mailpit](https://github.com/axllent/mailpit) work great for local testing |
| **OpenAI-compatible API** | *(optional)* for the chat assistant — e.g., [LM Studio](https://lmstudio.ai/) or [llama.cpp](https://github.com/ggerganov/llama.cpp) exposing an OpenAI-compatible endpoint |
| **Disk / RAM** | 5 GB free disk, 2 GB free RAM minimum |

## ⚠️ Development license required

> **The server will `process.exit(1)` on startup unless `packages/server/license.key` exists.** This applies to AGPL / open-source use as well as commercial use during development.

To obtain a key:

1. Request a free development key at **[getstacksapp.com/dev-program](https://getstacksapp.com/dev-program/)**.
2. You will receive the key via email.
3. Paste the contents into `packages/server/license.key` (the file is read from `process.cwd()` at server start — see [docs/packages/license.md](packages/license.md) for the exact lookup logic, payload schema, and failure modes).

The license check gates *server startup only*; it does not phone home at runtime.

## Installing dependencies

```bash
# Activate Yarn 3 (ships with Node via corepack)
corepack enable

# Install workspace dependencies
yarn install

# Build internal packages (types, db, license, translations)
yarn setup
```

`yarn setup` is required before the first `yarn dev` — it compiles the internal packages that the server and app import.

## Setting up environment variables

Most packages have their own `.env` file. Copy the examples and edit:

```bash
# From the root of the project
cp packages/db/env.example          packages/db/.env
cp packages/server/env.example      packages/server/.env
cp packages/email-service/env.example packages/email-service/.env
```

Customize each file with your local Postgres credentials, an SMTP host, and secrets:

- `packages/db/.env` — `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
- `packages/server/.env` — `APP_PORT`, `COOKIE_SECRET`, `JWT_SECRET`, CORS origins, optional `AI_OPENAI_BASE_URL` / `AI_OPENAI_API_KEY` / `AI_MODEL`
- `packages/email-service/.env` — `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `EMAIL_PROCESS_INTERVAL`

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

Visit **<http://localhost:3000/login>**.

### 3. Mobile (optional)

`yarn dev:mobile` starts Expo. Scan the QR code with [Expo Go](https://expo.dev/client) on your phone, or press `i` / `a` in the Expo CLI to launch an iOS simulator or Android emulator.

## Ports

| Service | Default port |
| --- | --- |
| Web app (Webpack dev server) | `3001` |
| API server (Hono) | `3000` — also serves the built app in production |
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
- **Postgres connection refused** — verify the credentials in `packages/db/.env` and that the server is running on the configured port.
