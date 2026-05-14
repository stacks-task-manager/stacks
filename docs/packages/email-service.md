# `@stacks/email-service`

A background worker that compiles React Email templates and drains an outbound email queue over SMTP on a configurable interval.

## Environment

`packages/email-service/.env` from [`packages/email-service/env.example`](../../packages/email-service/env.example):

```bash
cp packages/email-service/env.example packages/email-service/.env
```

SMTP + service:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`
- `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`
- `EMAIL_PROCESS_INTERVAL` — queue poll interval in milliseconds
- `PUBLIC_URL` — used to build absolute links inside emails

Database (required — the service reads the queue from Postgres via `@stacks/db`):

- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

If SMTP isn't configured, the service starts in **idle mode** (no processing) until configuration is supplied and the process is restarted.

## Development

```bash
yarn dev:email           # full service in watch mode
yarn workspace @stacks/email-service dev:email  # template preview server on :3005
```

`yarn dev:email` runs the actual worker against your local Postgres and SMTP host. The `dev:email` workspace script (different name, same package) is React Email's preview server for editing templates in the browser.

## Local SMTP testing

Use a local mail-capture server so emails don't leak. Either of these works:

- **MailHog** — `docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog`
- **Mailpit** — `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit`

Point the service at it:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=dev@localhost
```

View captured mail at <http://localhost:8025>. To confirm the queue is draining, watch the service log output or check the `email_queue` table in Postgres for rows transitioning from `pending` to `sent`.

## Overview

- `src/index.ts` — entry point and main loop
- `src/templates/` — React Email components rendered to HTML
- `src/queue/` — queue read / mark-sent logic against `@stacks/db`
- `src/transport/` — Nodemailer transport setup

## Related

- [`@stacks/db`](db.md) — the `email_queue` table this service consumes
- [`@stacks/server`](server.md) — enqueues outbound mail
