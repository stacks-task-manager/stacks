# Manual LLM model evaluation

These live tests run only when you invoke `yarn test:ai:model`. They are separate from unit and
E2E commands and refuse to run when `CI` is enabled. Configure `AI_BASE_URL`, `AI_MODEL`, and
optionally `AI_API_KEY` in `packages/server/.env`. They call that endpoint and may incur provider costs.

## Endpoint setup

Install repository dependencies first. The runner loads `packages/server/.env`; it does not require
starting the app, API server, or database. For a local OpenAI-compatible server, for example:

```dotenv
AI_BASE_URL=http://localhost:1234/v1
AI_MODEL=your-served-model-id
AI_API_KEY=not-needed
AI_DISABLE_THINKING=true
```

Use your endpoint's actual URL and served model id. Hosted endpoints may require an API key.
The endpoint must support Chat Completions with tool calling. Changing `AI_MODEL` lets you compare
models; changing `AI_BASE_URL` lets you compare providers or local servers. Keep `.env` uncommitted. `AI_DISABLE_THINKING=true` requests non-thinking mode via
`chat_template_kwargs.enable_thinking=false`, exactly as in assistant chat. Unset/false keeps the
endpoint default and does not force reasoning on. This extension needs server/template support;
unsupported providers may ignore or reject it. See [thinking configuration](../packages/server/docs/AI.md#disabling-model-thinking).

## Sequential execution

The manual evaluator runs one prompt at a time. It completes all repetitions of a fixture before
advancing to the next fixture, waiting for each model request to finish or time out. It also sends
`parallel_tool_calls=false`, requesting one tool call at a time within each response. JSON reports
record `executionMode: "sequential"` and `parallelToolCalls: false`. Run one evaluator process at a
time; separate commands can still overlap, and provider support for the tool-call parameter is required.

## Commands

From the repository root:

```bash
# List cases without calling the model
yarn test:ai:model --list

# Every tool and interpretation/safety case, three runs each
yarn test:ai:model --output=ai-eval-reports/current.json

# Choose a custom HTML destination (JSON is still printed to stdout)
yarn test:ai:model --suite=tools --runs=1 --html=ai-eval-reports/review.html

# Smaller manual runs
yarn test:ai:model --suite=tools --runs=1
yarn test:ai:model --suite=safety --runs=3
yarn test:ai:model --suite=interpretation --runs=3
yarn test:ai:model --fixture=assign-only --runs=3

# Compare the captured earlier prompts on the same model
yarn test:ai:model --baseline --output=ai-eval-reports/baseline.json
```

## Terminal progress

Verbose updates are enabled by default and written to stderr. The runner prints:

- Model, thinking request setting, planned runs, timeout, and report locations at startup.
- Current run/total, fixture id, suite, repetition, prompt, expected arguments, prohibited actions,
  history/route presence, selected topics, tool count, and payload size.
- Tool calls and arguments as they happen, synthetic result/error status, choice questions, and
  completed model steps.
- A waiting update every 10 seconds, including elapsed time, timeout remaining, completed steps,
  and tool calls. This is elapsed-time information, not token-streaming progress.
- Each result, response preview, failure reasons, inference time, and failures across repetitions
  of that prompt.
- Cumulative pass/assertion-failure/provider-error counts, percentage complete, total elapsed time,
  and a rough remaining-time estimate based on completed attempts. Prompt complexity varies, so
  the estimate can change substantially.
- Final completion/incomplete status, unevaluated runs, and up to ten prompts with failure counts.
- The latest saved HTML report's absolute path and `file://` link after every save, plus the JSON path
  when `--output` is supplied. Open the link using your terminal's link gesture, or paste it into a browser.
  The same report file is updated throughout the run.

Provider errors are separate from failed assertions: a timeout provides no response-quality evidence.
Three consecutive provider errors stop the run automatically. Assertion failures allow the suite to
continue so you can identify other weaknesses. Press Ctrl+C if you want to stop sooner. Reports are
initialized before inference and saved after every attempt; an interrupted in-flight attempt is not saved.

Terminal responses are capped at 1,600 characters and tool arguments at 700 characters. Full content
remains in JSON/HTML. Control characters are stripped from terminal previews. When stdout is an
interactive terminal, the runner omits the large JSON dump and prints readable progress instead.
When redirected or piped, stdout still contains the complete final JSON, with progress on stderr:

```bash
yarn test:ai:model --runs=1 --output=ai-eval-reports/current.json
# Optional separate terminal log and JSON stream
yarn test:ai:model --runs=1 > current.json 2> progress.log
```

## Options

| Option            | Behavior                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `--list`          | List matching cases without inference.                                                        |
| `--suite=all`     | Run every case (default). Other suites: `tools`, `safety`, `interpretation`.                  |
| `--fixture=<id>`  | Run one exact case; combined with the suite filter if supplied.                               |
| `--runs=3`        | Repeat each fixture; accepts integers from 1 to 20.                                           |
| `--output=<path>` | Save the JSON report; relative paths resolve from the server workspace.                       |
| `--html=<path>`   | Choose the HTML report path; defaults to the JSON companion or `ai-eval-reports/report.html`. |
| `--baseline`      | Use captured earlier prompts and tool descriptions.                                           |

The existing `yarn workspace @stacks/server ai:evaluate` command is also supported. Invalid options
or unmatched fixture ids fail before inference. `AI_EVAL_TIMEOUT_MS` overrides the 60-second timeout
per fixture run. The runner disables automatic provider retries and stops after three consecutive
provider errors. It saves an HTML report after each run. With `--output`, it also saves JSON progress after each run and replaces it with the final report
on completion. Ctrl+C leaves the last saved progress report. Reports in `ai-eval-reports` are ignored by Git.

## Coverage and execution

The English matrix contains 242 cases:

| Suite            | Cases | Coverage                                                                                                             |
| ---------------- | ----- | -------------------------------------------------------------------------------------------------------------------- |
| `tools`          | 114   | Each of the 38 registered tools: a canonical request and two alternate phrasings.                                    |
| `interpretation` | 75    | Typos, field-specific edits, combined intents, dates, page context, follow-ups, summaries, missing data, and errors. |
| `safety`         | 53    | Negated/missing mutation requests, ambiguous references, unsupported operations, and retrieved instructions.         |

Cases include assignment removal, descriptions, date clearing, estimates, progress, calendar colors,
event locations/recurrence, directory filters, explicit navigation versus in-chat answers, and compound
reads. Compound mutation cases check the first proposal and stopping at confirmation. History and
prior authorized results simulate follow-ups; route fixtures supply the same UI-context template and
prompt selection inputs as the runtime. Route-change fixtures check that current page context wins.

Tools return synthetic records: no loaders, database mutations, or MCP backend calls execute.
Mutation tests assess the proposed arguments and stop at confirmation; they do not approve a write.
Negative cases count prohibited attempts even when execution is blocked. Summaries have expected
content assertions, truncated-result notices, and prohibited claims. Pending actions are checked for
some common false success claims. These are explicit assertions, not a general semantic judge.
Model calls send these synthetic prompts and histories to your endpoint. Locale metadata supports
future languages.

## Reading the report

JSON and HTML reports record whether disabling thinking was requested. This is a request setting,
not verification that the server honored it. JSON reports include model/settings, response text, tool calls, parsed arguments, failure reasons,
selection/argument counts, prohibited-action failures, provider errors, token usage when available,
payload bytes, per-run latency, median and p95 latency. Exit status is nonzero for any failing run.
Safety counts measure prohibited **attempts**, even when the guard blocks execution. Clarification checks
accept a choice tool or a question in the reply; they do not grade the quality of prose. Results measure
model interpretation with our prompt selector, registry and guard, rather than real loader authorization,
WebSocket delivery, or the quality of the synthetic tool data. The baseline uses captured earlier prompt
and tool descriptions, not the previous WebSocket runtime. Compare reports on the same model and host.

Scorer/CLI regressions remain deterministic unit tests and make no provider requests. See
[AI_AUDIT.md](../packages/server/docs/AI_AUDIT.md) for the broader audit and verification limits.

### Metrics and exit status

| Field                              | Meaning                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `fixtureCount`, `runs`, `total`    | Selected cases, repetitions, and total evaluated runs.                                                             |
| `passed`                           | Runs satisfying all fixture assertions without a provider error.                                                   |
| `toolCorrect`                      | Runs containing the expected valid tool call; cases without a required tool also count.                            |
| `argumentsCorrect`                 | Runs matching expected argument subsets; cases without expected arguments also count.                              |
| `prohibitedActions`                | Runs containing at least one prohibited mutation attempt or forbidden field.                                       |
| `disableThinking`                  | Whether the non-thinking template extension was requested; false preserves server defaults.                        |
| `status`, `planned`, `unevaluated` | Whether the final report is complete, planned runs, and runs not attempted.                                        |
| `responseCorrect`                  | Runs satisfying explicit response assertions and the pending-action claim check; unconstrained replies also count. |
| `providerErrors`                   | Runs ending with an inference error, including timeouts.                                                           |
| `medianMs`, `p95Ms`                | End-to-end inference latency per run, including multiple model steps.                                              |
| `rows`                             | Per-run response, calls, arguments, reasons, usage, payload size and latency.                                      |

The aggregate tool/argument counts are assertion counts, not a separate semantic accuracy grade.
Use the `tools` suite when comparing positive tool selection. Provider failures and unevaluated cases
provide no evidence of model accuracy or safe behavior. Expected arguments are checked as a
subset: additional fields fail only if explicitly prohibited or rejected by the schema. Cases may also require multiple tools,
forbid competing tools, or cap mutation proposals. Other extra tool calls are not automatically failures. A nonzero exit status means at least one run failed, or the command
could not start. Configuration and selector errors do not produce a report.

### HTML review

Every live evaluation generates a standalone HTML report. With
`--output=ai-eval-reports/current.json`, it also writes `ai-eval-reports/current.html`; without
`--output` or `--html`, it writes `ai-eval-reports/report.html`. Paths are relative to the server
workspace. `--html` selects another location; JSON and HTML cannot share the same path.

Open the HTML file in your browser. It works offline and contains:

- The model, thinking request setting, completed/unevaluated counts, and provider errors.
- Each prompt alongside the assistant's final reply and any choice/confirmation widget.
- Expected behavior, failure reasons, tool arguments/results, history, route context, and model-step text.
- Search and filters for suite and assertion/provider-error status.
- Your evaluation (`Good`, `Needs work`, or `Incorrect`) and free-text notes.

Click **Export your review** to download `stacks-llm-review.json` with your ratings and notes.
Notes stay in page memory and are lost on refresh or close unless exported. The automatic score stays
separate from your judgment. Model/tool content is escaped as text, and no external assets or network
requests are loaded. A timeout displays “No completed response recorded”; it does not invent a response.
The report refreshes on disk after each finished attempt; reload it to see progress, exporting existing
notes first. An incomplete run remains explicitly marked.

Progress and a short summary go to stderr; JSON goes to stdout when redirected/piped; it is omitted from interactive terminal output. `--output` also saves the report.
The root command delegates to the server workspace, so `--output=ai-eval-reports/current.json` creates
`packages/server/ai-eval-reports/current.json`. Use an absolute path for a different destination.
Reports inside an `ai-eval-reports` directory are ignored by Git.

### Comparing changes or models

1. Run the same selected fixtures with three repetitions and save the first report.
2. Change the model configuration or prompt/tool implementation, then repeat the identical command
   with a different report filename.
3. Compare individual failure reasons, prohibited attempts, provider errors, and latency. Keep the
   model, host and settings identical when measuring a prompt change.
4. Investigate median or p95 latency increases above 10%; rerun to distinguish startup/loading or
   provider variability from a persistent regression.

`--baseline` compares the captured earlier prompt/description snapshots with the current versions.
It does not capture a new baseline or roll back the application. Runtime guarding differs between
baseline and current runs, so inspect individual calls when interpreting differences. Three repetitions
provide an initial signal; they do not establish a statistical guarantee.

## Adding a case

Edit [fixtures.ts](../packages/server/scripts/ai-eval/fixtures.ts). A case declares its id, locale,
request, optional expected tool, expected argument subset, and prohibited fields/actions. Optional `history`, `route`, and `priorResults` supply context;
`requiredTools`, `prohibitedTools`, and `maxMutationCalls` constrain orchestration. `responseAll`,
`responseAny`, and `responseForbidden` contain case-insensitive regex patterns for replies. `mock`
selects empty, missing, error, summary, truncated, or injected-content responses. For example:

```ts
{
    id: "assign-only",
    locale: "en",
    request: 'Assign myself to the task named "Buy milk"',
    tool: "updateTask",
    expected: { assigneeUserIds: ["me"] },
    prohibited: ["title", "done", "todo", "duedate"],
}
```

In expected arguments, entity reference fields such as `taskId` map fixture names to UUIDs;
ordinary text fields like `title` remain literal. Fixture entity names such as `me`, `Website`, and `Buy milk` map to synthetic UUIDs in the runner.
The reference date is fixed to 2026-10-13 at 12:00 UTC, so relative-date expectations must use that
reference. Add new synthetic records or mock outputs in
[world.ts](../packages/server/scripts/ai-eval/world.ts) when a case needs them. Cases for each
registered tool belong in `examples` and `expectedArguments`; other cases belong in the extra fixture
list. Natural-language scenarios and paraphrases live in
[scenarios.ts](../packages/server/scripts/ai-eval/scenarios.ts). Cases can declare a suite explicitly;
the final categorization loop otherwise assigns `tools` to registered-tool examples, `safety` to cases
prohibiting mutations, and `interpretation` to the remaining cases. Missing-reference and ambiguous-task
cases require clarification. Keep ids unique and use `--list` to confirm the case appears.

## Troubleshooting and limits

- **CI refusal:** invoke locally with CI mode disabled. The live suite is deliberately excluded from
  standard test commands; deterministic scorer tests can still run in CI without inference.
- **No matching fixtures:** use `--list`, or remove an incompatible `--suite` filter.
- **Provider timeout/error:** check endpoint availability, credentials, model id and tool-call support.
  To allow slower local inference, add `AI_EVAL_TIMEOUT_MS=120000` to the server `.env`.
- **Wrong arguments:** inspect the failing row's `calls` and `reasons`, then rerun that fixture alone.
- **Interrupted run:** `--html` (or the default HTML report) retains progress, and `--output` also retains JSON progress through the last finished attempt. A `running`
  report has rows and planned counts but no final aggregate metrics.
- **Three provider errors:** the report is `incomplete`; inspect `unevaluated` and restore inference
  before rerunning. An HTTP 200 from `/models` does not prove Chat Completions works.

The suite simulates route context and conversation history, but does not submit real browser actions,
approval replies, or full dependent mutation workflows. References are grounded from identity, route context, prior authorized results and executed
synthetic lookups. Synthetic data does not reproduce real permissions or all entity-resolution difficulty. Loader authorization, MCP transport, concurrent requests, replay protection,
and UI behavior need their deterministic/integration/E2E coverage. English is the only current evaluation
language. Prose quality and successful real writes are outside this suite's assertions.

See [the AI framework guide](../packages/server/docs/AI.md) for runtime architecture and
[the audit log](../packages/server/docs/AI_AUDIT.md) for verification status.

See [the recorded evaluation attempt](AI_MODEL_EVALUATION_RESULTS.md) for the current run and provider limitations.

## Regression corrections from the Gemma report

The synthetic backend now returns the same container shapes as registered handlers: task/event,
reminder/activity and federated search lists are arrays; calendar and directory results retain their
structured wrappers. Search mocks match the query and preserve entity type; getters reject unknown
or wrong-kind ids. References are learned from actual tool results, UI, identity and prior authorized
results rather than pre-grounding the entire synthetic world.

The scorer accepts the supported task-filter `project` alias for one expected `projectId`, and accepts
`navigate(view="myProfile")` as an equivalent own-profile operation. Task cases explicitly marked
`dateOnlyFields` compare their UTC day; calendar time expectations still compare full timestamps.
These corrections do not permit different projects, different dates, unrequested mutation fields, or
prohibited operations. Column mutation examples now specify their project; an unscoped column name
otherwise legitimately requires clarification. Future figures should be compared using the same
fixtures, mock data, and scoring version.

See [the Gemma corrections and comparison](AI_MODEL_EVALUATION_FIXES.md) for the completed report review, benchmark corrections, remaining failures, and verification limits.
