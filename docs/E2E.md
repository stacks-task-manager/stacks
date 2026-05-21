# E2E testing with Playwright

End-to-end tests live at `playwright/` (repo root) and are driven by [Playwright](https://playwright.dev/). They exercise the running web app at `http://localhost:3000` through Chrome. The base URL assumes the default `APP_PORT=3000`; if you've changed it in `packages/server/.env` you'll need to override `webServer.url` and the test baseURL to match (see [INSTALLATION.md](INSTALLATION.md#2-open-the-app)).

## Table of Contents

- [Setup](#setup)
- [Running the suite](#running-the-suite)
- [Test layout](#test-layout)
- [Conventions](#conventions)
    - [1. Selectors must use `data-testid`](#1-selectors-must-use-data-testid)
    - [2. All DOM access goes through a Page Object Model (POM)](#2-all-dom-access-goes-through-a-page-object-model-pom)
    - [3. Reusable actions belong on the POM](#3-reusable-actions-belong-on-the-pom)
- [Writing a new test](#writing-a-new-test)
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

The dev server is started automatically. From `playwright.config.ts`:

```ts
webServer: {
  command: "yarn dev:app",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
}
```

Locally, if you already have `yarn dev` running, Playwright reuses it. In CI it always launches its own.

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

Specs never call `page.getByTestId(...)`, `page.locator(...)`, `page.click(...)`, or any other Playwright DOM API directly. They only call methods on POM classes in `playwright/pages/`. Specs should read like a short description of user intent; the POM owns *how* that intent is realized.

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
        return this.page
            .getByTestId(`stack-${stackName}`)
            .getByTestId(`card-${cardTitle}`);
    }

    async dragCardToStack(cardTitle: string, targetStackName: string) {
        // implementation lives here, not in the spec
    }
}
```

### 3. Reusable actions belong on the POM

If a flow (logging in, opening a project, creating a task, dragging a card, asserting a toast) is needed in more than one spec — or is more than two or three clicks long — put it on the POM as a named method. Specs should be a short list of those method calls plus assertions.

Good rule of thumb: **the spec should read like English; the POM is the dictionary.**

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
5. `yarn test:e2e`
6. Upload `html-report/`, `results/reports/playwright.xml`, and `test-results/` (traces / videos) as artifacts.

## License caveat

The specs don't read `license.key`, but the API server they hit does — so the dev license requirement still applies. See [`docs/packages/license.md`](packages/license.md) for details.
