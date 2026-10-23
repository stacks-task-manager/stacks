// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { MCP_INSTRUCTIONS, mcpToolAnnotations } from "../mcpGuidance";
describe("external MCP guidance", () => {
    it("explains direct execution and host-owned references and caching", () => {
        expect(MCP_INSTRUCTIONS).toContain("handlers directly");
        expect(MCP_INSTRUCTIONS).toContain("actual input schemas");
        expect(MCP_INSTRUCTIONS).toContain("host's model requests");
        expect(MCP_INSTRUCTIONS).toContain("tools/list");
    });
    it("marks read tools and destructive changes without promising idempotence", () => {
        expect(mcpToolAnnotations("getTask")).toEqual({ readOnlyHint: true, destructiveHint: false });
        expect(mcpToolAnnotations("deleteStack")).toEqual({ readOnlyHint: false, destructiveHint: true });
        expect(mcpToolAnnotations("updateStack").destructiveHint).toBe(true);
        expect(mcpToolAnnotations("createTask").readOnlyHint).toBe(false);
    });
});
