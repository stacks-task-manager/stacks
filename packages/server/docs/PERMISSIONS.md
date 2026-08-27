# Permissions and Roles

This document records how authorization currently works in `@stacks/server`. The system is two-layered:

- **Resource visibility (ACL)** — per-record sharing rules stored in the `permissions` table (public vs restricted to users/roles).
- **Role access (RBAC)** — per-role section/action flags (read/write) used to gate specific features (reports, people creation, etc).

Prefer the code when in doubt; this doc links to the enforcement points.

## Table of contents

- [1. Resource visibility (ACL)](#1-resource-visibility-acl)
  - [Data model](#data-model)
  - [How reads are filtered](#how-reads-are-filtered)
  - [How writes are gated](#how-writes-are-gated)
- [2. Which resources use ACL](#2-which-resources-use-acl)
- [3. Updating permissions](#3-updating-permissions)
  - [REST API](#rest-api)
  - [Realtime side effects](#realtime-side-effects)
- [4. Role access (RBAC)](#4-role-access-rbac)
  - [Enforcement](#enforcement)
  - [Client-side gating](#client-side-gating)
- [5. WebSocket permission filtering (client)](#5-websocket-permission-filtering-client)

## 1. Resource visibility (ACL)

### Data model

ACL lives in the `permissions` table, modeled by [`PermissionEntity`](../../db/src/entities/Permission.ts).

Fields used for authorization:

- `id` — **resource id**. This is intentionally the same UUID as the resource row it applies to (document id, task id, etc).
- `owner` — user id that “owns” the permission row.
- `isPublic` — if `true`, everyone in the tenant can see the resource.
- `visibleUsers` — JSONB array of user ids allowed to see the resource when `isPublic=false`.
- `visibleRoles` — JSONB array of role ids allowed to see the resource when `isPublic=false`.
- `type` — polling section used when broadcasting realtime updates (e.g. `POLLINGTYPE.PROJECT`).

The table also inherits the standard tenant/audit columns from `BaseEntity` (tenant scoping and soft deletes), so ACL rows are still tenant-isolated and deletable.

### How reads are filtered

Most loader “read” paths run through helpers in [`src/loaders/utils.ts`](../src/loaders/utils.ts):

- `findOne(...)`
- `findAll(...)`

These helpers:

1. Apply tenant + soft-delete scoping via `sanitizeWhere(...)`.
2. LEFT JOIN `PermissionEntity` onto the target entity by `id`.
3. Apply ACL filtering via `sanitizeWherePermissions(...)`.
4. Normalize the shape by mapping the joined permission row onto `record.permissions`.

The core ACL predicate is [`sanitizeWherePermissions`](../src/loaders/utils.ts):

- **Admins bypass**: if `user.admin` is true, no ACL filter is added.
- **Non-admins can see a resource when any is true**:
  - `isPublic = true`
  - `owner = <currentUserId>`
  - `visibleUsers` contains `<currentUserId>`
  - `visibleRoles` contains `<currentUserRoleId>`

Missing permission rows are not treated as visible for non-admin users. Existing resources are backfilled by the ACL migration, and new ACL-backed resources should create their permission row in the same write flow as the resource.

### How writes are gated

Generic write helpers separate read visibility from write ownership. By default, `updateOne`, `updateAll`, `deleteOne`, and `deleteAll`:

- load the record through `findOne(...)` / `findAll(...)` (ACL applies)
- allow admins
- allow the permission owner
- reject non-owner users even when the record is public or shared with them

Some domains add additional checks (owner, admin, or RBAC) on top of visibility. If a domain has already performed its own write authorization, it can call the helper with `writePolicy: "visible"` so the helper only enforces visibility and tenant scoping.

Examples:

- Project updates check either `canWrite(PROJECT_SETTINGS)` or `projectOwner === currentUser` in [`ProjectsLoader.update`](../src/loaders/projects.ts), then call the generic helper with `writePolicy: "visible"`.
- Activity/comment creation checks `canWrite(COMMENTS)` in [`ActivitiesLoader`](../src/loaders/activities.ts).

## 2. Which resources use ACL

The common pattern is:

```ts
Entity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(Entity, { foreignKey: "id", constraints: false });
```

and then all queries go through `findOne`/`findAll`.

Notable resources:

- **Documents / Projects / Notepads** — permissions are created at document creation time in [`DocumentsLoader.create`](../src/loaders/documents.ts). Projects and notepads share the same id as their backing document, so the permission row is keyed by the document/project/notepad UUID.
- **Tasks** — permission rows are created in [`TasksLoader.create`](../src/loaders/tasks.ts). Realtime broadcasts merge task permissions with the project’s permissions via `mergePermissions(...)`, but SQL visibility filtering is still driven by the task’s own permission row.
- **Stacks** — permission rows are created as public in [`StacksLoader.create`](../src/loaders/stacks.ts) (“not used, will always be public”).
- **Bookmarks** — permission rows are created as private in [`BookmarksLoader.create`](../src/loaders/bookmarks.ts).
- **Events** — local event rows create a permission row in [`EventsLoader.create`](../src/loaders/events.ts).

## 3. Updating permissions

### REST API

Permission updates are handled by `PATCH /api/permissions/:id` in [`src/routes/permissions.ts`](../src/routes/permissions.ts), which delegates to [`PermissionsLoader.update`](../src/loaders/permissions.ts).

Current behavior:

- `PATCH /api/permissions/:id` accepts `isPublic`, `visibleUsers`, `visibleRoles`, and optional `owner`.
- The loader first loads the permission row via `getOne(id)` (ACL-filtered), then requires the current user to be the permission owner or an admin.
- Ownership transfer is saved through the same update route by including `owner` in the PATCH body.
- Deleting a permission row via [`PermissionsLoader.remove`](../src/loaders/permissions.ts) is restricted to the permission `owner`.

### Realtime side effects

When a permission row is updated, the server broadcasts a polling update based on the permission row’s `type` in [`PermissionsLoader.update`](../src/loaders/permissions.ts). For `PROJECT` and `NOTEPAD`, it also broadcasts a `DOCUMENTS` update so the sidebar tree can refresh.

## 4. Role access (RBAC)

RBAC is defined by `@stacks/types` in [`roles.ts`](../../types/src/models/roles.ts):

- Sections: `ROLE_SECTIONS` (reports, people, companies, comments, etc)
- Actions: `ROLE_ACTIONS` (`read` / `write`)
- A role carries `access: Partial<Record<section, { read?: boolean; write?: boolean }>>`

### Enforcement

There are two primary enforcement styles on the server:

- **Route middleware**: [`requireRoleAccess`](../src/middleware/roleAccess.ts) gates a route behind `{section, action}` (admins bypass).
- **Loader checks**: [`canRead` / `canWrite`](../src/loaders/context.ts) lets loader code branch or throw based on role access (admins bypass).

Current examples:

- Reports routes apply `requireRoleAccess(REPORTS)` in [`src/routes/reports.ts`](../src/routes/reports.ts).
- People creation checks `canWrite(PEOPLE)` in [`src/loaders/people.ts`](../src/loaders/people.ts).

### Client-side gating

The web app uses the same `ROLE_SECTIONS` + `ROLE_ACTIONS` model and helper functions (`canRead`, `canWrite`) in [`app/hooks/people.ts`](../../app/src/app/hooks/people.ts) to hide/disable UI affordances for sections a user cannot access.

## 5. WebSocket permission filtering (client)

Every realtime “polling update” can optionally include a `permissions` snapshot. The app uses it to decide whether to run listeners for that update in [`UpdatePoller.handleUpdate`](../../app/src/app/utils/polling.ts):

- Public updates are always processed.
- Non-public updates are processed only if the current user is:
  - an admin, or
  - in `visibleUsers`, or
  - in a role listed in `visibleRoles`, or
  - the author of the update (`update.user === me.id`)

This is a client-side optimization to avoid fetching entities the user cannot see; the REST API is still expected to enforce visibility on reads.

## 6. Enforcement order and audit matrix

Authenticated resource operations use this order. A denial at a resource or parent ACL is reported as not found so the API does not disclose that the row exists.

1. `mountAuthenticated()` runs JWT authentication and installs request context.
2. Applicable role section/action checks run in route middleware or the loader.
3. `sanitizeWhere()` restricts rows to the current tenant and `deleted IS NULL`.
4. `sanitizeWherePermissions()` applies the resource ACL. Missing or soft-deleted ACL rows fail closed for non-admins.
5. Parent loaders apply every applicable parent ACL. Admins bypass ACL/RBAC, but queries remain tenant-scoped.

| Resource / entrypoint              | Read rule                                                                         | Mutation rule                                                       | Applicable parent rule                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Documents                          | Resource ACL; list removes descendants whose visible ancestor chain is incomplete | ACL owner/admin; visible users may move/reorder                     | Every document ancestor; destination parent is checked before create/move                    |
| Projects / notepads                | Shared document/resource ACL                                                      | Owner/admin, plus existing project-settings policy                  | Backing document and every document ancestor                                                 |
| Stacks                             | Resource ACL                                                                      | ACL owner/admin                                                     | Project detail ACL                                                                           |
| Tasks                              | Resource ACL                                                                      | ACL owner/admin                                                     | Project ACL; list/count resolve visible projects once and filter in the task query           |
| Timelogs                           | Person/approver business rule                                                     | Person/admin and status workflow                                    | Task ACL and its project ACL, resolved in batches for lists                                  |
| Activities                         | Tenant scope plus validated resource type                                         | Comments write capability                                           | Task ACL; list first resolves the visible task set                                           |
| Attachments                        | Tenant scope plus validated `FILES_TYPE`                                          | Same parent visibility is required before attachment writes/deletes | Task, project, notepad, document, person, or company loader selected from the validated type |
| Local events                       | Event ACL                                                                         | ACL owner/admin                                                     | Calendar ACL for detail/list/count/create/move                                               |
| Search / overview / AI tools / MCP | Loader result policies                                                            | Loader mutation policies                                            | These callers do not bypass loader checks                                                    |
| WebSocket updates                  | Permission snapshot is advisory filtering only                                    | N/A                                                                 | REST/loaders independently re-authorize subsequent reads                                     |

All resource routers in `src/api.ts` are mounted with `mountAuthenticated()`. The intentionally public API surfaces are source/license information and the documented Google OAuth handshake routes.

## 7. Permission mutation hardening

Permission route IDs and all audience IDs are UUID-validated. Audience arrays are capped at 500 entries and deduplicated. The loader verifies the owner and visible users/roles are active, non-deleted rows in the current tenant. `type` and `tenant` are not accepted update fields. Ownership changes remain available only to the existing permission owner or an admin.

The authorization read and ACL write run in one transaction with a row lock. ACL deletion uses the same transactional pattern. After a successful ACL or role-access update, the complete current-tenant API response cache is invalidated after commit; realtime events are emitted after commit as well.

## 8. Query-shape and index review

Hierarchy list paths use bounded query counts rather than per-row parent lookups:

- document ancestry is intersected in memory from one tenant/ACL-filtered document query;
- project/notepad lists reuse that visible document-id set;
- task list/count resolves visible projects once and applies an `IN` predicate in the task query;
- activity and timelog lists resolve visible tasks in one batch;
- event list/count resolves visible calendars once.

No permission index migration was added. The audit did not produce three warm `EXPLAIN (ANALYZE, BUFFERS)` runs showing the required 20% improvement or a demonstrated high-cardinality permissions scan, so adding speculative B-tree/GIN indexes would violate the migration threshold. A production-sized benchmark should seed at least 10,000 mixed-ACL rows in an isolated database, run detail/list/count/search/overview/event/timelog queries three times after warm-up, and retain the plans before selecting an index.
