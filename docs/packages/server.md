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

Legacy / public routes outside `/api`: `/auth`, `/login`, `/register`, `/ping`.

Handler implementations live under [`packages/server/src/routes/`](../../packages/server/src/routes/) (one file per route group). Zod schemas in [`packages/server/src/routes/schema/`](../../packages/server/src/routes/schema/).

### WebSocket

Endpoint **`/ws`** ([`packages/server/src/routes/socket.ts`](../../packages/server/src/routes/socket.ts)), upgraded via `@hono/node-ws`. Used for real-time updates, heartbeats, presence, and broadcasts. Authentication is required (same JWT as the HTTP API).

### Auth model

Sessions are signed JWTs (HS256). Two transports are accepted, in order:

1. **Signed cookie** `auth_token` (cookie signature uses `COOKIE_SECRET`)
2. **Authorization header** `Bearer <jwt>`

Token extraction lives in [`src/middleware/utils.ts`](../../packages/server/src/middleware/utils.ts) (`getAuthTokenWithSource`); verification in [`src/middleware/auth.ts`](../../packages/server/src/middleware/auth.ts). Payload fields: `uid`, `email`, `role`, `tenant`, `iat`, `exp`.

## Sending email

The server never opens an SMTP connection itself — it writes rows into the `email_queue` Postgres table and the [`@stacks/email-service`](email-service.md) worker drains them on its own interval. There are two entry points depending on whether you have a request context:

### From a route handler — `c.sendEmail(...)`

`c.sendEmail` is attached to every Hono `Context` by the response middleware ([`src/services/response.ts`](../../packages/server/src/services/response.ts)). It's strongly typed: the `data` argument must match the payload type declared for `template` in [`packages/types/src/models/email.ts`](../../packages/types/src/models/email.ts).

```ts
import { EMAIL_TEMPLATES } from "@stacks/types";

// inside a Hono handler
await c.sendEmail(newUser.id, EMAIL_TEMPLATES.WELCOME, {
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    activationLink: `/auth/activate/${newUser.token}`,
});
```

Signature ([`SendEmailFunction`](../../packages/types/src/models/email.ts)):

```ts
<T extends EMAIL_TEMPLATES>(
    recipientId: string,                 // users.id of the destination user
    template: T,                         // EMAIL_TEMPLATES enum value
    data: EmailTemplateData<T>,          // typed per template
    scheduleAt?: Date,                   // optional; defaults to "now"
): Promise<boolean>;                     // false if the user wasn't found
```

What happens under the hood:

1. The recipient's email is **not** resolved here — the worker joins `users` on `userId` when draining. Pass the user's id, not their address.
2. The current user (from `requireAuth`) becomes the row's `createdBy` and `tenant`.
3. The locale is read from the `Locale` request header (default `"en"`). This is a **distinct** header from the i18n `Accept-Language` flow used by `c.get("locale")` — pick whichever locale the user prefers to receive emails in and send it as `Locale`.
4. A row is inserted into `email_queue` with `status='pending'` and `scheduledAt = scheduleAt ?? now()`.

### Outside a request — `EmailsLoader.queueEmail(...)`

For seed scripts, background jobs, or anywhere there is no Hono `Context`, call the loader directly ([`src/loaders/emails.ts`](../../packages/server/src/loaders/emails.ts)):

```ts
import { EmailsLoader } from "../loaders";
import { EMAIL_TEMPLATES } from "@stacks/types";

await EmailsLoader.queueEmail(
    adminUser.id,
    { firstName: adminUser.firstName, lastName: adminUser.lastName, activationLink: `/auth/activate/${token}` },
    EMAIL_TEMPLATES.WELCOME,
    "en",          // locale must be supplied explicitly
    systemUser,    // a User-shaped object — provides tenant + createdBy
    undefined,     // optional scheduleAt
    transaction,   // optional Sequelize transaction
);
```

This is the lower-level primitive `c.sendEmail` delegates to. Use it whenever you need an explicit transaction (e.g. so a queued email rolls back with the surrounding write) — the seeder does this when creating admin users ([`src/seed/users.ts`](../../packages/server/src/seed/users.ts)).

### Template payloads

The template enum and its typed payloads live in [`@stacks/types`](types.md):

| Template | Required `data` fields |
| --- | --- |
| `EMAIL_TEMPLATES.WELCOME` | `firstName`, optional `lastName`, `activationLink` |
| `EMAIL_TEMPLATES.PASSWORD_RESET` | `userName`, `resetLink`, `expirationTime`, optional `ipAddress`, `userAgent` |
| `EMAIL_TEMPLATES.REGISTRATION` | `userName`, `verificationLink`, optional `companyName`, `expirationTime` |
| `EMAIL_TEMPLATES.NOTIFICATION` | `title`, `message`, optional `actionUrl`, `actionText`, `priority`, `category` |

Anything in `data` is JSON-serialised into the queue row and substituted into the rendered template at send time as `%key%` (e.g. `%firstName%`, `%resetLink%`). The worker also injects `%publicUrl%` from its own `PUBLIC_URL` env var, so route handlers should pass **relative** paths (e.g. `/auth/activate/<token>`) and let the worker prepend the base URL.

### Adding a new template

The end-to-end recipe (server types, React component, subject string, restart the worker) is documented in [`@stacks/email-service` → How to add a new template](email-service.md#how-to-add-a-new-template). On the server side you only need to extend the enum and union in `packages/types/src/models/email.ts`; `c.sendEmail` will then type-check the new template automatically.

## In-app notifications

Distinct from outbound email. An **in-app notification** is a row in the `notifications` table that the recipient sees inside the app, plus a one-shot realtime push over the WebSocket so the UI updates without polling. Despite the shared name, `EMAIL_TEMPLATES.NOTIFICATION` is unrelated — nothing in the codebase currently bridges the two.

### Model

[`NotificationEntity`](../../packages/db/src/entities/Notification.ts) — table `notifications`. Per-recipient row, soft-deletable.

| Field | Type | Notes |
| --- | --- | --- |
| `recipient` | UUID | User the notification is for. Always populated by the loader from the caller's arguments. |
| `subject` | string | Short headline (already translated by the caller via [`translate()`](../../packages/translations/)). |
| `message` | text | Longer body. May be omitted. |
| `recordType` | enum [`NOTIFICATION_RECORD_TYPE`](../../packages/types/src/models/notification.ts) | `task`, `notepad`, `timelog`, `project`, `comment`, `person` — drives the deep-link target. |
| `recordId` | UUID | The id of the linked record (e.g. the task / comment). |
| `data` | JSON | Free-form payload the UI can hydrate with extra context. Callers pass either a single object (task, activity) or an array (timelogs). |
| `read`, `readOn` | bool / date | Toggled by the `PATCH /:id` endpoint. |

Tenant + audit columns (`tenant`, `createdBy`, `updatedBy`) are set from `getCurrentUser()` inside the loader.

### Loader API

[`NotificationsLoader`](../../packages/server/src/loaders/notifications.ts) exposes four operations:

```ts
NotificationsLoader.add({
    recipient: assignee,
    subject: translate("You have been assigned to a task"),
    message: task.title,
    recordType: NOTIFICATION_RECORD_TYPE.TASK,
    recordId: task.id,
    data: task,
});

await NotificationsLoader.getAll();         // unread notifications for current user, newest first
await NotificationsLoader.read(id);         // recipient-only — 403 otherwise
await NotificationsLoader.remove(id);       // recipient-only — soft-delete via Base entity
```

`add` runs inside its own `withTransaction` so callers don't have to manage a Sequelize transaction. It accepts an optional outer transaction as a second argument if you do want to chain it.

> **⚠ Fire-and-forget by convention.** Every internal trigger site calls `NotificationsLoader.add(...)` **without `await`** and **without passing the surrounding transaction** (see [tasks.ts](../../packages/server/src/loaders/tasks.ts), [activities.ts](../../packages/server/src/loaders/activities.ts), [timelogs.ts](../../packages/server/src/loaders/timelogs.ts)). Consequences:
>
> - The HTTP handler can return before the notification row is committed — clients should never assume the notification exists by the time the originating mutation responds.
> - The notification commits in its own transaction, so it survives a rollback of the surrounding write. If the surrounding mutation fails after the notification is queued, the recipient sees a notification about a record that no longer exists.
>
> This is the established pattern. If you change it (e.g. by passing the outer transaction in), do so deliberately and consistently across all triggers.

### REST endpoints

Mounted authenticated at `/api/notifications` ([`api.ts`](../../packages/server/src/api.ts)).

| Method | Path | Purpose | Scope |
| --- | --- | --- | --- |
| `GET` | `/api/notifications` | List **unread** notifications for the authenticated user, newest first. | `recipient = current user`, `read = false`, current tenant. |
| `PATCH` | `/api/notifications/:id` | Mark as read (`read=true`, `readOn=now`). | Recipient only — 403 if `recipient !== current user`. |
| `DELETE` | `/api/notifications/:id` | Soft-delete the notification. | Same recipient check. |

There is **no `POST` endpoint** — notifications are only ever created internally via `NotificationsLoader.add(...)`. The `NewNotificationSchema` Zod object in `routes/schema/notifications.ts` is defined but unused; treat it as reserved for a future public endpoint.

### Where the recipient sees them

Inside [`@stacks/app`](app.md), the recipient's notifications live in the **Inbox** view ([`packages/app/src/app/views/Inbox/Inbox.tsx`](../../packages/app/src/app/views/Inbox/Inbox.tsx)), reachable at `/inbox` from the **sidebar's Inbox button** ([`packages/app/src/app/widgets/sidebar/InboxButton/InboxButton.tsx`](../../packages/app/src/app/widgets/sidebar/InboxButton/InboxButton.tsx)). The sidebar button shows a red unread counter that ticks down as the user reads notifications, and selecting a notification in the Inbox issues `PATCH /api/notifications/:id` to mark it read.

### Realtime delivery

After persisting the row, `add()` calls [`sendRealtimeUpdateToUser`](../../packages/server/src/events.ts):

```ts
sendRealtimeUpdateToUser(data.recipient, {
    type: POLLINGTYPE.NOTIFICATION,
    record: newNotification.id,
    action: POLLINGACTIONS.CREATE,
});
```

That helper appends `targetUserId: recipient` to the standard `IUpdate` payload and emits it through the app event bus. The WebSocket handler in [`routes/socket.ts`](../../packages/server/src/routes/socket.ts) (`globalUpdateHandler`) sees the `targetUserId`, looks the user up in its `userConnections` map, and calls `sendMessageToUser(...)` to push **only to that user's active connections** (one user can have several open tabs / devices — all receive the push).

Important behaviours:

- **Recipient-targeted, not broadcast.** Other users on the same tenant do not receive the notification push, even though they share the global `update` channel.
- **No offline replay.** If the recipient has no active WebSocket connection at the time of the push, the realtime message is dropped on the server side. The notification row is still in the DB, so the next time the user opens the app, `GET /api/notifications` returns it. Per-user message queuing isn't wired up for notification pushes today.
- **Client contract.** The client receives `{ type: "update", payload: { type: "notification", record: "<id>", action: "create", ... } }`. The UI typically reacts by re-fetching `/api/notifications` (or appending the record locally if `data` is populated) and incrementing the unread badge.

### Where notifications are triggered

Today the server creates notifications automatically from three loaders:

| Trigger | Recipient | `recordType` | Subject (English) |
| --- | --- | --- | --- |
| Task created with assignees ([`tasks.ts`](../../packages/server/src/loaders/tasks.ts)) | each assignee (≠ current user) | `task` | "You have been assigned to a new task" |
| Task updated with new assignees | each new assignee | `task` | "You have been assigned to a task" |
| Task reopened (`done: true → false`) | each existing assignee | `task` | "A task you are assigned to was reopened" |
| Task completed (`done: true`) | each existing assignee | `task` | "A task where you are assigned to was completed" |
| Task deleted | each existing assignee | `task` | "A task you were assigned to was deleted" |
| Comment on a task ([`activities.ts`](../../packages/server/src/loaders/activities.ts)) | each task assignee | `comment` | "New comment on a task" |
| Timelog submitted ([`timelogs.ts`](../../packages/server/src/loaders/timelogs.ts)) | each project approver | `timelog` | "Timelog review pending" |
| Timelog approved / rejected | the timelog's `person` | `timelog` | "A timelog where you are assigned to was evaluated" |

All triggers skip the current user (so you never get notified about your own action).

### Sending a notification from new code

From any loader running inside `requireAuth + withRequestContext`:

```ts
import { NotificationsLoader } from "./notifications";
import { NOTIFICATION_RECORD_TYPE } from "@stacks/types";
import { translate } from "@stacks/translations";

NotificationsLoader.add({
    recipient: targetUserId,
    subject: translate("Your subject string"),
    message: translate("Optional body"),
    recordType: NOTIFICATION_RECORD_TYPE.PROJECT,
    recordId: project.id,
    data: project,
});
```

Conventions worth following:

1. **Translate the subject and message** with [`translate(...)`](../../packages/translations/) so different recipients see the strings in their own locale.
2. **Skip the current user** (`if (recipient === user.id) continue;`) so initiators don't notify themselves.
3. **Pass a `recordType` + `recordId`** matching a UI route the client can deep-link to. If you need a new category, extend `NOTIFICATION_RECORD_TYPE` in [`packages/types/src/models/notification.ts`](../../packages/types/src/models/notification.ts) and update any client-side router that handles deep-links.
4. **Don't `await`** unless you have a specific reason to block the surrounding handler on it — see the fire-and-forget note above.

### Related: reminders

`/api/reminders` ([`routes/reminders.ts`](../../packages/server/src/routes/reminders.ts) + [`loaders/reminders.ts`](../../packages/server/src/loaders/reminders.ts)) is a separate, simpler concept: scheduled alerts attached to a record (CRUD only, no realtime push, no recipient scoping). It does **not** produce `notifications` rows automatically; if you need a reminder to turn into a notification at fire time, that wiring isn't in place yet.

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
