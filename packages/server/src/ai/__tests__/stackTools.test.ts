// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TASKSORTING } from "@stacks/types";

vi.mock("../../loaders", () => ({
    StacksLoader: {
        update: vi.fn(),
    },
}));

import { StacksLoader } from "../../loaders";
import { stackAiTools } from "../toolRegistry/stackTools";

describe("ai.stackTools.updateStack", () => {
    const updateStack = stackAiTools.find(tool => tool.name === "updateStack");
    const updateMock = vi.mocked(StacksLoader.update);

    beforeEach(() => {
        updateMock.mockReset();
    });

    it("accepts null for clearable fields and converts them to undefined in the patch", async () => {
        updateMock.mockResolvedValue({
            id: "stack-1",
            title: "Done",
            project: "project-1",
            tint: undefined,
            collapsed: false,
            maxTasks: undefined,
            sorting: undefined,
            tasksOrder: [],
            created: new Date(),
            updated: new Date(),
        });

        const input = updateStack?.inputSchema.parse({
            stackId: "stack-1",
            tint: null,
            maxTasks: null,
            sorting: null,
        });

        const result = await updateStack?.execute(input as never);

        expect(updateMock).toHaveBeenCalledWith("stack-1", {
            tint: undefined,
            maxTasks: undefined,
            sorting: undefined,
        });
        expect(result).toEqual({
            id: "stack-1",
            title: "Done",
            projectId: "project-1",
            tint: null,
            collapsed: false,
            maxTasks: null,
            sorting: null,
        });
    });

    it("validates sorting against the supported enum values", () => {
        expect(() =>
            updateStack?.inputSchema.parse({
                stackId: "stack-1",
                sorting: "invalid-sort",
            })
        ).toThrow();

        expect(() =>
            updateStack?.inputSchema.parse({
                stackId: "stack-1",
                sorting: TASKSORTING.TITLEASC,
            })
        ).not.toThrow();
    });
});
