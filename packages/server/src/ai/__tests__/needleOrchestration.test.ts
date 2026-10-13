// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn(), stream: vi.fn(), build: vi.fn() }));
vi.mock("../needle/pipeline", () => ({
    runNeedleTurn: mocks.run,
    status: (label: string) => ({ type: "status", label }),
}));
vi.mock("../needle/runtime", () => ({ isNeedleReady: () => true, initializeNeedle: vi.fn() }));
vi.mock("../config", () => ({
    isLlmConfigured: () => true,
    getLlmConfig: () => ({ baseURL: "http://localhost/v1", modelId: "test", apiKey: "test" }),
}));
vi.mock("ai", () => ({ streamText: mocks.stream, stepCountIs: vi.fn() }));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: () => ({ chat: () => ({}) }) }));
vi.mock("../tools", () => ({ buildAiTools: mocks.build, MCP_AI_TOOL_NAMES: new Set() }));
vi.mock("../debugLog", () => ({ appendAiChatDebugTurn: vi.fn() }));
vi.mock("../promptTemplate", () => ({ template: () => "" }));
vi.mock("../promptContext", () => ({
    selectPromptContext: () => ({ topics: [], allowedTools: [], promptFragments: [], reasons: {} }),
}));
vi.mock("../../services/requestContext", () => ({
    requestContext: { getCurrentUser: () => ({ id: "user", tenant: "tenant" }) },
}));
import { streamAiChat } from "../chat";
beforeEach(() => {
    vi.clearAllMocks();
    mocks.run.mockResolvedValue({ widgets: [], results: [], tools: [], plans: [], mutated: false });
    mocks.stream.mockReturnValue({ consumeStream: async () => undefined, text: Promise.resolve("Done") });
});
const handlers = () => ({ onDone: vi.fn(), onTextDelta: vi.fn(), onError: vi.fn() });
describe("Needle and optional LLM orchestration", () => {
    it("writes completed results with tool execution disabled", async () => {
        mocks.run.mockResolvedValue({
            widgets: [{ type: "result", label: "Project", items: [] }],
            results: [{ tool: "createProject", output: { title: "Website" } }],
            tools: [],
            plans: [],
            mutated: true,
        });
        const callbacks = handlers();
        await streamAiChat([], "Create Website", callbacks);
        expect(mocks.stream.mock.calls[0][0].tools).toBeUndefined();
        expect(mocks.build).not.toHaveBeenCalled();
        expect(callbacks.onDone.mock.calls[0][0].widgets[0].type).toBe("result");
    });
    it("never falls back to LLM tools after attempting a mutation", async () => {
        mocks.run.mockResolvedValue({
            widgets: [{ type: "status", label: "Tool failed" }],
            results: [],
            tools: [],
            plans: [],
            mutated: true,
            fallback: "timeout",
        });
        const callbacks = handlers();
        await streamAiChat([], "Create Website", callbacks);
        expect(mocks.stream).not.toHaveBeenCalled();
        expect(callbacks.onDone).toHaveBeenCalledOnce();
    });
    it("keeps result cards when response writing fails", async () => {
        mocks.run.mockResolvedValue({
            widgets: [{ type: "result", label: "Project", items: [] }],
            results: [{}],
            tools: [],
            plans: [],
            mutated: true,
        });
        mocks.stream.mockImplementationOnce(() => {
            throw new Error("writer failed");
        });
        const callbacks = handlers();
        await streamAiChat([], "Create Website", callbacks);
        expect(mocks.build).not.toHaveBeenCalled();
        expect(callbacks.onDone.mock.calls[0][0].widgets[0].type).toBe("result");
    });
    it("uses the existing tool flow before any mutation", async () => {
        mocks.run.mockResolvedValue({
            widgets: [],
            results: [],
            tools: [],
            plans: [],
            mutated: false,
            fallback: "unsupported",
        });
        await streamAiChat([], "Help", handlers());
        expect(mocks.build).toHaveBeenCalledOnce();
        expect(mocks.stream).toHaveBeenCalledOnce();
    });
});
