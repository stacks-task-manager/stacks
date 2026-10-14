// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { AI_TOOL_REGISTRY, buildAiTools, MCP_AI_TOOL_NAMES } from "../tools";
import { CORE_TOOLS, TOPIC_TOOLS, PROMPT_TOPICS } from "../promptContext";
import { template } from "../promptTemplate";
import { fixtures } from "../../../scripts/ai-eval/fixtures";
import { z } from "zod";
import { vi } from "vitest";
import { aiDateInput } from "../toolRegistry/dateInput";
vi.mock("../../loaders", () => ({}));
vi.mock("../../loaders/context", () => ({ getCurrentUser: () => ({ id: "user" }) }));
describe("AI catalogue consistency", () => {
    it("rejects invalid dates before mutation dispatch", () => {
        for (const value of ["tomorrow", "2026-02-30", "2026-10-14T09:00:00", "2026-10-14T99:00:00Z"])
            expect(aiDateInput.safeParse(value).success).toBe(false);
        for (const value of ["2026-10-14", "2026-10-14T09:00:00Z", "2026-10-14T09:00:00+02:00"])
            expect(aiDateInput.parse(value)).toBe(value);
    });
    const names: string[] = AI_TOOL_REGISTRY.map(t => t.name);
    it("has unique names, fixture coverage, and no unreachable tools", () => {
        expect(new Set(names).size).toBe(names.length);
        for (const name of names) {
            expect(fixtures.some(f => f.tool === name)).toBe(true);
            expect([...CORE_TOOLS, ...Object.values(TOPIC_TOOLS).flat()]).toContain(name);
        }
        for (const name of [...CORE_TOOLS, ...Object.values(TOPIC_TOOLS).flat(), ...MCP_AI_TOOL_NAMES])
            expect(names).toContain(name);
    });
    it("exposes each prompt's referenced tool names", () => {
        for (const topic of PROMPT_TOPICS) {
            const text = template(`system-${topic}.md`, { currentUserId: "user" });
            const available = [...CORE_TOOLS, ...TOPIC_TOOLS[topic]];
            for (const match of text.matchAll(/`([a-z]+[A-Z][a-zA-Z]+)`/g)) {
                if (names.includes(match[1])) expect(available).toContain(match[1]);
            }
        }
    });
    it("validates before dispatching to an execution override", async () => {
        const override = vi.fn();
        const tools = buildAiTools(["createProject"], override);
        await expect((tools.createProject.execute as Function)({ title: "" }, {})).rejects.toBeInstanceOf(
            z.ZodError
        );
        expect(override).not.toHaveBeenCalled();
    });
    it("issues distinct choice ids when model ids are missing or duplicated", async () => {
        const definition = AI_TOOL_REGISTRY.find(t => t.name === "askUserChoice")!;
        for (const options of [
            [{ label: "Red" }, { label: "Blue" }],
            [
                { id: "same", label: "Red" },
                { id: "same", label: "Blue" },
            ],
        ]) {
            const input = definition.inputSchema.parse({ question: "Which?", control: "radio", options });
            const result = await (definition.execute as Function)(input);
            expect(new Set(result.options.map((o: { id: string }) => o.id)).size).toBe(2);
            expect(result.options.map((o: { label: string }) => o.label)).toEqual(["Red", "Blue"]);
        }
    });
});
