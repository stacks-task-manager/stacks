# `@stacks/server`

The Stacks backend. A [Hono](https://hono.dev/) HTTP server on Node that exposes the REST API, serves static app assets in production, talks to Postgres via Sequelize, and provides a real-time WebSocket endpoint.

> **⚠ Development license required.** The server calls `initializeLicense()` early in `bootstrap()` ([`src/index.ts:131`](../../packages/server/src/index.ts)) and exits with code `1` if `license.key` is missing or invalid. Place a key at `packages/server/license.key` before starting. See [`license.md`](license.md).

## Environment

`packages/server/.env` from [`packages/server/env.example`](../../packages/server/env.example):

```bash
cp packages/server/env.example packages/server/.env
```

Key variables:

- `APP_PORT` — HTTP port (default `3000`)
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — database connection
- `COOKIE_SECRET`, `JWT_SECRET` — auth / session secrets (must be strong in production)
- `DEBUG_DB` — set to `true` to log Sequelize SQL
- `DELETE_FILES` — whether deletes via the API also remove files from disk

Optional:

- `CORS_ORIGINS` — comma-separated list of allowed origins; if unset, CORS is permissive
- `REQUIRE_SECRETS=1` — enforce strong secrets outside production
- AI assistant: `AI_OPENAI_BASE_URL`, `AI_OPENAI_API_KEY`, `AI_MODEL`, `AI_CHAT_ENABLED`, `AI_CHAT_AUTO_REDIRECT`

## Development

```bash
yarn dev:server   # rebuilds internal libs, then `tsx watch` with --inspect
```

The server listens on `APP_PORT` (`3000` by default) and is the URL you visit in dev — it serves auth/login HTML directly and reverse-proxies `/app/*` and `/static/*` to the webpack dev server on `3001`. The proxy target is hardcoded to `localhost:3001`, so the app's dev server must run on that port.

## Importing a workspace from the Desktop Stacks app

The Desktop Stacks app stores each workspace as a folder of JSON + binary files on disk. The server includes a one-shot importer ([`src/seed/workspace.ts`](../../packages/server/src/seed/workspace.ts), called from [`src/seed/index.ts`](../../packages/server/src/seed/index.ts) as part of the boot-time seeding pipeline) that reads a workspace export, rewrites the IDs to fresh UUIDs, and inserts it into the database.

### What to export and where to put it

1. In the **Desktop Stacks app**, use its workspace export feature to produce a folder containing the workspace files (statuses/tags tree, people, companies, projects, tasks, attachments).
2. Drop that folder into `packages/server/import/workspace/` (relative to the server's working directory — for `yarn dev:server` that's `packages/server/`, so the literal path is `packages/server/import/workspace/`). The importer looks at exactly this location:

    ```js
    const WORKSPACE_PATH = join(process.cwd(), "import", "workspace");
    ```

The expected file layout inside `import/workspace/` matches what the desktop app writes:

```
import/workspace/
  documents.tree                 # JSON: { statuses[], tags[], documents[] } — the project/folder tree
  people                         # JSON array of people (used as both users and contacts)
  companies                      # JSON array of companies
  <oldProjectId>.project         # one JSON file per project, contains stacks[]
  tasks/
    <oldTaskId>.task             # one JSON file per task
    activities/
      <oldTaskId>.activity/
        <oldTaskId>.activity     # optional activity feed entries for a task
  files/
    tasks/
      <oldTaskId>/
        <filename>               # binary attachments referenced by the matching task
```

### How the import runs

The server invokes `workspaceSeed()` automatically as the **last step of boot-time seeding** (after the license tenant and admin user are in place). To trigger an import, just (re)start the server:

```bash
yarn dev:server   # or: yarn dev
```

What happens, in order:

1. The importer resolves the **target tenant** from the license (`getLicense().tenants[0]`) and looks up its row in `tenants`.
2. It finds the **admin user** for that tenant (`UserEntity` with `admin=true AND tenant=<licenseTenant>`). That user becomes `createdBy`/`updatedBy` on every imported row and the `owner` on every imported permission.
3. It rewrites every old ID into a fresh `randomUUID()`, mapping old → new IDs so cross-references inside the bundle resolve consistently. The original IDs from the desktop app are intentionally not preserved — this lets you import the same bundle into a different tenant without UUID collisions.
4. Statuses, tags, people, companies, documents, projects, stacks, and tasks are bulk-inserted inside a single transaction. Task attachments are uploaded through the standard files pipeline, and `workspace://files/tasks/<id>/<name>` URLs inside task descriptions are rewritten to the new `/api/files/preview/<id>?size=large` links.
5. On success, the folder is **renamed** to `import/workspace-imported_<timestamp>` so the next server start won't re-import it. On failure, the transaction rolls back and the folder is left in place — fix the underlying issue, then restart.

### Skip conditions (look for these in the server log on boot)

If something on the input side is missing, the importer logs a `⚠️ Skipping workspace import: …` line and exits gracefully without touching the database:

| Log message | Cause |
| --- | --- |
| `missing workspace directory (…)` | `packages/server/import/workspace/` doesn't exist |
| `Error parsing documents tree data` | `documents.tree` missing or not valid JSON |
| `Admin user not found` / `is disabled` | No `admin=true` user on the license tenant, or the admin is disabled |
| `User role not found` | The default `User` role hasn't been seeded for this tenant yet (run the server boot once with the license in place, then drop in the workspace and restart) |
| `User with email <addr> already exists` | A single person from the export collides with an existing user; that person is skipped, the rest of the import continues |
| `Error parsing people data` / `companies data` / `project data: <path>` | One of the JSON files in the bundle is malformed |

### Caveats

- **One-shot, not idempotent.** The importer renames the folder on success, so re-running with the same bundle is a no-op unless you rename the `-imported_*` folder back. There is no built-in "undo" — to retry, drop or truncate the affected tables and start over.
- **Always targets the license tenant.** The target tenant comes from your license file, not from a CLI flag. Swap licenses (or edit your dev tenant) to import elsewhere.
- **Email collisions skip the person, not the import.** If an exported person's email already exists on the tenant, only that person is dropped. Their references inside the bundle (assignees, activity authors) will then resolve to `null`, which the database accepts because most assignee columns are nullable. Check the log for `Skipping workspace import: User with email …` lines after importing.
- **Attachments are uploaded eagerly.** Every file under `files/tasks/<id>/` is read into memory and pushed through `FilesLoader.uploadFile` inside the same transaction. Very large bundles can spike memory and lengthen the boot.

## API overview

Routes are registered in [`src/api.ts`](../../packages/server/src/api.ts) and grouped under `/api/<resource>`. The current set:

| Prefix | Purpose |
| --- | --- |
| `/api/boot` | Initial client bootstrap payload |
| `/api/people`, `/api/companies` | Contacts directory |
| `/api/projects`, `/api/stacks`, `/api/tasks` | Core kanban entities |
| `/api/documents`, `/api/files`, `/api/notepads` | Files and notes |
| `/api/bookmarks`, `/api/tags`, `/api/preferences` | Per-user metadata |
| `/api/events`, `/api/activities`, `/api/notifications`, `/api/reminders` | Activity feed / scheduling |
| `/api/home`, `/api/search`, `/api/reports` | Aggregations |
| `/api/timelogs` | Time tracking |
| `/api/permissions`, `/api/roles` | RBAC |
| `/api/export` | Data export |
| `/api/google` | Google OAuth callbacks |

Legacy / public routes outside `/api`: `/auth`, `/login`, `/register`, `/ping`.

Handler implementations live under [`packages/server/src/routes/`](../../packages/server/src/routes/) (one file per route group). Zod schemas in [`packages/server/src/routes/schema/`](../../packages/server/src/routes/schema/).

### WebSocket

Endpoint **`/ws`** ([`packages/server/src/routes/socket.ts`](../../packages/server/src/routes/socket.ts)), upgraded via `@hono/node-ws`. Used for real-time updates, heartbeats, presence, and broadcasts. Authentication is required (same JWT as the HTTP API).

### Auth model

Sessions are signed JWTs (HS256). Two transports are accepted, in order:

1. **Signed cookie** `auth_token` (cookie signature uses `COOKIE_SECRET`)
2. **Authorization header** `Bearer <jwt>`

Token extraction lives in [`src/middleware/utils.ts`](../../packages/server/src/middleware/utils.ts) (`getAuthTokenWithSource`); verification in [`src/middleware/auth.ts`](../../packages/server/src/middleware/auth.ts). Payload fields: `uid`, `email`, `role`, `tenant`, `iat`, `exp`.

## Build

```bash
yarn build:server    # tsc -> dist/, then esbuild bundle via `bundle`
yarn release         # produces the runnable releases/server bundle
```

`yarn release:server` also copies `public.pem` next to the bundle so the production license check can find it.

## Deep dives

These live next to the server source under [`packages/server/docs/`](../../packages/server/docs/):

- [Server onboarding](../../packages/server/docs/ONBOARDING.md) — bootstrap order, request lifecycle, how to add a new route or loader
- [AI assistant framework](../../packages/server/docs/AI.md) — chat WebSocket contract, prompt + tool selection, how to add new tools
- [Caching system](../../packages/server/docs/CACHING.md) — the multi-tenant response cache, invalidation, and configuration
- [Embedded bundle integrity](../../packages/server/docs/EMBEDDED_INTEGRITY.md) — production bundle signing and the boot-time verification

## Related

- [`@stacks/db`](db.md) — models, migrations, seeds
- [`@stacks/types`](types.md) — request/response shapes shared with the client
- [`@stacks/license`](license.md) — startup license validation
- [`@stacks/translations`](translations.md) — bundled i18n strings
