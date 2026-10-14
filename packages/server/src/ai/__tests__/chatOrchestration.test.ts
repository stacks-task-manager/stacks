// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({
    stream: vi.fn(),
    guard: vi.fn(),
    execute: vi.fn(),
    mcp: vi.fn(),
    close: vi.fn(),
    configured: true,
    connect: vi.fn(),
}));
vi.mock("ai", () => ({ streamText: mocks.stream, stepCountIs: vi.fn() }));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: () => ({ chat: () => ({}) }) }));
vi.mock("../config", () => ({
    getLlmConfig: () => ({ baseURL: "http://test/v1", modelId: "test", apiKey: "test" }),
    isAiChatConfigured: () => mocks.configured,
}));
vi.mock("../debugLog", () => ({ appendAiChatDebugTurn: vi.fn() }));
vi.mock("../mcpToolClient", () => ({
    createMcpToolClient: mocks.connect,
}));
vi.mock("../../services/requestContext", () => ({
    requestContext: { getCurrentUser: () => ({ id: "user", tenant: "tenant" }) },
}));
vi.mock("../tools", () => ({
    AI_TOOL_REGISTRY: [
        {
            name: "createTask",
            inputSchema: z.object({ projectId: z.string(), title: z.string() }),
            execute: mocks.execute,
        },
    ],
    MCP_AI_TOOL_NAMES: new Set(["createTask"]),
    buildAiTools: (_names: unknown, execute: Function) => {
        mocks.guard.mockImplementation(execute as any);
        return {};
    },
}));
import { streamAiChat } from "../chat";
import { getConversation, issueChoice } from "../conversation";
const handlers = () => ({ onDone: vi.fn(), onError: vi.fn(), onTextDelta: vi.fn() });
const pending = (id: string) =>
    issueChoice(
        getConversation("tenant", "user", id),
        {
            type: "choice",
            id: "choice",
            question: "Create task?",
            control: "buttons",
            options: [
                { id: "confirm", label: "Confirm" },
                { id: "cancel", label: "Cancel" },
            ],
        },
        {
            toolName: "createTask",
            input: { projectId: "project", title: "Hello world" },
            intent: "Create task Hello world",
        }
    );
beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured = true;
    mocks.connect.mockReset();
    mocks.connect.mockResolvedValue({ callTool: mocks.mcp, close: mocks.close });
    delete process.env.AI_TOOL_BACKEND;
    mocks.stream.mockReturnValue({
        consumeStream: async () => undefined,
        text: Promise.resolve("Completed"),
    });
    mocks.execute.mockResolvedValue({ id: "task", projectId: "project", title: "Hello world" });
    mocks.mcp.mockResolvedValue({ id: "task", projectId: "project", title: "Hello world" });
});
describe("LLM chat orchestration", () => {
    it("requires configured LLM and honors the kill switch", async () => {
        mocks.configured = false;
        const h = handlers();
        await streamAiChat([], "Hello", h);
        expect(h.onError).toHaveBeenCalledOnce();
        expect(mocks.stream).not.toHaveBeenCalled();
    });
    it.each(["local", "mcp"])(
        "executes exact approved arguments once via %s and retains result widgets",
        async backend => {
            process.env.AI_TOOL_BACKEND = backend;
            const id = crypto.randomUUID();
            const choice = pending(id);
            const h = handlers();
            const options = {
                conversationId: id,
                clientRequestId: "request",
                choiceReply: { token: choice.pendingActionToken!, optionIds: ["confirm"] },
            };
            await streamAiChat([], "tampered message", h, undefined, options);
            const executor = backend === "mcp" ? mocks.mcp : mocks.execute;
            expect(executor).toHaveBeenCalledOnce();
            if (backend === "mcp")
                expect(executor).toHaveBeenCalledWith("createTask", {
                    projectId: "project",
                    title: "Hello world",
                });
            else expect(executor).toHaveBeenCalledWith({ projectId: "project", title: "Hello world" });
            expect(h.onDone.mock.calls[0][0].widgets[0].type).toBe("result");
            await streamAiChat([], "replayed", h, undefined, options);
            expect(executor).toHaveBeenCalledOnce();
        }
    );
    it("keeps completed action results if the LLM reply fails", async () => {
        mocks.stream.mockImplementation(() => {
            throw new Error("writer failed");
        });
        const id = crypto.randomUUID();
        const choice = pending(id);
        const h = handlers();
        await streamAiChat([], "Confirm", h, undefined, {
            conversationId: id,
            choiceReply: { token: choice.pendingActionToken!, optionIds: ["confirm"] },
        });
        expect(h.onError).not.toHaveBeenCalled();
        expect(h.onDone.mock.calls[0][0].widgets[0].type).toBe("result");
    });
    it("retains successful action results when a later MCP connection fails", async () => {
        process.env.AI_TOOL_BACKEND = "mcp";
        mocks.connect
            .mockResolvedValueOnce({ callTool: mocks.mcp, close: mocks.close })
            .mockRejectedValueOnce(new Error("Connection unavailable"));
        const id = crypto.randomUUID();
        const choice = pending(id);
        const h = handlers();
        await streamAiChat([], "Confirm", h, undefined, {
            conversationId: id,
            choiceReply: { token: choice.pendingActionToken!, optionIds: ["confirm"] },
        });
        expect(mocks.mcp).toHaveBeenCalledOnce();
        expect(h.onDone.mock.calls[0][0].widgets[0].type).toBe("result");
        expect(h.onDone.mock.calls[0][0].widgets.at(-1).label).toBe("Action completed; reply unavailable");
    });
    it("never retries a failed approved mutation", async () => {
        mocks.execute.mockRejectedValue(new Error("Forbidden"));
        const id = crypto.randomUUID();
        const choice = pending(id);
        const h = handlers();
        await streamAiChat([], "Confirm", h, undefined, {
            conversationId: id,
            choiceReply: { token: choice.pendingActionToken!, optionIds: ["confirm"] },
        });
        expect(mocks.stream).not.toHaveBeenCalled();
        expect(h.onDone.mock.calls[0][0].widgets[0].severity).toBe("error");
    });
    it("cancels without execution and rejects forged replies", async () => {
        const id = crypto.randomUUID();
        const choice = pending(id);
        const h = handlers();
        await streamAiChat([], "Cancel", h, undefined, {
            conversationId: id,
            choiceReply: { token: choice.pendingActionToken!, optionIds: ["cancel"] },
        });
        expect(mocks.execute).not.toHaveBeenCalled();
        await streamAiChat([], "Confirm", h, undefined, {
            conversationId: id,
            choiceReply: { token: "forged", optionIds: ["confirm"] },
        });
        expect(h.onError).toHaveBeenCalledWith("Choice expired or invalid");
    });
    it("rejects concurrent turns", async () => {
        const id = crypto.randomUUID();
        getConversation("tenant", "user", id).busy = true;
        const h = handlers();
        await streamAiChat([], "Create task", h, undefined, { conversationId: id });
        expect(h.onError).toHaveBeenCalledWith("Chat request already running");
        expect(mocks.stream).not.toHaveBeenCalled();
    });
    it("emits one terminal error for SDK stream errors", async () => {
        mocks.stream.mockImplementation(options => ({
            consumeStream: async () => options.onError({ error: new Error("unavailable") }),
            text: Promise.resolve(""),
        }));
        const h = handlers();
        await streamAiChat([], "List tasks", h, undefined, { conversationId: crypto.randomUUID() });
        expect(h.onError).toHaveBeenCalledOnce();
        expect(h.onDone).not.toHaveBeenCalled();
    });
    it("suppresses model success claims after a guarded mutation fails", async () => {
        mocks.stream.mockImplementation(() => ({
            consumeStream: async () => {
                await expect(
                    mocks.guard({
                        toolName: "deleteTask",
                        input: { taskId: "invented" },
                        defaultExecute: mocks.execute,
                    })
                ).rejects.toThrow("Resolve");
            },
            text: Promise.resolve("The task was permanently deleted."),
        }));
        const h = handlers();
        await streamAiChat([], "Delete that task", h, undefined, { conversationId: crypto.randomUUID() });
        expect(h.onDone).toHaveBeenCalledWith({
            text: "",
            widgets: [expect.objectContaining({ type: "status", severity: "error" })],
        });
        expect(mocks.execute).not.toHaveBeenCalled();
    });
    it("does not show success prose after mutation schema/tool errors", async () => {
        mocks.stream.mockImplementation(options => ({
            consumeStream: async () =>
                options.experimental_onToolCallFinish({
                    toolCall: { toolName: "updateTask", input: { progress: 150 } },
                    success: false,
                    error: new Error("Invalid progress"),
                }),
            text: Promise.resolve("The task was updated successfully."),
        }));
        const h = handlers();
        await streamAiChat([], "Set task progress", h, undefined, { conversationId: crypto.randomUUID() });
        expect(h.onDone).toHaveBeenCalledWith({
            text: "",
            widgets: [
                expect.objectContaining({
                    type: "status",
                    label: "Action failed: Invalid progress",
                    severity: "error",
                }),
            ],
        });
    });
});
