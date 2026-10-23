# Playwright — Agent Instructions

Applies to `playwright/`. Read the [root rules](../AGENTS.md), [E2E guide](../docs/E2E.md),
nearest spec and POM, and component under test. If changing UI hooks, also read
[app instructions](../packages/app/AGENTS.md).

## Test structure

- Select elements only with stable `data-testid` attributes, never tags, classes, text, roles,
  or CSS paths. Add missing test IDs in the component. Prefer entity IDs over translated text
  or array indexes for dynamic test IDs.
- Put selectors, clicks, waits, and DOM assertions in `pages/` POM classes. Specs contain
  user-intent method calls and non-DOM result assertions. Reuse the existing POM for a view.
- Shared flows belong on the POM as named methods. Follow the established fixtures in `fixtures/`.
- Use unique data for real API records. A focused scenario must run by itself; avoid accidental
  dependence on earlier tests or their localStorage, mocks, open dialogs, or preferences.

## Isolation and cleanup

- Every record a scenario creates must be torn down at the end of the test. Register `afterAll`
  or `finally` cleanup before creating records so assertion failures also clean up; delete owned
  children explicitly before parents rather than assuming document deletion cascades to other entities.
- Restore previous preference/storage values, including absence, and do nothing when no override
  occurred. Register cleanup so assertion failures also trigger it.
- Attempt independent record/browser cleanup operations independently and report failures after
  the attempts. Scope deletion to records created by the scenario.
- Match the browser's clock/time zone for date expectations; capture expectations at the action
  when a boundary could change their meaning. Assert the outcome this regression targets.
- Use mocks for deterministic UI behavior, not as proof of server persistence or authorization.
- If demonstrating a pre-fix failure, isolate both checkout and execution. Never overwrite source
  files in the shared running checkout. Report limitations if isolation is not practical.

## Run

The API server must already be available on port 3000 (or the configured base URL). Playwright
starts/reuses only the frontend on 3001; test/browser traffic goes through the API server.
See the E2E guide for database, license, auth flags, videos, and report paths.

Format touched files, run `yarn type-check:e2e`, run the changed scenario with `--grep` and
`--retries=0`, then run the full affected spec with `--retries=0`. Broaden coverage when the
change affects shared fixtures/POMs. Report failures, retries, and skipped scenarios explicitly.
