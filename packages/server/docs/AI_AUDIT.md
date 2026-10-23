# AI assistant audit — 13 October 2026

The assistant now uses the configured OpenAI-compatible LLM for planning and replies. The bundled
inference runtime, model downloads, worker, preparation scripts, shadow/confidence configuration,
benchmarks, startup initialization, and build hooks were removed. Generic result cards, conversation
identity, scoped choices, and useful regression cases were retained independently of inference.
Existing uncommitted task-assignment and dependent-creation fixes were reconciled into prompt guidance,
execution confirmation, and synthetic evaluation cases rather than retained as English regex patches.

## Findings and corrections

| Finding                                                                    | Correction                                                                                                                           | Evidence                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| LLM could continue tool calls after asking a question                      | Shared execution guard stops subsequent and parallel calls; SDK stops further steps                                                  | Conversation boundary tests                                                   |
| LLM mutations lacked the planner's server-issued approval boundary         | Every mutation proposes exact schema-validated arguments; a scoped token approves the stored action                                  | Local/MCP orchestration and cancellation/replay tests                         |
| Invented target ids could reach mutation handlers                          | References must be supplied by the user, current UI, identity, or authorized results; loaders still check authorization on execution | Grounding tests and existing ACL loader tests                                 |
| Duplicate actions and failed reply generation could obscure completed work | Request-id response cache, per-turn duplicate-call blocking, no mutation retry, retained result cards                                | Orchestration tests                                                           |
| SDK error callbacks could send both error and done                         | Emit a single terminal response after stream consumption; bounded model timeout                                                      | Stream error regression test                                                  |
| Task tool descriptions contradicted the task prompt                        | `listTasks` serves task questions and resolution; `findTasks` serves explicit UI navigation                                          | Prompt/catalogue tests and evaluation fixtures                                |
| Calendar/board plural nouns could hide needed tools                        | Recognize calendars, columns, stacks and other board plurals                                                                         | Prompt selection regression tests                                             |
| Chat omitted the third route segment                                       | Send `childId` for nested record context                                                                                             | Client/server TypeScript checks; existing route parsing tests                 |
| Mutation proposals could include unrequested fields                        | Prompt explicitly prohibits echoing existing values; exact field proposal requires user approval                                     | Assignment/creation/date-clearing fixtures; model accuracy remains unverified |
| Radio/checkbox selectors targeted hidden inputs                            | Visible labels and separate input identifiers; POM uses test ids for both                                                            | Passing browser widget suite and client regression test                       |
| MCP `isError` could be treated as a success                                | Parse and reject error results; close transport after connection failure; validate remote arguments                                  | MCP result tests; schema boundary tests                                       |
| Prompt context repeated identity/route information                         | Latest-message template preserves only user text; system retains identity and route once                                             | Prompt tests; captured baseline templates                                     |
| Retrieved content could be interpreted as instructions                     | Explicit trust rules; retained data outside system instructions; mutations always require user approval                              | Deterministic execution boundary; injection evaluation fixture                |
| CommonJS bundling emptied `import.meta.url` in the MCP client              | Resolve the SDK from `__dirname` and use exported `.js` paths; verified unsigned bundle and SDK loading                              | Server bundling check                                                         |
| Incremental compilation retained removed runtime modules                   | Clean generated server output before build and both bundling paths                                                                   | Build output inventory                                                        |
| Model evaluation lacked a meaningful failure gate                          | Every registered tool has a fixture; incorrect arguments, prohibited fields/actions and provider errors fail evaluation              | Catalogue coverage test                                                       |

## Validation and limitations

Server build and server/app TypeScript checks pass. The focused server suite passed 97 tests, including AI and ACL loader checks. Client tests passed
5 cases, and Playwright passed all 7 checks including authentication setup. The browser suite validates choices, answered-state
persistence, result cards, and navigation against the running app. Orchestration tests exercise exact
approved mutation dispatch through local and MCP adapters using synthetic handlers. These are not
live mutation tests against an external provider or a disposable deployment database.

The configured model is `Qwen3.6-35B-A3B-OptiQ-4bit` on the development Mac (Node 24.14.1,
darwin-arm64). Its model-list availability probe timed out. Three baseline and three current
`listProjects` chat probes also timed out at 10 seconds without producing tool calls. Thus there are
no valid model accuracy or completed-request latency measurements, and no claim of a performance
improvement or passing full model evaluation. Timeout durations are not inference performance data.
The full fixture matrix was not run against this unavailable endpoint.

The committed evaluation runner remains runnable once the endpoint responds:

```bash
yarn workspace @stacks/server ai:evaluate > current.json
yarn workspace @stacks/server ai:evaluate --baseline > baseline.json
```

Run both on the same host/model/settings, compare passing fixtures and token/payload overhead, and
investigate median or 95th-percentile latency increases above 10%. Baseline assets capture the earlier
prompts and tool descriptions; they do not reproduce the old orchestration implementation. Each
fixture runs three times, uses synthetic results, and cannot execute loaders or MCP mutations.

English is the only evaluated language. Choice state is memory-only, expires after 30 minutes of
inactivity, and is lost on restart. Every mutation requires confirmation, including subsequent actions
in a dependent batch; batches are not atomic. Prompt instructions cannot guarantee model accuracy;
confirmation and loader authorization provide the execution boundary. Live model accuracy, live
mutation E2E, and Docker image build checks remain deployment validation work (the local Docker daemon is unavailable).

## Subsequent Gemma evaluation

The later Gemma endpoint completed the full synthetic matrix. See [the correction log](../../../docs/AI_MODEL_EVALUATION_FIXES.md) for before/after results and remaining failures. This supersedes the earlier provider-unavailable limitation for synthetic model evaluation; live mutation, MCP and deployment checks remain incomplete.
