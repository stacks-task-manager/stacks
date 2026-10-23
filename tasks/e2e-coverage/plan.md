# Playwright coverage completion plan

Prepared 2026-10-16 (Europe/Rome), source snapshot `3a11c7b822033164438fb9bf0c44cda05d5b2baa`.
This is an investigation and implementation handoff; no tests or application behavior were changed.
Tasks and evidence belong in [todo.md](todo.md). The executable handoff is [goal-prompt.md](goal-prompt.md).
The unrelated security handoff at `tasks/plan.md` and `tasks/todo.md` remains intact.

## Scope and evidence

Goal: cover the implemented, browser-reachable Stacks workflows missing meaningful Playwright assertions,
including incomplete coverage inside existing specs. “All missing” means the finite inventory below plus
gaps discovered while validating its reachable controls, not every possible input combination or 100%
code coverage. Existing coverage must be reused. Native Expo, email delivery infrastructure, exhaustive
API security fuzzing, performance benchmarks, and new product features are outside this browser plan.

Investigation used Graft map/queries/skeletons, all spec titles, the route table, representative spec/POM
bodies, existing skipped steps, documentation, fixtures and package/configuration scripts. It did not
execute Playwright, start services, mutate the DB, inspect saved reports, or establish that current tests
pass. Counts are static: **26 spec files, 110 literal test declarations**, excluding setup, nested steps
and generated cases. This is a risk-based source inventory, not instrumented runtime coverage.

Evidence strength: **confirmed** means an inspected spec/body or source establishes the stated limitation;
**candidate** means a source surface exists without a dedicated behavior test in the inventory and needs
focused POM/caller inspection before adding cases. Avoid treating filenames as proof of missing behavior.

## Existing coverage and gaps

Paths below are relative to the repository root. App source prefix: `packages/app/src/app/`.

| Surface             | Existing evidence                                                                                                           | Remaining target                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Auth                | `tests/auth/` under `playwright/`: login rejection, landing, registration/activation, reset flow                            | Session expiry, protected deep links, logout invalidation, token reuse/expiry, disabled feature variants |
| Board               | `project/board-view.spec.ts`, `board-column.spec.ts`: workflow, columns, DnD, shortcuts                                     | Preserve these; add only missing persistence, failure and cross-view cases after inspecting their POMs   |
| Task details        | `project/task-details.spec.ts:242–320`: creation/completion of subtasks, 12 skipped steps and explicit unfinished checklist | Comments, files, dependencies, time, status/tags/estimates, lifecycle and skipped subtask behavior       |
| Core routes         | `views/core-views.spec.ts:28`: opens Home, Inbox, Bookmarks, My Tasks, Reports, Tasks                                       | Confirmed navigation coverage; feature results and persistence remain unproved                           |
| Project views       | `project/project-views.spec.ts`: nine views render, empty attachments/links/Gantt, notes persistence                        | Confirmed lack of populated-data assertions in this spec; list spec only switches view                   |
| Reports             | `reports/reports.spec.ts`: one `planned_vs_actual` title survives reload                                                    | Confirmed numerical results, range controls and other report types are unproved here                     |
| People              | `people/people.spec.ts`: create/update person/company; navigation and mocked timesheet states                               | Real submission/review persistence, roles, lifecycle, grouping/filter result correctness                 |
| Calendar            | `calendar/calendar.spec.ts`: view/date navigation and real local event create/edit                                          | Delete, reschedule, calendar visibility, task scheduling, integration state variants                     |
| Permissions         | `permissions/permissions.spec.ts`: private parent hierarchy/project/calendar                                                | Explicit role restrictions, direct-resource denial, revocation and tenant boundaries                     |
| Preferences/hotkeys | Existing preferences, hotkeys and column-restoration specs                                                                  | Preserve existing cases; targeted locale/date, shortcut outcome and state-isolation additions            |
| Sidebar/notepad     | Folder/quick-add menus, sidebar/profile, basic notepad content/export                                                       | Tree moves, archive/restore, duplicate/template, richer editor behavior and real export contents         |
| AI                  | Six tests seed localStorage widgets/results; conditional skip when unavailable                                              | Chat send/stream/error/cancel lifecycle, result navigation and deterministic transport contract          |

The `tests/` entries in this table are relative to `playwright/tests/` unless otherwise stated.
Useful implementation anchors:

- `App.tsx:105–160`: overlay routes and main routes, including project/task/person/company details.
- `views/Project/Project.tsx:58–151`: nine project view branches.
- `widgets/search/Search/Search.tsx:62–278`: query threshold/debounce, categories and keyboard navigation.
- `views/Home/Home.tsx:31–361`: private notes, favorite projects/people and pinned bookmarks.
- `views/Inbox/Inbox.tsx:38–193`: notification selection/read and resource navigation.
- `views/Bookmarks/Bookmarks.tsx:14–188`: filtering/grouping and bookmark interactions.
- `views/File/File.tsx:17–119`: metadata, missing-file behavior, deletion; download currently alerts.
- `components/project/Automations/AutomationsDialog/AutomationsDialog.tsx:32–89`: automation edit/toggle/delete/copy.
- `widgets/task/TaskDependenciesDialog/TaskDependenciesDialog.tsx:69–207`: dependency picker.
- `components/common/Comments/Comment.tsx:37–57`: comment update/delete.
- `views/Reports/ReportType.tsx:20–80`: range-dependent report loading/rendering.

## Implementation contract

Read root/scoped AGENTS, `docs/AGENT_WORKFLOW.md`, `docs/E2E.md`, nearest spec/POM and component before
each slice. Use Graft before source searches. Revalidate this snapshot with minimal focused reads.
Use stable `data-testid` only, preferably containing entity IDs. All selectors, actions, waits and DOM
assertions belong in POMs, even where older tests violate that rule. Extend existing POMs instead of
duplicating them. Specs express intent and non-DOM assertions. Add UI IDs only when needed.

Use unique scenario-owned data, preferably a run identifier plus random UUID. Register cleanup before
the first mutation. Track created IDs immediately, clean children before parents, attempt independent
cleanup even after failures and report cleanup errors. Preserve preferences/storage including absent
values; remove route handlers and close extra contexts. Do not wipe schemas, truncate tables, reset
shared passwords or modify unrelated fixture data. Review the DB helper before use: it loads the
server DB configuration and creates users borrowing the configured admin's tenant and role; this does
not provide least-privilege or foreign-tenant test users automatically.

Use real UI → API → DB flows for persistence, ACL, approvals, notifications, uploads and automations.
Verify mutations after reload or from another authenticated context/read request. Mocks cover only
deterministic loading/error/external-service UI states, labelled as such. Use tiny synthetic files and
local controlled URLs; no real provider accounts, production credentials or paid AI calls.
Use browser-compatible time zones and controlled dates; assert elapsed values with tolerances rather
than arbitrary sleeps. Wait on observable UI/request completion and assert response success.

## Ordered scenario backlog

Each numbered slice below is a task with three acceptance groups, dependencies and likely files.
Split a slice further if it would touch more than about five files. Suggested spec names are proposed,
not claims that those files already exist. P0/P1/P2 indicate order; all reachable required scenarios
remain in scope. A behavior mentioned below is conditional on its existing implementation: verify
callers before coding, and record absent features as product limitations rather than inventing them.

### Foundation — P0

**E00 — Reconcile coverage and isolate fixtures.** Dependencies: none. Likely files: shared fixtures,
existing POMs and `todo.md` (split fixture work by domain).

1. Map every backlog scenario to an existing test to retain/extend or a new test; inventory enabled
   routes and reachable menus with exact component/POM pointers. Record the 12 skipped subtask steps.
2. Provide scoped real-data helpers for projects/tasks, files, users/roles and dates only as needed by
   the next slice. Verify cleanup on an intentionally failing assertion in a disposable scenario.
3. Establish real versus mocked evidence labels, auth flag/license/DB prerequisites and baseline
   focused results. Every new test must run alone with `--grep` and retries disabled.

### Task workflows — P0

**E01 — Subtask completion.** Dependency: E00. Files: existing task-details spec/POM, Subtasks POM,
task/subtask component IDs.

1. Complete skipped counter, keyboard creation, dates, assignee and inline edit cases; reload and
   verify values, not only the editor input or optimistic state.
2. Open child, return to parent, traverse previous/next task, and inspect actionable child menu items;
   ensure closing the drawer and browser Back preserve the originating view.
3. Add/remove supported dependencies, detach a child and delete it; verify parent counters and
   persisted relationships. Remove each placeholder only once its scenario has executable coverage.

**E02 — Status, tags and estimates.** Dependency: E00. Files: task-details spec/POM plus status/tag/
estimate widget IDs; split definition-management into E16.

1. Set/change/clear status and tags on a task; reload and verify board/list/filter representations.
2. Set/edit/clear estimate and progress where supported; verify overview totals from known tasks.
3. Complete/reopen the task; assert completion counts and filtered visibility after reload. Test
   invalid/empty numeric input against the actual documented UI contract.

**E03 — Comments and activity.** Dependency: E00. Files: proposed `project/task-comments.spec.ts`,
task-details POM, Comments components.

1. Add a comment, reload and verify its author/body on the right task, including multiline content.
2. Edit/delete own comment and verify persistence; cancel editing/deletion without mutation.
3. With another user, verify implemented edit/delete restrictions and activity visibility; harmless
   markup must render according to the editor's supported contract without executing script.

**E04 — Dependencies.** Dependencies: E00, E01 for child variants. Files: proposed
`project/task-dependencies.spec.ts`, task-details POM, dependency picker/widget IDs.

1. Link/unlink distinct tasks through the picker; verify links and target navigation after reload.
2. Verify project/stack filtering and existing-selection state; cancellation must preserve links.
3. Exercise self-link/duplicate/cycle restrictions only where defined; removal/deletion of a linked
   task must not strand the view. Record unsupported graph constraints separately.

**E05 — Manual time entries.** Dependency: E00. Files: proposed `project/time-entries.spec.ts`,
existing TimelogDialog/QuickTimelog POMs, time-view POM extensions/widget IDs.

1. Create/edit/delete a manual entry with known duration/date; assert reload persistence and totals
   across task and project Time views without counting deleted entries.
2. Test required fields, invalid duration and cancel; scope entries to the selected task/person.
3. Verify date-range and grouping outcomes on two tasks/two days, including midnight/week boundary
   using a fixed browser zone and restoring prior display settings.

**E06 — Timer.** Dependency: E05. Files: proposed `project/task-timer.spec.ts`, task-details POM,
timer widget IDs.

1. Start/stop a timer and verify one resulting time entry and a bounded elapsed duration.
2. Navigate away/reload while running and assert the implemented persistence/recovery contract.
3. Exercise duplicate start/stop and switching tasks according to supported single/multiple timer
   semantics; cancel/cleanup all running timers even when an assertion fails.

**E07 — Task lifecycle and cross-view consistency.** Dependency: E00. Files: proposed
`project/task-lifecycle.spec.ts`, project/board/task POM extensions, archive/copy-move UI IDs.

1. Move/copy/duplicate where supported; verify destination, source preservation/removal and copied
   field contract after reload, without assuming IDs or child-copy rules.
2. Archive/restore/delete a task and verify normal/archive lists, counts and deep-link behavior.
3. Bulk or context-menu actions, if reachable, affect exactly selected scenario-owned tasks; cancel
   is inert and a failed mutation does not leave false success or phantom rows.

Checkpoint A: E00–E07 evidence recorded; focused and containing specs pass with retries disabled;
shared fixture/POM consumers rerun; cleanup leaves no scenario-owned records or running timers.

### Discovery, documents and files — P1

**E08 — Search.** Dependency: E00. Files: proposed `search/search.spec.ts`, Search POM,
`widgets/search/Search/Search.tsx` IDs.

1. Seed distinguishable tasks/documents/people and verify search results, type filters, empty results
   and the observed two-character query threshold; do not merely assert input values.
2. Navigate with arrows/Enter and click; assert correct resource ID, drawer or route, Escape closure
   and focus behavior.
3. Rapidly change queries and test delayed/failing responses deterministically; stale results must
   not replace current results. Real search must respect existing visibility restrictions.

**E09 — Bookmarks and Home.** Dependency: E00. Files: proposed `bookmarks/bookmarks.spec.ts`,
`home/home.spec.ts`, domain POMs and relevant widget IDs; implement as two small slices.

1. Create/edit/delete a URL bookmark; bookmark/unbookmark an internal resource; verify filter,
   pin/group behavior and correct destination after reload.
2. Verify pinned bookmarks and favorite projects/people appear on Home and disappear when removed;
   seed at least one excluded record to catch broad queries.
3. Edit/reload private Home notes and verify another user cannot see them; test meaningful empty
   states without deleting any non-test records.

**E10 — Document tree and lifecycle.** Dependency: E00. Files: proposed
`sidebar/document-lifecycle.spec.ts`, existing Sidebar/Project/Notepad POMs, tree/archive IDs.

1. Rename and move/reorder nested documents; reload and assert parent/order and navigation by ID.
2. Archive/restore/delete scenario-owned folder/project/notepad; confirm dialog cancellation and
   documented descendant handling. Existing quick-add tests already create records; reuse that flow.
3. Duplicate project/save-and-use template where implemented; verify copied content and independent
   editing. Verify copied links route to the correct document after a fresh navigation.

**E11 — Uploads and attachments.** Dependency: E00. Files: proposed
`files/attachments.spec.ts`, File/Task attachment POMs, uploader and attachment widget IDs.

1. Upload a tiny synthetic file to a task and supported document entry point; reload, verify
   filename/size and appearance in the project Attachments view.
2. Use the implemented attachment download route and verify filename, MIME type and payload;
   delete/detach and verify DB/UI visibility plus correct direct-link behavior.
3. Test rejected upload and missing/inaccessible file behavior without orphaned rows/files. Distinguish
   detach from physical deletion if files can be shared; never assume sole ownership.

**E12 — Notepad editor and project notes.** Dependency: E00. Files: existing notepad spec/POM,
project notes POM extension, editor IDs.

1. Extend existing content/reopen coverage with supported formatting, links and undo/redo; assert
   saved document structure and no lost content after navigation/reload.
2. Test covers/embedded files only where implemented; remove them and verify saved state.
3. Check export content against a known document, not only status/content type; verify supported
   formats and basic filename/content integrity. Preserve existing HTML export test.

Checkpoint B: E08–E12 pass individually and by containing spec; downloaded/uploaded artifacts and
created documents are cleaned; fixture failures do not hide cleanup failures.

### Collaboration and domain behavior — P1

**E13 — Inbox and notifications.** Dependency: E00. Files: proposed `inbox/notifications.spec.ts`,
Inbox POM, Inbox/task reminder/notification widget IDs; split reminders into a separate spec as needed.

1. Trigger a supported notification from a second user and verify correct recipient, record and
   unread presentation; unrelated user receives none.
2. Select/read the notification and use its resource link; reload to verify read state and correct
   task/document destination. Test supported read-all/delete controls only if reachable.
3. Configure/edit/remove a task reminder where implemented; verify persisted schedule and cancel.
   Use deterministic clocks/service harness for delivery, explicitly distinguishing UI-only mocks.

**E14 — Real timesheet approvals.** Dependency: E05. Files: proposed
`people/timesheet-approvals.spec.ts`, People POM, explicit submitter/reviewer fixtures.

1. Submit a real weekly set of entries and verify persisted in-review status and reviewer visibility.
2. Approve/reject as an authorized reviewer; verify reason, partial-review aggregation and submitter
   correction/resubmission through reloads and separate contexts.
3. Unauthorized reviewer cannot approve; pending requests cannot be resubmitted; test week/date
   boundaries and empty-week policy. Preserve existing mocked UI states as separate evidence.

**E15 — People/company lifecycle and roles.** Dependency: E00. Files: existing people spec/POM,
proposed `people/roles.spec.ts`, role/detail widget IDs; split by contacts versus roles.

1. Extend real create/update coverage with company membership, list grouping/filter result correctness,
   deletion/cancel and persistence; verify no unrelated contact changes.
2. Create/edit/assign a supported role with isolated users and verify visible allowed/denied actions
   in a second context; opening the Roles tab is insufficient.
3. Exercise actual required-field/duplicate validation and disabled user controls where exposed;
   do not change the shared admin account or its role.

**E16 — Tags, statuses and custom fields.** Dependency: E02. Files: proposed
`project/project-definitions.spec.ts` and `project/custom-fields.spec.ts`, manager/field POMs and IDs.

1. Add/edit/reorder/delete tag/status definitions; verify saved definitions, task choices and
   assignment behavior after reload, including cancel and in-use deletion policy.
2. Configure each enabled custom field type and set/edit/clear a task value; verify persistence
   and required/default behavior where implemented. Parameterize simple types without duplicating code.
3. Change field options or delete a definition and verify the documented treatment of saved values;
   check the same task across supported views and another project for isolation.

**E17 — Automations.** Dependency: E02. Files: proposed `project/automations.spec.ts`, automation
POM, wizard/action/dialog IDs.

1. Create/edit a deterministic supported rule, trigger it with a real task mutation and verify the
   resulting saved action once; preserve unrelated task fields.
2. Disable/enable/delete the rule and repeat the trigger to verify its effect, rather than dialog
   visibility alone.
3. Copy a rule from another scenario-owned project where supported; verify target configuration,
   cancellation and invalid configuration feedback without external side effects.

**E18 — Calendar behavior.** Dependency: E00. Files: existing calendar spec/POM, calendar/event
widget IDs; optional deterministic provider-state spec.

1. Extend create/edit coverage with delete/cancel and drag/resize rescheduling where exposed;
   verify saved start/end/all-day values and calendar membership after reload.
2. Toggle multiple local calendars and assert actual event inclusion/exclusion; schedule an existing
   task if supported and verify its persisted relation/date and resulting task/calendar views.
3. Test timezone/daylight-saving or all-day boundaries and deterministic integration unavailable/
   expired states. Real Google OAuth/network sync remains opt-in and requires a sandbox provider.

Checkpoint C: E13–E18 verified with real server persistence for their core flows; mocked/provider
cases labelled; both users/roles/calendars and all mutations cleaned independently.

### Views, access and resilience — P1/P2

**E19 — Populated project views.** Dependencies: E02, E05, E11. Files: extend project-views spec/POM,
specialized Gantt/map/overview POMs and view IDs; split into one slice per view.

1. List/table: create mixed tasks and assert sorting, grouping, selected edits and paging if exposed;
   verify consistency with Board and reload. Reuse existing filtered-table/column tests.
2. Overview and Time: assert known completion/estimate/spent totals and date/group changes; Links
   and Attachments show actual linked records and open the correct task/resource.
3. Gantt: known dates/relationships render and supported drag/resize edits persist. Map/World:
   known task locations and filters render; isolate external map tiles. Keep existing empty-state tests.

**E20 — Reports.** Dependencies: E05, E14 for approval-dependent reports. Files: existing reports
spec/POM, report toolbar/grid/chart IDs, scenario data helpers.

1. Enumerate report types from the actual report registry/API and cover each reachable report with
   known tasks/time data, asserting rows/totals and chart inputs or accessible equivalents.
2. Change supported span/project/person filters and assert exclusions/aggregations; cover no-data
   ranges and direct-link reloads. Do not assume nonexistent filter/export controls.
3. Test loading/failure/retry UI deterministically and export data if supported; preserve the existing
   title regression but never count it as numerical report coverage.

**E21 — Authentication/session boundaries.** Dependency: E00. Files: existing auth specs/POMs,
isolated user fixture; split login/session versus reset/activation variants.

1. Visit a protected deep link while signed out, sign in and verify the supported redirect; reload
   authenticated state, logout and verify Back/direct navigation cannot reveal protected data.
2. Expire/revoke a scenario-owned session and verify UI recovery without stale user data; test
   disabled credentials and invalid password without leaking secrets.
3. Extend real activation/reset coverage with expired/reused tokens, required/mismatched fields and
   feature-disabled pages. Revalidate intended recovery responses against any concurrent security
   changes rather than freezing information-disclosure behavior into tests.

**E22 — Permissions and realtime.** Dependencies: E00, E15 for role scenarios. Files: existing
permissions spec/POM, proposed `realtime/realtime.spec.ts`, explicit role/tenant fixtures.

1. Check allowed and denied read/write actions on real resources via UI and direct request using
   viewer sessions; cover task/comment/file inheritance and guessed IDs without mocks.
2. Two contexts: edit/create/delete a task, comment or document and assert the other view refreshes
   without a manual reload. Change permissions and verify revocation removes inaccessible data.
3. Foreign-tenant fixtures must be genuinely distinct. Verify no UI/search/notification/realtime
   leakage, and disconnect/reconnect recovery. Keep existing hierarchy regressions.

**E23 — My Tasks and task filter navigation.** Dependencies: E02, E15. Files: proposed
`views/my-tasks.spec.ts`, existing TasksTable/CoreViews POM extensions, filter widget IDs.

1. Seed assigned-to-me, assigned-to-other, unassigned, completed and overdue tasks; assert exact
   My Tasks membership and supported date/group filters after reload.
2. Open/edit/complete from My Tasks or filtered Tasks and verify resulting membership across views.
3. Deep-link encoded filters, clear filters, Back/Forward and switch projects; verify actual results
   and no old-project filter leakage. Extend existing filter combinations instead of copying them.

**E24 — Error recovery, preferences and keyboard outcomes.** Dependencies: relevant feature slices.
Files: targeted existing specs/POMs and deterministic fixtures; avoid one giant omnibus spec.

1. Representative task save, file upload and report load failures display meaningful feedback and
   permit retry; test API offline/reconnect and not-found/direct-link states where implemented.
2. Exercise date/number rendering with an available non-default locale and timezone, restore settings,
   and verify important dialogs at a narrow viewport; do not add a new browser matrix by default.
3. Verify supported shortcuts perform their action without firing while typing, Escape closes the
   active overlay and focus returns. Reuse existing hotkey/preferences cases and test only gaps.

### Product limitations and reachability gates

**E25 — Resolve scope gates without inventing features.** Dependency: E00; run before final completion.
Files: this plan/evidence ledger; source only for authorized selector hooks or proven related defects.

1. `views/Goal/Goal.tsx:4–12` renders only “This is a goal”. Record placeholder smoke coverage or
   explicit exclusion; do not plan Goal CRUD as an implemented flow.
2. `views/File/File.tsx` has an alert-only download button. Separate real attachment downloads from
   this unfinished UI. `ToolbarPeople.tsx:772–834` has an unimplemented CSV load path; record blocked
   import scenarios (parse/map/preview/save/error/cancel) rather than fake import success with mocks.
3. Workspaces is a shell rail (`views/Workspaces/Workspaces.tsx:24–53`), not evidence of a workspace
   switcher. Planner/Timebox source existence is not proof of a mounted route. Trace reachability
   before adding tests. Apply the same gate to recurrence, reminders, sharing, template and provider
   features. Record each as existing-covered, newly-covered, absent or externally blocked with evidence.

## Verification and completion

For every changed scenario, execute from the root:

```bash
yarn prettier --write <touched-files>
yarn type-check:e2e
yarn test:e2e playwright/tests/<area>/<name>.spec.ts --grep "scenario name" --retries=0
yarn test:e2e playwright/tests/<area>/<name>.spec.ts --retries=0
```

Run app type check and relevant lint/unit checks when adding component hooks or behavior. After shared
fixture/POM changes run their consumer specs. At the final checkpoint run the enabled full Chromium
suite once with `yarn test:e2e --retries=0`; report setup failures, failures, skips and cleanup failures
separately. Do not infer pre-existing failures without baseline evidence. Keep reports/artifacts untracked.

The API must be available on configured APP_PORT (normally 3000); frontend stays on 3001. Use a valid
dev license, never bypass validation. Auth flow specs require registration/recovery flags enabled;
exercise disabled variants in a separately configured environment without disrupting shared services.
AI/integration tests need an explicit deterministic configuration; a conditional skip is not a pass.
Do not run `yarn setup`, reset a DB or overwrite `.env`. Read server/DB rules before fixture changes.

Completion requires an evidence mapping for every scenario above, no unexplained skipped placeholders,
all reachable required flows implemented and verified, isolation verified, and final diff/status review.
Absent product features and external blockers must have exact evidence, impact and next action; they
must not silently count as covered. Test failures that expose product bugs need a regression-first
minimal repair within task scope; broad/new feature work must be documented as a separate dependency.
Do not claim exhaustive certification or completion when required runnable scenarios remain undone.

The implementing agent should revalidate only the next feature slice, extend rather than rewrite the
suite, keep E2E changes separate from the existing security effort, and preserve all unrelated work.
