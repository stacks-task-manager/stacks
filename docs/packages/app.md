# `@stacks/app`

The Stacks web client. A React 18 + TypeScript app, bundled with Webpack, that renders the UI, manages local state, and talks to `@stacks/server` over HTTP and WebSockets.

## Table of Contents

-   [Environment](#environment)
-   [Development](#development)
-   [Build](#build)
-   [Deep dives](#deep-dives)
-   [Related](#related)

## Environment

`packages/app/.env` (no `env.example` is checked in — create it manually if you need to override defaults):

- `PORT` — dev server port (default `3001` in this repo)
- `BROWSER` — set to `none` to prevent auto-opening a browser
- `GENERATE_SOURCEMAP` — enable / disable source maps

## Development

```bash
yarn dev:app          # webpack dev server on http://localhost:3001
yarn dev:app:watch    # same but skips the upfront translations build
```

The Hono server (port `3000`) is the entrypoint for the UI in dev. It serves the login/auth HTML directly and reverse-proxies `/app/*` and `/static/*` to the webpack dev server on `3001`. Run `yarn dev:server` (or `yarn dev` at the root for both) — visiting `:3001` directly returns the SPA shell without auth, cookies, or the API. The proxy target (`localhost:3001`) is hardcoded in [`packages/server/src/api.ts`](../../packages/server/src/api.ts), so the webpack dev server must run on `3001`.

## Build

```bash
yarn workspace @stacks/app build   # or `yarn build:app` from the root
```

Output lands in `packages/app/build/`. `yarn release` copies it into the runnable server bundle.

## Deep dives

These live next to the source under [`packages/app/docs/`](../../packages/app/docs/):

- [Web app onboarding](../../packages/app/docs/ONBOARDING.md) — stack overview, boot sequence, code layout, **"add a feature" walkthrough**, conventions, FAQ
- [Web app architecture](../../packages/app/docs/ARCHITECTURE.md) — routing model (HashRouter, background-route panels), state pattern, real-time updates, drag-and-drop, theming, the global user-feedback surface
- [API client](../../packages/app/docs/API_CLIENT.md) — the shared Axios instance, date round-tripping, `X-Instance-ID`, error handling, per-domain modules

## Related

- [`@stacks/server`](server.md) — API the app talks to
- [`@stacks/types`](types.md) — shared data shapes
- [`@stacks/translations`](translations.md) — runtime i18n
- [`docs/E2E.md`](../E2E.md) — Playwright conventions for testing the app
