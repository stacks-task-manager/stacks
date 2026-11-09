// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { parseMcpToolResult } from "../mcpToolClient";
describe("MCP tool result boundary", () => {
    it("does not treat remote tool errors as successful mutations", () => {
        expect(() =>
            parseMcpToolResult({ isError: true, content: [{ type: "text", text: "Forbidden" }] })
        ).toThrow("Forbidden");
    });
    it("preserves JSON and structured tool results", () => {
        expect(parseMcpToolResult({ content: [{ type: "text", text: '{"id":"task"}' }] })).toEqual({
            id: "task",
        });
        expect(parseMcpToolResult({ content: [], structuredContent: { id: "task" } })).toEqual({
            id: "task",
        });
    });
});
