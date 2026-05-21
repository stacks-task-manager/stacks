# Docker / production deployment

Stacks ships a `docker-compose` setup that runs the API server, the email worker, a Postgres database, and a one-shot migration job out of a self-contained `releases/` bundle. This is the recommended path for self-hosted deployments. For local **development**, use `yarn dev` instead (see [INSTALLATION.md](INSTALLATION.md)).

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Build the `releases/` bundle](#1-build-the-releases-bundle)
- [2. Configure the runtime](#2-configure-the-runtime)
- [3. Start the stack](#3-start-the-stack)
- [Common operations](#common-operations)
- [Troubleshooting](#troubleshooting)
- [Security checklist before going live](#security-checklist-before-going-live)

## Prerequisites

- Docker and Docker Compose
- A valid `license.key` (see [`packages/license.md`](packages/license.md))

## 1. Build the `releases/` bundle

```bash
yarn release
```

`yarn release` (defined in [`package.json`](../package.json)) cleans, installs, builds every package, copies the server + app + email-service bundles into `releases/`, and drops the Docker assets (`docker-compose.yml`, the three Dockerfiles, `.env.example`) next to them.

## 2. Configure the runtime

From the `releases/` directory, copy the example env file and fill it in:

```bash
cd releases
cp .env.example .env
```

At minimum, set:

| Variable | Notes |
| --- | --- |
| `POSTGRES_PASSWORD` | Use a strong value, not the default |
| `COOKIE_SECRET` | `openssl rand -hex 32` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `SMTP_*` | Real SMTP host/credentials, or a local capture server for staging |
| `PUBLIC_URL` | The public HTTPS URL users will hit |

Also drop your license file next to the compose file:

```bash
cp /path/to/license.key license.key
```

The `stacks` service mounts it read-only into the container at `/server/license.key`.

## 3. Start the stack

```bash
docker-compose up -d --build      # or `yarn run:docker` from the repo root
```

What runs (see [`docker/docker-compose.yml`](../docker/docker-compose.yml)):

| Service | Image / Dockerfile | Ports | Purpose |
| --- | --- | --- | --- |
| `postgres` | `postgres:15-alpine` | internal | Database; data persisted in `./data/db` |
| `migration` | `Dockerfile.migration` | — | One-shot job; runs migrations then exits |
| `stacks` | `Dockerfile.server` | `3000:3000` | The API server (serves the web app from the same port) |
| `email` | `Dockerfile.email` | internal | Email queue worker |

Volumes (created automatically under `releases/`):

- `./data/db` — Postgres data
- `./data/uploads` — file uploads
- `./data/previews` — generated previews
- `./logs` — service logs

Boot order is enforced by health checks: `postgres` becomes healthy → `migration` runs to completion → `stacks` and `email` start.

## Common operations

```bash
docker-compose logs -f stacks       # tail the API server logs
docker-compose logs -f email        # tail the email worker logs
docker-compose ps                   # service health and status
docker-compose down                 # stop everything (data preserved)
docker-compose down -v              # ⚠️ stop and delete all volumes
```

Backup / restore the database (run from `releases/`):

```bash
docker-compose exec postgres pg_dump -U postgres "$POSTGRES_DB" > backup.sql
docker-compose exec -T postgres psql -U postgres "$POSTGRES_DB" < backup.sql
```

## Troubleshooting

| Symptom | First thing to check |
| --- | --- |
| `stacks` container restarts in a loop | `docker-compose logs stacks` — almost always a missing/invalid `license.key` or bad Postgres credentials |
| Port `3000` already in use on the host | Change the left side of the port mapping in `docker-compose.yml` (e.g. `"3010:3000"`) and `PUBLIC_URL` to match |
| Migration container exits non-zero | `docker-compose logs migration` — schema is out of sync or Postgres unreachable |
| Email worker silent | Confirm `SMTP_*` is correctly set in `.env`; the worker idles silently when SMTP is unconfigured |
| Email actually doesn't ship | Check `email_queue` rows in Postgres for stuck `pending` entries; see [`packages/email-service.md`](packages/email-service.md) |

## Security checklist before going live

- Regenerate `COOKIE_SECRET` and `JWT_SECRET` (`openssl rand -hex 32` each)
- Set a strong `POSTGRES_PASSWORD`
- Run the stack behind a reverse proxy (nginx / Caddy / Traefik) that terminates TLS
- Configure `CORS_ORIGINS` to only your domain(s)
- Set `STACKS_SOURCE_URL` to your fork's repo (AGPL §13 source disclosure)
- Consider Docker secrets or a secrets manager rather than a plain `.env`
