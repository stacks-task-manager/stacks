# Permissions and Roles

This document records how authorization currently works in `@stacks/server`. The system is two-layered:

-   **Resource visibility (ACL)** — per-record sharing rules stored in the `permissions` table (public vs restricted to users/roles).
-   **Role access (RBAC)** — per-role section/action flags (read/write) used to gate specific features (reports, people creation, etc).

Prefer the code when in doubt; this doc links to the enforcement points.

## Table of contents

-   [1. Resource visibility (ACL)](#1-resource-visibility-acl)
    -   [Data model](#data-model)
    -   [How reads are filtered](#how-reads-are-filtered)
    -   [How writes are gated](#how-writes-are-gated)
-   [2. Which resources use ACL](#2-which-resources-use-acl)
-   [3. Updating permissions](#3-updating-permissions)
    -   [REST API](#rest-api)
    -   [Realtime side effects](#realtime-side-effects)
-   [4. Role access (RBAC)](#4-role-access-rbac)
    -   [Enforcement](#enforcement)
    -   [Client-side gating](#client-side-gating)
-   [5. WebSocket permission filtering (client)](#5-websocket-permission-filtering-client)

## 1. Resource visibility (ACL)

### Data model

ACL lives in the `permissions` table, modeled by [`PermissionEntity`](../../db/src/entities/Permission.ts).

Fields used for authorization:

-   `id` — **resource id**. This is intentionally the same UUID as the resource row it applies to (document id, task id, etc).
-   `owner` — user id that “owns” the permission row.
-   `isPublic` — if `true`, everyone in the tenant can see the resource.
-   `visibleUsers` — JSONB array of user ids allowed to see the resource when `isPublic=false`.
-   `visibleRoles` — JSONB array of role ids allowed to see the resource when `isPublic=false`.
-   `type` — polling section used when broadcasting realtime updates (e.g. `POLLINGTYPE.PROJECT`).

The table also inherits the standard tenant/audit columns from `BaseEntity` (tenant scoping and soft deletes), so ACL rows are still tenant-isolated and deletable.

### How reads are filtered

Most loader “read” paths run through helpers in [`src/loaders/utils.ts`](../src/loaders/utils.ts):

-   `findOne(...)`
-   `findAll(...)`

These helpers:

1. Apply tenant + soft-delete scoping via `sanitizeWhere(...)`.
2. LEFT JOIN `PermissionEntity` onto the target entity by `id`.
3. Apply ACL filtering via `sanitizeWherePermissions(...)`.
4. Normalize the shape by mapping the joined permission row (or a default) onto `record.permissions`.

The core ACL predicate is [`sanitizeWherePermissions`](../src/loaders/utils.ts):

-   **Admins bypass**: if `user.admin` is true, no ACL filter is added.
-   **Non-admins can see a resource when any is true**:
    -   `isPublic = true`
    -   `owner = <currentUserId>`
    -   `visibleUsers` contains `<currentUserId>`
    -   `visibleRoles` contains `<currentUserRoleId>`
    -   the joined permission row is missing (`PermissionEntity.id IS NULL`)

That last rule is important: **if a resource has no permission row, it is treated as visible** (and the response gets `permissions: { isPublic: true, visibleUsers: [], visibleRoles: [] }` via `defaultPermissions`).

### How writes are gated

There is no general “write ACL” separate from “read ACL”. Many write paths effectively boil down to:

-   load the record through `findOne(...)` (ACL applies)
-   update/delete the record

Some domains add additional checks (owner, admin, or RBAC) on top of visibility.

Examples:

-   Project updates check either `canWrite(PROJECT_SETTINGS)` or `projectOwner === currentUser` in [`ProjectsLoader.update`](../src/loaders/projects.ts).
-   Activity/comment creation checks `canWrite(COMMENTS)` in [`ActivitiesLoader`](../src/loaders/activities.ts).

## 2. Which resources use ACL

The common pattern is:

```ts
Entity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(Entity, { foreignKey: "id", constraints: false });
```

and then all queries go through `findOne`/`findAll`.

Notable resources:

-   **Documents / Projects / Notepads** — permissions are created at document creation time in [`DocumentsLoader.create`](../src/loaders/documents.ts). Projects and notepads share the same id as their backing document, so the permission row is keyed by the document/project/notepad UUID.
-   **Tasks** — permission rows are created in [`TasksLoader.create`](../src/loaders/tasks.ts). Realtime broadcasts merge task permissions with the project’s permissions via `mergePermissions(...)`, but SQL visibility filtering is still driven by the task’s own permission row.
-   **Stacks** — permission rows are created as public in [`StacksLoader.create`](../src/loaders/stacks.ts) (“not used, will always be public”).
-   **Bookmarks** — permission rows are created as private in [`BookmarksLoader.create`](../src/loaders/bookmarks.ts).

## 3. Updating permissions

### REST API

Permission updates are handled by `PATCH /api/permissions/:id` in [`src/routes/permissions.ts`](../src/routes/permissions.ts), which delegates to [`PermissionsLoader.update`](../src/loaders/permissions.ts).

Current behavior:

-   The loader first loads the permission row via `getOne(id)` (ACL-filtered), and then performs an update.
-   Deleting a permission row via [`PermissionsLoader.remove`](../src/loaders/permissions.ts) is restricted to the permission `owner`.
-   Updating a permission row is not additionally restricted to the owner at the server layer; the UI enforces “owner or admin can edit” in [`PermissionsDialog`](../../app/src/app/components/common/Permissions/PermissionsDialog/PermissionsDialog.tsx).

### Realtime side effects

When a permission row is updated, the server broadcasts a polling update based on the permission row’s `type` in [`PermissionsLoader.update`](../src/loaders/permissions.ts). For `PROJECT` and `NOTEPAD`, it also broadcasts a `DOCUMENTS` update so the sidebar tree can refresh.

## 4. Role access (RBAC)

RBAC is defined by `@stacks/types` in [`roles.ts`](../../types/src/models/roles.ts):

-   Sections: `ROLE_SECTIONS` (reports, people, companies, comments, etc)
-   Actions: `ROLE_ACTIONS` (`read` / `write`)
-   A role carries `access: Partial<Record<section, { read?: boolean; write?: boolean }>>`

### Enforcement

There are two primary enforcement styles on the server:

-   **Route middleware**: [`requireRoleAccess`](../src/middleware/roleAccess.ts) gates a route behind `{section, action}` (admins bypass).
-   **Loader checks**: [`canRead` / `canWrite`](../src/loaders/context.ts) lets loader code branch or throw based on role access (admins bypass).

Current examples:

-   Reports routes apply `requireRoleAccess(REPORTS)` in [`src/routes/reports.ts`](../src/routes/reports.ts).
-   People creation checks `canWrite(PEOPLE)` in [`src/loaders/people.ts`](../src/loaders/people.ts).

### Client-side gating

The web app uses the same `ROLE_SECTIONS` + `ROLE_ACTIONS` model and helper functions (`canRead`, `canWrite`) in [`app/hooks/people.ts`](../../app/src/app/hooks/people.ts) to hide/disable UI affordances for sections a user cannot access.

## 5. WebSocket permission filtering (client)

Every realtime “polling update” can optionally include a `permissions` snapshot. The app uses it to decide whether to run listeners for that update in [`UpdatePoller.handleUpdate`](../../app/src/app/utils/polling.ts):

-   Public updates are always processed.
-   Non-public updates are processed only if the current user is:
    -   an admin, or
    -   in `visibleUsers`, or
    -   in a role listed in `visibleRoles`, or
    -   the author of the update (`update.user === me.id`)

This is a client-side optimization to avoid fetching entities the user cannot see; the REST API is still expected to enforce visibility on reads.
