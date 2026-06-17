// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Streaming AI chat turn using Vercel AI SDK, tools, and prompt templates.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, type ModelMessage } from "ai";
import { requestContext } from "../services/requestContext";
import {
    clientRouteTemplateVars,
    parseClientRoute,
    type AiChatClientRoutePayload,
} from "./clientRoute";
import { selectPromptContext } from "./promptContext";
import { template } from "./promptTemplate";
import { buildAiTools } from "./tools";

export type AiChatClientMessage = { role: "user" | "assistant"; content: string };

/** Client: `button` shows a click target; `redirect` navigates to the app path without a click. */
export type AiChatWidget =
    | { type: "button"; label: string; hashPath: string }
    | { type: "redirect"; label: string; hashPath: string };

export type { AiChatClientRoutePayload } from "./clientRoute";

export type StreamAiChatHandlers = {
    onTextDelta: (delta: string) => void;
    onDone: (payload: { text: string; widgets: AiChatWidget[] }) => void;
    onError: (message: string) => void;
};

function envTrim(name: string): string {
    const v = process.env[name];
    return typeof v === "string" ? v.trim() : "";
}

/**
 * Produce a human-readable message from anything the AI SDK (or a thrown value) might hand us.
 * Without this, `String(error)` on plain objects yields `"[object Object]"`, which surfaces as a
 * useless toast on the client.
 */
export function formatAiChatError(error: unknown): string {
    if (!error) {
        return "AI error";
    }
    if (typeof error === "string") {
        return error;
    }
    if (error instanceof Error) {
        const parts: string[] = [error.message || error.name || "AI error"];
        const cause = (error as { cause?: unknown }).cause;
        const causeMsg = formatAiChatError(cause);
        if (cause && causeMsg && causeMsg !== parts[0] && causeMsg !== "AI error") {
            parts.push(`caused by: ${causeMsg}`);
        }
        return parts.join(" — ");
    }
    if (typeof error === "object") {
        const o = error as Record<string, unknown>;
        const candidate =
            (typeof o.message === "string" && o.message) ||
            (typeof o.error === "string" && o.error) ||
            (typeof o.reason === "string" && o.reason) ||
            (typeof o.statusText === "string" && o.statusText) ||
            "";
        if (candidate) {
            return candidate;
        }
        try {
            const json = JSON.stringify(error);
            if (json && json !== "{}") {
                return json;
            }
        } catch {
            // fall through
        }
    }
    return "AI error";
}

/**
 * Current-session identity for the prompt. Safe to call outside a request context
 * (returns a `hasCurrentUser: false` flag so templates can branch).
 */
function currentUserTemplateVars(): {
    hasCurrentUser: boolean;
    currentUserId: string;
    currentUserName: string;
    currentUserEmail: string;
} {
    try {
        const u = requestContext.getCurrentUser();
        const first = (u.firstName ?? "").trim();
        const last = (u.lastName ?? "").trim();
        const fullName = `${first} ${last}`.trim();
        const nickname = (u.nickname ?? "").trim();
        const email = (u.email ?? "").trim();
        const name = fullName || nickname || email || "Unknown user";
        return {
            hasCurrentUser: true,
            currentUserId: u.id ?? "",
            currentUserName: name,
            currentUserEmail: email,
        };
    } catch {
        return {
            hasCurrentUser: false,
            currentUserId: "",
            currentUserName: "",
            currentUserEmail: "",
        };
    }
}

/**
 * Widget used by tools whose purpose is to navigate the user (`navigate`,
 * `openProfile`). With `AI_CHAT_AUTO_REDIRECT=true` these auto-open; otherwise
 * they show a button the user can click.
 *
 * Do NOT use this for side-effect tools (`createTask`, `findTasks`, etc.) —
 * those return a route path as a courtesy link, not as a "take me there"
 * instruction. Use `aiChatLinkWidget` for those to prevent a very unpleasant
 * "every answer teleports me to /tasks" UX.
 */
function aiChatNavigationWidget(label: string, hashPath: string): AiChatWidget {
    if (envTrim("AI_CHAT_AUTO_REDIRECT") === "true") {
        return { type: "redirect", label, hashPath };
    }
    return { type: "button", label, hashPath };
}

/** Always a button — "here's a link to what I just did", never auto-redirects. */
function aiChatLinkWidget(label: string, hashPath: string): AiChatWidget {
    return { type: "button", label, hashPath };
}

function toModelMessages(messages: AiChatClientMessage[]): ModelMessage[] {
    return messages.map(m => {
        if (m.role === "user") {
            return { role: "user", content: m.content };
        }
        return { role: "assistant", content: m.content };
    });
}

function widgetsFromToolResult(toolName: string, output: unknown): AiChatWidget[] {
    if (!output || typeof output !== "object") {
        return [];
    }
    const o = output as Record<string, unknown>;
    const id = o.id;
    const title = typeof o.title === "string" ? o.title : "Open";

    if (toolName === "createTask") {
        const projectId = o.projectId;
        if (typeof id !== "string" || typeof projectId !== "string") {
            return [];
        }
        return [aiChatLinkWidget(`Open: ${title}`, `/project/${projectId}/${id}`)];
    }

    if (toolName === "createProject" && typeof id === "string") {
        return [aiChatLinkWidget(`Open project: ${title}`, `/project/${id}`)];
    }

    if (toolName === "findTasks" && typeof o.hashPath === "string") {
        return [aiChatLinkWidget("Show tasks", o.hashPath)];
    }

    if (toolName === "openProfile" && typeof o.hashPath === "string") {
        const label = typeof o.label === "string" ? o.label : "Open profile";
        return [aiChatNavigationWidget(label, o.hashPath)];
    }

    if (toolName === "navigate" && typeof o.hashPath === "string") {
        const label = typeof o.label === "string" ? o.label : "Open";
        return [aiChatNavigationWidget(label, o.hashPath)];
    }

    return [];
}

/**
 * Runs a streamed chat turn with tools. Call only inside `requestContext.run` after loaders auth is set.
 */
export async function streamAiChat(
    history: AiChatClientMessage[],
    newUserMessage: string,
    handlers: StreamAiChatHandlers,
    clientRoute?: AiChatClientRoutePayload | null
): Promise<void> {
    const baseURL = envTrim("AI_OPENAI_BASE_URL");
    const modelId = envTrim("AI_MODEL");
    const apiKey = envTrim("AI_OPENAI_API_KEY") || "not-needed";

    if (!baseURL || !modelId) {
        handlers.onError("AI is not configured");
        return;
    }

    const openai = createOpenAI({ baseURL, apiKey });
    const model = openai.chat(modelId);
    const widgets: AiChatWidget[] = [];

    const routeVars = clientRouteTemplateVars(clientRoute ?? undefined);
    const identityVars = currentUserTemplateVars();
    const now = new Date();

    const parsedRoute = clientRoute ? parseClientRoute(clientRoute) : null;
    const selection = selectPromptContext({
        newUserMessage,
        history,
        parsedRoute,
        routeSection: clientRoute?.section,
    });

    // Core is rendered with the full variable bag (identity + today). Topic
    // fragments currently only use `currentUserId` — passing the same bag to
    // every fragment is cheap and avoids branching, and any future template
    // var can be added in one place.
    const fragmentVars = {
        todaysDate: now.toDateString(),
        todaysDateISO: now.toISOString(),
        ...identityVars,
    };
    const fragmentParts = selection.promptFragments.map(name => template(name, fragmentVars));
    let systemPrompt = fragmentParts.join("\n\n");
    if (routeVars.hasClientRoute) {
        systemPrompt += "\n\n" + template("client-ui-context.md", routeVars);
    }

    console.log(
        "[aiChat] prompt selection",
        JSON.stringify({
            topics: selection.topics,
            tools: selection.allowedTools,
            reasons: selection.reasons,
        })
    );

    const tools = buildAiTools(selection.allowedTools);

    const messages: ModelMessage[] = [
        ...toModelMessages(history),
        {
            role: "user",
            content: template("client-chat.md", {
                newUserMessage,
                ...identityVars,
                ...routeVars,
            }),
        },
    ];

    try {
        const result = streamText({
            model,
            tools,
            stopWhen: stepCountIs(12),
            system: systemPrompt,
            messages,
            experimental_onToolCallFinish: async event => {
                if (!event.success) {
                    return;
                }
                const name =
                    "toolName" in event.toolCall ? (event.toolCall as { toolName: string }).toolName : "";
                widgets.push(...widgetsFromToolResult(name, event.output));
            },
            onChunk: ({ chunk }) => {
                if (chunk.type === "text-delta" && "delta" in chunk && typeof chunk.delta === "string") {
                    handlers.onTextDelta(chunk.delta);
                }
            },
            onError: ({ error }) => {
                console.error("[aiChat] stream error", error);
                handlers.onError(formatAiChatError(error));
            },
        });

        await result.consumeStream();

        const raw = (await Promise.resolve(result.text)) || "";
        const text = raw.replace(/^\s+/, "");
        handlers.onDone({ text, widgets });
    } catch (e) {
        console.error("[aiChat] turn failed", e);
        handlers.onError(formatAiChatError(e));
    }
}
