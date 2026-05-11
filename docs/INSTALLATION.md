# Installation Guide

This guide provides comprehensive instructions for installing Stacks dependencies for development.

## Prerequisites

-   Node.js 18.0.0 or higher (Node 20 recommended)
-   At least 2GB of available RAM
-   5GB of free disk space
-   Internet connection for downloading dependencies

## Installing dependencies

From the root of the project, run the following command to install dependencies:

```bash
yarn install
```

followed by:

```bash
yarn setup
```

## Setting up environment variables

Every (almost) package inside Stacks has its own environment variables file (`.env`). You can customize. Run the following command to generate the default values:

```bash
# From the root of the project
cp packages/db/env.example packages/db/.env
cp packages/email-service/env.example packages/email-service/.env
cp packages/server/env.example packages/server/.env
```

## Development license key

### 1. Request a development license key

To run Stacks in development mode, you need a development license key. You can request one by going to the following link:

[Join the dev program](https://getstacksapp.com/dev-program/)

### 2. Using the development license key

Once you receive the license key via email, copy and paste the key into the `packages/server/license.key` file.

## Running the application

### 1. Running the servers

The recommended way would be opening multi terminals and running the following commands:

```bash
# From the root of the project
yarn dev:server
yarn dev:app
yarn dev:mobile # only for mobile development
```

### 2. Opening the app

Open your web browser and visit [http://localhost:3000](http://localhost:3000)

### 3. Opening the mobile app

Open your mobile device and scan the QR code displayed in the terminal to open the mobile app.

### 4. Opening the desktop app

Open your desktop device and scan the QR code displayed in the terminal to open the desktop app.

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
