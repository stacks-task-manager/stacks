# App

## Purpose

The web client for Stacks. It renders the UI, manages local client state, and talks to the API server.

## File structure

-   `src/app`: contains the main application code.
-   `src/app/api`: contains the API client code.
-   `src/app/store`: contains the state slices and action creators.
-   `src/app/hooks`: contains the hooks and selectors to query the state.
-   `src/app/components`: contains the atomic-like components.
-   `src/app/views`: contains the main views of the application.
-   `src/app/utils`: contains the utility functions.
-   `src/app/widgets`: contains the widgets.
-   `src/app/locales`: contains the dynamic translations.
-   `src/app/styles`: contains global styles overrides.

## State management

The state management is handled by [Simpler state](https://simpler-state.js.org/), a light-weight state management library for React.

### 1. Structure

Stacks' store is split into multiple states rather than having just a big one. The state management is structured as follows:

-   `src/app/store`: contains all the state slices.
-   `src/app/store/actions`: contains all the action creators to update the state.
-   `src/app/hooks`: contains all the hooks and selectors to query the state.

### 2. State lifecycle

1. every change come in through an action
2. every action uses `produce` to update the state
3. every component that uses a state hook will automatically re-render when the state changes.

## Environment

This package uses a `.env` file at [packages/app/.env](../../packages/app/.env).

-   `PORT`: dev server port (default in this repo: `3001`)
-   `BROWSER`: set to `none` to prevent auto-opening a browser
-   `GENERATE_SOURCEMAP`: enable/disable sourcemaps
