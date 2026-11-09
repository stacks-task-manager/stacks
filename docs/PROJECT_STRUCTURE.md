# Project structure and documentation ownership

Stacks keeps implementation in Yarn workspaces, cross-project guides in `docs/`, and implementation
deep dives beside the relevant package. This map describes the current layout and where new work belongs;
it does not require moving existing source files.

## Repository map

```text
AGENTS.md                 Shared agent rules and entry point
README.md                 Product overview and quick start
CONTRIBUTING.md            Contribution, branch, and review policy
docs/
  README.md               Documentation index
  PROJECT_STRUCTURE.md    This map and documentation ownership
  AGENT_WORKFLOW.md       Acceptance criteria and completion evidence
  INSTALLATION.md         Environment setup and troubleshooting
  E2E.md                  Playwright workflow and conventions
  packages/               One overview per workspace
packages/
  app/                    React web client; scoped AGENTS.md and docs/
  server/                 Hono API; scoped AGENTS.md and docs/
    locales/              UI/API locale tables and locale-specific AGENTS.md
  db/                     Sequelize models, migrations, seeds; scoped AGENTS.md
  types/                  Shared entity shapes
  translations/           Runtime translation/interpolation library
  locales-tui/            Locale editing and integrity tools
  mobile/                 Expo / React Native client
  email-service/          Outbound mail worker and email templates
  license/                Development license verification
playwright/               Specs, POMs, fixtures; scoped AGENTS.md
scripts/                  Repository maintenance and release helpers
docker/                   Container and Compose configuration
third-party/              Vendored dependencies
graft/                    Generated repository context graph
```

Generated output and runtime data are not new source locations. Build/release output, dependency
directories, test reports, uploads, `.env` files, and license keys must not be included in a source change
merely because they appear during development. Follow `.gitignore` and inspect the diff before staging.

## Where implementation belongs

| Concern                                   | Location and boundary                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Shared entity contracts                   | `packages/types/src/models/`; use `@stacks/types` across consumers                                                      |
| Database schema/storage                   | `packages/db/src/entities/`, `migrations/`, `seeders/`; keep models and migrations aligned                              |
| API validation                            | `packages/server/src/routes/schema/`                                                                                    |
| HTTP endpoints                            | `packages/server/src/routes/`; register protected domains through `mountAuthenticated()`                                |
| Database access and server write behavior | `packages/server/src/loaders/`; use documented transaction, permission, cache, and realtime contracts                   |
| Web API calls                             | `packages/app/src/app/api/`; shared Axios client, one domain module per area                                            |
| Web state                                 | `packages/app/src/app/store/`; mutations through `store/actions/`, subscriptions through `hooks/`                       |
| Web presentation                          | `components/` for reusable UI, `widgets/` for composed blocks, `views/` for routed pages, under `packages/app/src/app/` |
| UI/API translated copy                    | `packages/server/locales/app/` and `server/`; edit through `@stacks/locales-tui`                                        |
| Runtime translation behavior              | `packages/translations/`; do not put locale editing logic here                                                          |
| Browser tests                             | `playwright/tests/` for scenarios, `pages/` for DOM interaction/assertions, `fixtures/` for lifecycle/setup             |

See the [package guides](README.md#per-package-docs) and scoped instructions for complete conventions.
Keep additions inside existing domain boundaries. Propose broad source moves as a separate task with
an import/dependency and test impact assessment, rather than mixing them into a feature or bug fix.

## Documentation ownership

| Document                                                | Owns                                                         | Keep elsewhere                                 |
| ------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| Root `AGENTS.md`                                        | Shared invariants, task routing, common commands             | Detailed onboarding and repeated package rules |
| Scoped `AGENTS.md`                                      | Local constraints, file placement, verification expectations | General policies already in the root           |
| `docs/AGENT_WORKFLOW.md`                                | Completion/review loop and evidence standards                | Package-specific API examples                  |
| `docs/README.md`                                        | Discovery links to maintained guides                         | Duplicated setup procedures                    |
| `docs/packages/<workspace>.md`                          | Workspace purpose, scripts, entry points                     | Long subsystem explanations                    |
| `packages/<workspace>/docs/`                            | Onboarding and implementation deep dives                     | Global contribution policy                     |
| `CONTRIBUTING.md`                                       | Branch, PR, review, and commit policy                        | Package-specific implementation rules          |
| `docs/INSTALLATION.md`, `docs/DOCKER.md`, `docs/E2E.md` | Environment, deployment, and browser-test procedures         | Competing copies of those procedures           |

When behavior changes, update the document that owns it and repair its index description if needed.
When extracting rules into a scoped file, preserve the constraints and link it from the root; do not
leave a conflicting copy. Keep `AGENTS.md` instructions usable without locally installed personal skills.

Treat source and configuration as the authority for runtime facts. Check routing, ports, env template
names, test discovery, and script names before repeating them in docs. Preserve tool-managed sections
such as the Graft markers when reorganizing instructions.
