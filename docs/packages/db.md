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

Model files live under [`packages/db/src/entities/`](../../packages/db/src/entities/); associations are wired in the package entry.

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
| `yarn reset-password:dev -- --email=<addr> [--password=<value>] [--tenant-id=<uuid>]` | **Dev-only.** Reset a user's password directly in the DB (default `$Pa$$w0rd`) and clear any pending activation token. Refuses to run with `NODE_ENV=production`; the script file lives under [`packages/db/scripts/`](../../packages/db/scripts/), which is not copied into release bundles, and the npm entry is stripped from the production `package.json` by [`post-build.cjs`](../../packages/db/post-build.cjs). |

Migration files live under [`packages/db/migrations/`](../../packages/db/migrations/) (the runtime location; sources for the initial schema live under `src/`). The server runs them on boot in production releases (see `docker/Dockerfile.migration`).

### Order of execution

Sequelize-CLI applies migrations in **lexicographic filename order**, and it remembers which ones have run in a `SequelizeMeta` table — so each file is applied exactly once, in alphabetical sequence.

The codebase uses a zero-padded numeric prefix:

```
migrations/
  000_init_schemas.cjs        # baseline schema (auto-generated, see below)
  001_add_<your_change>.cjs   # next migration you add
  002_…
```

Because the comparison is string-based, the padding matters: `010_…` sorts before `2_…`. Stick to three digits and you can add 999 migrations without re-numbering. A timestamp prefix (the default that `sequelize-cli migration:generate` emits — e.g. `20260515123456-foo.cjs`) also works and will sort *after* the `NNN_` files; just pick one scheme and be consistent within a feature branch.

> **Don't edit `000_init_schemas.cjs` by hand.** It's regenerated from [`src/init_schema.ts`](../../packages/db/src/init_schema.ts) by [`compile-migration.js`](../../packages/db/compile-migration.js) every time you run `yarn build:db`. Hand-edits will be overwritten. To evolve the schema, add a *new* migration file with a higher prefix.

### Writing a new migration

1. Generate the skeleton:

    ```bash
    yarn workspace @stacks/db migrate:create --name add-due-date-to-tasks
    ```

    This drops a timestamped file into `migrations/`. Rename it to use the numeric scheme if you want it to live alongside the existing files:

    ```bash
    mv migrations/20260515123456-add-due-date-to-tasks.js \
       migrations/001_add_due_date_to_tasks.cjs
    ```

    (The `.cjs` extension is required because the package is `"type": "module"` — Sequelize-CLI needs CommonJS.)

2. Fill in `up` / `down`. Always wrap multi-statement changes in a transaction so a half-applied migration rolls back cleanly:

    ```js
    "use strict";

    /** @type {import('sequelize-cli').Migration} */
    module.exports = {
        async up(queryInterface, Sequelize) {
            const t = await queryInterface.sequelize.transaction();
            try {
                await queryInterface.addColumn(
                    "tasks",
                    "duedate",
                    { type: Sequelize.DATE, allowNull: true },
                    { transaction: t }
                );
                await t.commit();
            } catch (err) {
                await t.rollback();
                throw err;
            }
        },

        async down(queryInterface) {
            await queryInterface.removeColumn("tasks", "duedate");
        },
    };
    ```

3. Apply and verify:

    ```bash
    yarn workspace @stacks/db migrate          # apply
    yarn workspace @stacks/db migrate:status   # confirm it's listed as "up"
    yarn workspace @stacks/db migrate:undo     # smoke-test the down path
    yarn workspace @stacks/db migrate          # re-apply
    ```

    Keep the matching Sequelize model under [`src/entities/`](../../packages/db/src/entities/) in sync — the migration moves the database, the entity moves the TypeScript surface, and the two have to agree.

## Seeds (demo data)

The demo seeder ([`seeders/000-demo.cjs`](../../packages/db/seeders/000-demo.cjs)) populates the database with realistic-looking projects, stacks, tasks, people, companies, and notepads sourced from JSON files under [`seeders/demo/`](../../packages/db/seeders/demo/). It's intended for local exploration, screenshots, and end-to-end tests — not for production.

> Looking to load **your own** content from the Desktop Stacks app instead? See [Importing a workspace from the Desktop Stacks app](server.md#importing-a-workspace-from-the-desktop-stacks-app) in the server docs — that path is server-side and runs on boot, not through `sequelize-cli`.

| Script | Effect |
| --- | --- |
| `yarn demo:install` | Apply all seeders (load demo content) |
| `yarn demo:install --tenantId=<uuid>` | Same, but target an existing tenant (see below) |
| `yarn demo:undo` | Revert all seeders (deletes everything tied to the `Demo` tenant) |
| `yarn seed:create --name=<slug>` | Generate a new seeder file |

Seeders live under [`packages/db/seeders/`](../../packages/db/seeders/).

### Loading demo data into an existing tenant

By default, `yarn demo:install` creates a brand-new tenant named **`Demo`** (with a fresh UUID and a 1-year expiry) and attaches all the demo rows to it. This keeps the demo data isolated from real workspaces — great for trying the app out, less useful when you want to populate a tenant you're already developing against.

To load the data into an **existing** tenant instead, pass its UUID through to the seeder. The flag is read straight off `process.argv` inside the seeder, so Yarn passes it through without any extra separator:

```bash
# Find the tenant you want to load into (e.g. the one your license seeded):
psql -c 'SELECT id, title FROM tenants;'

yarn workspace @stacks/db demo:install --tenantId=11111111-2222-3333-4444-555555555555
```

How the flag interacts with what's already in the database:

| State of the DB when you run `demo:install` | Result |
| --- | --- |
| A `Demo` tenant already exists | The seeder uses it and **ignores `--tenantId`**. Use `demo:undo` first if you want to switch tenants. |
| No `Demo` tenant, no `--tenantId` | A new `Demo` tenant is created with a random UUID, and demo data is attached to it. |
| No `Demo` tenant, `--tenantId=<uuid>` provided | The seeder writes demo data under the supplied tenant ID **without inserting a new tenant row** — that tenant must already exist (the demo rows have a foreign key on `tenants.id`). |

The seeder is idempotent at the row level: every demo entity has a fixed UUID in its JSON file, and the seeder skips inserts when the row already exists.

> **Best run against a tenant whose users haven't been seeded yet.** The demo people in `seeders/demo/people.json` have fixed UUIDs and are only inserted on the first run; later inserts (documents, projects, permissions, tasks) reference *those* user IDs as their `createdBy`. If those users already live in another tenant — or were partially imported in an earlier run — the second insert pass will hit a `NOT NULL` violation on `createdBy`. The safest pattern is: pick a tenant with no demo people yet, run `demo:install --tenantId=<that-tenant>`, and don't re-target a different tenant without resetting the demo users first.

### Reverting the demo data

`yarn demo:undo` looks up the tenant named **`Demo`** and deletes everything attached to it (timelogs → tasks → tags → stacks → notepads → projects → permissions → documents → companies → users → the tenant row itself, in dependency order).

> **Heads-up:** `demo:undo` only matches on `title = 'Demo'`. If you loaded demo content into an existing tenant via `--tenantId`, that tenant won't be touched, and the demo rows inside it have to be cleaned out manually (or by dropping/recreating the tenant). When in doubt, prefer the default flow so `demo:undo` can find what it inserted.

## Related

- [`@stacks/server`](server.md) — primary consumer
- [`@stacks/email-service`](email-service.md) — reads the `email_queue` table
- [`@stacks/types`](types.md) — shared row-shape types
