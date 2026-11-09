# Database — Agent Instructions

Applies to `packages/db/`. Read the [root rules](../../AGENTS.md) and
[database guide](../../docs/packages/db.md) before editing.

- Models belong in `src/entities/`; migrations in `migrations/`; seeds in `seeders/`.
- Never hand-edit `migrations/000_init_schemas.cjs`: the build regenerates it from
  `src/init_schema.ts`. Add a new migration for schema changes.
- Use the established zero-padded numeric migration order (`001_…`, `002_…`). Migration files
  need `.cjs` because this workspace is `"type": "module"`.
- Wrap multi-statement migrations in transactions. Keep models and migrations consistent and
  provide a meaningful `down` path when the operation is reversible.
- Shared entity types belong in `@stacks/types`. Run `yarn build:internal` after database/type
  changes before using dependent processes.
- Validate migrations against a disposable database when needed; do not reset, seed, undo, or
  drop a shared database as an incidental verification step.

Run from the repository root, against the intended development database:

| Purpose                         | Command                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Generate migration skeleton     | `yarn workspace @stacks/db migrate:create --name=<slug>`                         |
| Apply / inspect migrations      | `yarn workspace @stacks/db migrate` / `yarn workspace @stacks/db migrate:status` |
| Load demo data (writes records) | `yarn workspace @stacks/db demo:install`                                         |
| Development password reset      | `yarn workspace @stacks/db reset-password:dev`                                   |

Generation may produce a timestamped filename: inspect and rename it to match the numeric order.
Read the database guide before running seed/undo operations; they can remove data.
