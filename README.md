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
-   **SMTP server** for outbound email (MailHog / Mailpit works locally)
-   *(Optional)* an OpenAI-compatible API endpoint for the chat assistant (e.g., LM Studio or llama.cpp)

> **Development license required.** The server will `process.exit(1)` on startup unless `packages/server/license.key` exists. Request a free development key at [getstacksapp.com/dev-program](https://getstacksapp.com/dev-program/). The key gates startup only; see [docs/packages/license.md](docs/packages/license.md) for details.

## Quick start

```bash
git clone <repo-url> stacks
cd stacks

corepack enable                    # activates Yarn 3.6.4
yarn install
yarn setup                         # builds internal packages

cp packages/db/env.example          packages/db/.env
cp packages/server/env.example      packages/server/.env
cp packages/email-service/env.example packages/email-service/.env
# Edit each .env with your Postgres credentials and secrets.

# Drop your development license key into packages/server/
# (request one at https://getstacksapp.com/dev-program/)
cp /path/to/license.key packages/server/license.key

yarn dev                           # starts app (3001), server (3000), libs in watch mode
```

Open <http://localhost:3000/login>. For full setup details — environment variables, Docker, troubleshooting — see [docs/INSTALLATION.md](docs/INSTALLATION.md).

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

-   [Installation & local development](docs/INSTALLATION.md)
-   [Packages index](docs/PACKAGES.md)
-   [Docker / production deployment](docs/DOCKER.md)
-   [Caching system](docs/CACHING.md)
-   [E2E testing with Playwright](docs/E2E.md)

## License

Stacks is dual-licensed:

-   **Personal & open-source use**: [GNU AGPL v3](LICENSE)
-   **Commercial use**: contact [customers@getstacksapp.com](mailto:customers@getstacksapp.com)

See [NOTICE](NOTICE) for third-party attributions.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, branching strategy, and CLA. By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues should be reported privately per [SECURITY.md](SECURITY.md).
