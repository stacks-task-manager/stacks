# Web app onboarding

A getting-started guide for new contributors landing in `packages/app`. The goal is to get you from a fresh clone to a productive first PR without having to read the whole codebase first.

> Local environment setup (Node, Yarn, Postgres, license, the `.env` files) is in [`docs/INSTALLATION.md`](../../../docs/INSTALLATION.md). This page assumes you can already run `yarn dev` from the repo root and reach `http://localhost:3000/login`. URLs below use the default `APP_PORT=3000`; if you set a different `APP_PORT` in `packages/server/.env`, substitute that port everywhere — see [INSTALLATION.md](../../../docs/INSTALLATION.md#2-open-the-app).

## Table of Contents

- [1. Stack in one paragraph](#1-stack-in-one-paragraph)
- [2. Boot sequence](#2-boot-sequence)
- [3. Code layout](#3-code-layout)
- [4. How to add a feature (worked example)](#4-how-to-add-a-feature-worked-example)
- [5. Useful commands](#5-useful-commands)
- [6. Conventions & gotchas](#6-conventions--gotchas)
- [7. FAQ](#7-faq)

## 1. Stack in one paragraph

- **Framework**: React 18 + TypeScript, bundled with Webpack 5 (no CRA, no Vite).
- **Router**: `react-router-dom` v6, mounted under [`HashRouter`](../src/index.tsx) — URLs use `#/…` (e.g. `http://localhost:3000/#/project/abc`).
- **State**: a small in-house entity store (`app/hooks/store`) with [`immer`](https://immerjs.github.io/immer/) for mutations. One slice per domain under `app/store/`.
- **API**: a single shared Axios instance ([`app/api/request.ts`](../src/app/api/request.ts)) with domain modules in `app/api/`. See [API_CLIENT.md](API_CLIENT.md).
- **Realtime**: a WebSocket client (`window.updatePoller`) connected to the server's `/ws` endpoint, with REST polling for fallback. See [ARCHITECTURE.md](ARCHITECTURE.md#real-time-updates).
- **UI kit**: [Blueprint v6](https://blueprintjs.com/) for primitives (buttons, dialogs, toasts, popovers, datetime), plus app-local components in `src/app/components/`.
- **Rich text**: Tiptap 3 with a curated extension set.
- **Drag & drop**: `@hello-pangea/dnd` for the board, `@minoru/react-dnd-treeview` for the sidebar tree.
- **Calendar**: FullCalendar. **Gantt**: vendored `rc-gantt` (under `third-party/`).
- **i18n**: `@stacks/translations` + JSON files under `src/app/locale/`.
- **Tests**: Jest (configured but the test surface is thin — see "Conventions").

## 2. Boot sequence

[`src/index.tsx`](../src/index.tsx) is the entry. The order matters; read it once before changing it.

```
1. Polyfills (`app/utils/prototypes`)
2. Create the Blueprint toaster   → window.toaster
3. Create the realtime client     → window.updatePoller (connects to /ws)
4. await BootAPI.load()           → translations, license, preferences, aiChat
5. Hydrate stores                 → LicenseActions.setLicense / PreferencesActions.set / …
6. createRoot().render(<HashRouter><App /></HashRouter>)
```

Two implications you'll hit on day one:

- **There is no `<App />` before step 5.** Anything you put on the global window object inside a store/action will not have run yet at the top of `index.tsx`. Boot data goes through `BootAPI.load()` from the server's `/api/boot` endpoint.
- **`window.toaster` and `window.updatePoller` are real globals.** They're typed in `src/react-app-env.d.ts` and used throughout the app. Don't create your own — reuse these.

[`src/app/App.tsx`](../src/app/App.tsx) is mounted after that. It sets up `<DragDropProvider>`, the dark-mode body class, the `useUpdates()` realtime subscriptions, and the route table (`MainAppRoutes`).

## 3. Code layout

Everything lives under `src/app/`. The folders are not interchangeable — knowing which one to put a new file in is half the battle.

| Folder | What goes here |
| --- | --- |
| [`api/`](../src/app/api/) | One file per backend domain (`tasks.ts`, `projects.ts`, …). Each exports an `XAPI` object whose methods return `Promise<T>`. They all import from `./request`. **No React, no state.** |
| [`store/`](../src/app/store/) | One slice per domain. Each file declares an `entity<T>({...defaults})` and exports it as `XStore`. **No actions, no React.** |
| [`store/actions/`](../src/app/store/actions/) | One namespace per slice (`TasksActions`, `ProjectsActions`, …). Actions call `XStore.set(produce(...))`, dispatch API requests, and may call other actions. **All mutations to store state go through here.** |
| [`hooks/`](../src/app/hooks/) | Subscriber-side: `useTasks()`, `useProject()`, `useMe()`, etc. Wrap `XStore.use(selector, equality)` with derived data. Also home of cross-store getters like `getCurrentTaskId()` for use inside actions. |
| [`components/`](../src/app/components/) | Small, reusable, mostly presentational pieces — buttons, headers, common dialogs, the project board cell, etc. Folders are `PascalCase` matching the component name. |
| [`widgets/`](../src/app/widgets/) | Composed feature blocks: the calendar widget, the AI chat panel, the sidebar tree. Bigger than a component, smaller than a view. |
| [`views/`](../src/app/views/) | Top-level routed pages (`Home/`, `Project/`, `MyTasks/`, …). One folder per route group. The `Project/` folder contains sub-views (`Board`, `Gantt`, `Table`, `Time`, …). |
| [`utils/`](../src/app/utils/) | Stateless helpers — date math, color tokens, dialog wrappers, the `UpdatePoller` class itself, sound effects, storage shims. |
| [`icons/`](../src/app/icons/) | SVG sprite + the React `<Icon>` wrapper. Regenerate the sprite with `yarn workspace @stacks/app sprites` after adding an SVG to `packages/app/svg/`. |
| [`locale/`](../src/app/locale/) | Translation tables, keyed by locale code. Edit with [`@stacks/locales-tui`](../../../docs/packages/locales-tui.md). |
| [`styles/`](../src/app/styles/) | Global SCSS tokens, mixins, Blueprint overrides. Per-component styles live next to the component as `_X.scss`. |

**Import paths use `app/…`, not relative paths.** The webpack config sets `resolve.modules: [src/, node_modules/]`, so `import { TasksAPI } from "app/api"` and `import { useProject } from "app/hooks"` resolve from inside `src/`.

## 4. How to add a feature (worked example)

Say you want to add a new "Goals" page accessible at `#/goals`. Roughly:

1. **API client** — `src/app/api/goals.ts`:

    ```ts
    import { IGoal } from "@stacks/types";
    import request from "./request";

    export const GoalsAPI = {
        list: () => request.get<IGoal[]>("/api/goals"),
        create: (goal: Partial<IGoal>) => request.post<IGoal>("/api/goals", goal),
    };
    ```

    Re-export from [`src/app/api/index.ts`](../src/app/api/index.ts).

2. **Store slice** — `src/app/store/goals.ts`:

    ```ts
    import { entity } from "app/hooks/store";
    import { IGoal } from "@stacks/types";

    export interface IGoalsStore {
        isLoading: boolean;
        goals: IGoal[];
    }

    export const GoalsStore = entity<IGoalsStore>({
        isLoading: false,
        goals: [],
    });
    ```

3. **Actions** — `src/app/store/actions/goals.ts`:

    ```ts
    import { produce } from "immer";
    import { GoalsAPI } from "app/api";
    import { GoalsStore } from "app/store/goals";

    export const GoalsActions = {
        async load() {
            GoalsStore.set(produce(d => { d.isLoading = true; }));
            const goals = await GoalsAPI.list();
            GoalsStore.set(produce(d => { d.goals = goals; d.isLoading = false; }));
        },
    };
    ```

    Re-export from [`src/app/store/actions/index.ts`](../src/app/store/actions/index.ts).

4. **Hook** — `src/app/hooks/goals.ts`:

    ```ts
    import { shallowEqual } from "app/hooks/store";
    import { GoalsStore } from "app/store/goals";

    export const useGoals = () => GoalsStore.use(s => s.goals, shallowEqual);
    ```

    Re-export from [`src/app/hooks/index.ts`](../src/app/hooks/index.ts).

5. **View** — `src/app/views/Goals/Goals.tsx`:

    ```tsx
    import { useEffect } from "react";
    import { useGoals } from "app/hooks";
    import { GoalsActions } from "app/store/actions";

    export const Goals = () => {
        const goals = useGoals();
        useEffect(() => { GoalsActions.load(); }, []);
        return <ul>{goals.map(g => <li key={g.id} data-testid={`goal-${g.id}`}>{g.title}</li>)}</ul>;
    };
    ```

    Add an `index.ts` barrel in `views/Goals/` and re-export from [`src/app/views/index.ts`](../src/app/views/index.ts).

6. **Route** — add a line to `MainAppRoutes` in [`src/app/App.tsx`](../src/app/App.tsx):

    ```tsx
    <Route path="/goals" element={<Goals />} />
    ```

7. **Sidebar entry** — add a link in the appropriate place under `src/app/views/Sidebar/` so the user can actually reach the page.

8. **(Optional) Realtime** — if the server emits `POLLINGTYPE.GOAL` updates, register a listener in [`src/app/hooks/updates.ts`](../src/app/hooks/updates.ts) so the UI refreshes when other clients change goals. See [ARCHITECTURE.md → Real-time updates](ARCHITECTURE.md#real-time-updates).

A real PR would also add a `data-testid` on every interactive element (see [E2E conventions](../../../docs/E2E.md#conventions)) and a translation key for any user-visible string.

## 5. Useful commands

Run from the repo root:

```bash
yarn dev:app          # webpack dev server on :3001 (or yarn dev for full stack)
yarn build:app        # production webpack build → packages/app/build/
yarn workspace @stacks/app lint
yarn workspace @stacks/app test           # jest
yarn workspace @stacks/app analyze        # source-map-explorer over the built bundle
yarn workspace @stacks/app sprites        # regenerate the SVG icon sprite
```

`yarn dev:app:watch` is the same as `yarn dev:app` minus the upfront translations build — use it once translations are already built.

## 6. Conventions & gotchas

- **HashRouter, not BrowserRouter.** Internal links should be relative paths handled by `<Link to="…">`; the `#/` is implicit. If you paste `http://localhost:3000/project/foo` into a browser, the server won't know where to send you — the URL is `http://localhost:3000/#/project/foo`.
- **All mutations to store state go through actions.** Components never call `Store.set(...)` directly.
- **Selectors must pass `shallowEqual`** (or a custom equality) to `Store.use(...)` when they return an object/array, or you'll re-render on every store change.
- **Don't reach into a store inside a component without `.use()`.** `Store.get()` is for actions and getters; using it inside render won't subscribe the component to updates.
- **Dates round-trip automatically.** The Axios layer converts ISO strings → `Date` objects on response and `Date` → ISO on request. Don't manually `.toISOString()` in your API call sites unless you have a reason — see [API_CLIENT.md → Date round-tripping](API_CLIENT.md#date-round-tripping).
- **Errors auto-toast.** Any non-2xx response shows a Blueprint toast. Pass `{ silent: true }` to `request.<method>(..., { silent: true })` if you want to handle the error yourself. See [API_CLIENT.md → Error handling](API_CLIENT.md#error-handling).
- **`window.toaster.show({ message, intent })`** is the canonical way to surface a transient message to the user. Don't roll your own.
- **Dark mode is a body class.** Toggled in [`App.tsx`](../src/app/App.tsx) via `document.body.classList.toggle(Classes.DARK, darkMode)`. Style overrides should use Blueprint's `.bp6-dark` selector.
- **No CSS-in-JS.** Use SCSS modules / global SCSS in `_X.scss` files next to the component. Tokens live in [`src/app/_vars.scss`](../src/app/_vars.scss).
- **Tests are sparse.** Jest is wired up and `__tests__` folders exist next to a handful of hooks and utils. New logic in `utils/`, `hooks/`, and pure helpers should have a unit test; UI is covered by Playwright (see [E2E.md](../../../docs/E2E.md)).

## 7. FAQ

- **Why HashRouter?** The server serves the dev app at `/login` and `/` from the same origin, and HashRouter avoids needing the server to know every client-side route. It also means you can `file://` open a built bundle if you ever need to.
- **Why a custom entity store instead of Redux / Zustand?** It pre-dates them in this codebase and the API is small enough that switching costs more than it saves. The `entity()` factory is in [`src/app/hooks/store/entity.ts`](../src/app/hooks/store/entity.ts) — read it; it's ~100 lines.
- **Where does the user come from?** The server's `/api/boot` endpoint returns `{ translations, license, preferences, aiChat }`. The current user is read via the `useMe()` hook (which selects from `PeopleStore`). `PeopleActions.load()` is fired in `App.tsx`'s mount effect.
- **What is `window.updatePoller`?** A long-lived WebSocket client at `/ws`. It exposes `instanceId` (a UUID used as the `X-Instance-ID` header on every Axios request, so the server can tell which tab/client emitted a write) and an `on(section, callback)` subscription API used by [`useUpdates()`](../src/app/hooks/updates.ts) to keep stores in sync with server-side changes. See [ARCHITECTURE.md → Real-time updates](ARCHITECTURE.md#real-time-updates).
- **Why does my new component re-render constantly?** Most likely you used `Store.use(s => s.someObject)` without `shallowEqual`. Selectors that return objects or arrays need an equality check.
- **What's the Electron file for?** `src/electron.ts` is unused legacy. There is no Electron build target shipping today.
