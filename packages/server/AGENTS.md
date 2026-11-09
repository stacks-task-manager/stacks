# API server — Agent Instructions

Applies to `packages/server/`. Read the [root rules](../../AGENTS.md),
[server guide](../../docs/packages/server.md), and [onboarding](docs/ONBOARDING.md).
Locale-only changes additionally use [locales/AGENTS.md](locales/AGENTS.md);
the source-code rules below apply when changing server implementation.

## Placement and authentication

- Routes: `src/routes/<domain>.ts`; Zod schemas: `src/routes/schema/<domain>.ts`;
  database access: `src/loaders/<domain>.ts`.
- Mount authenticated routers with `mountAuthenticated("<domain>", router)` in `src/api.ts`.
  A direct `app.route()` does not add authentication. Keep public endpoints explicitly public.
- `requireAuth` supplies the typed user and loaded role. Do not add `c.get("user") as User`
  casts in authenticated handlers or re-query `RoleEntity` in admin middleware.
- Preserve both ACL visibility and RBAC section/action permissions. Read
  [PERMISSIONS.md](docs/PERMISSIONS.md) before changing authorization or SQL scoping.

## Writes and subsystems

Read the relevant guide before changing these paths:

| Concern          | Guide and invariant                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Database access  | [LOADERS.md](docs/LOADERS.md): use the established loader/transaction patterns                                                              |
| Cache            | [CACHING.md](docs/CACHING.md): tenant-scoped TTL/LRU; write paths call `invalidateApiCacheForCurrentRequest()`                              |
| Realtime         | [REALTIME_UPDATES.md](docs/REALTIME_UPDATES.md): `/ws` publishes lightweight `IUpdate` invalidations                                        |
| Notifications    | [NOTIFICATIONS.md](docs/NOTIFICATIONS.md): persist through `NotificationsLoader.add`, pass outer transactions, invalidate only after commit |
| AI assistant     | [AI.md](docs/AI.md): AI SDK and WebSocket streaming contracts                                                                               |
| Bundle integrity | [EMBEDDED_INTEGRITY.md](docs/EMBEDDED_INTEGRITY.md): signed bundle verification at boot, skipped in dev/test                                |
| Export           | [EXPORTS.md](docs/EXPORTS.md): export formats and access rules                                                                              |

Authentication uses JWT (HS256) through `auth_token` or a bearer token. Never expose secrets.
Do not bypass license validation to start the server. Port/proxy invariants are in the root rules.

## Verification

Vitest tests live in both `src/` and `test/`; use the nearest existing pattern and the active
Vitest configuration. Prefer loader tests for authorization and SQL scoping. Run focused tests
first, then checks required by the affected subsystem. `yarn test:server` uses database global
setup; `yarn test:server:unit` uses the separate unit config without that setup. Do not assume
every test is database-free merely because it is included by the unit config.
