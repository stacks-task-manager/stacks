# Contributing to Stacks

First off — thank you for taking the time to contribute. Stacks is an
independent open source project and every contribution, big or small, makes
a real difference.

Please take a few minutes to read this guide before you start. It helps keep
the process smooth for everyone.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Contributor License Agreement](#contributor-license-agreement)
- [Licensing](#licensing)
- [How to Report a Bug](#how-to-report-a-bug)
- [How to Request a Feature](#how-to-request-a-feature)
- [Branching Strategy](#branching-strategy)
- [How to Submit a Pull Request](#how-to-submit-a-pull-request)
- [PR Rules](#pr-rules)
- [Development Setup](#development-setup)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Getting Help](#getting-help)

---

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By
participating you agree to abide by its terms. Concerns can be reported
confidentially to `customers@getstacksapp.com`.

---

## Contributor License Agreement

Before your first pull request can be merged, you must sign our
**Contributor License Agreement (CLA)**.

This is a one-time step. It ensures that the project maintains clean IP
ownership, which protects both you and the project — especially important
if Stacks is ever acquired or relicensed.

When you open your first PR, the [CLA Assistant](https://github.com/contributor-assistant/github-action)
bot will leave a comment asking you to sign. To sign, reply with the **exact phrase**:

> I have read the CLA Document and I hereby sign the CLA

The bot records your signature in `.github/cla-signatures/signatures.json`. If you
contribute again later, the bot will recognise you and not block the PR. You can
read the CLA itself at [.github/CLA.md](.github/CLA.md) before signing.

If you ever want the bot to re-check signature status on a PR, comment `recheck`.

---

## Licensing

Stacks is dual-licensed:

- **Open source use** is covered by the [GNU AGPL v3](./LICENSE). If you
  contribute code, your contribution will be licensed under the same terms.
- **Commercial use** is available under a separate
  [Commercial License](mailto:customers@getstacksapp.com).

By submitting a contribution, you confirm that you have read and agree to
both the CLA and the licensing terms above.

---

## How to Report a Bug

Use **[GitHub Issues](https://github.com/stacks-task-manager/stacks/issues)**
to report bugs.

Before opening a new issue, please search existing issues to avoid duplicates.

When reporting a bug, include:

- A clear and descriptive title
- Steps to reproduce the problem
- What you expected to happen
- What actually happened
- Your environment (OS, browser or Node version, Stacks version)
- Any relevant screenshots or error logs

---

## How to Request a Feature

Use **[GitHub Discussions](https://github.com/stacks-task-manager/stacks/discussions)**
to propose new features or improvements.

Discussions are the right place to share ideas, gather feedback, and talk
through the direction of the project before any code is written. If a feature
gains traction in Discussions, it may be promoted to a tracked Issue and
eventually a milestone.

Please check existing Discussions before opening a new one.

---

## Branching Strategy

Stacks uses a two-tier branching model designed to keep `main` always
production-ready while giving contributors a safe integration space in `dev`.

```
main
 └── dev
      ├── feature/your-feature-name
      ├── fix/your-bug-description
      └── docs/what-you-are-documenting

hotfix/critical-bug-description  (branches from main)
```

| Branch | Purpose |
|---|---|
| `main` | Always production-ready. Protected. Never commit directly. |
| `dev` | Integration branch. All features and fixes land here first. |
| `feature/*` | New features. Branch from `dev`, merge back into `dev`. |
| `fix/*` | Bug fixes. Branch from `dev`, merge back into `dev`. |
| `hotfix/*` | Critical production bugs only. Branch from `main`, merge into both `main` and `dev`. |
| `docs/*` | Documentation-only changes. Branch from `dev`. |

**The golden rule:** `main` only ever receives merges from `dev` or `hotfix/*`
branches. Never push directly to `main`.

---

## How to Submit a Pull Request

1. **Fork the repository** and clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/stacks.git
   cd stacks
   ```

2. **Set the upstream remote** so you can stay up to date:
   ```bash
   git remote add upstream https://github.com/stacks-task-manager/stacks.git
   ```

3. **Sync with the latest `dev`** before starting work:
   ```bash
   git fetch upstream
   git checkout dev
   git merge upstream/dev
   ```

4. **Create a branch** from `dev` for your change:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-description
   # or
   git checkout -b docs/what-you-are-documenting
   ```

5. **Make your changes.** Keep your PR focused — one bug fix or one feature
   per PR. Large, unfocused PRs are hard to review and slow to merge.

6. **Test your changes** before submitting. Make sure existing tests pass and
   add new tests where appropriate.

7. **Commit your changes** following the
   [commit message guidelines](#commit-message-guidelines) below.

8. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

9. **Open a pull request against `dev`** — not `main`. PRs targeting `main`
   directly will be redirected.

10. **Fill in the PR description** — explain what your change does, why it is
    needed, and link to any related Issue or Discussion (e.g. `Closes #42`).

11. **Sign the CLA** if prompted by the bot.

---

## PR Rules

### Merging into `dev`

- Target branch must be `dev`
- At least **1 approval** from a maintainer is required
- All CI checks (tests, linting) must pass
- Your branch must be up to date with `dev` before merging
- CLA must be signed
- Merge strategy: **squash and merge** (keeps history clean)

### Merging into `main`

- Only `dev` or `hotfix/*` branches may target `main`
- At least **1 approval** from a maintainer is required
- All CI checks must pass
- Merge strategy: **merge commit** (preserves the full dev history as a unit)

### Hotfixes

For critical bugs affecting production:

```bash
git checkout main
git checkout -b hotfix/critical-bug-description
# fix the bug
# open PR against main
# after merging into main, also open a PR against dev
```

This ensures `dev` never diverges from what is live in `main`.

---

## Development Setup

```bash
# Clone the repo
git clone https://github.com/stacks-task-manager/stacks.git
cd stacks

# Activate Yarn 3 (ships with Node via corepack)
corepack enable

# Install dependencies and build internal packages
yarn install
yarn setup

# Start the full dev environment (app on 3001, server on 3000)
yarn dev
```

You will also need a PostgreSQL 15 instance, an SMTP host, and a development
license key in `packages/server/license.key`. Full prerequisites and the
list of `.env` files to copy live in
**[docs/INSTALLATION.md](docs/INSTALLATION.md)** — please use that as the
canonical setup reference.

---

## Commit Message Guidelines

Use clear, descriptive commit messages. Follow this format:

```
type: short description (max 72 chars)

Optional longer explanation if the change needs context.
Reference issues or PRs at the bottom: Closes #42
```

**Types:**

| Type | Use for |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `refactor` | Code restructuring, no behaviour change |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependencies, tooling |
| `hotfix` | Critical production bug fix |

**Examples:**

```
feat: add due date filtering to project board
fix: prevent duplicate task creation on rapid clicks
docs: update development setup instructions
hotfix: resolve data loss on concurrent task updates
```

---

## Getting Help

- **Questions about using Stacks** → open a
  [Discussion](https://github.com/stacks-task-manager/stacks/discussions)
- **Bug reports** → open an
  [Issue](https://github.com/stacks-task-manager/stacks/issues)
- **Commercial licensing** → customers@getstacksapp.com
- **Security vulnerabilities** → please do **not** open a public issue.
  Follow the process in [SECURITY.md](SECURITY.md) and email
  `customers@getstacksapp.com` with `SECURITY:` as the subject prefix.

---

*Stacks is built and maintained by
[Cristian Barlutiu](https://github.com/cristianbarlutiu).
Commercial licensing available at customers@getstacksapp.com.*
