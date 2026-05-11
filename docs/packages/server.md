# Server

**Purpose**

The Stacks backend server. It exposes HTTP APIs, serves static pages/assets, connects to Postgres via Sequelize, and provides real-time features (WebSockets).

**Environment**

Create `packages/server/.env` from [packages/server/env.example](../../packages/server/env.example):

```bash
cp packages/server/env.example packages/server/.env
```

Key variables:

-   `APP_PORT`: HTTP port (default `3000`)
-   `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: database connection
-   `DEBUG_DB`: set to `true` to enable Sequelize SQL logging
-   `COOKIE_SECRET`, `JWT_SECRET`: auth/session secrets
-   `DELETE_FILES`: whether file deletion via the API also deletes from disk

Optional variables used by the server:

-   `CORS_ORIGINS`: comma-separated list of allowed origins; if unset, CORS is permissive
-   `REQUIRE_SECRETS=1`: enforce strong secrets even outside production
-   AI (optional): `AI_OPENAI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_CHAT_ENABLED`, `AI_CHAT_AUTO_REDIRECT`

**License files (runtime)**

The licensing package looks for `public.pem` and `license.key` in the process working directory (`process.cwd()`), which matters for production/bundled runs.
