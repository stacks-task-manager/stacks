# Stacks

Stacks is a local-first, privacy-focused project management app with a kanban-style workflow. It’s designed to keep your work organized without forcing you into a cloud-first model: you can run Stacks on your own machine (or self-host it), keep control of your data, and stay productive even when you’re offline.

At its core, Stacks organizes work into **projects**, and each project contains **stacks** (columns) that hold **tasks**.

## What Stacks includes

-   **Projects & tasks**: create tasks, subtasks, set priorities and due dates, and track progress.
-   **Kanban stacks**: organize tasks into columns per project; reorder tasks and manage per-stack settings like sorting and limits.
-   **People & companies**: keep contacts and collaborators connected to your projects.
-   **Docs, files & notes**: attach documents/files and maintain rich-text notes (notepads) alongside your work.
-   **Calendar, reminders & activity**: schedule events, set reminders, and see what changed.
-   **Time tracking & reports**: log time and generate reports for visibility and accountability.
-   **Teams & permissions**: supports multi-tenant data modeling with roles/permissions for controlled access.

## How the system is built

This repository is a Yarn workspaces monorepo that ships Stacks as a set of services and clients:

-   **Web app**: React UI in [packages/app](packages/app)
-   **API server**: Hono-based Node server in [packages/server](packages/server)
-   **Database layer**: Sequelize/Postgres models and migrations in [packages/db](packages/db)
-   **Mobile app**: Expo/React Native client in [packages/mobile](packages/mobile)
-   **Email service**: background email processing in [packages/email-service](packages/email-service)

## Getting started

-   Docker-based install and deployment: [docs/INSTALLATION.md](docs/INSTALLATION.md)
-   Local Docker notes: [docs/DOCKER.md](docs/DOCKER.md)

## Scripts

All commands are run from the repo root using `yarn <script>`.

-   `yarn setup`: clean install + build internal workspace packages (types/db/license/translations) and finalize workspace wiring.
-   `yarn dev`: start a full local dev environment (internal libs + web app + server) in watch mode.
-   `yarn dev:app`: start the web app dev server.
-   `yarn dev:server`: start the API server in watch mode (includes building internal libs first).
-   `yarn dev:email`: start the email service in watch mode.
-   `yarn dev:mobile`: start the Expo mobile app.
-   `yarn dev:locales`: run the locales TUI tool.
-   `yarn build`: build all packages (internal libs, app, server, email service).
-   `yarn test:server` / `yarn test:server:unit`: run server tests.
-   `yarn test:e2e` (or `:ui`, `:headed`): run Playwright end-to-end tests.
-   `yarn release`: create a runnable `releases/` bundle (server + app + email service + db + Docker assets).
-   `yarn run:docker`: run the generated `releases/` bundle via `docker-compose`.
-   `yarn clean`: remove build artifacts and reset the workspace.

## License

Stacks is dual-licensed:

-   Open source use: [GNU AGPL v3](LICENSE)
-   Commercial use: contact [customers@getstacksapp.com](mailto:customers@getstacksapp.com)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
