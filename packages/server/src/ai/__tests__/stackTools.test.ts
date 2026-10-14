// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TASKSORTING } from "@stacks/types";

vi.mock("../../loaders", () => ({
    StacksLoader: {
        update: vi.fn(),
        create: vi.fn(),
        getAll: vi.fn(),
        remove: vi.fn(),
    },
    ProjectsLoader: { removeStackOrder: vi.fn(), getOne: vi.fn() },
}));

import { ProjectsLoader, StacksLoader } from "../../loaders";
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

describe("ai.stackTools.deleteStack", () => {
    const deleteStack = stackAiTools.find(tool => tool.name === "deleteStack");
    it("removes the column and its project ordering entry", async () => {
        vi.mocked(StacksLoader.remove).mockResolvedValue({
            id: "stack-1",
            title: "Column XYZ",
            project: "project-1",
        } as never);
        await deleteStack?.execute(deleteStack.inputSchema.parse({ stackId: "stack-1" }) as never);
        expect(StacksLoader.remove).toHaveBeenCalledWith("stack-1");
        expect(ProjectsLoader.removeStackOrder).toHaveBeenCalledWith("project-1", "stack-1");
    });
});

describe("ai.stackTools relative placement", () => {
    it("passes the reference anchor to the transactional loader", async () => {
        const tool = stackAiTools.find(tool => tool.name === "createStack")!;
        vi.mocked(StacksLoader.create).mockResolvedValue({
            id: "new",
            title: "Test",
            project: "project",
        } as never);
        await tool.execute(
            tool.inputSchema.parse({ projectId: "project", title: "Test", beforeStackId: "Drafts" }) as never
        );
        expect(StacksLoader.create).toHaveBeenCalledWith(
            { title: "Test", project: "project" },
            { beforeStackId: "Drafts" }
        );
        expect(
            tool.inputSchema.safeParse({
                projectId: "project",
                title: "Test",
                beforeStackId: "Drafts",
                afterStackId: "Review",
            }).success
        ).toBe(false);
    });
    it("lists columns in board order even when database order differs", async () => {
        vi.mocked(ProjectsLoader.getOne).mockResolvedValue({ stacksOrder: ["done", "drafts"] } as never);
        vi.mocked(StacksLoader.getAll).mockResolvedValue([
            { id: "drafts", title: "Drafts", project: "project" },
            { id: "done", title: "Done", project: "project" },
        ] as never);
        const tool = stackAiTools.find(tool => tool.name === "listStacks")!;
        const result = (await tool.execute({ projectId: "project" } as never)) as {
            id: string;
            index: number;
        }[];
        expect(result.map(row => [row.id, row.index])).toEqual([
            ["done", 0],
            ["drafts", 1],
        ]);
    });
});
