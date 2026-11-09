# Web app — Agent Instructions

Applies to `packages/app/`. Read the [root rules](../../AGENTS.md),
[app guide](../../docs/packages/app.md), and [onboarding](docs/ONBOARDING.md) before editing.
Read [architecture](docs/ARCHITECTURE.md) for routing/state/realtime changes and
[API client](docs/API_CLIENT.md) for requests or date handling.

## Placement and data flow

Paths below are relative to `src/app/`:

- `api/<domain>.ts`: domain API methods using the shared Axios client.
- `store/<domain>.ts`: entity slice; `store/actions/<domain>.ts`: mutations and side effects.
- `hooks/<domain>.ts`: subscriptions and derived state.
- `views/<Domain>/`: routed pages; register routes in `App.tsx`.
- `components/<Name>/`: reusable UI; `widgets/`: composed feature blocks.
- Keep per-component `_Name.scss` beside the component; global tokens belong in `_vars.scss`.

Use `app/…` imports within the app, not relative paths. Use `@stacks/types` for shared shapes.
The router is `BrowserRouter` with basename `/app`; use router links rather than manually adding
the basename. Legacy `#/…` URLs are normalized before React mounts.

## State and UI invariants

- Mutations go through actions: never call `Store.set()` from components.
- Subscribe with `Store.use()` in render, never `Store.get()`.
- Object/array selectors need `shallowEqual` or appropriate custom equality.
- Realtime updates flow from `window.updatePoller` through `useUpdates()` to stores.
  When changing a view's data source, check that edits and realtime updates reach its rendered rows.
- The shared Axios layer round-trips dates; do not manually call `.toISOString()` at API call sites.
- Use `window.toaster.show()` for user notifications and `.bp6-dark` for dark-mode styles.
- Use colocated SCSS, not CSS-in-JS.
- Add stable `data-testid` attributes to interactive elements. See
  [Playwright rules](../../playwright/AGENTS.md) when adding coverage.
- Translation tables live in `packages/server/locales/app/`, not in this workspace.
  Follow the [locale rules](../server/locales/AGENTS.md); reuse existing keys before adding new ones.

## Verification

New pure logic in hooks/utilities needs unit tests; user flows use Playwright. Run the relevant
checks from the [root command table](../../AGENTS.md#commands-and-verification), including the
app type check and appropriate lint/tests. For E2E changes, also read the
[E2E guide](../../docs/E2E.md) and nearest spec/POM. Format only touched files.
