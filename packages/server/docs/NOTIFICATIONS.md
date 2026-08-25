# In-app notifications

Stacks stores in-app notifications in PostgreSQL and uses a targeted realtime update to tell the
recipient's connected clients to reload them. Persistence is the source of truth; the WebSocket
message is only an invalidation signal.

## Table of contents

- [Notification flow](#notification-flow)
- [Creating notifications](#creating-notifications)
- [Transactions and realtime delivery](#transactions-and-realtime-delivery)
- [Reading and removing notifications](#reading-and-removing-notifications)
- [Testing](#testing)

## Notification flow

1. A domain loader calls `NotificationsLoader.add(...)`.
2. `NotificationEntity.create(...)` stores the notification row.
3. After the database transaction commits, the server emits a targeted
   `POLLINGTYPE.NOTIFICATION` update through `sendRealtimeUpdateToUser(...)`.
4. The WebSocket layer sends the update only to the recipient.
5. The web app's notification listener reloads unread notifications through the REST API.

The realtime payload deliberately contains only the notification ID and polling metadata. Do not
put the notification body in the WebSocket payload or treat delivery as persistence.

## Creating notifications

Use [`NotificationsLoader.add`](../src/loaders/notifications.ts), not `NotificationEntity.create`
or `sendRealtimeUpdateToUser` directly:

```ts
await NotificationsLoader.add(
  {
    recipient: assignee,
    subject: translate("You have been assigned to a task"),
    message: task.title,
    recordType: NOTIFICATION_RECORD_TYPE.TASK,
    recordId: task.id,
    data: task,
  },
  transaction
);
```

Always `await` the call. If the producer is already inside a transaction, pass that transaction as
the second argument so the domain write and notification row form one atomic unit.

## Transactions and realtime delivery

Never publish a realtime update for an uncommitted database write. A client reacts by immediately
reloading through the API; emitting before commit creates a race where it sees stale data, and an
event may describe a write that later rolls back.

`NotificationsLoader.add` writes with the supplied transaction and registers delivery through
`afterTransactionCommit(...)`:

```ts
afterTransactionCommit(transaction, () => {
  sendRealtimeUpdateToUser(recipient, payload);
});
```

The guarantees are:

- successful commit → the notification row exists, then the recipient receives the update;
- rollback → neither the notification row nor its realtime update is produced;
- no transaction → `afterTransactionCommit` runs the side effect immediately.

Use the same helper for any realtime event coupled to an optional Sequelize transaction:

```ts
afterTransactionCommit(transaction, () => {
  sendRealtimeUpdate({
    type: POLLINGTYPE.TASK,
    record: task.id,
    action: POLLINGACTIONS.UPDATE,
    permissions: task.permissions,
  });
});
```

Register the callback on the transaction that owns the complete operation. Nested loaders must
receive the outer transaction rather than opening and committing their own. Keep post-commit
callbacks small and best-effort: the database is already committed when they run, so callback
failure cannot roll it back.

## Reading and removing notifications

`NotificationsLoader.getAll()` returns unread notifications for the current user, newest first.
`read(id)` and `remove(id)` verify that the current user is the recipient before mutating the row.
Do not accept a recipient from the request when reading or deleting notifications.

## Testing

Transaction-sensitive tests should capture the registered `afterCommit` callback and assert that:

1. no realtime update is emitted before the callback runs;
2. the expected targeted update is emitted after it runs;
3. callers pass their outer transaction into `NotificationsLoader.add`.

The focused loader coverage lives in
[`src/loaders/__tests__/notifications-realtime.test.ts`](../src/loaders/__tests__/notifications-realtime.test.ts).

See [REALTIME_UPDATES.md](REALTIME_UPDATES.md) for WebSocket transport and client consumption, and
[LOADERS.md](LOADERS.md) for transaction composition.
