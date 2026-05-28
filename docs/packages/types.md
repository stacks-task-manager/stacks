# `@stacks/types`

Shared TypeScript types used across the server, db, web app, and mobile app. Keeping a single source of truth for entity shapes and DTOs avoids drift between the API and its clients.

## Table of Contents

-   [Environment](#environment)
-   [Development](#development)
-   [Usage](#usage)
-   [Overview](#overview)
-   [Related](#related)

## Environment

None.

## Development

This is a library — `tsc` produces `dist/` and that's what other packages import.

```bash
yarn workspace @stacks/types compile    # one-shot tsc
yarn workspace @stacks/types dev        # tsc --watch (run automatically by `yarn dev`)
```

`yarn setup` runs the initial build for you.

## Usage

```ts
import type { Task, Project, User, Tenant } from "@stacks/types";
```

Because every other package depends on `@stacks/types`, a change here ripples through the server, db, app, mobile, and email-service. After editing types, run `yarn build:internal` (or `yarn setup`) before starting the dependent dev processes.

## Overview

- `src/index.ts` — public re-exports
- `src/<domain>/` — per-domain type modules (tasks, projects, users, permissions, etc.)
- `dist/` — compiled JS + `.d.ts` consumed by other workspace packages

## Related

- Every other package consumes this one.
