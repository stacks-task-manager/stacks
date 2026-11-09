# Agent goal prompt: complete missing Playwright coverage

In `/Users/synapse/Projects/Personal/stacks-oss`, implement the missing Playwright E2E coverage defined
in `tasks/e2e-coverage/plan.md` and track scenario-level evidence in `tasks/e2e-coverage/todo.md`.
Read both files first. They contain the investigation, existing coverage, prioritized E00–E25 backlog,
concrete scenarios, dependencies, implementation anchors, known unfinished product features and checks.

The goal is to cover all implemented, browser-reachable workflows in that inventory, including gaps
inside existing specs and the 12 skipped subtask steps. Revalidate against the current checkout with
focused Graft queries and nearest spec/POM/component reads; reuse current coverage and avoid broad
reinvestigation. Inspect status, staged/unstaged diffs and untracked work first. Preserve the separate
security plan at `tasks/plan.md` and `tasks/todo.md` and all unrelated work.

Proceed through the plan in dependency order, splitting large entries into small verifiable slices.
Use only stable data-testid selectors, keep all DOM interactions/assertions in existing or narrowly
scoped POMs, and add missing UI IDs where required. Follow root/scoped AGENTS and docs/E2E.md.
Use unique scenario-owned records, explicit least-privilege users/tenants and failure-safe independent
cleanup. Restore preferences/storage including absence. Never wipe a database, overwrite environment
files, reset shared credentials, bypass the license, or terminate unrelated processes.

Use real browser/API/database flows to prove persistence, permissions, approvals, notifications,
uploads, automations and realtime. Verify saved state after reload or in another authenticated context.
Use clearly labelled mocks only for deterministic UI failures/external services; do not count them as
server verification. Avoid paid/external provider calls. Test user-visible results and excluded controls,
not just visible menus, route rendering, response status or optimistic updates.

For each scenario run targeted formatting, yarn type-check:e2e, the focused test and its containing
spec with --retries=0. Rerun shared POM/fixture consumers when affected and relevant app checks for
component changes. At completion run the enabled full Chromium suite with --retries=0 and reconcile
every scenario to a verified test or an explicit absent-feature/external blocker with source evidence.
Record exact commands/results, real-versus-mocked evidence, skips, cleanup and remaining gaps.

The Goal page, File page download button and People CSV loader have known implementation limits;
verify them and document blocked behavior without inventing features or faking successful E2E flows.
If a test exposes a real task-related defect, reproduce it with a regression and make the smallest
related repair. Keep unrelated security/new feature work separate. Do not silently defer runnable
required scenarios, weaken assertions, add unexplained skips, or claim completion with unresolved work.
Continue autonomously until the agreed inventory is covered or a concrete external dependency prevents
further work. Do not commit, push, merge, deploy or message anyone. Return a concise coverage/evidence
summary with exact remaining blockers and local file links.
