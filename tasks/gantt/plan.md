# Internal Gantt replacement

Build a new app-local React/TypeScript Gantt with the current Stacks feature set, native Blueprint styling,
calendar-day geometry, bounded rendering, accessible controls, and reliable date persistence.

## Acceptance and implementation order

1. Cover calendar geometry, hierarchy, visible windows, and date-edit calculations with unit tests.
2. Build a virtualized task tree and timeline with five scales, Today, weekend shading, pane resizing,
   expand/collapse, off-screen navigation, task opening, and stack metadata.
3. Implement move/resize/schedule pointer gestures, cancellation, auto-scroll, and a keyboard date editor.
   Save through an action that awaits the API before applying dates; failed saves retain old dates.
4. Integrate with project filters/navigation/realtime; verify unit tests, browser flows, and production build.
5. Remove the complete vendor directory, dependency, overrides, obsolete tooling/assertions and docs references.

No backend/schema changes, new dependencies, scheduling dependencies, progress tracking, or persistent view preferences.
Preserve root alphabetical/subtask persisted ordering and current missing-date/orphan conversion rules.

## Verification

Focused Jest tests followed by app tests, app/E2E type checks, lint, production build, dependency-patch
checks, and Playwright with retries disabled. Browser coverage includes scheduling, date persistence after
reload, failed saves, cancellation, nested rows, scales, pane controls, navigation, themes, and bounded rows.
See todo.md for execution evidence and remaining work. Existing tasks/todo.md belongs to unrelated work.

## Accepted follow-up

Show subtasks in the Gantt independently of the board's visibility toggle. Display parent-to-child
hierarchy arrows in the task pane and between dated bars; these links do not impose scheduling rules.
