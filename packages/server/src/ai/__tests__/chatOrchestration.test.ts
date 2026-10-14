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
    setupError: false,
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
        if (mocks.setupError) throw new Error("Tool setup failed");
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
            input: { projectId: "00000000-0000-4000-8000-000000000001", title: "Hello world" },
            intent: "Create task Hello world",
        }
    );
beforeEach(() => {
    vi.clearAllMocks();
    mocks.close.mockResolvedValue(undefined);
    mocks.configured = true;
    mocks.setupError = false;
    mocks.connect.mockReset();
    mocks.connect.mockResolvedValue({ callTool: mocks.mcp, close: mocks.close });
    delete process.env.AI_TOOL_BACKEND;
    mocks.stream.mockReturnValue({
        consumeStream: async () => undefined,
        text: Promise.resolve("Completed"),
    });
    mocks.execute.mockResolvedValue({
        id: "task",
        projectId: "00000000-0000-4000-8000-000000000001",
        title: "Hello world",
    });
    mocks.mcp.mockResolvedValue({
        id: "task",
        projectId: "00000000-0000-4000-8000-000000000001",
        title: "Hello world",
    });
});
describe("LLM chat orchestration", () => {
    it.each([false, true])(
        "returns immediate create results without another model step (stream failure: %s)",
        async fails => {
            const projectId = "00000000-0000-4000-8000-000000000001";
            mocks.stream.mockImplementation(options => ({
                consumeStream: async () => {
                    const args = {
                        toolName: "createTask",
                        input: { projectId, title: "Hello world" },
                        defaultExecute: mocks.execute,
                    };
                    const output = await mocks.guard(args);
                    await options.experimental_onToolCallFinish({ toolCall: args, success: true, output });
                    options.onChunk({ chunk: { type: "text-delta", delta: "Wrong extra prose" } });
                    if (fails) throw new Error("Stream closed after action");
                },
                text: Promise.resolve("Wrong extra prose"),
            }));
            const h = handlers();
            const id = crypto.randomUUID();
            await streamAiChat(
                [],
                "Create task Hello world",
                h,
                { section: "project", sectionId: projectId },
                { conversationId: id, clientRequestId: "create" }
            );
            expect(mocks.execute).toHaveBeenCalledOnce();
            expect(mocks.stream).toHaveBeenCalledOnce();
            expect(h.onTextDelta).not.toHaveBeenCalled();
            expect(h.onError).not.toHaveBeenCalled();
            expect(h.onDone).toHaveBeenCalledWith({ text: "Task created: Hello world.", widgets: [] });
            await streamAiChat([], "Create task Hello world", h, undefined, {
                conversationId: id,
                clientRequestId: "create",
            });
            expect(mocks.execute).toHaveBeenCalledOnce();
        }
    );
    it("explains unsupported operations without calling the model or offering choices", async () => {
        const h = handlers();
        await streamAiChat([], "Create a new tag called Urgent", h, undefined, {
            conversationId: crypto.randomUUID(),
        });
        expect(mocks.stream).not.toHaveBeenCalled();
        expect(mocks.execute).not.toHaveBeenCalled();
        expect(h.onDone).toHaveBeenCalledWith({
            text: expect.stringContaining("can't perform"),
            widgets: [],
        });
    });
    it("reports a confirmed action using its tool result instead of model success prose", async () => {
        mocks.stream.mockImplementation(options => ({
            consumeStream: async () => {
                options.onChunk({ chunk: { type: "text-delta", delta: "I deleted every project." } });
            },
            text: Promise.resolve("I deleted every project."),
        }));
        const id = crypto.randomUUID();
        const choice = pending(id);
        const h = handlers();
        await streamAiChat([], "Confirm", h, undefined, {
            conversationId: id,
            choiceReply: { token: choice.pendingActionToken!, optionIds: ["confirm"] },
        });
        expect(h.onDone.mock.calls[0][0].text).toBe("Task created: Hello world.");
        expect(h.onTextDelta).not.toHaveBeenCalled();
        expect(h.onDone.mock.calls[0][0].widgets).toEqual([]);
    });
    it("rejects an old confirmation containing a name in an id field", async () => {
        const id = crypto.randomUUID();
        const s = getConversation("tenant", "user", id);
        const choice = pending(id);
        s.pending!.mutation!.input = { projectId: "Website", title: "Hello world" };
        const h = handlers();
        await streamAiChat([], "Confirm", h, undefined, {
            conversationId: id,
            choiceReply: { token: choice.pendingActionToken!, optionIds: ["confirm"] },
        });
        expect(mocks.execute).not.toHaveBeenCalled();
        expect(mocks.stream).not.toHaveBeenCalled();
        expect(h.onDone.mock.calls[0][0].widgets[0].label).toContain("not a resolved id");
    });
    it("executes the stored create proposal after clarification without additional approval", async () => {
        const id = crypto.randomUUID();
        const s = getConversation("tenant", "user", id);
        const projectId = "00000000-0000-4000-8000-000000000001";
        s.knownIds.add(projectId);
        s.knownKinds.set(projectId, new Set(["project"]));
        const choice = issueChoice(s, {
            type: "choice",
            id: "which",
            question: "Which project?",
            control: "radio",
            options: [{ id: "selected", label: "Website", value: projectId }],
        });
        s.pending!.resolution = {
            toolName: "createTask",
            input: { projectId: "Website", title: "Hello world" },
            intent: "Create task Hello world in Website",
            field: "projectId",
        };
        const h = handlers();
        await streamAiChat([], "tampered title", h, undefined, {
            conversationId: id,
            choiceReply: { token: choice.pendingActionToken!, optionIds: ["selected"] },
        });
        expect(mocks.stream).not.toHaveBeenCalled();
        expect(mocks.execute).toHaveBeenCalledWith({ projectId, title: "Hello world" });
        expect(mocks.execute).toHaveBeenCalledOnce();
        expect(s.pending).toBeUndefined();
        expect(h.onDone).toHaveBeenCalledWith({ text: "Task created: Hello world.", widgets: [] });
    });
    it("closes MCP when tool setup fails before streaming starts", async () => {
        process.env.AI_TOOL_BACKEND = "mcp";
        mocks.setupError = true;
        const h = handlers();
        await streamAiChat([], "List projects", h, undefined, { conversationId: crypto.randomUUID() });
        expect(mocks.close).toHaveBeenCalledOnce();
        expect(mocks.stream).not.toHaveBeenCalled();
        expect(h.onError).toHaveBeenCalledOnce();
    });
    it("uses the evaluation generation settings in runtime chat", async () => {
        await streamAiChat([], "List projects", handlers(), undefined, {
            conversationId: crypto.randomUUID(),
        });
        expect(mocks.stream).toHaveBeenCalledWith(
            expect.objectContaining({
                temperature: 0,
                providerOptions: { openai: { parallelToolCalls: false } },
            })
        );
    });
    it("requires configured LLM and honors the kill switch", async () => {
        mocks.configured = false;
        const h = handlers();
        await streamAiChat([], "Hello", h);
        expect(h.onError).toHaveBeenCalledOnce();
        expect(mocks.stream).not.toHaveBeenCalled();
    });
    it.each(["local", "mcp"])(
        "executes exact approved arguments once via %s and returns one plain summary",
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
                    projectId: "00000000-0000-4000-8000-000000000001",
                    title: "Hello world",
                });
            else
                expect(executor).toHaveBeenCalledWith({
                    projectId: "00000000-0000-4000-8000-000000000001",
                    title: "Hello world",
                });
            expect(h.onDone.mock.calls[0][0]).toEqual({ text: "Task created: Hello world.", widgets: [] });
            await streamAiChat([], "replayed", h, undefined, options);
            expect(executor).toHaveBeenCalledOnce();
        }
    );
    it("acknowledges approved actions without requesting an LLM reply", async () => {
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
        expect(mocks.stream).not.toHaveBeenCalled();
        expect(h.onDone.mock.calls[0][0].text).toBe("Task created: Hello world.");
        expect(
            h.onDone.mock.calls[0][0].widgets.some((widget: { type: string }) => widget.type === "result")
        ).toBe(false);
    });
    it("acknowledges MCP actions without opening a second connection", async () => {
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
        expect(h.onDone.mock.calls[0][0].text).toBe("Task created: Hello world.");
        expect(
            h.onDone.mock.calls[0][0].widgets.some((widget: { type: string }) => widget.type === "result")
        ).toBe(false);
        expect(h.onDone.mock.calls[0][0].widgets).toEqual([]);
        expect(mocks.connect).toHaveBeenCalledOnce();
        expect(mocks.stream).not.toHaveBeenCalled();
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
                ).rejects.toThrow();
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
