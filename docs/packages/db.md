# DB

**Purpose**

The database layer for Stacks: Sequelize models/entities, schema initialization, migrations, and demo seed data. It is consumed by `@stacks/server` and `@stacks/email-service`.

**Environment**

This package reads the standard Postgres variables. You can create `packages/db/.env` from [packages/db/env.example](../../packages/db/env.example) when running DB tooling directly:

```bash
cp packages/db/env.example packages/db/.env
```

Variables:

-   `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
-   `DEBUG_DB=true` (optional) to enable SQL logging (used by Sequelize config)
