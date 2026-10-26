# Docker / production deployment

Stacks ships a `docker-compose` setup that runs the API server, the email worker, a Postgres database, and a one-shot migration job out of a self-contained `releases/` bundle. This is the recommended path for self-hosted deployments. For local **development**, use `yarn dev` instead (see [INSTALLATION.md](INSTALLATION.md)).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Build the releases bundle](#1-build-the-releases-bundle)
- [Configure the runtime](#2-configure-the-runtime)
- [Start the stack](#3-start-the-stack)
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

| Variable                | Notes                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`     | Strong bootstrap password used only by Postgres initialization, migrations, and role setup  |
| `POSTGRES_APP_USER`     | Restricted database role for the API and email worker (default `stacks_app`)                |
| `POSTGRES_APP_PASSWORD` | Strong password for the restricted API and email-worker database account                    |
| `COOKIE_SECRET`         | `openssl rand -hex 32`                                                                      |
| `JWT_SECRET`            | `openssl rand -hex 32`                                                                      |
| `SMTP_*`                | Real SMTP host/credentials, or a local capture server for staging                           |
| `PUBLIC_URL`            | The public HTTPS URL users will hit                                                         |
| `STACKS_BIND_ADDRESS`   | Host interface for the API port; defaults to `127.0.0.1` and should stay private behind TLS |

For SMTP submission using STARTTLS (typically port 587 with `SMTP_SECURE=false`), set
`SMTP_REQUIRE_TLS=true` to reject delivery when the SMTP server does not offer STARTTLS.
`SMTP_TLS_REJECT_UNAUTHORIZED` defaults to `true` and controls certificate verification.
The email service explicitly forwards these settings from `.env`, along with
`SMTP_MAX_CONNECTIONS`, `EMAIL_MAX_ATTEMPTS`, `EMAIL_CLAIM_LEASE_MS`, and `EMAIL_SEND_CONCURRENCY`.

The server, email worker, and migration job run as the unprivileged `node` user (UID/GID 1000 by
default). Set `STACKS_UID` and `STACKS_GID` in `.env` to the host account that owns the persistent
server directories and license file. Prepare those paths before the first start; for example, on a
Linux host:

```bash
mkdir -p data/uploads data/previews logs
sudo chown -R "$(id -u):$(id -g)" data/uploads data/previews logs
```

Set `STACKS_UID`/`STACKS_GID` in `.env` to the values from `id -u` and `id -g`. The server image
keeps Chromium's browser files readable by the unprivileged process. Server logs are also available
through `docker-compose logs`; no root process is needed to access the mounted log directory.

Also drop your license file next to the compose file:

```bash
cp /path/to/license.key license.key
sudo chown "$(id -u):$(id -g)" license.key
chmod 0400 license.key
```

The `stacks` service mounts it read-only into the container at `/server/license.key`.

Compose binds the HTTP port to `127.0.0.1` by default so external clients cannot bypass the TLS
reverse proxy. If the proxy runs in a separate container or on another host, set
`STACKS_BIND_ADDRESS` to an address reachable by that proxy and restrict access with the host firewall;
keep TLS termination at the proxy and do not expose the plain HTTP port directly to the internet.

The `role-bootstrap` one-shot service provisions `POSTGRES_APP_USER` (default `stacks_app`) with
table and sequence access needed by the API and email worker, while denying database, role, and
schema creation privileges. It also removes legacy `CREATE` access on the public schema granted to
`PUBLIC`, so inherited schema permissions cannot bypass the app role's restriction. `POSTGRES_USER`
and `POSTGRES_PASSWORD` remain the database bootstrap
credentials for migrations and role provisioning; the API and email worker receive only the
application credentials. Migrations grant the application role access to tables and sequences they
create. PostgreSQL has no published host port in the Compose configuration.

The API container also runs with a read-only root filesystem, all Linux capabilities dropped, and
`no-new-privileges`. Only the uploads, previews, and logs bind mounts are persistent and writable;
`/tmp` and Chromium's cache use bounded ephemeral tmpfs mounts. In the Docker profile used for runtime
verification, Chromium could not start with its kernel sandbox enabled (`No usable sandbox`), so PDF
rendering currently uses Playwright's no-sandbox mode. JavaScript is disabled, network requests are
blocked, and the renderer shares the API container's remaining privileges; treat this as partial
containment and use a separately sandboxed renderer environment when processing hostile content in a
higher-risk deployment.

After building the release bundle, run `./scripts/test-runtime-security.sh ./releases runtime` from
the repository root to build all three images, verify their runtime UID and server mount access, check
the Compose privilege restrictions, exercise the restricted database role against a temporary
PostgreSQL instance, and render a small PDF in Chromium with the same read-only, capability, and
temporary-storage restrictions as the service. The script removes its test containers, network,
temporary files, and images when it exits.

## 3. Start the stack

```bash
docker-compose up -d --build      # or `yarn run:docker` from the repo root
```

What runs (see [`docker/docker-compose.yml`](../docker/docker-compose.yml)):

| Service          | Image / Dockerfile     | Ports                       | Purpose                                                |
| ---------------- | ---------------------- | --------------------------- | ------------------------------------------------------ |
| `postgres`       | `postgres:15-alpine`   | internal                    | Database; data persisted in `./data/db`                |
| `migration`      | `Dockerfile.migration` | —                           | One-shot job; runs migrations then exits               |
| `role-bootstrap` | `Dockerfile.migration` | —                           | One-shot restricted application-role provisioning      |
| `stacks`         | `Dockerfile.server`    | `127.0.0.1:3000` by default | The API server (serves the web app from the same port) |
| `email`          | `Dockerfile.email`     | internal                    | Email queue worker                                     |

Volumes (created automatically under `releases/`):

- `./data/db` — Postgres data
- `./data/uploads` — file uploads
- `./data/previews` — generated previews
- `./logs` — service logs

Boot order is enforced by health checks: `postgres` becomes healthy → `role-bootstrap` provisions the app role → `migration` runs to completion → `stacks` and `email` start.

## Common operations

```bash
docker-compose logs -f stacks       # tail the API server logs
docker-compose logs -f email        # tail the email worker logs
docker-compose ps                   # service health and status
docker-compose down                 # stop everything (data preserved)
docker-compose down -v              # ⚠️ stop and delete all volumes
```

Backup / restore the database (run from `releases/`):

The dump below is plaintext and includes `users.oauthTokens`, which stores Google access and refresh
tokens. Protect both the PostgreSQL data directory (`./data/db`) and every backup with encrypted-at-rest
storage, strict access controls, and an explicit retention policy. Set restrictive file permissions
before creating a local dump, encrypt it before transferring or storing it outside an encrypted
filesystem, and test restores only into an isolated environment. Compose cannot verify or configure
host-volume or backup encryption; confirm those controls with the deployment operator. The app does
not currently encrypt OAuth tokens before writing them to PostgreSQL.

```bash
umask 077
docker-compose exec postgres pg_dump -U postgres "$POSTGRES_DB" > backup.sql
docker-compose exec -T postgres psql -U postgres "$POSTGRES_DB" < backup.sql
```

## Troubleshooting

| Symptom                                | First thing to check                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `stacks` container restarts in a loop  | `docker-compose logs stacks` — almost always a missing/invalid `license.key` or bad Postgres credentials                       |
| Port `3000` already in use on the host | Change the left side of the port mapping in `docker-compose.yml` (e.g. `"3010:3000"`) and `PUBLIC_URL` to match                |
| Migration container exits non-zero     | `docker-compose logs migration` — schema is out of sync or Postgres unreachable                                                |
| Email worker silent                    | Confirm `SMTP_*` is correctly set in `.env`; the worker idles silently when SMTP is unconfigured                               |
| Email actually doesn't ship            | Check `email_queue` rows in Postgres for stuck `pending` entries; see [`packages/email-service.md`](packages/email-service.md) |

## Security checklist before going live

- Regenerate `COOKIE_SECRET` and `JWT_SECRET` (`openssl rand -hex 32` each)
- Set a strong `POSTGRES_PASSWORD`
- Run the stack behind a reverse proxy (nginx / Caddy / Traefik) that terminates TLS
- Configure `CORS_ORIGINS` to only your domain(s)
- Set `STACKS_SOURCE_URL` to your fork's repo (AGPL §13 source disclosure)
- Consider Docker secrets or a secrets manager rather than a plain `.env`
