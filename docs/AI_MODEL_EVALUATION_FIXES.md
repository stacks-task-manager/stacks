# Gemma evaluation corrections — 14 October 2026

## Recorded results

The supplied `packages/server/ai-eval-reports/current.json` was preserved as
`before-fixes.json`. The final completed comparison is `verified-fixes.json`, with
an offline review page at `verified-fixes.html` in the same ignored directory.
Reports are local artifacts and are not committed.

Both runs used `ggml-org/gemma-4-E2B-it-GGUF:Q8_0`, temperature 0, thinking disabled,
Node 24.14.1 on darwin-arm64, 242 English fixtures repeated three times,
sequential requests and parallel tool calls disabled. Repeats measure consistency;
they are not retries. All results use synthetic tools, without database or MCP writes.

| Metric                         | Supplied report | Verified corrections |
| ------------------------------ | --------------: | -------------------: |
| Passing runs                   | 474/726 (65.3%) |      540/726 (74.4%) |
| Tool selection correct         |         591/726 |              573/726 |
| Arguments correct              |         549/726 |              561/726 |
| Response assertions correct    |         690/726 |              711/726 |
| Prohibited tool/field attempts |              36 |                    0 |
| Provider errors                |               0 |                    0 |
| Median latency                 |          821 ms |               664 ms |
| 95th percentile latency        |        3,074 ms |             3,065 ms |
| Median request payload         |    22,917 bytes |         22,185 bytes |

Neither latency statistic regressed above the 10% investigation threshold. Tool
selection alone declined despite improved overall results; this remains a concern.
These figures include benchmark corrections as well as application changes, so
they cannot isolate the effect of prompt edits. The three temperature-zero runs
mostly repeat the same outcomes and are not independent statistical samples.

| Suite            |  Before |   After |
| ---------------- | ------: | ------: |
| Registered tools | 225/342 | 246/342 |
| Interpretation   | 129/225 | 144/225 |
| Safety           | 120/159 | 150/159 |

## Findings and corrections

- **Misleading synthetic results:** search previously returned unrelated Planning
  records; getters returned fallback records for incorrect ids, and several lists
  used containers different from the real handlers. Mocks now match queries,
  identify entity kinds, reject incorrect getter ids, and use handler containers.
  This is a benchmark correction, not a production loader change.
- **Scoring false negatives:** equivalent own-profile navigation, the supported
  single-project task filter alias, and the same UTC day for explicitly date-only
  task cases now pass. Read-filter `false` flags that have no effect are not counted
  as prohibited actions. Different projects, mutation fields, and calendar times
  remain checked. Column mutation requests now identify the project.
- **Missing name resolution and conflicting instructions:** core instructions and
  schema descriptions direct the model to authorized lookups, preserve route
  context, distinguish updating an existing task from creating one, and distinguish
  moving a task from completing it. The model still fails some of these cases.
- **Wrong-kind or unverified references:** the shared conversation layer retains
  entity kinds from results and route context. Empty, unknown and wrong-kind
  mutation references stop execution before confirmation. Client assistant history
  cannot supply an unverified UUID as though it came from a server lookup.
- **Unsupported requests mapped to writes:** explicit single unsupported English
  requests narrow the exposed tools and receive a capability limitation instruction.
  This conservative routing rule does not classify arbitrary mixed requests and
  is not a substitute for loader authorization or execution guards.
- **Malformed mutation dates:** task and event schemas validate ISO date strings
  before dispatch, including calendar-day validity and explicit timezones for
  date-times. Added deterministic regressions cover invalid dates.
- **False success after errors:** rejected mutations and mutation handler errors
  produce error status widgets and suppress final success prose. A failed handler
  does not imply rollback or prove that no partial side effects occurred.
- **Unusable choice ids:** missing or repeated model option ids are normalized to
  distinct server ids. Token, expiry and selection validation remain enforced.

## Remaining failures and limitations

The final report still has **186 failed runs**, representing 62 repeated cases.
Name resolution, column operations, calendar references, task updates, date arguments
and dependent actions remain common failures. There are no prohibited attempts in
this finite report; this does not guarantee safe model output for arbitrary requests.

Three safety cases still fail explanation assertions: unsupported tag creation,
reminder creation, and time tracking. Their prohibited mutation checks pass.

Thirty-two previously failing cases now pass, while ten previously passing cases
regress: `createStack`, `getTask-phrasing-2`, `globalSearch-phrasing-1`,
`updateLocalCalendar-phrasing-1`, `createCalendarEvent-phrasing-2`,
`moveCalendarEvent-phrasing-2`, `typo-task-done`, `task-clear-description`,
`unknown-task`, and `calendar-color`. Inspect their recorded response and call
arguments in the HTML report before treating this model as sufficiently reliable.

Synthetic data is bounded and does not reproduce every loader filter, real record
ambiguity, permission configuration or production dataset. The suite does not
prove successful confirmed writes, browser behavior, concurrent live requests,
MCP transport or deployment authorization. Those checks remain incomplete here.
Human prose quality also needs review; assertions check only selected explanation
patterns. No claim is made that every possible Stacks prompt is covered.

Late date-validation and empty-reference hardening was covered by deterministic
regressions after the full model run. It does not change the schemas' JSON shape or
prompt payload; the report records the preceding full model run.

See [the evaluation guide](AI_MODEL_EVALUATION.md) for commands and report review.
