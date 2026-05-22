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

| Variable | Purpose |
| --- | --- |
| `AI_OPENAI_BASE_URL` | OpenAI-compatible endpoint (e.g. a local LLM server). Required. |
| `AI_OPENAI_API_KEY` | Key for the endpoint. Defaults to `"not-needed"` for local servers. |
| `AI_MODEL` | Model id passed to `openai.chat(modelId)`. Required. |
| `AI_CHAT_ENABLED` | Kill switch — set to `false` / `0` / `off` to disable even when configured. |
| `AI_CHAT_AUTO_REDIRECT` | When `true`, `navigate`/`openProfile` results auto-navigate the client instead of rendering a click button. |

`isAiChatConfigured()` ([`src/ai/config.ts:20`](../src/ai/config.ts)) returns `false` when the kill switch is on or `AI_OPENAI_BASE_URL` / `AI_MODEL` are missing — in which case `ai_chat_request` messages return an `ai_chat_error` with `"AI chat is not enabled"`.

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
  | { type: "button";   label: string; hashPath: string }
  | { type: "redirect"; label: string; hashPath: string };
```

The client side that drives this lives at [`packages/app/src/app/widgets/aiChat/AiChat.tsx`](../../app/src/app/widgets/aiChat/AiChat.tsx) (sends `ai_chat_request`) and [`packages/app/src/app/store/actions/aiChat.ts`](../../app/src/app/store/actions/aiChat.ts) (handles deltas/done/error into the Zustand store).

## Prompt templates

Templates are Markdown files under [`src/ai/prompts/`](../src/ai/prompts) rendered with Handlebars by [`promptTemplate.ts`](../src/ai/promptTemplate.ts). At build time `yarn build` copies `src/ai/prompts → dist/ai/prompts` (the loader uses `__dirname`-relative paths).

| File | Role |
| --- | --- |
| `system-core.md` | Always included. Identity, ground-truth rules, always-available tools. |
| `system-tasks.md` | Appended when topic `tasks` is active. |
| `system-projects.md` | Appended when topic `projects` is active. |
| `system-notepads.md` | Appended when topic `notepads` is active. |
| `system-calendar.md` | Appended when topic `calendar` is active. |
| `system-org.md` | Appended when topic `org` is active. |
| `client-ui-context.md` | Appended when the request includes a `clientRoute`. |
| `client-chat.md` | Wraps the latest user message before it goes to the model. |

Template variables available in every fragment: `todaysDate`, `todaysDateISO`, plus identity (`hasCurrentUser`, `currentUserId`, `currentUserName`, `currentUserEmail`). The `client-ui-context.md` and `client-chat.md` templates additionally receive `viewKind`, `viewSummary`, `routeSection`, and per-entity inferred ids (`projectId`, `taskId`, `notepadId`, `personId`, `companyId`, `reportType`) — see [`clientRouteTemplateVars()`](../src/ai/clientRoute.ts).

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

| File | Contains |
| --- | --- |
| `taskTools.ts` | `findTasks`, `listTasks`, `createTask`, `updateTask`, `moveTask` |
| `projectTools.ts` | `createProject`, `listProjects`, `getProject` |
| `stackTools.ts` | `listStacks`, `createStack` |
| `peopleTools.ts` | `searchPeople`, `getPerson` |
| `orgTools.ts` | `getCompany`, `listCompanies`, `listTags`, `listBookmarks` |
| `notepadTools.ts` | `listNotepads`, `summarizeNotepad` |
| `reminderTools.ts` | `listReminders` |
| `eventTools.ts` | `listCalendarEvents` |
| `activityTools.ts` | `listActivities` |
| `searchTools.ts` | `globalSearch` |
| `navigationTools.ts` | `navigate`, `openProfile` |

Each tool is built with [`defineTool()`](../src/ai/toolRegistry/defineTool.ts):

```ts
defineTool({
  name: string,                              // model-facing name
  description: string,                       // model-facing description; tokens count, keep it tight
  inputSchema: ZodType,                      // Zod schema for arguments (also validates)
  execute: async (input) => Promise<unknown>,// handler; runs inside requestContext
})
```

All domain arrays are spread into `AI_TOOL_REGISTRY` in [`toolRegistry/index.ts:35`](../src/ai/toolRegistry/index.ts). At streaming time, [`buildAiTools(allowedNames)`](../src/ai/toolRegistry/index.ts) returns the Vercel AI `ToolSet` filtered to just the allowed names.

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
- **Return small objects.** Truncate lists (most existing tools cap at 50–100 rows and set `truncated: true`). Token budget matters.
- **Validate at the boundary with Zod.** The schema is also what the model sees, so the `.describe(...)` strings are real prompt engineering — be specific.
- **Throw to fail.** A thrown error becomes a tool error visible to the model; it'll often retry with different args.

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

- **Always available** — add the name to `CORE_TOOLS` in [`promptContext.ts:39`](../src/ai/promptContext.ts). Only do this if the description is small and the tool is broadly useful from any context.
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

- **`aiChatNavigationWidget(label, hashPath)`** — for navigation-intent tools (`navigate`, `openProfile`). Emits `type: "redirect"` when `AI_CHAT_AUTO_REDIRECT=true`, otherwise `type: "button"`.
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
