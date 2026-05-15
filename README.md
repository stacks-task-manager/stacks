# Stacks

Stacks is a local-first, privacy-focused project management app with a kanban-style workflow. It's designed to keep your work organized without forcing you into a cloud-first model: you can run Stacks on your own machine (or self-host it), keep control of your data, and stay productive even when you're offline.

At its core, Stacks organizes work into **projects**, and each project contains **stacks** (columns) that hold **tasks**.

**Tech stack:** TypeScript • Hono • Sequelize/PostgreSQL • React • Expo • Playwright

## What Stacks includes

-   **Projects & tasks**: create tasks, subtasks, set priorities and due dates, and track progress.
-   **Kanban stacks**: organize tasks into columns per project; reorder tasks and manage per-stack settings like sorting and limits.
-   **People & companies**: keep contacts and collaborators connected to your projects.
-   **Docs, files & notes**: attach documents/files and maintain rich-text notes (notepads) alongside your work.
-   **Calendar, reminders & activity**: schedule events, set reminders, and see what changed.
-   **Time tracking & reports**: log time and generate reports for visibility and accountability.
-   **Teams & permissions**: supports multi-tenant data modeling with roles/permissions for controlled access.

## Table of Contents

-   [Prerequisites](#prerequisites)
-   [Quick start](#quick-start)
-   [Structure](#structure)
-   [Documentation](#documentation)
-   [License](#license)
-   [Contributing](#contributing)

## Prerequisites

-   **Node.js** 18+ (20 recommended)
-   **Yarn** 3.6.4 — enable via `corepack enable` (ships with Node)
-   **PostgreSQL** 15
-   *(Optional)* an **SMTP server** for outbound email features like password reset (MailHog / Mailpit works locally — `yarn dev` does not start the email worker, so this isn't needed for first run)
-   *(Optional)* an OpenAI-compatible API endpoint for the chat assistant (e.g., LM Studio or llama.cpp)

> **Development license required.** The server will `process.exit(1)` on startup unless `packages/server/license.key` exists. Request a free development key at [getstacksapp.com/dev-program](https://getstacksapp.com/dev-program/). The key gates startup only; see [docs/packages/license.md](docs/packages/license.md) for details.

## Quick start

```bash
git clone <repo-url> stacks
cd stacks
```

### Activate Yarn 3.6.4

```bash
corepack enable
```

### Install dependencies and build internal packages

```bash
# `yarn setup` does a clean install and builds the internal packages
# (types, db, license, translations) that the server and app import.
yarn setup
```

### Set up env vars

```bash
# Required for first run
cp packages/db/env.example     packages/db/.env
cp packages/server/env.example packages/server/.env
# Edit each .env with your Postgres credentials and secrets.

# Optional — only if you want outbound email features (password reset, etc.)
# cp packages/email-service/env.example packages/email-service/.env
```

### Add your dev license key

```bash
# Save the key you received via email as packages/server/license.key
# (request one at https://getstacksapp.com/dev-program/)
cp /path/to/license.key packages/server/license.key
```

### Run Postgres

```bash
# Make sure Postgres is running and reachable with the credentials in
# packages/db/.env, then create the schema:
docker run -d --name stacks-postgres \
    -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=stacks \
    -p 5432:5432 postgres:15        # or use an existing Postgres 15
# If host port 5432 is already taken (another Postgres, etc.), bind to a
# free port — e.g. `-p 5433:5432` — and set POSTGRES_PORT=5433 in both
# packages/db/.env and packages/server/.env so they agree.
```

### Apply schema migrations

```bash
yarn workspace @stacks/db migrate
```

### Run the dev servers

```bash
# starts app (3001), server (3000), libs in watch mode
yarn dev
```

Open <http://localhost:3000/login> — this is the API server, which serves the login HTML directly and reverse-proxies `/app/*` and `/static/*` to the Webpack dev server on `3001` (don't visit `3001` directly). If you change `APP_PORT`, visit `http://localhost:<APP_PORT>/login`; the `3001` proxy target is hardcoded, so the Webpack dev server must still run on `3001`. For full setup details — environment variables, Docker, troubleshooting — see [docs/INSTALLATION.md](docs/INSTALLATION.md).

## Structure

This repository is a Yarn workspaces monorepo that ships Stacks as a set of services and clients:

-   **Web app** — React UI written in TypeScript: [packages/app](packages/app)
-   **API server** — Hono-based Node server: [packages/server](packages/server)
-   **Database layer** — Sequelize/Postgres models and migrations: [packages/db](packages/db)
-   **Mobile app** — Expo/React Native client: [packages/mobile](packages/mobile)
-   **Email service** — background email processing: [packages/email-service](packages/email-service)
-   **Shared types** — TypeScript types shared across packages: [packages/types](packages/types)
-   **Translations** — i18n runtime: [packages/translations](packages/translations)
-   **License** — dev license verification: [packages/license](packages/license)
-   **Locales TUI** — terminal tool for editing locale JSON: [packages/locales-tui](packages/locales-tui)

## Documentation

The full documentation index lives at **[docs/README.md](docs/README.md)** — start there for everything beyond the quick start above (per-package docs, server internals, Docker deployment, E2E testing, Tiptap Pro setup).

Most-reached-for pages:

- [Installation & local development](docs/INSTALLATION.md)
- [Contributing](CONTRIBUTING.md)
- [Docker / production deployment](docs/DOCKER.md)

## License

Stacks code is dual-licensed:

-   **Personal & open-source use**: [GNU AGPL v3](LICENSE)
-   **Commercial use**: contact [customers@getstacksapp.com](mailto:customers@getstacksapp.com)

Stacks documentation (this README, `docs/`, and other Markdown in the repo) is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

See [NOTICE](NOTICE) for the full licensing breakdown and third-party attributions.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, branching strategy, and CLA. By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues should be reported privately per [SECURITY.md](SECURITY.md).
