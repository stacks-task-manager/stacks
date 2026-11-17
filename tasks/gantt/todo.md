# Internal Gantt checklist

- [x] Unit tests and calendar/hierarchy foundation
- [x] Internal chart, task tree, toolbar, viewport rendering
- [x] Pointer interactions and accessible date editor
- [x] Awaited persistence action and project integration
- [x] Browser regression scenarios and verification
- [x] Complete vendor removal and documentation cleanup
- [x] Final review, formatting, type checks, tests, lint and build

## Verification executed on 2026-10-27

- `yarn workspace @stacks/app test --runInBand`: 36 suites, 216 tests passed.
- `TZ=Europe/Rome yarn workspace @stacks/app test --runInBand --runTestsByPath src/app/components/common/GanttChart/__tests__/geometry.spec.ts`:
  11 tests passed, including calendar-day movement over the local DST transition.
- App `tsc --noEmit` and `yarn type-check:e2e`: passed.
- Focused ESLint for the component, adapter, action and tests: passed without warnings.
- `yarn lint`: passed with warnings; no errors. These warnings are not claimed to have a verified baseline.
- `yarn workspace @stacks/app build`: passed with 29 warnings, including rrule source-map warnings
  and the bundled lint report.
- `yarn test:security:dependency-patches`: passed after removing only obsolete vendor assertions.
- `yarn test:e2e playwright/tests/project/gantt.spec.ts playwright/tests/project/project-views.spec.ts --retries=0 --no-deps`:
  all 6 scenarios passed. Used existing authenticated state; authentication setup was omitted because an
  earlier repeated login hit the running server's rate limit. No browser scenarios were skipped or retried.
- Browser coverage includes hierarchy and all scales, task pane controls, pointer scheduling, date-editor
  scheduling, moving and both resize endpoints, persistence after reload, Escape cancellation, rejected
  saves, off-screen navigation, both task-navigation preferences, light/dark themes, a 390px viewport,
  and bounded rendering while scrolling through a mocked 1,000-row fixture.
- Screenshot inspection: desktop light/dark and narrow dark layouts. Date persistence scenarios use real
  server records; the load fixture and rejected-save response are mocked.
- Test-created projects/tasks were removed, including records from early failed runs. Changed visual
  preferences are restored through an independent request context, even if the browser is closed.
- Targeted Prettier checks and `git diff --check`: passed. `graft build` refreshed the local graph.
- Source/dependency references were checked; the retired directory is absent and the app cannot resolve
  the removed package. No commits, pushes, migrations, or changes to shared entity/server interfaces.

## Review corrections

Review and browser iterations fixed pre-drag edge scrolling, resize handles blocking short bars,
synthetic-click suppression affecting later clicks, scheduling capture on a disappearing element,
selection cleanup after pane resizing, and scroll preservation when distant tasks change the origin.
The project adapter now supplies the project ID to the stacks hook so labels and colors are available.

## Follow-up: subtask visibility and parent arrows

- [x] Gantt includes subtasks even when the board's show-subtasks filter is off; default consumers retain
      their previous behavior. Other project filters and archived/project boundaries remain active.
- [x] Task-pane elbow arrows identify undated child rows; SVG arrows connect dated parent/child bars.
      Arrowheads enter the left center of the child bar, with initial timeline padding to keep them visible.
- [x] Connectors follow pending/drag dates, disappear on collapse, and render only for the visible window.
- [x] Removed the browser fixture's show-subtasks query workaround, so it covers the ordinary project URL.
- [x] Regression tests first failed for the missing child and arrow, then passed after the fix.
- [x] Final app tests: 37 suites, 224 tests passed. App/E2E type checks passed. Focused lint passed cleanly;
      full lint passed with 248 warnings and no errors. Production build passed with 29 warnings.
- [x] All 6 Gantt/project-view browser scenarios passed with existing auth, retries disabled. Screenshot
      inspection confirmed the parent/child arrow direction and visibility in the dark-theme timeline.
- [x] Independent follow-up review found no required corrections. No commits made.

## Follow-up: connector layering and entry point

- [x] Raised timeline connectors above the day grid and Today line while keeping task panes and headers above them.
- [x] Routed arrowheads horizontally into the child bar's left center for both forward and backward date relationships.
- [x] Added initial timeline padding so current-day task arrowheads remain visible to the left of their bars.
- [x] Verified 11 focused unit/component tests, the full Gantt browser workflow (existing auth, no retries),
      app/E2E type checks, focused component lint, formatting, and rendered screenshot inspection.
