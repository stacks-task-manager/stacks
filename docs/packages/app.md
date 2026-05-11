# App

**Purpose**

The web client for Stacks. It renders the UI, manages local client state, and talks to the API server.

**Environment**

This package uses a `.env` file at [packages/app/.env](../../packages/app/.env).

-   `PORT`: dev server port (default in this repo: `3001`)
-   `BROWSER`: set to `none` to prevent auto-opening a browser
-   `GENERATE_SOURCEMAP`: enable/disable sourcemaps
