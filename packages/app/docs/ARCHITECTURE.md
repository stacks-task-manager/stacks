# Web app architecture

A reference for _how_ `@stacks/app` is wired together. Read [ONBOARDING.md](ONBOARDING.md) first if you haven't — this page assumes you know the directory layout and the boot sequence.

## Table of Contents

-   [App shell](#app-shell)
-   [Routing](#routing)
-   [State management](#state-management)
-   [Client-side persistence](#client-side-persistence)
-   [API layer](#api-layer)
-   [Real-time updates](#real-time-updates)
-   [Drag-and-drop](#drag-and-drop)
-   [Theming](#theming)
-   [User feedback surface](#user-feedback-surface)
-   [Error handling](#error-handling)
-   [Build](#build)
-   [Where to go next](#where-to-go-next)

## App shell

[`src/index.tsx`](../src/index.tsx) is the entry. It mounts `<App />` inside a `<HashRouter>` after `BootAPI.load()` resolves. [`src/app/App.tsx`](../src/app/App.tsx) is the shell component — it wraps the page in `<DragDropProvider>`, syncs dark-mode and scrollbar preferences onto the body element, registers the global `useUpdates()` realtime subscriptions, and renders the route table.

```
<HashRouter>
  <App>
    <ErrorBoundary>
      <DragDropProvider>
        <Preferences />          ← invisible side-effect components (auto-save preferences, etc.)
        <Announcement />
        <Workspaces />           ← tenant switcher
        <SplitView
          left={<Sidebar />}
          right={<MainAppRoutes />}
        />
      </DragDropProvider>
    </ErrorBoundary>
  </App>
</HashRouter>
```

## Routing

The route table is `MainAppRoutes` inside [`App.tsx`](../src/app/App.tsx). The router uses `HashRouter` so the live URL is `http://localhost:3000/#/<path>` (substitute your `APP_PORT` if you changed it — see [INSTALLATION.md](../../../docs/INSTALLATION.md#2-open-the-app)).

Top-level routes (paraphrased — see `App.tsx` for the truth):

| Path                                                    | View             | Notes                                 |
| ------------------------------------------------------- | ---------------- | ------------------------------------- |
| `/home`                                                 | `<Home />`       | Default landing surface               |
| `/mytasks`                                              | `<MyTasks />`    | Nested `:tid` opens task details      |
| `/tasks`                                                | `<Tasks />`      | Global task list, nested `:tid`       |
| `/inbox`                                                | `<Inbox />`      | Nested `:tid`                         |
| `/project/:id`                                          | `<Project />`    | Sub-views under `views/Project/*`     |
| `/notepad/:id`, `/goal/:id`, `/file/:id`                | per-record views |                                       |
| `/people`                                               | `<People />`     | Nested `person/:id` and `company/:id` |
| `/calendar`, `/bookmarks`, `/reports`, `/reports/:type` | section views    |                                       |
| `*`                                                     | `<Watermark />`  | Empty / fallback                      |

### Background-route panels

Task, person, and company details can open _on top of_ the current view as overlay panels without changing the underlying page. The pattern is React Router's `location.state.backgroundLocation`:

```tsx
// When opening:
navigate(`/task/${id}`, { state: { backgroundLocation: location } });
```

`App.tsx` renders a second `<Routes>` block keyed off `locationState?.backgroundLocation`, mounting `<TaskDetailsPanel />`, `<PersonDetailsPanel />`, or `<CompanyDetailsPanel />` over the page. The base `MainAppRoutes` reads from `backgroundLocation` so the underlying view doesn't unmount.

This is why you'll see two kinds of detail components: `TaskDetails` (full-page) and `TaskDetailsPanel` (overlay). Both wrap the same content.

## State management

State is held in a small in-house entity store ([`src/app/hooks/store/entity.ts`](../src/app/hooks/store/entity.ts) — read it; it's short). The API:

```ts
import { entity } from "app/hooks/store";

export const TasksStore = entity<ITasksStore>({ tasks: [], isLoading: false });
```

An entity has four methods that matter:

| Method                                          | When to call                                                   | Notes                                                                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Store.get()`                                   | Inside actions, getters, or other non-component code           | Reads the current value synchronously. **Don't call inside render** — it won't subscribe.                                                 |
| `Store.set(value)` or `Store.set(prev => next)` | Inside actions                                                 | Replaces the value and notifies subscribers. Use [`immer`'s `produce(...)`](https://immerjs.github.io/immer/) for ergonomic deep updates. |
| `Store.subscribe(fn)`                           | Rare, for non-React listeners (e.g. the WS client, a debugger) | Returns an unsubscribe.                                                                                                                   |
| `Store.use(selector, equality?)`                | Inside components                                              | Selects a value and subscribes the component. Always pass `shallowEqual` (from `app/hooks/store`) for selectors returning objects/arrays. |

### Slice shape

One slice per domain under [`src/app/store/`](../src/app/store/). Each slice file:

-   Declares a `interface IXStore { ... }`
-   Exports an `entity<IXStore>({ ...defaults })` named `XStore`
-   Contains **no actions and no React** — pure state shape

### Actions shape

One file per slice under [`src/app/store/actions/`](../src/app/store/actions/), exporting an `XActions` object. Actions:

-   Mutate the corresponding store with `XStore.set(produce(draft => { ... }))`
-   Call the API client
-   May call other actions or read other stores via cross-store getters (`getCurrentProjectId()`, `getMe()`, `getStack()`, etc.)
-   Surface user feedback via `window.toaster.show(...)` when appropriate

Common helpers in [`src/app/store/actionHelpers.ts`](../src/app/store/actionHelpers.ts):

-   `upsertById(existing, incoming)` — replace-or-append items in a normalized list
-   `runStoreLoad({ set, onStart, load, onSuccess })` — the standard "set loading → fetch → set data" sequence
-   `createDebouncedCallback(ms)` — debounces store-driven query inputs (500 ms is the app default)
-   `patchFilterField(filters, key, value)` — `Object.assign` inside an Immer draft

### Hooks shape

[`src/app/hooks/`](../src/app/hooks/) is the read-side surface. Each hook wraps `XStore.use(selector, equality)` and exposes a clean React API:

```ts
export const useTask = (taskId: string) =>
    TasksStore.use(s => s.tasks.find(t => t.id === taskId), shallowEqual);
```

Cross-store getters (synchronous, _not_ hooks) also live here so actions can compose:

```ts
export const getCurrentTaskId = () => /* read NavigationStore.get() */;
export const getStack = (id: string) => StacksStore.get().stacks.find(s => s.id === id);
```

## Client-side persistence

Some UI state should survive a browser refresh without being loaded from the server (filter toggles, panel open/closed, table column widths, etc.). In the web app, there are three common patterns.

### 1) Persist component-local UI state: `useStorage`

Use [`useStorage`](../src/app/hooks/storage.ts) for simple values owned by a single component (or a small component tree).

```ts
import { useStorage } from "app/hooks/storage";

const [filter, setFilter] = useStorage<string>("home-my-tasks-filter", false, "due-thisWeek");
```

-   `key`: storage key
-   `parse`: `false` (string), `true` (JSON), or a custom parser `(raw: string) => T`
-   `defaultValue`: returned when nothing is stored yet
-   `prefix` (optional): adds an extra prefix segment for organization

### 2) Persist store state explicitly: `app/utils/storage`

Use [`Storage`](../src/app/utils/storage.ts) (`Storage.get` / `Storage.set`) when you want full control over when you read/write persisted state (most common in actions or in a store init hook).

This helper automatically scopes keys to the active workspace/tenant (based on the `tenant` cookie), so persisted state does not leak across workspaces.

Examples:

-   Store init reads cached data: [`OverviewStore`](../src/app/store/overview.ts)
-   Calendar filters persist to localStorage and hydrate on init: [`CalendarStore`](../src/app/store/calendar.ts)

### 3) Persist an entire entity automatically: store plug-ins

The entity store supports plug-ins that can override `init()` and/or `set()`. There is a generic persistence plug-in at [`persistence`](../src/app/hooks/store/plugins/persistence.ts):

```ts
import { entity } from "app/hooks/store";
import { persistence } from "app/hooks/store/plugins/persistence";

export const CounterStore = entity(0, [persistence("counter")]);
```

This loads the stored value on entity init, and writes the new value on every `entity.set(...)`.

Important notes:

-   Prefer `app/utils/storage` for app-facing persistence because it is tenant/workspace aware.
-   If you use `persistence(...)`, choose a key that cannot collide across workspaces, or pass a custom storage implementation that handles scoping.
-   Never persist secrets or tokens in localStorage.

## API layer

Every HTTP call goes through [`src/app/api/request.ts`](../src/app/api/request.ts) — a single Axios instance with date round-tripping, an `X-Instance-ID` header, automatic error toasts, and `data` unwrapping. Per-domain modules (`api/tasks.ts`, `api/projects.ts`, …) just compose `request.get`/`post`/`patch`/`delete`.

Full details, including the date transformation rules and how to opt out of error toasts, are in **[API_CLIENT.md](API_CLIENT.md)**.

## Real-time updates

The app maintains a persistent WebSocket connection to the server's `/ws` endpoint and uses it to keep stores in sync with mutations made by other clients (or by the same user in another tab).

### `UpdatePoller`

[`src/app/utils/polling.ts`](../src/app/utils/polling.ts) exports the `UpdatePoller` class, instantiated once in [`src/index.tsx`](../src/index.tsx) and assigned to `window.updatePoller`. It owns:

-   **The WebSocket connection** to `ws[s]://{host}:{port}/ws[?token=...]`, with auto-reconnect (5 attempts, exponential backoff) and a heartbeat.
-   **`instanceId`** — a per-tab UUID. The Axios request interceptor reads it and sends it as `X-Instance-ID` on every request, so the server can distinguish "this client made the change" from "another client did" when broadcasting updates back over WS.
-   **`on(section, callback)`** — subscribes a callback to updates for a polling section (e.g. `POLLINGTYPE.TASK`, `POLLINGTYPE.PROJECT`). Callbacks are debounced 100 ms so a flurry of WS messages of the same type collapses into a single store reload.
-   **AI chat streaming** — the same WS carries `delta` / `done` / `error` payloads for the AI assistant.

### `useUpdates()`

[`src/app/hooks/updates.ts`](../src/app/hooks/updates.ts) is the React-side glue. Mounted once in `App.tsx`, it registers one listener per polling type:

```ts
useRealtimeUpdates(POLLINGTYPE.TASK, TasksActions.reloadTask);
useRealtimeUpdates(POLLINGTYPE.PROJECT, ProjectsActions.reloadProject);
// …etc
```

Each action receives `(update, hasPermissions)` and decides what to do — usually re-fetching the affected record and upserting it into its store. If you add a new domain, register its handler here too.

### Connection status

`UpdatePoller.subscribeConnectionStatus(callback)` reports `{ isConnected, isConnecting, isDisconnected }`. The connection banner in the UI subscribes to this so users see a "reconnecting…" pill when the WS drops.

## Drag-and-drop

Two libraries, one provider:

-   **[`@hello-pangea/dnd`](https://github.com/hello-pangea/dnd)** — used for the project board (drag cards between stacks, reorder stacks), the task list, and other linear lists.
-   **[`@minoru/react-dnd-treeview`](https://github.com/minop1205/react-dnd-treeview)** — used for the sidebar document tree (drag folders and files into folders).

Both sit under a single [`<DragDropProvider>`](../src/app/components/draggable/context/DragDropContext.tsx) in `App.tsx` that brokers cross-library drags (e.g. drag a task card onto a sidebar folder). Drag _intent_ and _result_ state lives in the provider's context; the consumer components subscribe and dispatch the relevant action (`TasksActions.move`, `StacksActions.reorder`, etc.).

If you're adding DnD inside an existing view, prefer reaching for the same library the surrounding code uses. Cross-view DnD goes through the provider.

## Theming

Dark mode is a body class: [`App.tsx`](../src/app/App.tsx) toggles `Blueprint.Classes.DARK` (`bp6-dark`) on `<body>` based on the `darkMode` preference. There is no theme provider — global SCSS and Blueprint's own styles read off the body class.

To make a component theme-aware:

```scss
/* light is the default */
.my-block {
    background: var(--color-surface);
    color: var(--color-text);
}

/* dark override */
:global(.bp6-dark) .my-block {
    background: var(--color-surface-dark);
    color: var(--color-text-dark);
}
```

Color tokens are in [`src/app/_vars.scss`](../src/app/_vars.scss). Reach for tokens first; introduce a new token only if no existing one fits.

## User feedback surface

-   **Toasts**: `window.toaster.show({ message, intent, icon, timeout })` — a Blueprint `OverlayToaster` instantiated in `index.tsx`. Use `Intent.SUCCESS`/`WARNING`/`DANGER`/`PRIMARY`. The Axios layer auto-toasts errors (see [API_CLIENT.md](API_CLIENT.md#error-handling)) so don't double-toast a failed request.
-   **Dialogs**: [`src/app/utils/dialog.ts`](../src/app/utils/dialog.ts) wraps Blueprint's `<Dialog>` so you can imperatively call `Dialog.confirm("Delete?")` from inside an action without rendering a dialog component. Returns a Promise.
-   **Sounds**: [`src/app/utils/sound.ts`](../src/app/utils/sound.ts) exposes named sound effects (e.g. `sound.play("complete")`). Used sparingly — most flows are silent.
-   **Mousetrap**: [`src/app/utils/`](../src/app/utils/) wraps [Mousetrap](https://craig.is/killing/mice) for keyboard shortcuts. `Mousetrap.bind(["command+k", "ctrl+k"], handler)` is the canonical form. Register and unregister inside `useEffect`.

## Error handling

Errors travel three paths:

1. **Render errors** → caught by `<ErrorBoundary>` near the root of `App.tsx`. The fallback UI lives next to the boundary.
2. **API errors** → caught by the Axios response interceptor, surfaced as toasts unless `{ silent: true }` is passed. The Promise still rejects, so action code can also branch on `try`/`catch`. See [API_CLIENT.md](API_CLIENT.md#error-handling).
3. **WebSocket errors** → handled inside `UpdatePoller`. Auto-reconnects up to 5 times with backoff; surfaces connection status to any subscribed UI. The app does **not** crash on a dropped WS — REST polling fills the gap.

## Build

Webpack 5 ([`packages/app/webpack.config.cjs`](../webpack.config.cjs)) produces:

```
packages/app/build/
  static/
    css/  js/  media/
  index.html
  manifest.json
```

Important config details:

-   **`resolve.modules: [src/, node_modules/]`** — this is why imports use `app/…` rather than relative paths.
-   **`resolve.alias`** — `@stacks/types` and `@stacks/translations` are aliased straight into the workspace sources for fast dev rebuilds. `lodash` is aliased to `lodash-es` for tree-shaking.
-   **`devServer.port`** — `process.env.PORT || 3001`. The server (`:3000`) proxies `/app/*` and `/static/*` to this port in development.
-   **`publicPath`** — `"./"` in production (so the bundle is portable under any URL prefix), `"/"` in development.

`yarn release` from the repo root copies `build/` into `releases/server/app/` so the production server bundle serves the static files directly.

## Where to go next

-   [API_CLIENT.md](API_CLIENT.md) — the Axios instance in detail (the most-asked-about piece for new contributors)
-   [ONBOARDING.md](ONBOARDING.md) — back to the worked "add a feature" example with a concrete checklist
-   [`docs/E2E.md`](../../../docs/E2E.md) — Playwright conventions; required reading before adding an interactive element without a `data-testid`
-   [`docs/packages/translations.md`](../../../docs/packages/translations.md) — how user-visible strings flow through `@stacks/translations`
