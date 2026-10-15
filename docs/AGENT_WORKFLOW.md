# Agent workflow

This is the shared completion workflow for work in this repository. It supports starting a task,
finishing another agent's work, and reviewing without changes. It does not require a personal skill
or a particular model. Read the [root instructions](../AGENTS.md) and applicable scoped instructions.

## Define the outcome

Before editing, inspect staged/unstaged changes and relevant untracked files. Preserve existing work
and staging. Read the relevant guides in the [documentation index](README.md) and use the repository
graph to trace the implementation. Treat another agent's summary as claims to verify.

For a multi-step task, keep a short checklist in the conversation or task tracker:

| Requirement        | Observable success         | Verification                | Status / evidence |
| ------------------ | -------------------------- | --------------------------- | ----------------- |
| Requested behavior | What the user will observe | Relevant test or inspection | Pending           |

Include explicit user requirements and applicable project rules. Separate optional improvements and
known pre-existing issues. State assumptions that affect behavior; clarify conflicting interpretations
before implementing dependent work. Do not create a tracking file or a persistent background task
unless requested. A plan is a starting point, not the deliverable when implementation is authorized.

## Implement and check

1. Trace each requirement through its implementation and consumers. For changes spanning packages,
   check the shared types, API/loader contract, state updates, and user-visible result as relevant.
2. Make the smallest change that meets the requirement. Fix concrete task-related defects; avoid
   adjacent cleanup, unused future abstractions, dependency changes, and speculative hardening.
3. Run the appropriate verification below. If a check exposes a defect caused by the task, repair it
   and rerun affected checks. Preserve useful regression tests and reproducible commands.
4. Reconcile the checklist with the final diff. Continue until required outcomes are verified or a
   specific external dependency prevents completion. Do not silently recast unfinished requirements
   as accepted limitations. Stop once the agreed scope is satisfied; optional polish does not prolong it.

For review-only requests, inspect and report without fixes, staging, formatting writes, service
changes, database mutations, or test runs that write artifacts. Read existing reports and distinguish
them from newly executed checks. If a check would violate the requested review boundary, report it as
not rerun rather than silently changing state.

## Verification

Use the narrowest meaningful check plus the checks required by the affected package. Commands are in
the [root command table](../AGENTS.md#commands-and-verification); actual scripts/configs take precedence
over stale documentation. Do not install dependencies or restart services when the environment is
already adequate.

| Change                     | Appropriate evidence                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation/instructions | Targeted Prettier check, local paths/links/anchors, commands against package scripts, claims against source/config; no runtime suite unless behavior also changed |
| Web app                    | App type check, relevant lint and unit tests; UI flow coverage when behavior changed                                                                              |
| Server                     | Focused unit/loader/route tests as relevant; integration coverage for database/auth/transaction behavior                                                          |
| Shared types/database      | Internal build, affected consumers, and migration verification on a disposable database where needed                                                              |
| Playwright                 | E2E type check, focused scenario, then complete affected spec with retries disabled; follow [E2E.md](E2E.md)                                                      |
| Locale behavior            | Existing locale operations/integrity checks, placeholder preservation, and relevant translation tests                                                             |

- For bugs, demonstrate failure before the fix and success afterward where practical. Run baseline
  experiments in a genuinely isolated checkout and execution environment. Do not copy original source
  into a shared live checkout; if isolation is impractical, explain the verification limit.
- Verify user outcomes, not implementation wording. Type checks do not establish runtime behavior;
  optimistic UI updates do not establish persistence; passing cleanup does not prove failure-path cleanup.
- When modifying test state, preserve the previous value, including absence, and restore only state
  actually overridden. Attempt independent cleanup operations independently; report their failures.
- Date assertions must use compatible clocks/time zones and measure the intended outcome. Capture the
  expected date at the action if a clock boundary matters.
- Rerun checks invalidated by later changes. Do not keep repeating a passing suite without new evidence
  of risk. Do not call an unrelated-looking failure pre-existing without a baseline or qualified analysis.

## Completion and reporting

Before finishing, inspect the final diff and status, including staged files. Check for unintended
formatting, credentials, build output, local tooling, and new unused exports. Do not stage, commit,
push, or merge without authorization. Keep docs consistent with behavior changed by the task.

Report:

- What changed, or what is sound in a review, and why it satisfies the requested outcome.
- Checks **executed now**, **existing reports inspected**, **code inspection**, and **not verified**.
  Include commands/results and material conditions such as retries, skipped tests, mocks, or required services.
- Concrete remaining issues with file locations and their effect. Distinguish required gaps from optional
  suggestions. Do not claim an unresolved requirement was intentionally deferred unless that decision exists.
- The external dependency or decision needed if incomplete. Complete independent work first; avoid repeated
  identical retries with no new evidence. Do not mark work complete merely because time or usage ran out.

Use “complete” only when required outcomes and checks are satisfied. “Complete with limitations” still
requires all acceptance criteria to be met. Claims such as “all verified,” “isolated,” or “zero leftovers”
need evidence for those specific statements. A saved test report supports its recorded run, not later edits.
