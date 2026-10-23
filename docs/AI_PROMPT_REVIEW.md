# AI prompt and context-cache review — 16 October 2026

## Review boundaries and findings

This review covers the built-in assistant and external MCP tool guidance. Public tool names,
validation rules, handlers, return shapes, authorization, confirmation guards, and WebSocket
contracts are preserved. Coding-agent instructions are outside scope.

| Surface reviewed                | Finding                                                                                                                                      | Change / retained behavior                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Core system instructions        | Dense shorthand mixed capability, context, action, and output rules.                                                                         | Organized sections, explicit precedence, examples of commonly confused mutations, accurate failure/partial-result guidance.           |
| Five domain fragments           | Some fragments were compressed to a few lines; task guidance embedded the user id.                                                           | Expanded relevant explanations, preserved domain behavior, moved identity references to dynamic context.                              |
| Current UI and user wrapper     | Route references appeared in both system and user messages despite documentation claiming otherwise.                                         | Latest user text is verbatim; UI context appears once after stable instructions and cannot override explicit user targets.            |
| Tool and parameter descriptions | Several descriptions lacked output limits, clearing behavior, or actual return fields; some MCP tools required lookups not exposed over MCP. | Clarified affected contracts and accepted references, without changing schema validation.                                             |
| MCP initialization              | External agents received no server workflow instructions and could infer chat-only safeguards.                                               | Added server instructions and read-only/destructive annotations; direct mutation execution and host-owned authorization are explicit. |
| Request assembly                | Full timestamp near the beginning disrupted reuse of later instructions. Runtime and evaluator assembled prompts separately.                 | Shared stable/dynamic assembly, separate system messages, deterministic registry order.                                               |
| Model requests                  | Runtime streaming and evaluator non-streaming calls had no shared cache configuration or cache accounting.                                   | One model wrapper applies provider-aware policy to every SDK step and observes raw JSON/SSE usage.                                    |
| Cache metrics                   | SDK normalization can turn absent provider fields into zero and discard newer fields.                                                        | Raw telemetry preserves read/write counts; unknown remains null. Streaming bytes pass through unchanged.                              |
| Evaluation baselines            | Historical baseline uses different execution behavior and cannot isolate this rewrite.                                                       | Added immutable current prompt/tool snapshots and targeted/full comparisons using identical execution guards.                         |

All 38 registered tools and their parameter definitions were reviewed against their handlers:

- Projects: listProjects, createProject, getProject.
- Columns: listStacks, createStack, updateStack, deleteStack.
- Tasks: findTasks, listTasks, getTask, createTask, updateTask, moveTask, deleteTask.
- Directory/navigation: searchPeople, getPerson, openProfile, navigate.
- Workspace reads: listTags, listCompanies, getCompany, listBookmarks, globalSearch.
- Notepads/activity/reminders: listNotepads, summarizeNotepad, listActivities, listReminders.
- Calendars: listCalendars, createLocalCalendar, updateLocalCalendar, deleteLocalCalendar.
- Events: listCalendarEvents, getCalendarEvent, createCalendarEvent, updateCalendarEvent,
  moveCalendarEvent, deleteCalendarEvent.
- Structured clarification: askUserChoice.

Descriptions already aligned with implementation were retained. For example, task filter operators,
directory filter conjunction/defaults, and choice widget controls remain unchanged. Result-size limits
remain intact. getTask exposes only id/title/description/done/duedate/assignees/project/stack;
instructions must not promise fields absent from that result.

## Caching behavior

Shared instructions and model-facing tool schemas form the reusable prefix. Date, identity,
route, and retained results remain fresh per request. Keys hash deployment namespace, tenant scope,
endpoint/model, stable instructions, and actual tool definitions. They contain no credentials,
raw identities, or user messages.

Auto mode adds cache hints only to the official OpenAI HTTPS endpoint. Explicit compatible-provider
mode is opt-in; unknown endpoints retain stable complete requests without unsupported parameters.
Modern OpenAI options and the explicit stable-prefix breakpoint use the documented Chat Completions
wire format, since the installed SDK only natively supports keys and legacy retention. No response
cache, mutation replay, provider configuration change, or proactive prewarm is introduced.

Configuration, local-server prerequisites, retention, and external-host responsibilities are described
in the [AI framework guide](../packages/server/docs/AI.md#prompt-authoring-and-context-caching).
This follows the [official cache guide](https://developers.openai.com/api/docs/guides/prompt-caching)
and [Chat Completions contract](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).

## Verification and limitations

Deterministic checks cover stable instruction prefixes despite date/identity/route changes, template
rendering, full-topic selection, provider configuration, opaque scoped keys, schema changes,
streaming/non-streaming serialization, modern explicit boundaries, SDK tool continuations,
raw telemetry aggregation, and byte-preserving SSE handling. Existing AI behavior/guard tests remain
part of the focused verification.

Live evaluation uses synthetic results only. The captured current snapshot is separate from the
historical --baseline fixtures; fixture assertions, execution safeguards, and generation settings
remain identical across the comparisons. Provider errors are not prompt-quality failures.

Topic selection remains the runtime default. Full context is available as an evaluation option.
A default change requires evidence of no new safety failures, then improved task success, fewer
unnecessary calls/clarifications, and finally measured latency/cost including cache reuse. If evidence
is equivalent or incomplete, keep topic selection.

The full three-repetition matrix has 777 runs per configuration in the current checkout. The initial
full baseline was interrupted after six completed runs because observed requests implied roughly
eight hours per configuration. Those six runs passed their bounded assertions; they do not prove
response quality or safety. One baseline answer claimed a page had opened despite link-only mode,
illustrating a limit of tool-selection assertions.

The representative comparison uses eight cases: project listing, assignment-only mutation, default task-list navigation, explicit-chat follow-up, ambiguous task resolution, injected notepad instructions, unspecified event timezone, and an unsupported operation. Each configuration requests three repetitions. Provider-error stops leave cases unevaluated.
The full matrix and model families without configured endpoints remain unverified.

### Executed results

Configured endpoint model: `qwen3.8-flash-next-coder-iq1_m`. No additional model families were
configured or provisioned. All calls used synthetic records; no workspace mutation handlers ran.

| Live check                          | Outcome                                                                                                                                                                                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial pre-edit listProjects smoke | Completed; 5,607 aggregate cached input tokens across model steps. This establishes earlier within-turn reuse, not reuse of the rewritten prefix across user turns.                                                                                                              |
| Captured-current baseline sample    | Stopped after three consecutive 60-second provider timeouts; 3/24 attempts, 21 unevaluated.                                                                                                                                                                                      |
| Rewritten targeted sample           | Stopped after three consecutive 60-second provider timeouts; 3/24 attempts, 21 unevaluated.                                                                                                                                                                                      |
| Rewritten full-context sample       | All five topics and 38 tools were exposed. Stopped after three consecutive 60-second provider timeouts; 3/24 attempts, 21 unevaluated.                                                                                                                                           |
| Independent request cache probe     | Three requests with fresh date context and stable system/tool guidance, no tool execution, output capped at 16 tokens: 14,190 ms / 0 cached tokens; 58,202 ms / 0 cached tokens; third request timed out at 60,005 ms without cache telemetry. Cache-write telemetry was absent. |

The short probe deliberately limits generation and is not a response-quality benchmark; its timings
are not comparable to the behavioral suites. The first probe request was not guaranteed to be
cold. Neither later request demonstrated a cache hit. **Cross-turn cache reuse of the rewritten
prefix remains unverified on this local endpoint.** Confirm the backend's cache configuration and
eligible prefix threshold; only enable optional OpenAI cache fields for an endpoint that documents
them. Application hints cannot force a backend cache hit.

The sample attempts supply availability evidence, not a meaningful accuracy comparison. Final
wording corrections followed incomplete attempts; those attempts cannot establish the quality of
the final prompts. No claim of improved live accuracy, reduced inference cost, universal agent
compatibility, or absence of model safety failures follows from these timeouts.

Executed deterministic verification:

- Focused AI suite: 246 tests passed across 23 files, including actual SDK request serialization,
  model tool continuations, raw streaming telemetry, chat orchestration, and MCP protocol requests.
- Follow-up prompt/catalogue/evaluation checks after wording edits: 35 tests passed.
- Server TypeScript check: passed.
- Targeted Prettier check and `git diff --check`: passed.
- Graft graph refreshed after the implementation changes.

Local JSON/HTML reports and immutable snapshots remain in the ignored
`packages/server/ai-eval-reports/` directory. Relevant names are
`prompt-review-before-sample`, `prompt-review-after-targeted`,
`prompt-review-after-full-final`, and `prompt-review-cache-probe.json`.
Historical baseline fixtures and the existing Playwright edit were preserved. Nothing was staged,
committed, pushed, or merged.
