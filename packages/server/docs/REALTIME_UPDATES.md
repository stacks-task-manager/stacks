# Realtime updates

Stacks uses a WebSocket to push lightweight “polling updates” to clients after writes. The update payload does not contain the full updated record; it tells the client what changed so the client can reload the affected entity through the REST API and update its local store.

This document covers the current server → client path and how the web app consumes updates.

## Table of contents

-   [1. Update payload shape (`IUpdate`)](#1-update-payload-shape-iupdate)
-   [2. Server emission (from loaders and other code)](#2-server-emission-from-loaders-and-other-code)
-   [3. Server transport (`/ws`)](#3-server-transport-ws)
-   [4. Self-echo suppression (`instanceId`)](#4-self-echo-suppression-instanceid)
-   [5. Front-end handling (web app)](#5-front-end-handling-web-app)

## 1. Update payload shape (`IUpdate`)

The shared update type is defined in `@stacks/types`: [`updates.ts`](../../types/src/models/updates.ts).

Key fields:

-   `type` (`POLLINGTYPE`) — which domain changed (task, project, documents, etc)
-   `action` (`POLLINGACTIONS`) — create/update/delete/archived/unarchived
-   `record` — the id of the record that changed
-   `parent` — optional parent id (used by some domains)
-   `user` — the user id attributed to the change
-   `timestamp` — ms since epoch
-   `instanceId` — optional client instance id (used to suppress self-echo in the UI)
-   `permissions` — optional ACL snapshot for client-side filtering (see [PERMISSIONS.md](PERMISSIONS.md))

## 2. Server emission (from loaders and other code)

The helper most server code uses is [`sendRealtimeUpdate`](../src/events.ts).

It:

-   derives `user` and `instanceId` from `requestContext` when available
-   fills in `timestamp`
-   emits an `AppEvents.DATA_UPDATE` event through the app-wide emitter

Example (task creation) from [`TasksLoader.create`](../src/loaders/tasks.ts):

```ts
await sendRealtimeUpdate({
    type: POLLINGTYPE.TASK,
    record: task.id,
    action: POLLINGACTIONS.CREATE,
    permissions: mergePermissions(permissions, project.permissions),
});
```

Notes:

-   Many broadcasts include a `permissions` snapshot so the client can skip fetching records it cannot see.
-   Some flows target a single user (instead of broadcast) via [`sendRealtimeUpdateToUser`](../src/events.ts).

## 3. Server transport (`/ws`)

The WebSocket endpoint is registered in [`src/routes/socket.ts`](../src/routes/socket.ts) at `GET /ws`.

At startup, the socket layer registers a global handler:

-   [`onUpdate(...)`](../src/events.ts) subscribes to `AppEvents.DATA_UPDATE`
-   on each update, the socket server:
    -   sends to a specific user when `targetUserId` exists, or
    -   broadcasts to all connections otherwise

The outgoing WebSocket message looks like:

```json
{ "type": "update", "payload": { "...IUpdate fields..." }, "timestamp": 123 }
```

## 4. Self-echo suppression (`instanceId`)

To avoid “I just clicked a button and then got notified about my own change”, the system threads a per-tab instance id through:

-   Client → server: Axios adds `X-Instance-ID` to requests (the value is owned by `UpdatePoller`).
-   Server request context: `requireAuth` stores `instanceId` from that header in the Hono context, and `withRequestContext` persists it into `AsyncLocalStorage`.
-   Server → client: `sendRealtimeUpdate(...)` includes that `instanceId` in emitted updates.
-   Client handling: the web app ignores incoming updates whose `update.instanceId === this.instanceId`.

The suppression happens in [`UpdatePoller.handleUpdate`](../../app/src/app/utils/polling.ts).

## 5. Front-end handling (web app)

The web app’s realtime client is `UpdatePoller` in [`app/utils/polling.ts`](../../app/src/app/utils/polling.ts), created once at startup and stored on `window.updatePoller`.

End-to-end:

1. `UpdatePoller` connects to `/ws` and parses `type: "update"` messages.
2. It decides whether to forward the update to listeners:
    - drops self-echo updates by `instanceId`
    - optionally evaluates `update.permissions` against the current user (admin, visibleUsers, visibleRoles)
3. Listeners are registered from React via [`useUpdates`](../../app/src/app/hooks/updates.ts):
    - one listener per `POLLINGTYPE`
    - each listener calls a store action, which typically re-fetches the record and upserts it

The high-level overview of `UpdatePoller` and `useUpdates()` is also described in the app architecture doc under “Real-time updates”: [`ARCHITECTURE.md`](../../app/docs/ARCHITECTURE.md).
