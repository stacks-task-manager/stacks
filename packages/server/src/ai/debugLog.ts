// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Local AI chat debug log.
 *
 * The main API server and the debug viewer run as separate processes, so debug
 * turns are persisted as JSONL on disk instead of held in process memory.
 */
import { chmod, mkdir, open, stat, writeFile } from "fs/promises";
import path from "path";
import { redactLogMetadata } from "../utils/logRedaction";

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
    cacheUsage?: { readTokens: number | null; writeTokens: number | null };
    error?: string;
};

const MAX_DEBUG_TURNS = 500;
const MAX_DEBUG_BYTES = 10 * 1024 * 1024;
const DEBUG_RETENTION_MS = 24 * 60 * 60 * 1000;
let appendQueue = Promise.resolve();
const retentionTimer = setInterval(() => {
    if (process.env.NODE_ENV !== "production" && process.env.AI_CHAT_DEBUG === "true") {
        appendQueue = appendQueue.then(pruneDebugLog).catch(() => {
            console.error("[aiChatDebug] failed to prune debug log");
        });
    }
}, 60 * 60 * 1000);
retentionTimer.unref();

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
    if (process.env.NODE_ENV === "production" || process.env.AI_CHAT_DEBUG !== "true") return;
    appendQueue = appendQueue
        .then(() => writeBoundedDebugTurn(turn))
        .catch(() => {
            console.error("[aiChatDebug] failed to write debug turn");
        });
    await appendQueue;
}

export async function readAiChatDebugTurns(limit = MAX_DEBUG_TURNS): Promise<AiChatDebugTurn[]> {
    try {
        const boundedLimit = Number.isFinite(limit)
            ? Math.min(MAX_DEBUG_TURNS, Math.max(1, Math.floor(limit)))
            : MAX_DEBUG_TURNS;
        return (await readRecentTurns(aiChatDebugLogPath())).slice(-boundedLimit).reverse();
    } catch (error: any) {
        if (error?.code === "ENOENT") {
            return [];
        }
        throw error;
    }
}

export async function clearAiChatDebugTurns(): Promise<void> {
    await ensurePrivateDirectory();
    await writeFile(aiChatDebugLogPath(), "", { encoding: "utf8", mode: 0o600 });
    await chmod(aiChatDebugLogPath(), 0o600);
}

async function ensurePrivateDirectory(): Promise<void> {
    await mkdir(aiChatDebugDir(), { recursive: true, mode: 0o700 });
    await chmod(aiChatDebugDir(), 0o700);
}

async function readRecentTurns(filePath: string): Promise<AiChatDebugTurn[]> {
    let fileSize: number;
    try {
        fileSize = (await stat(filePath)).size;
    } catch (error: any) {
        if (error?.code === "ENOENT") return [];
        throw error;
    }
    if (fileSize === 0) return [];

    const start = Math.max(0, fileSize - MAX_DEBUG_BYTES);
    const length = Math.min(fileSize, MAX_DEBUG_BYTES);
    const file = await open(filePath, "r");
    let content: string;
    try {
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await file.read(buffer, 0, length, start);
        content = buffer.toString("utf8", 0, bytesRead);
    } finally {
        await file.close();
    }

    const lines = content.split("\n").filter(Boolean);
    if (start > 0) lines.shift();
    const cutoff = Date.now() - DEBUG_RETENTION_MS;
    return lines.flatMap(line => {
        try {
            const turn = JSON.parse(line) as AiChatDebugTurn;
            const startedAt = Date.parse(turn.startedAt);
            return Number.isFinite(startedAt) && startedAt >= cutoff ? [turn] : [];
        } catch {
            return [];
        }
    });
}

async function writeBoundedDebugTurn(turn: AiChatDebugTurn): Promise<void> {
    const safeTurn = redactLogMetadata(turn as unknown as Record<string, unknown>);
    const line = `${safeJson(safeTurn)}\n`;
    const bytes = Buffer.byteLength(line, "utf8");
    const startedAt = Date.parse(turn.startedAt);
    if (bytes > MAX_DEBUG_BYTES || !Number.isFinite(startedAt) || startedAt < Date.now() - DEBUG_RETENTION_MS)
        return;

    await ensurePrivateDirectory();
    const filePath = aiChatDebugLogPath();
    const retained = await readRecentTurns(filePath);
    const lines = retained.map(safeJson);
    lines.push(line.trimEnd());
    let serialized = `${lines.join("\n")}\n`;
    while (Buffer.byteLength(serialized, "utf8") > MAX_DEBUG_BYTES && lines.length > 1) {
        lines.shift();
        serialized = `${lines.join("\n")}\n`;
    }

    await writeFile(filePath, serialized, { encoding: "utf8", mode: 0o600 });
    await chmod(filePath, 0o600);
}

async function pruneDebugLog(): Promise<void> {
    const filePath = aiChatDebugLogPath();
    const turns = await readRecentTurns(filePath);
    await ensurePrivateDirectory();
    await writeFile(filePath, turns.length ? `${turns.map(safeJson).join("\n")}\n` : "", {
        encoding: "utf8",
        mode: 0o600,
    });
    await chmod(filePath, 0o600);
}
