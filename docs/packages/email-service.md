# Email Service

**Purpose**

A background worker that compiles email templates and sends queued emails via SMTP on an interval.

**Environment**

Create `packages/email-service/.env` from [packages/email-service/env.example](../../packages/email-service/env.example):

```bash
cp packages/email-service/env.example packages/email-service/.env
```

SMTP + service variables:

-   `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`
-   `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`
-   `EMAIL_PROCESS_INTERVAL` (ms)
-   `PUBLIC_URL` (used to generate links inside emails)

Database variables (also required, because the service reads the queue from Postgres via `@stacks/db`):

-   `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

If SMTP is not configured, the service starts in an idle mode (no processing) until configuration is provided and the process is restarted.
