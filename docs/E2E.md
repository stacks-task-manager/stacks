# E2E testing with Playwright

End-to-end tests live at `playwright/` (repo root) and are driven by [Playwright](https://playwright.dev/). They exercise the running web app at `http://localhost:3000` through Chrome. The base URL assumes the default `APP_PORT=3000`; if you've changed it in `packages/server/.env`, override the Playwright `baseURL` to match (see [INSTALLATION.md](INSTALLATION.md#2-open-the-app)). Keep `webServer.url` on port 3001 because it tracks the hardcoded frontend dev server.

## Table of Contents

- [Setup](#setup)
- [Running the suite](#running-the-suite)
- [Test layout](#test-layout)
- [Conventions](#conventions)
- [Agent workflow](#agent-workflow)
- [Writing a new test](#writing-a-new-test)
- [Editing an existing test](#editing-an-existing-test)
- [Mocking APIs and isolating state](#mocking-apis-and-isolating-state)
- [Debugging](#debugging)
- [CI](#ci)
- [License caveat](#license-caveat)

## Setup

E2E tests need everything a normal dev environment needs (Node, Yarn, Postgres, the `.env` files, the dev license at `packages/server/license.key`) — see [INSTALLATION.md](INSTALLATION.md) once and come back here.

On top of that, install the Playwright browser binaries once:

```bash
yarn playwright install chromium
```

## Running the suite

From the repo root:

```bash
yarn test:e2e          # headless run
yarn test:e2e:ui       # interactive Playwright UI mode (great for authoring)
yarn test:e2e:headed   # headed Chromium so you can watch
```

The API server must already be running on port 3000. Playwright starts (or reuses) only the web app
dev server on port 3001; browser traffic still goes through the API server at
`http://localhost:3000`.

Start the API in one terminal:

```bash
yarn dev:server
```

Then run Playwright in another terminal. Alternatively, keep `yarn dev` running and Playwright will
reuse its frontend process. The relevant `playwright.config.ts` settings are:

```ts
use: {
  baseURL: "http://localhost:3000",
},
webServer: {
  command: "yarn dev:app",
  url: "http://localhost:3001",
  reuseExistingServer: !process.env.CI,
}
```

If authentication fails with `ERR_CONNECTION_REFUSED` for `http://localhost:3000/login`, the API
server is not ready. Check the database, environment files, and development license before changing
the test.

### Auth feature flags

Registration and password recovery are opt-in. To run their specs
(`playwright/tests/auth/registration.spec.ts` and `playwright/tests/auth/password-recovery.spec.ts`),
the server must be running with those features enabled in `packages/server/.env`:

```bash
REGISTRATION_ENABLED=true
PASSWORD_RECOVERY_ENABLED=true
```

Both default to `false` (see `packages/server/env.example`). The specs skip nothing and fail with a
403 if the flags are off, because the auth pages themselves render only when the feature is enabled.
These settings are never committed — they live in your local, git-ignored `.env`.

## Test layout

```
playwright/
├── auth.setup.ts          # logs in and stores session into .auth/user.json
├── config/                # shared globals (viewport, users, etc.)
├── fixtures/              # custom Playwright fixtures (login, bootstrap context, video)
├── pages/                 # page object models (app, project, boardView, taskDetails, sidebar, …)
├── utils/                 # helpers
└── tests/
    ├── auth/auth.spec.ts
    ├── sidebar/sidebar.spec.ts
    └── project/
        ├── board-view.spec.ts
        └── task-details.spec.ts
```

The config defines two projects: a `setup` project that runs `auth.setup.ts` to seed an authenticated `storageState`, and a `chrome` project that depends on it and runs the actual specs in Desktop Chrome viewport.

## Conventions

These three rules are non-negotiable. Reviewers will ask you to fix violations before merging.

### 1. Selectors must use `data-testid`

Never select by tag, class, text, role, or CSS path inside a spec or page object. The DOM, copy, and styling change far too often. Every element a test touches must carry a stable `data-testid` attribute applied in the React component, and tests must locate it via `page.getByTestId(...)`.

```tsx
// In the app component
<button data-testid="task-create-button" onClick={...}>Add task</button>
```

```ts
// Inside the page object — never inside the spec
this.createButton = page.getByTestId("task-create-button");
```

If the element you need to interact with does not yet have a `data-testid`, **add one in the component** as part of the same PR — don't fall back to a text or CSS selector "just for now."

### 2. All DOM access goes through a Page Object Model (POM)

Specs never call `page.getByTestId(...)`, `page.locator(...)`, `page.click(...)`, or any other Playwright DOM API directly. They only call methods on POM classes in `playwright/pages/`. Specs should read like a short description of user intent; the POM owns _how_ that intent is realized.

A POM class follows this shape:

```ts
// playwright/pages/boardView.ts
import type { Page, Locator } from "@playwright/test";

export class BoardViewPage {
  readonly page: Page;
  readonly board: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.board = page.getByTestId("board-view");
    this.createButton = page.getByTestId("task-create-button");
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}`);
    await this.board.waitFor();
  }

  cardIn(stackName: string, cardTitle: string): Locator {
    return this.page.getByTestId(`stack-${stackName}`).getByTestId(`card-${cardTitle}`);
  }

  async dragCardToStack(cardTitle: string, targetStackName: string) {
    // implementation lives here, not in the spec
  }
}
```

### 3. Reusable actions belong on the POM

If a flow (logging in, opening a project, creating a task, dragging a card, asserting a toast) is needed in more than one spec — or is more than two or three clicks long — put it on the POM as a named method. Specs should be a short list of those method calls plus assertions.

Good rule of thumb: **the spec should read like English; the POM is the dictionary.**

## Agent workflow

For an agent adding or changing E2E coverage, use this sequence:

1. Read this guide, then inspect the closest existing spec in `playwright/tests/`, its POM in
   `playwright/pages/`, and the React component being exercised.
2. Define the observable user outcome. Prefer a real cross-layer flow when server behavior is under
   test; use a route mock when the test is specifically about deterministic UI states.
3. Add stable `data-testid` attributes to every element the flow touches. Dynamic IDs should contain
   a stable entity ID, not translated copy or an array index.
4. Put selectors, clicks, waits, and DOM assertions in the POM. Put only user-intent calls and
   non-DOM result assertions in the spec.
5. Restore route mocks, preferences, dialogs, and other state after the scenario, including when an
   assertion fails. Existing suites often reuse a page/context through `beforeAll`.
6. Format the touched files, type-check Playwright, run the focused test, then run the containing
   feature spec.

```bash
yarn prettier --write <component> <page-object> <spec>
yarn type-check:e2e
yarn test:e2e playwright/tests/<feature>/<name>.spec.ts --grep "scenario name"
yarn test:e2e playwright/tests/<feature>/<name>.spec.ts
```

## Writing a new test

Look at `playwright/tests/project/board-view.spec.ts` for an idiomatic example. The pattern:

1. Use a POM from `playwright/pages/` — never raw `page.locator` / `page.getByTestId` in the spec.
2. Use the fixtures from `playwright/fixtures/` for login or bootstrap state.
3. Place the spec under `playwright/tests/<feature>/<name>.spec.ts`.
4. If you need a new selector, add a `data-testid` to the component and a method/locator to the POM in the same PR.

```ts
import { test, expect } from "@playwright/test";
import { BoardViewPage } from "../../pages/boardView";

test("a card moves between stacks", async ({ page }) => {
  const board = new BoardViewPage(page);
  await board.goto("project-id");
  await board.dragCardToStack("Task 1", "Doing");
  await expect(board.cardIn("Doing", "Task 1")).toBeVisible();
});
```

Notice that the spec contains no DOM details, no selectors, and no Playwright primitives beyond `test` / `expect`. All of that lives in `BoardViewPage`.

Use unique data for records created against the real API (for example, a `Date.now()` suffix). Do not
depend on test execution order unless the enclosing suite explicitly shares state and documents that
choice. A focused test must be runnable on its own.

## Editing an existing test

Before editing, trace the whole testing seam: component `data-testid` → POM locator/method → spec.
Keep established test-ID prefixes and extend the existing POM instead of creating a second POM for
the same view. If a selector is brittle, fix the component hook and POM together. Do not move DOM
access into the spec as a shortcut.

Run the changed scenario with `--grep`, then run the complete spec because shared contexts, route
mocks, local storage, and preferences can leak between otherwise passing tests.

## Mocking APIs and isolating state

Route mocks belong in the POM or a reusable fixture, not inline in a spec. Match both the HTTP method
and endpoint, return the same `{ success, data }` envelope as the API, and let unrelated requests
continue. Remove handlers with `page.unroute(...)` after the scenario; prefer `afterEach` or
`try/finally` when a failed assertion could otherwise leave a mock active.

Mock only what the scenario needs. Approval, authorization, notification, persistence, and other
server contracts should have server tests or a real E2E path; a mocked UI test cannot prove those
behaviors.

## Debugging

- `yarn test:e2e --debug` — Playwright Inspector (step through, pause, eval).
- `yarn test:e2e:headed` — headed Chromium for visual debugging.
- `yarn test:e2e --trace on` — record a trace; open with `yarn playwright show-trace trace.zip`.
- HTML report is written to `html-report/` after every run. Open with `yarn playwright show-report html-report`.
- JUnit XML and JSON reports are emitted to `results/reports/playwright.xml` and `playwright.json` for CI consumption.

## CI

This repository does not yet ship a GitHub Actions workflow. When one is added, the recommended job shape is:

1. Spin up Postgres as a service container.
2. Provide `license.key` from a repository secret.
3. `corepack enable && yarn install && yarn setup`
4. `yarn playwright install --with-deps chromium`
5. Start `yarn dev:server` and wait for `http://localhost:3000/health` to succeed.
6. `yarn test:e2e` (Playwright starts the frontend on port 3001).
7. Upload `html-report/`, `results/reports/playwright.xml`, and `test-results/` (traces / videos) as artifacts.

## License caveat

The specs don't read `license.key`, but the API server they hit does — so the dev license requirement still applies. See [`docs/packages/license.md`](packages/license.md) for details.
