# `@stacks/locales-tui`

A terminal UI for managing the locale JSON files used by `@stacks/server` and `@stacks/app`. Built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal).

## Table of Contents

-   [Environment](#environment)
-   [Development](#development)
-   [Usage](#usage)
-   [Overview](#overview)
-   [Related](#related)

## Environment

None.

## Development

From the repo root:

```bash
yarn dev:locales      # alias for `yarn workspace @stacks/locales-tui start`
```

The `start` script runs `tsx src/cli.tsx` so no build step is needed.

## Usage

The TUI lets you browse locales, find untranslated keys, and add or edit entries. Keyboard shortcuts (see [`src/App.tsx`](../../packages/locales-tui/src/App.tsx)):

| Key | Action |
| --- | --- |
| `↑` / `↓` / `Enter` | Navigate menus and confirm selections |
| `Esc` | Back / cancel |
| `u` | Toggle untranslated-only filter |
| `/` | Enter search mode |
| `d` | Delete key *(English locale only — it's the source of truth)* |
| `r` | Rename key *(English locale only)* |

Locale files are loaded from the server and app locale directories; edits are written back as JSON.

## Overview

- `src/cli.tsx` — entry (shebang-ready)
- `src/App.tsx` — main Ink component, input routing, screen state
- `src/screens/` — individual screen components (list, edit, search)
- `src/io/` — disk read / write of locale JSON

## Related

- [`@stacks/translations`](translations.md) — the runtime that consumes these locale tables
