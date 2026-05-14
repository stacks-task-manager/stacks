# `@stacks/db`

The database layer for Stacks. Sequelize models and associations, migration definitions, and demo seeds — consumed by `@stacks/server` and `@stacks/email-service`.

## Environment

`packages/db/.env` from [`packages/db/env.example`](../../packages/db/env.example) — only needed when invoking DB tooling directly (`yarn workspace @stacks/db migrate`, etc.); the server reads its own `.env`:

```bash
cp packages/db/env.example packages/db/.env
```

Variables:

- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `DEBUG_DB=true` — *(optional)* enable Sequelize SQL logging

## Development

This package is a library — it doesn't run as a service. Build it with:

```bash
yarn build:db      # tsc + migration compilation
```

`yarn setup` and `yarn dev` invoke this for you. Run direct migration commands per the table below.

## Schema overview

The schema models a multi-tenant kanban / project-management workspace. Top-level entities:

| Entity | Purpose |
| --- | --- |
| `users`, `tenants`, `roles`, `permissions` | Identity, multi-tenancy, RBAC |
| `projects`, `stacks`, `tasks`, `subtasks` | Core kanban hierarchy |
| `companies`, `people` | Contacts directory |
| `files`, `documents`, `notepads` | Attached content |
| `events`, `reminders`, `notifications`, `activities` | Scheduling and feed |
| `tags`, `bookmarks`, `preferences` | User metadata |
| `timelogs` | Time tracking |
| `email_queue` | Outbound email queue consumed by `@stacks/email-service` |

Model files live under [`packages/db/src/models/`](../../packages/db/src/models/); associations are wired in the package entry.

## Migrations

Sequelize-CLI is the migration runner. From the package directory (or with `yarn workspace @stacks/db <script>`):

| Script | Effect |
| --- | --- |
| `yarn migrate` | Apply pending migrations |
| `yarn migrate:undo` | Revert the most recent migration |
| `yarn migrate:undo:all` | Revert every migration |
| `yarn migrate:reset` | `migrate:undo:all` then `migrate` |
| `yarn migrate:status` | Show applied / pending |
| `yarn migrate:create --name=<slug>` | Generate a new migration file |
| `yarn db:create` / `yarn db:drop` | Create / drop the database |

Migrations live under [`packages/db/src/migrations/`](../../packages/db/src/migrations/). The server runs them on boot in production releases (see `releases/Dockerfile.migration`).

## Seeds (demo data)

| Script | Effect |
| --- | --- |
| `yarn demo:install` | Apply all seeders (populates a fresh DB with demo content) |
| `yarn demo:undo` | Revert all seeders |
| `yarn seed:create --name=<slug>` | Generate a new seeder file |

Seeders live under [`packages/db/src/seeders/`](../../packages/db/src/seeders/).

## Related

- [`@stacks/server`](server.md) — primary consumer
- [`@stacks/email-service`](email-service.md) — reads the `email_queue` table
- [`@stacks/types`](types.md) — shared row-shape types
