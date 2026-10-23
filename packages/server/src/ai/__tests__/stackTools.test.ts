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
            id: "33333333-3333-4333-8333-333333333333",
            title: "Done",
            project: "22222222-2222-4222-8222-222222222222",
            tint: undefined,
            collapsed: false,
            maxTasks: undefined,
            sorting: undefined,
            tasksOrder: [],
            created: new Date(),
            updated: new Date(),
        });

        const input = updateStack?.inputSchema.parse({
            stackId: "33333333-3333-4333-8333-333333333333",
            tint: null,
            maxTasks: null,
            sorting: null,
        });

        const result = await updateStack?.execute(input as never);

        expect(updateMock).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333", {
            tint: undefined,
            maxTasks: undefined,
            sorting: undefined,
        });
        expect(result).toEqual({
            id: "33333333-3333-4333-8333-333333333333",
            title: "Done",
            projectId: "22222222-2222-4222-8222-222222222222",
            tint: null,
            collapsed: false,
            maxTasks: null,
            sorting: null,
        });
    });

    it("validates sorting against the supported enum values", () => {
        expect(() =>
            updateStack?.inputSchema.parse({
                stackId: "33333333-3333-4333-8333-333333333333",
                sorting: "invalid-sort",
            })
        ).toThrow();

        expect(() =>
            updateStack?.inputSchema.parse({
                stackId: "33333333-3333-4333-8333-333333333333",
                sorting: TASKSORTING.TITLEASC,
            })
        ).not.toThrow();
    });

    it("rejects relationship fields outside the documented update contract", () => {
        expect(() =>
            updateStack?.inputSchema.parse({
                stackId: "33333333-3333-4333-8333-333333333333",
                title: "Renamed",
                project: "another-project",
                tasksOrder: ["another-project-task"],
            })
        ).toThrow();
    });
});

describe("ai.stackTools.deleteStack", () => {
    const deleteStack = stackAiTools.find(tool => tool.name === "deleteStack");
    it("removes the column and its project ordering entry", async () => {
        vi.mocked(StacksLoader.remove).mockResolvedValue({
            id: "33333333-3333-4333-8333-333333333333",
            title: "Column XYZ",
            project: "22222222-2222-4222-8222-222222222222",
        } as never);
        await deleteStack?.execute(
            deleteStack.inputSchema.parse({ stackId: "33333333-3333-4333-8333-333333333333" }) as never
        );
        expect(StacksLoader.remove).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333");
        expect(ProjectsLoader.removeStackOrder).toHaveBeenCalledWith(
            "22222222-2222-4222-8222-222222222222",
            "33333333-3333-4333-8333-333333333333"
        );
    });
});

describe("ai.stackTools relative placement", () => {
    it("passes the reference anchor to the transactional loader", async () => {
        const tool = stackAiTools.find(tool => tool.name === "createStack")!;
        vi.mocked(StacksLoader.create).mockResolvedValue({
            id: "new",
            title: "Test",
            project: "22222222-2222-4222-8222-222222222222",
        } as never);
        await tool.execute(
            tool.inputSchema.parse({
                projectId: "22222222-2222-4222-8222-222222222222",
                title: "Test",
                beforeStackId: "55555555-5555-4555-8555-555555555555",
            }) as never
        );
        expect(StacksLoader.create).toHaveBeenCalledWith(
            { title: "Test", project: "22222222-2222-4222-8222-222222222222" },
            { beforeStackId: "55555555-5555-4555-8555-555555555555" }
        );
        expect(
            tool.inputSchema.safeParse({
                projectId: "22222222-2222-4222-8222-222222222222",
                title: "Test",
                beforeStackId: "55555555-5555-4555-8555-555555555555",
                afterStackId: "66666666-6666-4666-8666-666666666666",
            }).success
        ).toBe(false);
    });
    it("lists columns in board order even when database order differs", async () => {
        vi.mocked(ProjectsLoader.getOne).mockResolvedValue({ stacksOrder: ["done", "drafts"] } as never);
        vi.mocked(StacksLoader.getAll).mockResolvedValue([
            { id: "drafts", title: "Drafts", project: "22222222-2222-4222-8222-222222222222" },
            { id: "done", title: "Done", project: "22222222-2222-4222-8222-222222222222" },
        ] as never);
        const tool = stackAiTools.find(tool => tool.name === "listStacks")!;
        const result = (await tool.execute({
            projectId: "22222222-2222-4222-8222-222222222222",
        } as never)) as {
            id: string;
            index: number;
        }[];
        expect(result.map(row => [row.id, row.index])).toEqual([
            ["done", 0],
            ["drafts", 1],
        ]);
    });
});
