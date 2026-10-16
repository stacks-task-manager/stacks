// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
    getOne: vi.fn(async (id: string) => ({
        id,
        title: "Read task",
        done: false,
        project: "project",
        stack: "column",
    })),
}));
vi.mock("../../loaders", () => ({ TasksLoader: { getOne: mocks.getOne } }));
import mcp from "../../routes/mcp";
import { MCP_AI_TOOL_NAMES } from "../toolRegistry";

describe("MCP wire metadata", () => {
    const call = async (method: string, params: unknown = {}) => {
        const response = await mcp.request("/", {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        });
        expect(response.status).toBe(200);
        return response.json();
    };
    it("publishes direct-execution instructions and strict schemas without running handlers", async () => {
        const initialized = await call("initialize", {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "metadata-test", version: "1" },
        });
        expect(initialized.result.instructions).toContain("handlers directly");
        const listed = await call("tools/list");
        expect(listed.result.tools).toHaveLength(MCP_AI_TOOL_NAMES.size);
        const get = listed.result.tools.find((tool: any) => tool.name === "getTask");
        const remove = listed.result.tools.find((tool: any) => tool.name === "deleteTask");
        const create = listed.result.tools.find((tool: any) => tool.name === "createTask");
        expect(get.annotations.readOnlyHint).toBe(true);
        expect(remove.annotations.destructiveHint).toBe(true);
        expect(create.inputSchema.properties.projectId.description).not.toContain("Accepts an exact name");
        expect(listed.result.tools.some((tool: any) => tool.name === "askUserChoice")).toBe(false);
    });
    it("isolates concurrent metadata requests with the same JSON-RPC id", async () => {
        const [a, b] = await Promise.all([call("tools/list"), call("tools/list")]);
        expect(a.result.tools).toEqual(b.result.tools);
    });
    it("waits for tool results before closing each stateless request", async () => {
        const id = "00000000-0000-4000-8000-000000000001";
        const response = await call("tools/call", { name: "getTask", arguments: { taskId: id } });
        expect(mocks.getOne).toHaveBeenCalledTimes(1);
        expect(mocks.getOne).toHaveBeenCalledWith(id);
        expect(JSON.parse(response.result.content[0].text)).toMatchObject({
            id,
            title: "Read task",
            done: false,
        });
    });
});
