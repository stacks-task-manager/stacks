# Security Policy

## Table of Contents

-   [Supported Versions](#supported-versions)
-   [Reporting a Vulnerability](#reporting-a-vulnerability)
-   [Scope](#scope)
-   [Disclosure Policy](#disclosure-policy)

## Supported Versions

Security fixes are applied to the `main` branch. There is no LTS branch at this time; once tagged releases begin, this section will list the supported tags and their fix windows.

| Version | Supported |
| --- | --- |
| `main` | ✅ |
| Tagged releases | TBD — until then, please run from `main` |

## Reporting a Vulnerability

Please report suspected vulnerabilities **privately** to **customers@getstacksapp.com** with the subject line `SECURITY:` followed by a short summary.

Include in your report:

- Affected component (server, app, mobile, email-service, db) and version/commit
- A clear description of the issue and its impact
- Steps to reproduce, or a proof-of-concept
- Any suggested remediation, if you have one

You should expect an acknowledgement within **72 hours**. A status update will follow within 7 days, and a fix or mitigation timeline within 30 days where feasible.

Please do **not** open public GitHub issues, discussions, or pull requests for security-sensitive matters until a fix is available.

## Scope

In scope:

- The server (`@stacks/server`) and its HTTP / WebSocket surface (auth, session handling, request validation, file handling)
- Database layer (`@stacks/db`) — migrations, query construction, model authorization
- The email service (`@stacks/email-service`) — SMTP handling, template rendering, queue processing
- Client applications (`@stacks/app`, `@stacks/mobile`) — XSS, token storage, IPC

Out of scope:

- The development license check at `packages/license/src/index.ts` and `packages/server/public.pem`. This is a licensing-compliance mechanism, not a security boundary — bypassing it locally is a license violation, not a vulnerability.
- Issues that require an attacker to already have root / administrator access to the host
- Self-hosted misconfiguration (e.g., weak `COOKIE_SECRET` / `JWT_SECRET`, exposed Postgres, missing TLS)
- Issues in third-party dependencies — report those upstream; we'll consume their fixes via Dependabot

## Disclosure Policy

Stacks follows coordinated disclosure. We aim to resolve confirmed issues within **90 days** of acknowledgement; if that's not feasible, we'll communicate a revised timeline.

Reporters who follow this policy will be credited in the release notes for the fix (unless they request to remain anonymous).
