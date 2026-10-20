// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, stat, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { appendAiChatDebugTurn, readAiChatDebugTurns } from "./debugLog";

const originalEnv = {
    AI_CHAT_DEBUG: process.env.AI_CHAT_DEBUG,
    AI_CHAT_DEBUG_DIR: process.env.AI_CHAT_DEBUG_DIR,
    NODE_ENV: process.env.NODE_ENV,
};
let directory: string;

function turn(id: string, startedAt = new Date().toISOString(), message = "hello") {
    return {
        id,
        startedAt,
        finishedAt: startedAt,
        status: "ok" as const,
        request: { newUserMessage: message, history: [] },
        tools: [],
    };
}

describe("AI chat debug log boundaries", () => {
    beforeEach(async () => {
        directory = await mkdtemp(path.join(os.tmpdir(), "stacks-debug-log-"));
        process.env.AI_CHAT_DEBUG = "true";
        process.env.AI_CHAT_DEBUG_DIR = directory;
        process.env.NODE_ENV = "development";
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    it("does not capture turns in production even when debugging is enabled", async () => {
        process.env.NODE_ENV = "production";
        await appendAiChatDebugTurn(turn("production"));
        await expect(readFile(path.join(directory, "turns.jsonl"), "utf8")).rejects.toMatchObject({
            code: "ENOENT",
        });
    });

    it("restricts the debug directory and log file to the owner", async () => {
        await appendAiChatDebugTurn(turn("private"));
        expect((await stat(directory)).mode & 0o777).toBe(0o700);
        expect((await stat(path.join(directory, "turns.jsonl"))).mode & 0o777).toBe(0o600);
    });

    it("only returns turns from the last 24 hours", async () => {
        await appendAiChatDebugTurn(turn("old", new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()));
        await appendAiChatDebugTurn(turn("fresh"));
        expect(await readFile(path.join(directory, "turns.jsonl"), "utf8")).not.toContain('"id":"old"');
        expect((await readAiChatDebugTurns()).map(item => item.id)).toEqual(["fresh"]);
    });

    it("redacts credential values before persisting debug turns", async () => {
        const sensitiveTurn = {
            ...turn("sensitive", new Date().toISOString(), "provider access_token=debug-secret-sentinel"),
            tools: [
                {
                    toolName: "example",
                    input: { nested: { refresh_token: "nested-secret-sentinel" } },
                    success: false,
                    error: "Bearer provider-secret-sentinel",
                    timestamp: new Date().toISOString(),
                },
            ],
        };

        await appendAiChatDebugTurn(sensitiveTurn);

        const stored = await readFile(path.join(directory, "turns.jsonl"), "utf8");
        expect(stored).not.toContain("debug-secret-sentinel");
        expect(stored).not.toContain("nested-secret-sentinel");
        expect(stored).not.toContain("provider-secret-sentinel");
        expect(stored).toContain("[redacted]");
    });

    it("does not print storage error details that can contain local paths", async () => {
        const secretPath = path.join(directory, "private-path-sentinel");
        const validDirectory = directory;
        await writeFile(secretPath, "occupied");
        process.env.AI_CHAT_DEBUG_DIR = secretPath;
        const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);

        try {
            await appendAiChatDebugTurn(turn("write-failure"));
            expect(logError.mock.calls.flat().join(" ")).not.toContain("private-path-sentinel");
        } finally {
            logError.mockRestore();
            process.env.AI_CHAT_DEBUG_DIR = validDirectory;
        }

        await appendAiChatDebugTurn(turn("after-write-failure"));
        expect((await readAiChatDebugTurns()).map(item => item.id)).toEqual(["after-write-failure"]);
    });

    it("caps stored data at 10 MiB and skips a single oversized turn", async () => {
        await appendAiChatDebugTurn(
            turn("oversized", new Date().toISOString(), "x".repeat(10 * 1024 * 1024))
        );
        await appendAiChatDebugTurn(turn("kept"));
        expect((await stat(path.join(directory, "turns.jsonl"))).size).toBeLessThanOrEqual(10 * 1024 * 1024);
        expect((await readAiChatDebugTurns()).map(item => item.id)).toEqual(["kept"]);
    });

    it("rotates the oldest turns when a new turn would exceed the 10 MiB cap", async () => {
        const largeMessage = "x".repeat(5 * 1024 * 1024);
        await appendAiChatDebugTurn(turn("older", new Date().toISOString(), largeMessage));
        await appendAiChatDebugTurn(turn("newer", new Date().toISOString(), largeMessage));

        expect((await stat(path.join(directory, "turns.jsonl"))).size).toBeLessThanOrEqual(10 * 1024 * 1024);
        expect((await readAiChatDebugTurns()).map(item => item.id)).toEqual(["newer"]);
    });
});
