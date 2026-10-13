// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { AI_TOOL_REGISTRY } from "../tools";
import { NEEDLE_TOOL_METADATA, needleSchema, presentResult } from "../needle/catalog";
describe("registered Needle tool coverage", () => {
    it("has a derived schema, explicit metadata and presentation for every tool", () => {
        expect(Object.keys(NEEDLE_TOOL_METADATA).sort()).toEqual(AI_TOOL_REGISTRY.map(t => t.name).sort());
        for (const tool of AI_TOOL_REGISTRY) {
            const schema = needleSchema(tool.name);
            expect(schema.parameters.type).toBe("object");
            expect(presentResult(tool.name, {})).toHaveProperty("type", "result");
            for (const field of Object.keys(NEEDLE_TOOL_METADATA[tool.name].references))
                expect(schema.parameters.properties).toHaveProperty(field);
        }
    });
    it("keeps refinements and constraints authoritative in Zod", () => {
        const tool = AI_TOOL_REGISTRY.find(t => t.name === "listTasks")!;
        expect(tool.inputSchema.safeParse({}).success).toBe(false);
        expect(needleSchema("moveTask").parameters.properties.taskId.description).toContain("name or id");
    });
});
