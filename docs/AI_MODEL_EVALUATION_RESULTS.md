# Expanded Stacks prompt evaluation — 2026-10-13

## Scope

The manual suite now contains 242 English cases: 114 tool cases (three phrasings for each of
38 registered tools), 75 interpretation cases, and 53 safety cases. The matrix checks explicit
arguments and prohibited actions, and selected replies have content, clarification, error,
truncation, or false-success assertions. See [the guide](AI_MODEL_EVALUATION.md).

## Live evaluation attempt

Configured model: `ggml-org/Qwen3.6-27B-GGUF:Q4_K_M`. Temperature: 0. Automatic provider retries:
disabled for the expanded runner. Synthetic tools only. No workspace changes were made.

| Check                                                        | Result                                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Endpoint `/models`                                           | HTTP 200; returned the configured model id.                              |
| Plain Chat Completions, “Reply with OK”, 64-token limit      | Timed out after 30 seconds.                                              |
| Initial `listProjects` evaluation                            | Timed out after 60 seconds.                                              |
| Expanded suite, three repetitions, 30-second per-run timeout | Three consecutive `listProjects` attempts timed out; evaluation stopped. |
| Planned runs                                                 | 726                                                                      |
| Attempted runs                                               | 3                                                                        |
| Unevaluated runs                                             | 723                                                                      |
| Provider errors                                              | 3                                                                        |
| Attempt latency median / p95                                 | 30,060 ms / 30,527 ms                                                    |

The model did not return a completed response for these attempts. **Prompt interpretation, response
quality, argument accuracy, and mutation safety remain unmeasured.** Zero recorded prohibited
attempts during these timeouts does not establish safe behavior. The observed latency is the timeout
boundary, not successful inference performance. Endpoint reachability alone does not establish readiness.

The full JSON is saved locally at `packages/server/ai-eval-reports/expanded-current.json`, with an
`incomplete` status. This directory is ignored by Git. The initial attempt is in `provider-smoke.json`.
No baseline comparison was performed because inference was unavailable.

## Deterministic verification

All 18 evaluation/catalogue regression tests passed. These check scoring, literal versus reference
arguments, equivalent dates, fixture uniqueness, tool/schema compatibility, response assertions, and
coverage of all registered tools. TypeScript checks passed, and the CI refusal was confirmed.
These checks validate the test harness; they do not measure live model quality.

## Repeat after restoring inference

From the repository root:

```bash
# Confirm actual tool calling first
yarn test:ai:model --fixture=listProjects --runs=1 --output=ai-eval-reports/smoke.json

# Then evaluate the expanded matrix
yarn test:ai:model --runs=3 --output=ai-eval-reports/expanded-current.json
```

For slower inference, increase `AI_EVAL_TIMEOUT_MS` in `packages/server/.env`. Check the model
server logs for loading, queueing, or generation failures. The evaluation runner does not modify
provider settings. Review per-case responses and failure reasons after a successful run; the suite
assertions are bounded checks and do not grade every possible meaning or wording.
