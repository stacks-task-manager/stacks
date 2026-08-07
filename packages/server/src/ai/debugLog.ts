// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Local AI chat debug log.
 *
 * The main API server and the debug viewer run as separate processes, so debug
 * turns are persisted as JSONL on disk instead of held in process memory.
 */
import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type AiChatDebugToolCall = {
    toolName: string;
    input: unknown;
    output?: unknown;
    success: boolean;
    error?: string;
    timestamp: string;
};

export type AiChatDebugTurn = {
    id: string;
    startedAt: string;
    finishedAt: string;
    status: "ok" | "error";
    modelId?: string;
    baseURL?: string;
    user?: {
        id?: string;
        name?: string;
        email?: string;
    };
    request: {
        newUserMessage: string;
        history: unknown[];
        clientRoute?: unknown;
    };
    promptSelection?: {
        topics: string[];
        allowedTools: string[];
        promptFragments: string[];
        reasons: Record<string, string[]>;
    };
    systemPrompt?: string;
    messages?: unknown[];
    tools: AiChatDebugToolCall[];
    responseText?: string;
    error?: string;
};

const MAX_DEBUG_TURNS = 500;

export function aiChatDebugDir(): string {
    return path.resolve(process.env.AI_CHAT_DEBUG_DIR || path.join(process.cwd(), ".ai-chat-debug"));
}

export function aiChatDebugLogPath(): string {
    return path.join(aiChatDebugDir(), "turns.jsonl");
}

function safeJson(value: unknown): string {
    return JSON.stringify(value, (_key, item) => {
        if (typeof item === "bigint") {
            return item.toString();
        }
        if (item instanceof Error) {
            return {
                name: item.name,
                message: item.message,
                stack: item.stack,
            };
        }
        return item;
    });
}

export async function appendAiChatDebugTurn(turn: AiChatDebugTurn): Promise<void> {
    try {
        await mkdir(aiChatDebugDir(), { recursive: true });
        await appendFile(aiChatDebugLogPath(), `${safeJson(turn)}\n`, "utf8");
    } catch (error) {
        console.error("[aiChatDebug] failed to write debug turn", error);
    }
}

export async function readAiChatDebugTurns(limit = MAX_DEBUG_TURNS): Promise<AiChatDebugTurn[]> {
    try {
        const raw = await readFile(aiChatDebugLogPath(), "utf8");
        return raw
            .split("\n")
            .filter(Boolean)
            .slice(-limit)
            .map(line => JSON.parse(line) as AiChatDebugTurn)
            .reverse();
    } catch (error: any) {
        if (error?.code === "ENOENT") {
            return [];
        }
        throw error;
    }
}

export async function clearAiChatDebugTurns(): Promise<void> {
    await mkdir(aiChatDebugDir(), { recursive: true });
    await writeFile(aiChatDebugLogPath(), "", "utf8");
}
