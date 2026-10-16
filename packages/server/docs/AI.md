# AI assistant framework

How the server's AI chat works: how the browser talks to it, how prompts and tools are assembled per turn, and how to add new tools.

Implementation lives in [`packages/server/src/ai/`](../src/ai). The client widget that drives it lives in [`packages/app/src/app/widgets/aiChat/`](../../app/src/app/widgets/aiChat).

> See also: [server onboarding](ONBOARDING.md) and [`docs/packages/server.md`](../../../docs/packages/server.md).

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Request flow](#request-flow)
- [WebSocket contract](#websocket-contract)
- [Prompt templates](#prompt-templates)
- [Dynamic prompt + tool selection](#dynamic-prompt--tool-selection)
- [Tool registry](#tool-registry)
- [Adding a new tool](#adding-a-new-tool)
- [Adding a new prompt topic](#adding-a-new-prompt-topic)
- [Widgets (button vs. redirect)](#widgets-button-vs-redirect)
- [Testing](#testing)

## Overview

The assistant is an OpenAI-compatible chat model wrapped with the [Vercel AI SDK](https://sdk.vercel.ai/) (`streamText`). For each user turn the server:

1. Picks **prompt fragments** and a **tool subset** from intent + the user's current route.
2. Streams the model output back to the browser over the existing `/ws` WebSocket as `ai_chat_delta` messages.
3. Collects **widgets** (buttons / auto-redirects) from successful tool calls and emits them with the final `ai_chat_done`.

There is no separate HTTP endpoint for chat; everything rides the user's authenticated WebSocket connection.

## Configuration

Set in `packages/server/.env`. All five are described in [`docs/packages/server.md`](../../../docs/packages/server.md#environment) and read in [`src/ai/config.ts`](../src/ai/config.ts) + [`src/ai/chat.ts`](../src/ai/chat.ts):

| Variable                | Purpose                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `AI_BASE_URL`           | OpenAI-compatible endpoint (e.g. a local LLM server). Required.                                                         |
| `AI_API_KEY`            | Key for the endpoint. Defaults to `"not-needed"` for local servers.                                                     |
| `AI_MODEL`              | Model id passed to `openai.chat(modelId)`. Required.                                                                    |
| `AI_CHAT_ENABLED`       | Kill switch — set to `false` / `0` / `off` to disable even when configured.                                             |
| `AI_CHAT_AUTO_REDIRECT` | When `true`, `findTasks`/`navigate`/`openProfile` results auto-navigate the client instead of rendering a click button. |

`isAiChatConfigured()` ([`src/ai/config.ts:20`](../src/ai/config.ts)) returns `false` when the kill switch is on or `AI_BASE_URL` / `AI_MODEL` are missing — in which case `ai_chat_request` messages return an `ai_chat_error` with `"AI chat is not enabled"`.

## Request flow

```
Browser (AiChat.tsx)
  │  send via /ws
  │  type=ai_chat_request, payload={ clientRequestId, messages, clientRoute }
  ▼
socket.ts (Hono WS)
  │  onCustomMessage → wsBridge.ts:registerAiChatWebSocketHandlers
  ▼
wsBridge.ts                         load user/role, open requestContext
  ▼
chat.ts:streamAiChat
  │  selectPromptContext()  ──▶ pick topics, tools, fragments
  │  template() per fragment ─▶ assemble system prompt
  │  buildAiTools(allowed) ──▶ filtered ToolSet
  ▼
Vercel AI SDK streamText
  │  text-delta chunks ───────▶ ai_chat_delta (per chunk)
  │  experimental_onToolCallFinish
  │     └─ widgetsFromToolResult ─▶ collected
  ▼
  on completion ──────────────▶ ai_chat_done { text, widgets }
  on error      ──────────────▶ ai_chat_error { message }
```

Key entry points:

- WebSocket handler registration: [`registerAiChatWebSocketHandlers()`](../src/ai/wsBridge.ts) — wired up once at boot from [`src/index.ts`](../src/index.ts).
- Streaming turn: [`streamAiChat()`](../src/ai/chat.ts) — call only inside an active `requestContext.run(...)` (the bridge does that for you).
- Selector: [`selectPromptContext()`](../src/ai/promptContext.ts).
- Template loader: [`template()`](../src/ai/promptTemplate.ts) — Handlebars over Markdown files in `src/ai/prompts/`.

## WebSocket contract

All four message types travel over the existing `/ws` connection (same JWT auth as REST).

### Client → server

```ts
{
  type: "ai_chat_request",
  payload: {
    clientRequestId?: string,                                  // server generates one if omitted
    conversationId?: string,                                 // persisted by the client
    choiceReply?: { token: string; optionIds: string[] },        // server-issued choice reply
    messages: { role: "user" | "assistant", content: string }[], // full chat history; last must be role:"user"
    clientRoute?: {                                            // user's current React Router location
      section: string,                                         // e.g. "project", "mytasks", "people"
      sectionId?: string,
      childId?: string,
      viewType?: string,
    },
  },
}
```

### Server → client

```ts
{ type: "ai_chat_delta", payload: { clientRequestId, delta: string } }
{ type: "ai_chat_done",  payload: { clientRequestId, text: string, widgets: AiChatWidget[] } }
{ type: "ai_chat_error", payload: { clientRequestId, message: string } }
```

`AiChatWidget` ([`chat.ts:20`](../src/ai/chat.ts)):

```ts
type AiChatWidget =
  | { type: "button"; label: string; hashPath: string }
  | { type: "redirect"; label: string; hashPath: string }
  | {
      type: "choice";
      id: string;
      question: string;
      control: "buttons" | "radio" | "checkbox";
      options: { id: string; label: string; value?: string }[];
      submitLabel?: string;
    };
```

`askUserChoice` is always available to the assistant. Button choices submit immediately; radio and checkbox choices require the client-side `Next` button. The client sends the server-issued token and selected option ids with the next message and persists the widget as answered. The server validates the selection and reconstructs its text from stored options; client prose cannot change approved arguments.

Because the choice is answered in a separate round-trip, the assistant must **ask first and act later**: it calls `askUserChoice` and stops — the chosen labels come back as the next user message, and only then does it run `moveTask` / `updateTask` / `createTask` etc. The execution guard stops further calls after a choice, including parallel calls in the same step. Only deletion proposals create a confirmation of the exact validated arguments; approval executes that stored action through its authorized loader or MCP. Clear creates, updates, and moves execute immediately after validation and authorized reference resolution. The system prompt and the `askUserChoice` tool description also carry that instruction; the widget already renders the question and options, so the assistant must not repeat them as plain text.

The client side that drives this lives at [`packages/app/src/app/widgets/aiChat/AiChat.tsx`](../../app/src/app/widgets/aiChat/AiChat.tsx) (sends `ai_chat_request`) and [`packages/app/src/app/store/actions/aiChat.ts`](../../app/src/app/store/actions/aiChat.ts) (handles deltas/done/error into the Zustand store).

## Prompt templates

Templates are Markdown files under [`src/ai/prompts/`](../src/ai/prompts) rendered with Handlebars by [`promptTemplate.ts`](../src/ai/promptTemplate.ts). At build time `yarn build` copies `src/ai/prompts → dist/ai/prompts` (the loader uses `__dirname`-relative paths).

| File                   | Role                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `system-core.md`       | Always included. Stable capabilities, context precedence, action and response rules. |
| `system-tasks.md`      | Appended when topic `tasks` is active.                                               |
| `system-projects.md`   | Appended when topic `projects` is active.                                            |
| `system-notepads.md`   | Appended when topic `notepads` is active.                                            |
| `system-calendar.md`   | Appended when topic `calendar` is active.                                            |
| `system-org.md`        | Appended when topic `org` is active.                                                 |
| `client-ui-context.md` | Appended when the request includes a `clientRoute`.                                  |
| `request-context.md`   | Dynamic current date, identity, and navigation mode; follows stable instructions.    |
| `client-chat.md`       | Wraps the latest user message before it goes to the model.                           |

`client-chat.md` preserves the user message verbatim, including when route context is present. Identity and route context are supplied once in a separate dynamic system message after stable instructions. Stable fragments render without per-turn variables. `request-context.md` receives `todaysDate`, `todaysDateISO`, `autoRedirect`, and authenticated identity. `client-ui-context.md` receives route summaries and inferred entity references from [`clientRouteTemplateVars()`](../src/ai/clientRoute.ts). The user wrapper contains only `newUserMessage` and renders with content preservation enabled so code indentation, trailing spaces, and repeated blank lines survive.

## Dynamic prompt + tool selection

[`selectPromptContext()`](../src/ai/promptContext.ts) is a **pure** function that picks the topics for a turn from three signals:

1. **Keywords** in the new user message ([`TOPIC_KEYWORDS`](../src/ai/promptContext.ts) — regex per topic, recall over precision).
2. **Route** — `ROUTE_TOPICS` maps `clientRoute.section` to default topics; the parsed route's ids (e.g. `projectId`) cast extra votes.
3. **Stickiness** — keyword matches from the last 3 history turns (drops off quickly so topic changes aren't fought).

The output is a `PromptContextSelection`:

```ts
{
  topics: PromptTopic[],          // active topics this turn
  allowedTools: string[],         // CORE_TOOLS ∪ TOPIC_TOOLS[topic] for each active topic
  promptFragments: string[],      // ["system-core.md", "system-tasks.md", ...] — concatenated in order
  reasons: Record<string, string[]>, // debug: which signals voted for each topic (also logged on every turn)
}
```

Two invariants worth knowing:

- **Core tools are always exposed.** `CORE_TOOLS` (navigate, openProfile, globalSearch, listProjects, searchPeople, getProject, getTask, getPerson, getCompany, summarizeNotepad) survive every filter — they unblock identity, navigation, and single-record reads no matter the topic.
- **Topic tools must be listed in `TOPIC_TOOLS`.** If a `system-<topic>.md` fragment mentions a tool that isn't in the topic's tool list, the model will hallucinate calls to a tool that isn't registered this turn. Keep the two in lockstep.

If no topic signal fires, the selector defaults to `tasks` — the most common Stacks use case and a safe fallback since core tools still cover pure navigation/identity.

The selection is logged on every turn under the `[aiChat] prompt selection` line — useful when debugging "why didn't the model use tool X?".

## Tool registry

Each domain has its own file under [`src/ai/toolRegistry/`](../src/ai/toolRegistry):

| File                 | Contains                                                         |
| -------------------- | ---------------------------------------------------------------- |
| `taskTools.ts`       | `findTasks`, `listTasks`, `createTask`, `updateTask`, `moveTask` |
| `projectTools.ts`    | `createProject`, `listProjects`, `getProject`                    |
| `stackTools.ts`      | `listStacks`, `createStack`, `updateStack`                       |
| `peopleTools.ts`     | `searchPeople`, `getPerson`                                      |
| `orgTools.ts`        | `getCompany`, `listCompanies`, `listTags`, `listBookmarks`       |
| `notepadTools.ts`    | `listNotepads`, `summarizeNotepad`                               |
| `reminderTools.ts`   | `listReminders`                                                  |
| `eventTools.ts`      | `listCalendarEvents`                                             |
| `activityTools.ts`   | `listActivities`                                                 |
| `searchTools.ts`     | `globalSearch`                                                   |
| `navigationTools.ts` | `navigate`, `openProfile`                                        |

Each tool is built with [`defineTool()`](../src/ai/toolRegistry/defineTool.ts):

```ts
defineTool({
  name: string, // model-facing name
  description: string, // model-facing purpose, prerequisites, effects, and returned information
  inputSchema: ZodType, // Zod schema for arguments (also validates)
  execute: async input => Promise<unknown>, // handler; runs inside requestContext
});
```

All domain arrays are spread into `AI_TOOL_REGISTRY` in [`toolRegistry/index.ts:35`](../src/ai/toolRegistry/index.ts). At streaming time, [`buildAiTools(allowedNames)`](../src/ai/toolRegistry/index.ts) returns the Vercel AI `ToolSet` filtered to just the allowed names.

When `AI_TOOL_BACKEND` is set to `mcp` or `mcp-canary`, the chat pipeline can delegate selected tools to the authenticated MCP bridge at `/api/mcp` while preserving the existing WebSocket contract for the app. Keep the MCP allowlist in [`routes/mcp.ts`](../src/routes/mcp.ts) and the chat-side remote allowlist in [`chat.ts`](../src/ai/chat.ts) aligned with any tool you expect to run through MCP.

The `tools.ts` module at the AI root is a thin re-export of the registry — `chat.ts` imports from there, but you should add new tools to the per-domain files.

## Adding a new tool

End-to-end checklist. Example: a `listTimeLogs` tool that returns time tracking for a project.

### 1. Decide which domain file to extend

Pick the closest match in [`src/ai/toolRegistry/`](../src/ai/toolRegistry) — e.g. a time-tracking tool either joins `activityTools.ts` or earns its own `timelogTools.ts` file. For a brand-new file you'll also wire it into `index.ts` (step 5).

### 2. Define the tool

```ts
// src/ai/toolRegistry/timelogTools.ts
import { z } from "zod";
import { TimeLogsLoader } from "../../loaders";
import { defineTool } from "./defineTool";

export const timelogAiTools = [
  defineTool({
    name: "listTimeLogs",
    description:
      "List time-log entries for a project. Returns { entries: [...], truncated }. Use the project's UUID from listProjects or the current UI block.",
    inputSchema: z.object({
      projectId: z.string().uuid(),
      from: z.string().optional().describe("ISO date, inclusive lower bound"),
      to: z.string().optional().describe("ISO date, exclusive upper bound"),
    }),
    execute: async ({ projectId, from, to }) => {
      const entries = await TimeLogsLoader.listForProject(projectId, { from, to });
      return { entries: entries.slice(0, 100), truncated: entries.length > 100 };
    },
  }),
];
```

Conventions worth following (see existing tools for examples):

- **`execute` runs inside `requestContext`** — loaders authenticated as the current user. Use them; don't reach into Sequelize directly.
- **Return relevant objects.** Preserve sensible result limits and expose truncation explicitly; a larger context window does not make partial results exhaustive.
- **Validate at the boundary with Zod.** The schema is also what the model sees, so the `.describe(...)` strings are real prompt engineering — be specific.
- **Throw to fail.** A thrown error becomes a tool error visible to the model. Failed approved mutations are not retried automatically; failed lookups may be corrected.

### 3. Register it in the registry

```ts
// src/ai/toolRegistry/index.ts
import { timelogAiTools } from "./timelogTools";
export { timelogAiTools } from "./timelogTools";

export const AI_TOOL_REGISTRY = [
  ...projectAiTools,
  ...stackAiTools,
  ...taskAiTools,
  // ...
  ...timelogAiTools,
];
```

### 4. Expose it to the model

There are two ways the model can see the tool:

- **Always available** — add the name to `CORE_TOOLS` in [`promptContext.ts:39`](../src/ai/promptContext.ts). Do this when the tool is broadly useful from any context; description length is not a hard constraint.
- **Topic-gated (preferred)** — add the name to the appropriate entry of `TOPIC_TOOLS`. For `listTimeLogs` that's likely a new `timelogs` topic, or an extension of `tasks` if you don't want to introduce a topic.

```ts
// src/ai/promptContext.ts
export const TOPIC_TOOLS: Record<PromptTopic, readonly string[]> = {
    tasks: [..., "listTimeLogs"],
    // ...
};
```

### 5. Document the tool in a prompt fragment

If you added the tool to an existing topic, mention it in that topic's `system-<topic>.md` so the model knows it exists this turn. Match the style of existing entries (one-line behavior, when to use, when **not** to use).

### 6. (Optional) Emit a widget

If the tool result should produce a clickable button or auto-redirect, extend `widgetsFromToolResult()` in [`chat.ts:146`](../src/ai/chat.ts) with a branch for your tool name. See [Widgets](#widgets-button-vs-redirect).

### 7. Test it

Unit-test the tool's `execute` directly (it's just an async function). For end-to-end coverage, the prompt selector tests in [`__tests__/promptContext.test.ts`](../src/ai/__tests__) are the right pattern — they verify that a given input selects the expected topics and tools.

## Adding a new prompt topic

When a new domain is big enough to warrant its own fragment (multiple tools, distinct instructions), promote it to a topic:

1. Add the topic name to `PROMPT_TOPICS` in [`promptContext.ts:21`](../src/ai/promptContext.ts).
2. Add a regex to `TOPIC_KEYWORDS` (favor recall — false positives are cheap, false negatives strand the model).
3. Add the tool names to `TOPIC_TOOLS[<topic>]`.
4. Optionally add route mappings in `ROUTE_TOPICS` so the topic activates by route alone.
5. Create `src/ai/prompts/system-<topic>.md`. It'll be appended after `system-core.md` automatically (the loader builds `["system-core.md", ...topics.map(t => \`system-${t}.md\`)]`).
6. Add cases / assertions to `__tests__/promptContext.test.ts`.

## Widgets (button vs. redirect)

Two helpers in [`chat.ts`](../src/ai/chat.ts) decide which widget shape to emit:

- **`aiChatNavigationWidget(label, hashPath)`** — for navigation-intent tools (`findTasks`, `navigate`, `openProfile`). Emits `type: "redirect"` when `AI_CHAT_AUTO_REDIRECT=true`, otherwise `type: "button"`.
- **`aiChatLinkWidget(label, hashPath)`** — always emits `type: "button"`. Use this for side-effect tools that return a courtesy link ("here's the task I just made"), to avoid the "every answer teleports me to /tasks" UX.

`widgetsFromToolResult(toolName, output)` in [`chat.ts:146`](../src/ai/chat.ts) is the dispatch map. If you add a tool that should surface a widget, register it here.

## Testing

- The selector has a dedicated test file: [`packages/server/src/ai/__tests__/promptContext.test.ts`](../src/ai/__tests__). Add cases there when you add a topic or change a regex.
- Tool `execute` handlers are plain async functions and can be tested without booting the WS server.
- For a manual end-to-end smoke, start `yarn dev` and open the chat widget in the app — the server logs `[aiChat] prompt selection` on every turn with the topics/tools/reasons it picked, which makes it easy to see whether the selector did what you expected.

## Related

- [`docs/packages/server.md`](../../../docs/packages/server.md) — server package overview, environment variables.
- [`packages/server/docs/ONBOARDING.md`](ONBOARDING.md) — bootstrap order, loaders, request lifecycle.
- [`packages/app/src/app/widgets/aiChat/`](../../app/src/app/widgets/aiChat) — the React widget on the other end of the WebSocket.

## Conversation and execution safeguards

`streamAiChat` uses the configured OpenAI-compatible model for all inference. Set `AI_BASE_URL`
(or the existing `AI_OPENAI_BASE_URL` alias) to a local or hosted endpoint ending in `/v1`, and set
`AI_MODEL` to its served model id. Use `AI_API_KEY` (or `AI_OPENAI_API_KEY`) for endpoints requiring
authentication; local endpoints may use the default `not-needed`. No model runtime or weights are downloaded by setup or builds.

Conversation state is isolated by tenant, user, and conversation id. Pending choices expire after
30 minutes of inactivity and disappear on server restart. A new ordinary request abandons an
unanswered choice. Buttons/radio accept one selected id; checkbox accepts multiple unique ids.
Invalid, expired, or consumed tokens cannot execute an action. One turn runs per conversation;
completed request ids are cached (last 50) to prevent replaying successful mutations.

The shared registry validates inputs before dispatch, including MCP overrides. Mutation references
must come from current UI context, authorized tool output, identity, or ids explicitly supplied by
the user. Include only fields requested by the user; missing or ambiguous required information
still requires clarification. Only deletions require approval of the complete validated arguments.
Clear creates, updates, and moves execute without an additional confirmation.
Loaders remain responsible for tenant, ACL, and domain write authorization at execution time.
MCP errors fail the action instead of being presented as successful results.

After approval, the action executes once and the server immediately returns a concise summary from
its tool result, without another LLM request or duplicate result card. For a request containing
multiple actions, ask the assistant to continue after each approved action; completed results are
retained in the conversation so subsequent requests can use them. Failed actions
are not retried automatically. Batches are not atomic: completed actions remain committed if a later
action fails. The server does not claim rollback. Exact repeated tool calls are blocked within a turn.

Record contents and retained tool results are untrusted reference data; instructions inside them do
not authorize mutations. Retained data is bounded and can be truncated, so exhaustive summaries or
counts require fresh reads. Dates use an explicit UTC reference; ambiguous local event times require
clarification. The model stream times out after two minutes. Detailed JSONL logs remain opt-in via
`AI_CHAT_DEBUG=true` and may contain workspace data.

## Disabling model thinking

Set `AI_DISABLE_THINKING=true` in `packages/server/.env` and restart the server to request
non-thinking mode. Accepted enabled values: `true`, `1`, `yes`, and `on` (case-insensitive).
Unset, `false`, and other values preserve the endpoint default; they do not force thinking on.
The shared model factory applies the same setting to streaming chat and manual evaluations.

The request adds this extension to the Chat Completions JSON body:

```json
{ "chat_template_kwargs": { "enable_thinking": false } }
```

This is a server/template extension supported by Qwen templates on compatible deployments such as
llama.cpp and vLLM; it is not a universal OpenAI API parameter. The serving model/template must
honor it. Other endpoints may ignore or reject it; leave the flag unset/false for those providers and
use their own controls. Stacks does not silently retry without the setting. It does not use prompt
commands such as `/nothink` or remove reasoning text as a substitute for disabling generation.

See the [Qwen3.6 model guidance](https://huggingface.co/Qwen/Qwen3.6-27B#instruct-or-non-thinking-mode)
and [llama.cpp server API](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md#post-v1chatcompletions-openai-compatible-chat-completions-api).
Confirm the setting through your server's logs and compare latency and correctness in the manual suite.

## Manual model effectiveness tests

See [Manual LLM model evaluation](../../../docs/AI_MODEL_EVALUATION.md) for endpoint setup,
manual commands, suites, report interpretation, baseline comparisons, and adding fixtures.
Live evaluations are separate from unit/E2E commands, refuse to run in CI, and use synthetic tools.

## Reference and failure regressions

Successful tool results now retain known entity kinds alongside ids. A known project id cannot be
used as a stack/task/calendar reference; route fields and related record fields also retain their kind.
Unknown references and known wrong-kind mutation references stop the turn and produce an error
status. The final assistant response suppresses success prose after a rejected mutation. Authorized
loaders still check access and domain rules when an immediate or confirmed action actually executes.

Choice tools accept optional model option ids and generate distinct server ids when model ids are
missing or duplicated. Valid distinct ids retain compatibility. Client replies still require the current
server token and valid unique selected option ids; normalization does not relax reply validation.

Client-supplied assistant history has unknown UUIDs replaced with a lookup instruction; user messages and server-grounded references are preserved. Explicit single unsupported English requests narrow the exposed mutation tools, while mixed requests retain normal routing and execution guards. Mutation dates are validated as ISO dates or date-times with explicit timezones before dispatch. See [the Gemma correction log](../../../docs/AI_MODEL_EVALUATION_FIXES.md) for measured results and remaining model failures.

## Application-managed references and action outcomes

Chat tool reference fields accept exact names or ids. The execution layer resolves
names through existing registered read handlers, using the same local/MCP dispatch
and loader authorization as ordinary reads. It preserves the original execution
schemas for final validation and for direct MCP interfaces. Task/project/column,
person, company, calendar/event, notepad, and status references are covered;
folder document ids still require an explicit id.

Resolution uses exact names (case-insensitive), email, nickname or an exact first/last name for people, and
never guesses from a partial match. The person references `me` and `myself` resolve to the authenticated user. Project context scopes task and column lookup;
a task move resolves its destination column in the task's actual project. Without
project context, column-only requests ask which project. Event title lookup searches
one month around a supplied start date or today; an absent match is described as
missing in that window, not missing globally. Truncated directory results require
narrower input. Loader/MCP errors stop the proposal.

Ambiguous matches produce a server-issued choice. The stored proposal retains its
arguments and the selected record value; a reply resumes resolution directly in
application code. Deletion confirmation follows resolution and final schema
validation. Mentioning a name in user prose does not make it an executable id.
Approval also checks resolved reference form, rejecting older confirmations that
stored names as ids. Known provider calendar/event ids retain compatibility.
Concurrent model calls are serialized within a turn, so a pending choice cannot
be overwritten by another action proposal.

Explicit single unsupported requests return an application explanation before
opening a model/MCP connection. Generic model choices cannot offer recognized
unsupported actions or serve as mutation approval; deletion tools generate the
validated confirmation. Ordinary clarification choices remain available. Choice
widget ids are not remembered as entity ids.

After an immediate mutation or approved deletion, a single plain-text action summary is generated from the returned tool result.
Completed mutations do not add duplicate success widgets or raw result cards. Missing result ids and unconfirmed deletions do not receive
success status. Model prose and text deltas are suppressed for completed mutation
turns. A completed action summary remains available if stream completion later fails.
Later failures retain earlier success widgets. These checks do not make multi-step
handlers atomic or establish rollback after a handler error.

The model still chooses the operation and non-reference arguments. No natural
language planner is added in application code. See the manual evaluation guide for
application/model lookup attribution and the Temp-column reproduction.

### Confirmation display

Confirmation controls are shown until answered, then hidden from the visible
transcript. Their stored choice state still validates the selected token/option.
The generated `Question / Selected` reply is sent in the request context without
being appended as a visible or persisted user message. Ordinary typed messages and
non-confirmation clarification widgets retain their normal history behavior.

For example, a successful column deletion returns `Column deleted: Temp.` once.
Raw mutation output remains in server reference data; it is not displayed as a
`Delete Stack / Deleted / true` card. Completed-action text remains available when
a subsequent model continuation fails, with a warning only when needed.

## Generation settings and connection cleanup

Runtime chat and the manual evaluation runner share `LLM_GENERATION_SETTINGS` in
`src/ai/model.ts`: temperature `0` and OpenAI provider option
`parallelToolCalls: false`. Providers must support these request parameters;
rejections are reported through the existing error flow rather than retried with
weaker settings. The execution guard still serializes calls in case a provider
ignores the parallel-call preference. Evaluation timeout/retry policy and its fixed
reference date remain separate from runtime behavior.

MCP ownership starts inside the streaming turn's cleanup boundary. Setup failures,
including tool construction and message/template assembly, close the connection.
Cleanup runs before debug persistence so logging cannot bypass closing the client.

Conversation capacity is capped at 1,000 sessions across the entire server process.
This guards against unbounded session counts; it is not a total memory-byte limit.
Expired idle sessions are swept on access after 30 minutes. Busy sessions are not
evicted. At capacity, existing sessions continue while new sessions receive
`Chat capacity reached`. State and pending confirmations are lost on restart.

### Relative column placement

`listStacks` returns columns in the project's stored board order, with zero-based `index` values.
`createStack` accepts exactly one of `insertIndex`, `beforeStackId`, or `afterStackId` (or none to append).
For "before" / "in front of" and "after" requests, the assistant uses a resolved column anchor.
The loader computes the insertion position from the current board order inside the creation
transaction. A missing or foreign anchor fails the transaction rather than appending silently.
Numeric insertion positions remain supported for existing web and mobile callers.

### Filtered tasks and follow-ups

`findTasks` returns a path with task filters and honors `AI_CHAT_AUTO_REDIRECT`, just like other
navigation tools. Its validated path ends the turn with a server-generated acknowledgement, avoiding
a second LLM request merely to describe navigation. With auto redirect off, it renders a button; the assistant must not claim the
page has already opened. Task-list requests such as "show me all tasks assigned to me", "list my
tasks", task searches, and filtering default to `findTasks`. Enumerate rows in chat only when the
user explicitly asks for them here/in chat/as text or says not to navigate. Explicit chat intent
persists across narrowing follow-ups. `listTasks` remains available for internal reference lookups,
counts, and analysis. A read failure does not change the requested output mode.

Both tools accept `overdueOnly: true`: incomplete tasks with a non-null due date strictly before
now, matching the app's overdue semantics. Navigation serializes this as `overdue=true`; the Tasks
page forwards it to the validated `/api/tasks` endpoint. This differs from `from`/`to`, which test
task/date-window overlap and can include undated tasks. Existing assignee/project constraints
remain part of a narrowing follow-up. The client sends the current Tasks query string as optional
`clientRoute.search`; the server includes recognized filter keys as reference data in Current UI.
Assignee arrays use JSONB containment predicates with OR semantics, preserving matches for any
requested person without PostgreSQL array-overlap operators.

### Task filter extensions

`findTasks` and `listTasks` share the same filter object and validators, so every filter below works
for both chat rows and navigation:

| Filter            | Tool argument         | Tasks view query      | Server behavior                                                                                  |
| ----------------- | --------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| Tags              | `tagIds`              | `tags`                | JSONB `contains` per tag joined with OR — any requested tag matches                              |
| Status            | `statusTagIds`        | `status`              | the task `status` column holds one status tag UUID, so a list becomes an `IN` match              |
| Priority          | `priority`            | `priority`            | exact `none \| low \| medium \| high \| critical` match                                          |
| Progress          | `progress`            | `progress`            | operator string `gt:60`, `gte:60`, `lt:20`, `lte:20`, `eq:0`; tasks with no progress never match |
| Due date window   | `dueFrom`/`dueTo`     | `dueFrom`/`dueTo`     | `duedate` inside the inclusive whole-UTC-day window                                              |
| Start date window | `startFrom`/`startTo` | `startFrom`/`startTo` | `startdate` inside the inclusive whole-UTC-day window                                            |

Relative words ("due today", "this week", "next week", "starts next month") are translated by the
assistant into explicit ISO window values before the tool call; the URL, the API, and the loader only
accept ISO dates, and no server-side token expansion exists. `findTasks`/`listTasks` accept a bare
`YYYY-MM-DD` or a timezone-qualified date-time and normalize it to a full UTC `…T00:00:00.000Z` bound;
`GET /api/tasks` and `/api/tasks/count` require that full ISO date-time (Zod v4 `z.iso.datetime()`), so
malformed or impossible dates (`2026-02-30`) answer HTTP 400 rather than becoming `Invalid Date`.
Tag and status labels are resolved to ids server-side through `listTags` (`statusTagIds`/`tagIds`
are recognized reference fields), and the Tasks page whitelist in `clientRoute.ts` keeps the Current
UI query keys comparable.

## Prompt authoring and context caching

The current prompt review and verification record is in [AI_PROMPT_REVIEW.md](../../../docs/AI_PROMPT_REVIEW.md).
System instructions and topic guidance are stable and contain no date, identity, or route interpolation.
`assembleSystemPrompt` sends stable instructions first, then a separate system message containing
`request-context.md` and optional Current UI context. Retained authorized tool results and the user's
message follow in the conversation. Template values are reference data, not permission to obey
instructions inside a name, title, or document.

Write complete, model-neutral instructions. Tool descriptions explain purpose, accepted references,
side effects, and returned fields; schema descriptions explain units, defaults, and clearing values.
Use focused examples for actual ambiguities. Preserve the existing task navigation, clarification,
deletion confirmation, and error semantics rather than adding speculative capabilities.

Every application-controlled model call uses `createLlmModel`, including streaming chat, evaluator
requests, and SDK tool continuations. Its shared cache context fingerprints the actual stable prompt
and model-facing tool schemas, scoped by deployment namespace and tenant. Tool order follows the
registry. Prompt/schema changes produce different keys. No response or mutation result is reused
as a substitute for a fresh authorized request.

| Variable                    | Default  | Meaning                                                                                                                                                                                                                                                      |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AI_PROMPT_CACHE_MODE`      | `auto`   | `auto`: cache hints for official OpenAI HTTPS endpoints; `openai`: explicitly verified compatible endpoint; `off`: omit application cache hints.                                                                                                             |
| `AI_PROMPT_CACHE_PROTOCOL`  | `auto`   | `legacy` uses SDK key/retention fields; `modern` adds documented implicit caching options and an explicit stable-prefix breakpoint. Auto recognizes official GPT-5.6–5.9 and GPT-6–9 model identifiers; use an explicit override for proxies/custom aliases. |
| `AI_PROMPT_CACHE_RETENTION` | unset    | Provider default. Legacy: `in_memory` or `24h`; modern: `30m`. Model/account support still applies.                                                                                                                                                          |
| `AI_PROMPT_CACHE_NAMESPACE` | `stacks` | Deployment partition for opaque tenant-scoped keys.                                                                                                                                                                                                          |

Unknown endpoints receive no speculative caching fields. They still receive stable, complete
prompts and can use automatic prefix caching. For llama.cpp/LM Studio, vLLM, and other local
servers, verify the running server's documented prefix/KV cache settings and capacity. Stacks
does not change server settings, prewarm caches, or replay failed requests to negotiate support.
`off` cannot force a provider to disable its own automatic cache.

The installed AI SDK supports cache keys and legacy retention. Modern options/breakpoints are
added only at the shared HTTP boundary because this SDK version strips those fields. Complete
context is still sent; expiry and cache eviction never remove required instructions. Provider
defaults are retained unless configured explicitly; longer retention should match deployment
data-retention requirements.

Debug JSONL turns include `cacheUsage` (read/write token counts). The evaluator includes the same
counts per row. These use raw provider telemetry, including streamed usage chunks; absent counts
are `null`, not zero. SDK-normalized counts alone cannot prove a cache miss. A lower latency
alone cannot prove a cache hit. Cache eligibility depends on model thresholds and infrastructure.
See [OpenAI's prompt-caching guide](https://developers.openai.com/api/docs/guides/prompt-caching)
and [Chat Completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).

### External MCP agents

The MCP initialization response supplies server instructions and tools carry read-only/destructive
hints. Annotations are guidance, not authorization. External clients see strict execution schemas;
they do not inherit chat's name-resolution adapter or confirmation guard. Direct MCP mutations
execute their handlers immediately. Use authorized host references and host approval policies.
The host controls its own model request caching; Stacks can only provide stable tool metadata.
