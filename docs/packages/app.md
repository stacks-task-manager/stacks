# `@stacks/app`

The Stacks web client. A React 18 app built with Webpack that renders the UI, manages local state, and talks to `@stacks/server` over HTTP and WebSockets.

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

The dev server proxies API calls to the Hono server on `http://localhost:3000`. Run `yarn dev:server` (or `yarn dev` at the root for both) before exercising any feature that touches the backend.

## Overview

- `src/app` — main application code
- `src/app/api` — typed API client (axios)
- `src/app/store` — state slices and action creators
- `src/app/store/actions` — action creators that update state
- `src/app/hooks` — hooks and selectors that query state
- `src/app/components` — small reusable components
- `src/app/views` — top-level views (boards, dashboards, etc.)
- `src/app/widgets` — composed widgets used across views
- `src/app/utils` — utility functions
- `src/app/locales` — runtime translation tables (English baseline plus per-locale overrides)
- `src/app/styles` — global SCSS / overrides

## State management

State is managed by [Simpler State](https://simpler-state.js.org/) — a lightweight React state library. The store is split into many small slices rather than one large one.

The lifecycle is straightforward:

1. Every change comes through an action in `src/app/store/actions`.
2. Each action uses `immer`'s `produce` to update the slice immutably.
3. Components that subscribe via a hook from `src/app/hooks` re-render automatically.

## Build

```bash
yarn workspace @stacks/app build   # or `yarn build:app` from the root
```

Output lands in `packages/app/build/`. `yarn release` copies it into the runnable server bundle.

## Related

- [`@stacks/server`](server.md) — API the app talks to
- [`@stacks/types`](types.md) — shared data shapes
- [`@stacks/translations`](translations.md) — runtime i18n
