# Loaders

Loaders are the server’s database access layer: small, reusable modules that implement domain reads/writes against Sequelize models. Route handlers call loaders, seed scripts call loaders, and other server subsystems (AI tools, WebSocket flows, background-ish jobs) should prefer loaders over ad-hoc `Model.findOne(...)` calls.

The canonical entry point is the barrel export: [`src/loaders/index.ts`](../src/loaders/index.ts).

## Table of contents

-   [What loaders are responsible for](#what-loaders-are-responsible-for)
-   [Request context and “current user”](#request-context-and-current-user)
-   [Common loader utilities](#common-loader-utilities)
    -   [Tenant + soft delete filtering](#tenant--soft-delete-filtering)
    -   [ACL-aware reads](#acl-aware-reads)
    -   [Transactions](#transactions)
-   [Side effects from loaders](#side-effects-from-loaders)
    -   [Realtime broadcasts](#realtime-broadcasts)
    -   [Cache invalidation](#cache-invalidation)
-   [How to add a loader](#how-to-add-a-loader)
-   [Testing loaders](#testing-loaders)

## What loaders are responsible for

-   **Tenant scoping** — most queries must be restricted to the current tenant.
-   **Soft-delete semantics** — loaders typically treat `deleted = null` as “exists”.
-   **Authorization checks** — role access (RBAC) and per-record visibility (ACL) are enforced here for most domains.
-   **Transactions** — many operations accept an optional Sequelize `Transaction` so callers can compose larger atomic flows.
-   **Side effects** — cache invalidation and realtime broadcasts are usually emitted from loaders after successful writes.

Loaders generally return plain JSON (via `toJSON()` or raw queries) instead of Sequelize instances.

## Request context and “current user”

Authenticated HTTP requests are wrapped in `AsyncLocalStorage` via:

-   `requireAuth` (loads user + role) — [`src/middleware/auth.ts`](../src/middleware/auth.ts)
-   `withRequestContext` (stores `{ user, role, instanceId, requestId }`) — [`src/middleware/requestContext.ts`](../src/middleware/requestContext.ts)

Inside loaders, use the request-scoped helpers in [`src/loaders/context.ts`](../src/loaders/context.ts):

-   `getCurrentUser()` / `getCurrentRole()`
-   `canRead(section)` / `canWrite(section)`

This is how loader code accesses the caller identity without threading `{ user }` through every function signature.

## Common loader utilities

Most domains reuse helpers from [`src/loaders/utils.ts`](../src/loaders/utils.ts).

### Tenant + soft delete filtering

-   `sanitizeWhere(whereData?)` injects:
    -   `tenant: <currentUser.tenant>`
    -   `deleted: null`
-   `sanitizeUpdate(newData)` strips audit/tenant fields from “patch” style payloads.

### ACL-aware reads

For resources that participate in per-record visibility (the `permissions` table), use:

-   `sanitizeWherePermissions(whereData?, prefix?)` for SQL WHERE clauses
-   `findOne({ entity, id, ... })` and `findAll({ entity, filter, ... })` to:
    -   join `PermissionEntity` by `id`
    -   apply `sanitizeWherePermissions(...)`
    -   normalize the output to `record.permissions`

Details of the ACL model live in [PERMISSIONS.md](PERMISSIONS.md).

### Transactions

Most loaders follow this pattern:

-   accept `extTransaction?: Transaction`
-   wrap work in `withTransaction(extTransaction, async transaction => { ... })`

`withTransaction` will:

-   use the provided transaction as-is, or
-   open/commit/rollback its own transaction if none was provided

This makes it easy for callers to compose multiple loader operations into one atomic unit.

## Side effects from loaders

### Realtime broadcasts

After mutations, loaders typically emit a lightweight “polling update” so connected clients refresh their local stores.

The primitive is [`sendRealtimeUpdate`](../src/events.ts), which emits an [`IUpdate`](../../types/src/models/updates.ts) via the app-wide emitter. The WebSocket server broadcasts it to clients.

Example: task creation broadcasts an update whose `permissions` is the merged task+project visibility:

```ts
await sendRealtimeUpdate({
    type: POLLINGTYPE.TASK,
    record: task.id,
    action: POLLINGACTIONS.CREATE,
    permissions: mergePermissions(permissions, project.permissions),
});
```

See the end-to-end realtime flow in [REALTIME_UPDATES.md](REALTIME_UPDATES.md).

### Cache invalidation

Some loaders call `invalidateApiCacheForCurrentRequest()` after writes so cached API responses are evicted for the current tenant/request context. This behavior is documented in [CACHING.md](CACHING.md).

## How to add a loader

1. Create a new module under [`src/loaders/`](../src/loaders/).
2. Export a named loader object, e.g. `export const WidgetsLoader = { ... }`.
3. Re-export it from [`src/loaders/index.ts`](../src/loaders/index.ts).
4. Reuse shared helpers:
    - `withTransaction` for transaction boundaries
    - `createOne`, `updateOne`, `deleteOne` for consistent audit fields and tenant scoping
    - `sanitizeWhere` / `sanitizeWherePermissions` for consistent visibility rules

## Testing loaders

Loader tests live under [`src/loaders/__tests__/`](../src/loaders/__tests__/). Prefer loader-level tests (requestContext + SQL scoping) over HTTP tests when you’re validating authorization or query behavior.
