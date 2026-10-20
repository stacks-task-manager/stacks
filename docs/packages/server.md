# `@stacks/server`

The Stacks backend. A [Hono](https://hono.dev/) HTTP server on Node that exposes the REST API, serves static app assets in production, talks to Postgres via Sequelize, and provides a real-time WebSocket endpoint.

> **⚠ Development license required.** The server calls `initializeLicense()` early in `bootstrap()` ([`src/index.ts:131`](../../packages/server/src/index.ts)) and exits with code `1` if `license.key` is missing or invalid. Place a key at `packages/server/license.key` before starting. See [`license.md`](license.md).

## Table of Contents

- [Environment](#environment)
- [Development](#development)
- [Importing a workspace from the Desktop Stacks app](#importing-a-workspace-from-the-desktop-stacks-app)
- [API overview](#api-overview)
- [Sending email](#sending-email)
- [Build](#build)
- [Deep dives](#deep-dives)
- [Related](#related)

## Environment

`packages/server/.env` from [`packages/server/env.example`](../../packages/server/env.example):

```bash
cp packages/server/env.example packages/server/.env
```

Key variables:

- `APP_PORT` — HTTP port (default `3000`)
- `APP_ORIGIN` — public origin used for OAuth redirect URIs, popup postMessage target origin, and the trusted-origin check on WebSocket upgrades (e.g. `http://localhost:3000` in dev)
- `TRUST_PROXY_HEADERS` — set to `1` only when a controlled reverse proxy overwrites forwarded client-IP headers and direct access to the server is blocked; otherwise the server uses the Node socket peer address and ignores forwarding headers
- Public login, recovery, and registration use shared PostgreSQL limits by account and peer IP. Defaults are 10 login attempts per account and 100 per IP, 5 recovery/registration attempts per account and 30 per IP, and 3 email-change requests per account and 10 per IP, per 15 minutes. `RATE_LIMIT_AUTH_WINDOW_MS` and the `RATE_LIMIT_{LOGIN,RECOVERY,REGISTER,EMAIL_CHANGE}_{ACCOUNT,IP}_MAX` values can override these bounds; invalid values prevent the server from starting. Counter subjects are stored as HMACs, and store failures return a generic 503.
- Other API requests use shared budgets of 600 per peer IP and 300 per authenticated user per minute. `RATE_LIMIT_API_WINDOW_MS`, `RATE_LIMIT_UNAUTH_API_IP_MAX`, and `RATE_LIMIT_AUTH_API_USER_MAX` override those defaults; responses use a generic 429 with `Retry-After`.
- Request bodies are counted before route parsing: 1 MiB for ordinary requests and 256 KiB for MCP. `/api/files/upload` is excluded because its authenticated streaming loader enforces the 25 MiB actual-byte limit.
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — database connection
- `COOKIE_SECRET`, `JWT_SECRET` — distinct auth / session secrets; strict mode requires each to be at least 32 UTF-8 bytes
- `DEBUG_DB` — set to `true` to log Sequelize SQL
- `DELETE_FILES` — when `true`, remove an unreferenced global file after its final attachment is deleted; `false` retains bytes on disk
- `REGISTRATION_ENABLED` — opt in to public registration (`true`, `1`, `yes`, or `on`)
- `PASSWORD_RECOVERY_ENABLED` — opt in to public password recovery; requires the email-service worker

Optional:

- `CORS_ORIGINS` — comma-separated list of allowed origins; if unset, the configured app origin is used
- `REQUIRE_SECRETS=1` — enforce strong secrets outside production
- Google Calendar OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `GOOGLE_REDIRECT_URI`
- AI assistant: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_CHAT_ENABLED`, `AI_CHAT_AUTO_REDIRECT`, `AI_CHAT_DEBUG`

Generate separate production values with `openssl rand -hex 32` (run it once for each variable). This
produces 32 random bytes encoded as 64 hexadecimal characters. The length check rejects weak values;
it cannot prove that a value was generated randomly. Do not reuse either value for another secret.

The separate AI debug viewer (`yarn workspace @stacks/server ai:debug`) is for local development only.
It binds to `127.0.0.1`, refuses production startup, and prints a temporary Basic-auth credential to
the launching terminal. Treat the viewer's conversation and tool data as sensitive.

Public registration and password recovery are disabled by default. When recovery is disabled, administrators
should provide a secure, identity-verified support process for password resets. Enabling recovery also requires a
configured `@stacks/email-service` worker so reset messages can be delivered.

When registration is enabled, new accounts remain disabled until the recipient follows the emailed activation
link. Password recovery queues a one-hour, single-use reset link; only that link can open and submit the password
reset form. Configure the email worker's `PUBLIC_URL` to the externally reachable server origin so both link types
resolve correctly.

For compatible Qwen template servers, set `AI_DISABLE_THINKING=true` to request non-thinking mode
in both assistant chat and manual model tests. Unset/false preserves the endpoint default. This sends
`chat_template_kwargs.enable_thinking=false`; provider/template support is required. See
[AI thinking configuration](../../packages/server/docs/AI.md#disabling-model-thinking).

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

| Log message                                                             | Cause                                                                                                                                                       |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `missing workspace directory (…)`                                       | `packages/server/import/workspace/` doesn't exist                                                                                                           |
| `Error parsing documents tree data`                                     | `documents.tree` missing or not valid JSON                                                                                                                  |
| `Admin user not found` / `is disabled`                                  | No `admin=true` user on the license tenant, or the admin is disabled                                                                                        |
| `User role not found`                                                   | The default `User` role hasn't been seeded for this tenant yet (run the server boot once with the license in place, then drop in the workspace and restart) |
| `User with email <addr> already exists`                                 | A single person from the export collides with an existing user; that person is skipped, the rest of the import continues                                    |
| `Error parsing people data` / `companies data` / `project data: <path>` | One of the JSON files in the bundle is malformed                                                                                                            |

### Caveats

- **One-shot, not idempotent.** The importer renames the folder on success, so re-running with the same bundle is a no-op unless you rename the `-imported_*` folder back. There is no built-in "undo" — to retry, drop or truncate the affected tables and start over.
- **Always targets the license tenant.** The target tenant comes from your license file, not from a CLI flag. Swap licenses (or edit your dev tenant) to import elsewhere.
- **Email collisions skip the person, not the import.** If an exported person's email already exists on the tenant, only that person is dropped. Their references inside the bundle (assignees, activity authors) will then resolve to `null`, which the database accepts because most assignee columns are nullable. Check the log for `Skipping workspace import: User with email …` lines after importing.
- **Attachments are uploaded eagerly.** Every file under `files/tasks/<id>/` is read into memory and pushed through `FilesLoader.uploadFile` inside the same transaction. Very large bundles can spike memory and lengthen the boot.

## API overview

Routes are registered in [`src/api.ts`](../../packages/server/src/api.ts) and grouped under `/api/<resource>`. The current set:

| Prefix                                                                   | Purpose                          |
| ------------------------------------------------------------------------ | -------------------------------- |
| `/api/boot`                                                              | Initial client bootstrap payload |
| `/api/people`, `/api/companies`                                          | Contacts directory               |
| `/api/projects`, `/api/stacks`, `/api/tasks`                             | Core kanban entities             |
| `/api/documents`, `/api/files`, `/api/notepads`                          | Files and notes                  |
| `/api/bookmarks`, `/api/tags`, `/api/preferences`                        | Per-user metadata                |
| `/api/events`, `/api/activities`, `/api/notifications`, `/api/reminders` | Activity feed / scheduling       |
| `/api/home`, `/api/search`, `/api/reports`                               | Aggregations                     |
| `/api/timelogs`                                                          | Time tracking                    |
| `/api/permissions`, `/api/roles`                                         | RBAC                             |
| `/api/export`                                                            | Data export                      |

Legacy / public routes outside `/api`: `/auth`, `/login`, `/register`, `/ping`.

Handler implementations live under [`packages/server/src/routes/`](../../packages/server/src/routes/) (one file per route group). Zod schemas in [`packages/server/src/routes/schema/`](../../packages/server/src/routes/schema/).

### WebSocket

Endpoint **`/ws`** ([`packages/server/src/routes/socket.ts`](../../packages/server/src/routes/socket.ts)), upgraded via `@hono/node-ws`. Used for real-time updates, heartbeats, presence, and broadcasts. Authentication is required (same JWT as the HTTP API).

### Auth model

Every credential is a **session**: a row in the `auth_sessions` table plus a signed JWT (HS256) that
carries that row. Two transports are accepted, in order:

1. **Signed cookie** `auth_token` (cookie signature uses `COOKIE_SECRET`)
2. **Authorization header** `Bearer <jwt>`

Token extraction lives in [`src/middleware/utils.ts`](../../packages/server/src/middleware/utils.ts) (`getAuthTokenWithSource`); verification in [`src/middleware/auth.ts`](../../packages/server/src/middleware/auth.ts). Payload fields are `uid`, `sid`, `iat`, `exp`, `iss` (`stacks`) and `aud` (`stacks-client`); all six are required, so a token missing any of them — including every token issued before sessions existed — is rejected. The raw bearer token is never stored in the database.

Sessions are issued by [`issueSession`](../../packages/server/src/services/sessions.ts) with a **seven-day absolute** lifetime (`SESSION_LIFETIME_SECONDS` in [`src/config/session.ts`](../../packages/server/src/config/session.ts)): there is no refresh, sliding expiry, or re-issue. Every protected request re-checks the session row (existence, owner, `revokedAt`, own `exp`) and then the current user/tenant state, so revocation and account deactivation take effect immediately. Authentication infrastructure failures fail closed.

| Revocation point            | Effect                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `POST /auth/logout`         | Revokes the current `sid`                                                               |
| `POST /auth/logout-all`     | Revokes every live session of the authenticated user                                    |
| Password reset / activation | Revokes all of the user's sessions **in the same transaction** as the credential change |

The two logout endpoints resolve the caller's identity first and then apply the browser policy described in [Browser origin and CSRF](#browser-origin-and-csrf); a bearer/API caller is exempt. Login cookies are centralized in `authCookieOptions` — `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` bounded by the token's own expiry, and `Secure` whenever the request is HTTPS (or `NODE_ENV=production`). The `uid` and `tenant` cookies are non-authoritative hints only and are cleared with matching path settings.

Clients must handle expiry rather than assume a long-lived token:

- **Mobile** ([`packages/mobile/src/api/client.ts`](../mobile.md)): a `401` clears the stored bearer and forces re-login; `logout()` calls `POST /auth/logout` and clears local state even when that request fails, reporting whether the server accepted the revocation.
- **MCP** (`/api/mcp`): the MCP client authenticates with the same session token, so it must re-login once the token expires or the session is revoked. There is no MCP-specific refresh path.
- **Web**: the `Me` widget logout calls `POST /auth/logout`; the browser never stores a bearer in `localStorage`.

### Account tokens

Activation and password-reset links carry a credential that is **single-use, hashed at rest, and always expired**.
[`src/services/accountTokens.ts`](../../packages/server/src/services/accountTokens.ts) issues 32 random bytes as hex
(24 hours for activation, 1 hour for reset) and returns both the raw `token` — shown once, in the emailed link — and
its SHA-256 `hash`. Only the hash is written to the user row (`activationTokenHash` / `passwordResetTokenHash`)
alongside the matching `…TokenExpiresAt`; the raw value never reaches the database or a directory response.

Redeeming a link is an **atomic conditional claim** in one transaction: the update matches on the stored hash _and_ an
expiry still in the future, and a claim count of anything but `1` means the link was already consumed, expired, or
malformed. Two browsers opened from the same emailed link therefore change the password exactly once, and the loser
cannot overwrite the winner. A successful activation or password reset revokes the user's sessions in the same
transaction.

| Link type  | Issued by                                                       | Redeemed at                  |
| ---------- | --------------------------------------------------------------- | ---------------------------- |
| Activation | `POST /auth/register`, `POST /api/people/:id/resend-activation` | `GET`/`POST /auth/activate`  |
| Reset      | `POST /login/password-recovery`                                 | `POST /login/password-reset` |

Migration [`005_add_activation_token_hash.cjs`](../../packages/db/migrations/005_add_activation_token_hash.cjs) expires
activation links that were still pending when the model changed: their raw `token` predates the hash, so it can never
match the new lookup. Those links stop redeeming rather than keeping a raw-token path, and an administrator sends a
fresh one with `POST /api/people/:id/resend-activation` (admin-only, re-queues `EMAIL_TEMPLATES.REGISTRATION`). The
downgrade is lossy for the same reason and is documented in the migration.

New passwords are bounded **before** bcrypt runs ([`src/utils/passwordPolicy.ts`](../../packages/server/src/utils/passwordPolicy.ts)):
at least 12 code points and at most 72 bytes, with no silent truncation. Password recovery responses are identical for
missing, disabled, system, and deleted accounts — only the email queue can tell them apart.

### OAuth attempts

A Google Calendar flow is bound to the browser that started it. [`beginOAuthAttempt`](../../packages/server/src/services/oauthAttempts.ts)
writes one row in `oauth_attempts` when the client asks for `GET /api/google/auth-url` and returns the `state` value,
a browser `nonce`, and the S256 PKCE `challenge` exactly once. The row keeps only SHA-256 hashes of the first two and
the `codeVerifier` server-side, so no flow value is stored in the clear and none is read back.

`GET`/`POST /api/google/callback` redeems that row **before** anything is exchanged: the state, the `stacks_oauth_nonce`
cookie, the current `sid`, and the current user/tenant must all match, and the attempt must still be inside its
ten-minute window (`OAUTH_ATTEMPT_LIFETIME_MS` in [`src/config/oauthAttempts.ts`](../../packages/server/src/config/oauthAttempts.ts)).
Redemption is an atomic conditional claim (`consumedAt` set while still `null`), so two callbacks for one state have
exactly one winner — a replay, an unsolicited callback, an expired window, or a different browser links nothing.
A provider error or a user denial still burns the attempt, so a retry cannot reuse it.

The provider client is created per call ([`googleOAuthService.client()`](../../packages/server/src/services/googleOAuthService.ts)),
never shared across requests, so credentials for one account cannot reach another account's exchange or refresh.

Migration [`006_add_oauth_attempts.cjs`](../../packages/db/migrations/006_add_oauth_attempts.cjs) adds the table with a
unique index on `stateHash`; its downgrade drops the table (`cascade: true`) because a half-consumed attempt has no
meaningful earlier state.

### Browser origin and CSRF

Two different origins are configured, and they are not interchangeable:

| Variable       | Controls                                                    | Default                          |
| -------------- | ----------------------------------------------------------- | -------------------------------- |
| `APP_ORIGIN`   | Browser policy: CORS, WebSocket upgrade, CSRF token binding | `http://localhost:<APP_PORT>`    |
| `CORS_ORIGINS` | Additional exact browser origins (comma-separated)          | unset                            |
| `API_BASE_URL` | Server-side API base for non-browser clients                | `http://localhost:<SERVER_PORT>` |

Matching is **exact string equality** after `trim()` — no wildcard, no regex, no prefix or suffix match
([`src/config/origins.ts`](../../packages/server/src/config/origins.ts)). `http://localhost:3000/evil`,
`http://localhost:3000.evil.com`, and `http://localhost:3001` are all rejected. In strict mode (`NODE_ENV=production`
or `REQUIRE_SECRETS=1`) the server refuses to boot unless `APP_ORIGIN` is a bare `http(s)` origin and no `CORS_ORIGINS`
entry is a wildcard or carries a path ([`src/config/origins.ts`](../../packages/server/src/config/origins.ts)).

A **browser** mutation (anything that is not `GET`/`HEAD`/`OPTIONS`) must prove same-site intent:

1. A present, non-null `Origin` that is not configured is rejected outright, even with a valid token.
2. The opaque `Origin: null` is not trusted by origin matching. It is accepted only when the request carries a
   valid nonce-bound CSRF token; an opaque-origin request without the browser nonce is rejected.
3. A request with no `Origin` and no `auth_token` or `browser_nonce` is a non-browser client (for example, a native
   app) and is allowed — there is no browser credential to bind.
4. Otherwise the request must carry a token that the server can re-derive. `browser_nonce` is 32 random bytes
   issued when the login cookie is set, and the only token a browser may present is
   `HMAC-SHA256(browser_nonce, COOKIE_SECRET)` ([`src/utils/browserCsrf.ts`](../../packages/server/src/utils/browserCsrf.ts)).
   It arrives in the `x-csrf-token` header and/or a hidden form field `csrf`; exactly one candidate must be present
   and must match in constant time. A cookie alone is not enough, and an `auth_token` without a nonce is rejected.

`GET /auth/csrf` hands the browser that token for the current session. The static form templates
(`static/*.html`) carry it in `<input type="hidden" name="csrf" value="{{csrf}}" />`; the web client fetches it
once and caches it in [`packages/app/src/app/api/request.ts`](../../packages/app/src/api.md), attaching it as
`x-csrf-token` to every state-changing request and clearing the cache on logout. The issuance endpoint applies the
same origin rule, so an untrusted `Origin` is never handed a token, and its response is `no-store` because the token
is only valid for one browser. Duplicate `csrf` fields are rejected, as is a nonce from a
different session. `browser_nonce` is rotated on every logout, so a token captured before logout stops working.

**Bearer/API callers skip the gate entirely** — they never send an `Origin` that means anything, and they cannot
drive a cross-site form. `requireAuth` applies the policy for every `/api/*` route
([`src/middleware/auth.ts`](../../packages/server/src/middleware/auth.ts) `browserMutationAllowed`); the auth routes
under `/auth/*` call it explicitly because they authenticate themselves.

`OPTIONS` preflights are answered (the exact origin is echoed in `access-control-allow-origin`) but never
authorize a mutation. WebSocket upgrades use the same exact-origin list.

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
  {
    firstName: adminUser.firstName,
    lastName: adminUser.lastName,
    activationLink: `/auth/activate/${token}`,
  },
  EMAIL_TEMPLATES.WELCOME,
  "en", // locale must be supplied explicitly
  systemUser, // a User-shaped object — provides tenant + createdBy
  undefined, // optional scheduleAt
  transaction // optional Sequelize transaction
);
```

This is the lower-level primitive `c.sendEmail` delegates to. Use it whenever you need an explicit transaction (e.g. so a queued email rolls back with the surrounding write) — the seeder does this when creating admin users ([`src/seed/users.ts`](../../packages/server/src/seed/users.ts)).

### Template payloads

The template enum and its typed payloads live in [`@stacks/types`](types.md):

| Template                         | Required `data` fields                                                         |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `EMAIL_TEMPLATES.WELCOME`        | `firstName`, optional `lastName`, `activationLink`                             |
| `EMAIL_TEMPLATES.PASSWORD_RESET` | `userName`, `resetLink`, `expirationTime`, optional `ipAddress`, `userAgent`   |
| `EMAIL_TEMPLATES.REGISTRATION`   | `userName`, `verificationLink`, optional `companyName`, `expirationTime`       |
| `EMAIL_TEMPLATES.NOTIFICATION`   | `title`, `message`, optional `actionUrl`, `actionText`, `priority`, `category` |

Anything in `data` is JSON-serialised into the queue row and substituted into the rendered template at send time as `%key%` (e.g. `%firstName%`, `%resetLink%`). The worker also injects `%publicUrl%` from its own `PUBLIC_URL` env var, so route handlers should pass **relative** paths (e.g. `/auth/activate/<token>`) and let the worker prepend the base URL.

### Adding a new template

The end-to-end recipe (server types, React component, subject string, restart the worker) is documented in [`@stacks/email-service` → How to add a new template](email-service.md#how-to-add-a-new-template). On the server side you only need to extend the enum and union in `packages/types/src/models/email.ts`; `c.sendEmail` will then type-check the new template automatically.

## Build

```bash
yarn build:server    # tsc -> dist/, then esbuild bundle via `bundle`
yarn release         # produces the runnable releases/server bundle
```

`yarn release:server` also copies `public.pem` next to the bundle so the production license check can find it.

## Deep dives

These live next to the server source under [`packages/server/docs/`](../../packages/server/docs/):

- [Server onboarding](../../packages/server/docs/ONBOARDING.md) — bootstrap order, request lifecycle, how to add a new route or loader
- [Manual LLM model evaluation](../AI_MODEL_EVALUATION.md) — opt-in model tests, suites, reports, and fixture authoring
- [AI assistant framework](../../packages/server/docs/AI.md) — chat WebSocket contract, prompt + tool selection, how to add new tools
- [Caching system](../../packages/server/docs/CACHING.md) — the multi-tenant response cache, invalidation, and configuration
- [Loaders](../../packages/server/docs/LOADERS.md) — the database access layer, request context, transactions, and shared query helpers
- [Permissions and roles](../../packages/server/docs/PERMISSIONS.md) — RBAC vs per-record ACL, enforcement points, and realtime behavior
- [Realtime updates](../../packages/server/docs/REALTIME_UPDATES.md) — server emission, WebSocket transport, instanceId suppression, and app-side consumption
- [In-app notifications](../../packages/server/docs/NOTIFICATIONS.md) — persistence, recipient targeting, and post-commit realtime delivery
- [Embedded bundle integrity](../../packages/server/docs/EMBEDDED_INTEGRITY.md) — production bundle signing and the boot-time verification

## Related

- [`@stacks/db`](db.md) — models, migrations, seeds
- [`@stacks/types`](types.md) — request/response shapes shared with the client
- [`@stacks/license`](license.md) — startup license validation
- [`@stacks/translations`](translations.md) — bundled i18n strings
