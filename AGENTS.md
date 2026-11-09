# Stacks — Agent Instructions

Stacks is a local-first project manager: a Yarn workspaces monorepo with React, Hono,
Sequelize/PostgreSQL, Expo, and shared TypeScript types.

## Navigation map

```text
AGENTS.md                         Shared rules and commands
docs/
  README.md                       Documentation index
  PROJECT_STRUCTURE.md            Detailed project map and ownership
  AGENT_WORKFLOW.md               Completion and verification workflow
packages/
  app/AGENTS.md                   Web client rules
  server/AGENTS.md                API and loader rules
    locales/AGENTS.md             Translation rules
  db/AGENTS.md                    Database rules
playwright/AGENTS.md               Browser testing rules
```

Use the links below to open the relevant instructions. For source layout and file placement,
see the [detailed project map](docs/PROJECT_STRUCTURE.md); use Graft to locate specific code.

## Start here

1. Read this file and the scoped `AGENTS.md` files for every area you touch (linked below).
   Scoped rules supplement these shared rules; read both for cross-package changes.
2. Inspect `git status --short`, staged and unstaged diffs, and relevant untracked files.
   Preserve existing work and staging. Do not reset files, overwrite another agent's work,
   or stage unrelated changes.
3. Use the Graft workflow below for code discovery, then read the task-specific docs before editing.
4. Define observable acceptance criteria and complete the implementation/verification loop in
   [Agent workflow](docs/AGENT_WORKFLOW.md). For review-only requests, inspect and report without changes.

## Find the right instructions

| Area                                 | Scoped instructions                                    | Required documentation                                                                                                          |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Web app                              | [packages/app/AGENTS.md](packages/app/AGENTS.md)       | [App guide](docs/packages/app.md), [onboarding](packages/app/docs/ONBOARDING.md); architecture/API client when relevant         |
| Server routes and loaders            | [packages/server/AGENTS.md](packages/server/AGENTS.md) | [Server guide](docs/packages/server.md), [onboarding](packages/server/docs/ONBOARDING.md), relevant subsystem guide             |
| Database                             | [packages/db/AGENTS.md](packages/db/AGENTS.md)         | [Database guide](docs/packages/db.md)                                                                                           |
| E2E tests                            | [playwright/AGENTS.md](playwright/AGENTS.md)           | [E2E guide](docs/E2E.md), nearest spec/POM, component under test                                                                |
| Locale files or translation calls    | [Locale rules](packages/server/locales/AGENTS.md)      | [Translations](docs/packages/translations.md), [locale tooling](docs/packages/locales-tui.md)                                   |
| Other workspaces                     | This file                                              | Matching guide in [docs/packages/](docs/packages/) and package scripts/README, if present                                       |
| Documentation and agent instructions | This file                                              | [Documentation index](docs/README.md), [project map](docs/PROJECT_STRUCTURE.md), source/configuration behind any changed claims |

The [project map](docs/PROJECT_STRUCTURE.md) explains ownership and where new files belong.
The [documentation index](docs/README.md) links the detailed guides. Read only the guides relevant to the task.

## Environment and runtime invariants

- Node.js 22.12+, Yarn 3.6.4 (`corepack enable`), PostgreSQL 15.
- First-time setup: follow [INSTALLATION.md](docs/INSTALLATION.md). `yarn setup` performs a **clean**
  install and builds internal packages; do not rerun it automatically in a working environment.
- Required env templates: `packages/db/env.example` and `packages/server/env.example`.
  Optional email template: `packages/email-service/env.example`. Copy only when the target `.env`
  does not exist; never overwrite configured secrets.
- The server exits if `packages/server/license.key` is missing or invalid. Obtain a development
  key through the [dev program](https://getstacksapp.com/dev-program/); never bypass verification.
- Webpack must run on **3001**: the server's `/app/*` and `/static/*` proxy target is hardcoded.
  Do not change that port or terminate an unrelated process to free it without authorization.
- Access the UI through `http://localhost:<APP_PORT>/login` (default **3000**), never port 3001.
  The app uses `BrowserRouter` with basename `/app`; old hash routes are normalized at boot.
- `@stacks/types` owns shared entity shapes. After changing types or database code, run
  `yarn build:internal` before starting dependent processes.

## Commands and verification

Run from the repository root. Package scripts and configs are the source of truth.

| Purpose                              | Command                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| Full development / server / web app  | `yarn dev` / `yarn dev:server` / `yarn dev:app`                    |
| Other clients/workers                | `yarn dev:mobile` / `yarn dev:email`                               |
| Internal packages / production build | `yarn build:internal` / `yarn build`                               |
| Server tests / server unit tests     | `yarn test:server` / `yarn test:server:unit`                       |
| Web app unit tests                   | `yarn workspace @stacks/app test`                                  |
| Web app type check                   | `yarn workspace @stacks/app tsc --noEmit`                          |
| Playwright type check                | `yarn type-check:e2e`                                              |
| Focused E2E spec                     | `yarn test:e2e playwright/tests/<area>/<name>.spec.ts --retries=0` |
| Web app lint                         | `yarn lint`                                                        |
| Format touched files                 | `yarn prettier --write <files>`                                    |
| Check touched formatting             | `yarn prettier --check <files>`                                    |

Format every changed source/doc file with Prettier. Prefer targeted formatting to keep the diff surgical;
`yarn format` formats the whole repository and is appropriate only when that scope is intended.
Use `.prettierrc` and `.editorconfig`: double quotes, semicolons, ES5 trailing commas, width 110,
and 4-space code indentation (Markdown/YAML formatting follows the Prettier overrides).

Choose checks proportional to the change using [Agent workflow](docs/AGENT_WORKFLOW.md#verification).
Do not start services, reinstall dependencies, or run the full suite for a documentation-only change.

## Shared implementation rules

- Keep the minimum change that satisfies the request. No speculative features, abstractions,
  dependencies, adjacent refactors, or pre-existing dead-code cleanup. Remove orphans created by your changes.
- State material assumptions; ask when ambiguity would change the result. Check project docs before
  asking about internals. Complete independent work while waiting for a needed decision.
- Add regression coverage for bug fixes where practical. New pure app hook/utility logic needs unit tests.
  Distinguish required behavior from optional polish; do not silently defer required work.
- Use `@stacks/types` for shared type imports. Follow the existing domain boundaries and local style.
- For translations, use `@stacks/locales-tui`, not hand-edited JSON. Read the
  [locale rules](packages/server/locales/AGENTS.md) before adding translation keys anywhere.
- Restore state changed by tests and keep test data scoped. Do not copy baseline code into a shared
  running checkout for regression experiments; isolate the checkout and execution environment.
- Report executed checks separately from inspected reports and unverified claims. Do not call a failing
  check pre-existing solely because its error points outside the diff. See the completion criteria in
  [Agent workflow](docs/AGENT_WORKFLOW.md#completion-and-reporting).

## Git, security, and operations

- Follow [CONTRIBUTING.md](CONTRIBUTING.md): normal PRs target `dev`, one feature/fix per PR,
  at least one maintainer approval. Hotfixes follow its documented exception.
- Squash-merge into `dev`; use a merge commit into `main`. Do not commit, push, or merge unless requested.
- Commit format: `type: short description` (max 72 characters). Types: `feat`, `fix`, `docs`,
  `refactor`, `test`, `chore`, `hotfix`. Branch conventions are in the contributing guide.
- Never commit `.env`, `license.key`, dependency/build output (`node_modules/`, `dist/`, `build/`),
  test artifacts, or unrelated local tooling. Untracked is not the same as ignored; inspect before staging.
- Never expose `COOKIE_SECRET`, `JWT_SECRET`, or other credentials in logs, reports, or commits.
  Report vulnerabilities using [SECURITY.md](SECURITY.md), not a public issue.
- `reset-password:dev` is development-only and refuses `NODE_ENV=production`.
- Docker setup is in [DOCKER.md](docs/DOCKER.md); E2E prerequisites and the proposed CI sequence are
  in [E2E.md](docs/E2E.md). Deployment and destructive database operations require task authorization.

<!-- graft:start -->

## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).

<!-- graft:end -->
