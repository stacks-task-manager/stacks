# E2E implementation checklist

Read [plan.md](plan.md). Reviewed 2026-10-19: this is a separate browser-coverage backlog; completion
of the security suites does not complete these scenarios. Existing login, registration/activation,
recovery/reset and calendar create/edit coverage must be reused, not reimplemented. Every E-number
below tracks the additional acceptance groups in the plan; none has complete scenario-level evidence
in this file. Source inspection is not a fresh Playwright result. Split large groups into small slices.

- [ ] E00: Reconcile inventory; safe scenario fixtures; baseline and cleanup-failure verification.
- [ ] E01: Complete all 12 skipped subtask steps and navigation/persistence assertions.
- [ ] E02: Task status, tags, estimates, progress and completion across views.
- [ ] E03: Comment add/edit/delete/cancel, ownership and comment activity.
- [ ] E04: Dependency link/unlink/filter/navigation and supported invalid cases.
- [ ] E05: Manual time-entry lifecycle, totals and date/group boundaries.
- [ ] E06: Timer start/stop, reload and duplicate-action semantics.
- [ ] E07: Task copy/move/archive/restore/delete and selection isolation.
- [ ] Checkpoint A: Focused/spec/consumer checks and cleanup evidence.
- [ ] E08: Real search results, categories, keyboard navigation and stale/error results.
- [ ] E09a: Bookmark lifecycle, filtering, pins and navigation.
- [ ] E09b: Home favorites/pins/private notes and isolation.
- [ ] E10: Tree moves, document lifecycle, duplicates and implemented templates.
- [ ] E11: Real upload/download/detach/delete and failure cleanup.
- [ ] E12: Editor persistence/formatting and meaningful export contents.
- [ ] Checkpoint B: Discovery/document/file checks and artifact cleanup.
- [ ] E13: Recipient-scoped notifications/read/navigation and supported reminders.
- [ ] E14: Real submit/review/reject/correct/resubmit with explicit users/roles.
- [ ] E15a: Person/company membership, deletion, validation and list results.
- [ ] E15b: Role management and restricted-action behavior.
- [ ] E16a: Tag/status definition management and task integration.
- [ ] E16b: Enabled custom-field types, persistence and definition changes.
- [ ] E17: Automation lifecycle and actual trigger effects.
- [ ] E18: Remaining event delete/reschedule, calendar visibility and supported task scheduling.
- [ ] Checkpoint C: Real collaboration outcomes, separate mock evidence and cleanup.
- [ ] E19a: Populated list/table and overview correctness.
- [ ] E19b: Populated Time/Links/Attachments correctness.
- [ ] E19c: Populated Gantt/Map and supported edits.
- [ ] E20: Every reachable report type, numeric results, ranges and supported exports.
- [ ] E21a: Protected deep-link, logout invalidation and expired-session boundaries; reuse login tests.
- [ ] E21b: Activation/reset expiry/reuse and feature-disabled variants.
- [ ] E22a: Real role/tenant/inherited access restrictions and revocation.
- [ ] E22b: Cross-context realtime and reconnect behavior.
- [ ] E23: My Tasks membership and filter/URL/history consistency.
- [ ] E24: Targeted failure/retry, locale/viewport and shortcut outcome gaps.
- [ ] E25: Document every absent/unreachable/external feature gate with source evidence.
- [ ] Final: All enabled Chromium tests with retries disabled; no unexplained skips/failures.
- [ ] Final: Scenario-to-test mapping complete; formatting and diff/status review; handoff.

## Evidence ledger

Add one row per executable scenario or explicit scope gate; an E-number alone is not sufficient.

| Scenario ID | Existing/new spec and test title | Real or mocked | Focused result | Full spec/consumer result | Cleanup evidence | Limitation/next action | Status |
| ----------- | -------------------------------- | -------------- | -------------- | ------------------------- | ---------------- | ---------------------- | ------ |

Record exact commands, date, enabled flags/project, retries, skips and relevant failures. Distinguish
newly executed checks from source inspection or previously saved reports. Never mark mocked
persistence/authorization as verified server behavior. Keep credentials and tokens out of this ledger.
