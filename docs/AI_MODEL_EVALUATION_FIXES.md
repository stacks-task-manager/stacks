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

## Subsequent application hardening

Server-managed name resolution, reference-choice continuation, approval-time id
validation, unsupported-choice rejection, deterministic unsupported responses and
confirmed-action summaries were added after the comparison above. The full matrix
has not been rerun for these changes. A new `route-delete-column-name` fixture
reproduces the reported Temp-column error; all three targeted model runs passed.
Its report is `packages/server/ai-eval-reports/column-reference-fix.html` (ignored).
The current matrix now has 243 cases. The reference and outcome behavior also has
deterministic coverage; no real column was deleted during evaluation.

Verification for this subsequent change: 167 deterministic AI tests passed across 18 files, TypeScript checking passed, and the Temp-column fixture passed three sequential model runs. Its median was 2,601 ms and p95 19,481 ms; one slow first request dominates this tiny sample, so these are not full-suite performance measurements.

## Confirmed column deletion stuck on Thinking

A subsequent live report showed that confirming deletion of Temp never completed.
Read-only PostgreSQL diagnostics found an idle outer deletion transaction and a
second transaction waiting on its task-row lock while updating `timeSpent`.
The outer transaction awaited the second one in application code, so PostgreSQL
could not resolve this as an ordinary database-only deadlock.

The path was `StacksLoader.remove` → `TasksLoader.removeByStack` →
`TimelogsLoader.removeByTasks` → `removeByIds` → `updateTotals`. The final call
omitted the existing transaction. Several authorized task reads also omitted it.
In addition, tasks were hidden before same-transaction total recalculation could
read them. This failure was independent of model interpretation and happened
before the post-action model response.

The loaders now propagate the transaction through task visibility reads and
aggregate recalculation. Column cleanup removes time logs before soft-deleting
tasks. Aggregate queries use tenant and soft-delete filtering so deleted time
logs do not remain in the total. Existing authorization and post-commit realtime
hooks remain in place.

Verification: 176 tests passed across the AI suite and targeted loader regressions
(21 files), and TypeScript checking passed. The loader regressions cover transaction
identity, cleanup ordering, failure stopping, and post-commit total notifications.
These are isolated mock-based tests; the live evidence was read-only lock inspection.
The real Temp column was not deleted by this investigation. The normal server
integration configuration recreates database tables and was not run against the
active development database.

The running server must be restarted to roll back its old blocked transaction and
load the corrected code. Reload the app and make a fresh request/confirmation;
server-issued choices from before restart expire. A post-restart live deletion
remains to be verified.

## Confirmation transcript cleanup

The user subsequently confirmed that deleting Temp succeeded after the transaction
fix. Their transcript exposed redundant confirmation text and mutation presentation.
Structured choice replies now send their question/selection context without storing
an extra user bubble. Answered mutation confirmation controls are hidden from the
visible transcript while their validation state remains stored.

Successful mutations return one plain summary, such as `Column deleted: Temp.`.
The repeated success status and raw `Delete Stack / Deleted / true` result card
are removed. Completed-action text is preserved if a later response fails.
Verification: 168 AI tests, eight client conversation tests, server TypeScript
checking, and diff whitespace checks passed. The client test verifies the Confirm
button sends its token, selected option and context without echoing the reply.

## Reviewer follow-up hardening

The reviewed MCP lifetime gap is closed: connection creation, tool setup and
message assembly are covered by cleanup, and closing precedes debug persistence.
A setup-failure regression checks one terminal error and one close. Runtime and
manual evaluation now share temperature 0 and disabled parallel tool calling;
SDK HTTP tests verify both streamed and non-streamed request serialization.

Registry names retain literal types. The synthetic world has a complete explicit
handler map checked with `Record<AiToolName, MockHandler>`. The generic mutation
fallback is removed. State is isolated per run; filters, dependent creates/moves,
deletions, calendar constraints and invalid requests have regression coverage.
These changes improve the harness rather than proving production loader behavior.

Routing regressions exposed missing reminder/comment/activity and document keywords.
Those words now expose the relevant tools even alongside calendar phrases such as
"this week". Comments acknowledge the schema and prompt-fragment cost of extra
topics. The process-wide 1,000-session cap has a named constant and documented
expiry/rejection behavior; no new configuration switch was added.

The Temp-column model fixture passed three sequential runs with the revised harness,
with no prohibited attempts or provider errors. Its local report is
`packages/server/ai-eval-reports/review-hardening.html`. The full matrix was not
rerun and historical accuracy percentages must not be treated as current scores.

Final verification for this hardening: 197 tests passed across 22 AI/targeted loader
files, TypeScript checking passed, and whitespace checks passed. Evaluations now
create independent conversation state without adding entries to the runtime session
registry. This also prevents larger repetition counts from exhausting the 1,000
runtime-session cap; an isolation regression creates 1,100 evaluation states.

## Relative column placement and confirmation latency (2026-10-14)

- Finding: every write requests confirmation by server policy, even an explicit column creation.
  The user subsequently selected deletions-only confirmation; clear creates, updates, and moves now execute immediately.
- Finding: approved actions invoked another LLM request before acknowledging success. They now
  return the validated tool-result summary immediately, without success cards or duplicate prose.
  Approval ends that turn; multi-action requests can continue on a follow-up using retained results.
- Finding: `listStacks` exposed database row order, which could differ from the board. It now
  returns stored board order and zero-based indices. Relative creates use `beforeStackId` or
  `afterStackId`, resolved through authorized lookups; the transaction computes the current
  insertion position and rejects missing anchors. Existing numeric positions remain supported.
- Validation: 199 unit tests passed; server/evaluator TypeScript check passed. Tests cover the
  exact "in front of Drafts" reference, before/after placement, changed board order, conflicting
  position fields, and no second LLM/MCP request after approval. No live workspace data was changed.
- Model check: Qwen3.6-35B-A3B-oQ4e-mtp, runtime generation settings, three sequential synthetic
  "in front of Done" attempts: 3/3 passed with no prohibited fields/actions or provider errors.
  Median initial inference 4,801 ms; p95 22,162 ms. This measures interpretation/proposal latency,
  not the database operation or post-approval acknowledgement. No production latency claim is made.
  Local report: `packages/server/ai-eval-reports/column-placement-before.html` (ignored by Git).

- "After Done" also passed 3/3 sequential attempts with no prohibited fields/actions or provider
  errors (median 5,066 ms, p95 9,928 ms). Report:
  `packages/server/ai-eval-reports/column-placement-after.html`. These six attempts are targeted
  checks, not a rerun of the full model evaluation matrix.

## Deletions-only confirmation policy (2026-10-14)

The user selected confirmation for deletions only. All mutations still pass the existing schema,
authorized reference-resolution, and target checks. Clear creates, updates, and moves execute
through their local/MCP handler immediately; missing or ambiguous targets still stop for clarification.
Each mutation ends the turn, preventing repeated or concurrent writes. Immediate successes use
`mutationSummary` and retain the actual result; failures do not claim success. Deletions retain
server-issued tokens, exact stored arguments, and replay protection. The synthetic evaluator uses
the same policy and reports the server's tool-result summary.

Validation for the policy change: 206 unit tests passed and the server/evaluator TypeScript check
passed. Targeted synthetic model evaluations passed 3/3 immediate relative-column creations and
3/3 deletion proposals (Confirm/Cancel, no deletion before approval), with no prohibited-action
failures or provider errors. Reports: `packages/server/ai-eval-reports/deletions-only-create.html`
and `packages/server/ai-eval-reports/deletions-only-delete.html`. No user workspace records were
changed and the complete model matrix was not rerun.

## Filtered task navigation and overdue follow-ups (2026-10-15)

The reported chat claimed it opened task views without changing the URL. Investigation found:

- `findTasks` always emitted a button, even with `AI_CHAT_AUTO_REDIRECT=true`. It now follows
  the same navigation mode as `navigate` and `openProfile`.
- Neither task tool exposed an overdue filter. `overdueOnly` now maps to `overdue=true` through
  the Tasks URL, client API parameters, REST validation, and authorized loader. It means an
  incomplete task whose due date is strictly before now; date-window overlap is not equivalent.
- Assignee arrays generated PostgreSQL `&&` against the JSONB assignees column. The loader now
  uses OR-ed JSONB containment predicates, preserving any-assignee matching and project ACL filters.
- The chat omitted current task query parameters, so narrowing follow-ups lacked the active filter
  context. Recognized current filters now reach Current UI through bounded optional `clientRoute.search`.
- The configured model initially claimed "Showing overdue tasks assigned to you" without a tool
  call in 3/3 synthetic attempts. Prompt instructions now distinguish data questions from changing
  an open filtered view, require a fresh call for each filter change, and distinguish link mode
  from automatic navigation. `findTasks` finishes from its validated path with a server summary,
  avoiding another model request just to acknowledge navigation; failures do not claim success.

Executed evidence: the five new focused server regressions failed before the implementation and
passed afterward. The final affected server/unit selection passed 211 tests; client tests passed
13 tests, including real React Router query updates, link-mode click behavior, filter transport,
and URL-to-API parsing. Server/evaluator and app TypeScript checks passed. Focused app ESLint
passed with two warnings. SQL verification used Sequelize's PostgreSQL generator with mocked
loaders, not a live database. No browser E2E or live database query was run for this change.

Synthetic model checks used `ISTA-DASLab/Qwen3.8-Flash-Next-GSQ-RCO-Coder-GGUF:IQ1_M`, temperature 0,
thinking-disable requested, sequential execution, and three repetitions each. After prompt-only
changes, the overdue case passed 2/3 with one timeout during the additional response request.
With the tool-result acknowledgement, overdue navigation passed 3/3 (median 3,837 ms, p95 10,553 ms).
The original "show me all the tasks assigned to me" request passed 3/3 routing/argument checks
using `listTasks`, with no unwanted navigation (median 5,371 ms, p95 8,158 ms). These are targeted
routing/argument checks with synthetic tool output, not a comprehensive grade of response prose
or a controlled latency benchmark. The full model matrix was not rerun.

Ignored local reports: `packages/server/ai-eval-reports/overdue-task-navigation-final.html` and
`packages/server/ai-eval-reports/assigned-tasks-chat.html`. No user workspace records were changed.

## Task lists open the app by default (2026-10-15)

The user changed the task-list output policy: "show me", "list my tasks", task searches,
and filtered task-list questions now use `findTasks` by default. The assistant must not first
print rows or ask whether to open the view. Explicit "here/in chat/as text" or "don't navigate"
requests use `listTasks`, and that explicit output choice survives narrowing follow-ups even
when the current route is Tasks. Internal lookups, counts, and analysis still use `listTasks`.
Specific record details are unaffected. Automatic navigation continues to honor
`AI_CHAT_AUTO_REDIRECT`.

Updated core/task fragments, both tool descriptions, the canonical `listTasks` example, and
existing fixtures that previously expected chat output for ordinary task-list requests. Added
regressions for the exact assigned-tasks request, overdue navigation, explicit chat, explicit
no-navigation, and a chat-only overdue follow-up. This policy supersedes the previous default
recorded above; earlier `assigned-tasks-chat` reports describe the former policy.

### Verification of the task-list output policy

Executed the AI unit selection after updating the policy: 209 tests passed and the server/evaluator
TypeScript check passed. A later focused run against the current workspace passed all 20 prompt,
catalogue, and navigation-widget tests, and TypeScript passed again.

Live synthetic model cases `task-list-default-assigned`, `task-list-default-overdue`,
`task-list-explicit-chat`, and `task-list-explicit-no-navigation` each passed 3/3 sequential runs:
12 passing routing/argument checks. The `task-list-chat-followup` case hit three 60-second provider
timeouts; one attempt had already issued the correct `listTasks` call before timing out during
response completion. Those timeouts do not establish a routing assertion failure, nor do they
verify a completed response. Earlier reports remain available; the full model matrix was not rerun.
Reports are ignored files under `packages/server/ai-eval-reports/task-list-*.html`.

The follow-up completed successfully in a separate single run with a 120-second timeout
(86034 ms). It used `listTasks` with the expected assignee and overdue filters and did
not navigate, despite the current Tasks route. This verifies one completed follow-up; it does not
convert the original three timeouts into passes. Report:
`packages/server/ai-eval-reports/task-list-chat-followup-extended.html`.

## Task filters for tags, statuses, priority, progress and date windows (2026-10-15)

The Tasks view and the AI task tools gained filters that previously had no argument: tags, status,
priority, progress comparisons, and explicit due/start date windows. The route schema, loader,
client, and both AI tools were extended together so chat rows and navigation stay consistent.

Progress uses an explicit operator string (`gt:60`, `gte:60`, `lt:20`, `lte:20`, `eq:0`) because a
bare number cannot express "above/below/equal"; the loader parses the same grammar and rejects
malformed operators with `Errors.badRequest` instead of ignoring them. Relative words remain the
assistant's job: the prompt instructs it to emit ISO `dueFrom`/`dueTo` and `startFrom`/`startTo`
windows, and the URL/API stay ISO-only. Plain "overdue" keeps `overdueOnly` rather than being
approximated by a window. Tag and status ids come from `listTags`; `tagIds`/`statusTagIds` joined
the existing server-managed reference resolver so labels resolve before execution.

Eval coverage added fixtures for a due-this-week window, a due-tomorrow chat window, a start-next-week
window, progress above and at-zero requests, tag, status, and priority filters, each asserting the
expected tool and arguments while prohibiting the old approximations (`from`/`to`, `overdueOnly`,
`doneFilter`) where they would be wrong. The evaluation harness `filterTasks` mirror in
`packages/server/scripts/ai-eval/world.ts` now applies the same operators and day windows so count
checks cannot pass against a looser predicate.

Review follow-ups on the same filters (2026-10-15): the count route moved above `GET /:id` so
`/api/tasks/count` cannot be captured as a task id; the loader reads `dueFrom`/`dueTo`/`startFrom`/`startTo`
as whole UTC calendar days (`utcDayBounds`) instead of host-timezone day edges, and rejects impossible
bounds such as `2026-02-30`; the Tasks view parses filter dates with a validating reader that drops
unparseable values, so `qs` never receives `Invalid Date`; `aiDateInput` now requires an explicit
timezone for date-times and `utcWindowDate` normalises model dates to `…T00:00:00.000Z`; the evaluation
world lists the `Bug` tag and `In Progress` status so those names resolve exactly; and the filtered-table
Playwright spec drives tag, status, progress, and window filters through POM helpers that await the
filtered API response and the rendered empty state.

Further review follow-ups on the same filters (2026-10-15): the loader's four `Errors.badRequest`
messages now go through `translate` with the offending value in the error `context`, matching the
convention in the other loaders, and the new `Invalid progress filter`, `Invalid progress filter value`,
`Invalid date window`, and `Invalid date range` keys were added to `locales/server/en.json` through
`@stacks/locales-tui`. The loader test now pins all five progress operators: mutating `gt` to `gte` or
`lte` to `lt` previously left the suite green.
