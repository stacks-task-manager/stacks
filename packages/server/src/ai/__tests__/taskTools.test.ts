// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRIORITY } from "@stacks/types";

vi.mock("../../loaders", () => ({
    ProjectsLoader: {
        getOne: vi.fn(),
    },
    StacksLoader: {
        getAll: vi.fn(),
    },
    TasksLoader: {
        getOne: vi.fn(),
        getAll: vi.fn(),
        removeById: vi.fn(),
        update: vi.fn(),
    },
}));

import { TasksLoader } from "../../loaders";
import { taskAiTools } from "../toolRegistry/taskTools";

describe("ai.taskTools.deleteTask", () => {
    const deleteTask = taskAiTools.find(tool => tool.name === "deleteTask");

    it("deletes the resolved task through the authorized loader", async () => {
        vi.mocked(TasksLoader.removeById).mockResolvedValue({
            id: "11111111-1111-4111-8111-111111111111",
            title: "Task 1",
        } as never);
        const result = await deleteTask?.execute(
            deleteTask.inputSchema.parse({ taskId: "11111111-1111-4111-8111-111111111111" }) as never
        );
        expect(TasksLoader.removeById).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
        expect(result).toEqual({
            id: "11111111-1111-4111-8111-111111111111",
            title: "Task 1",
            deleted: true,
        });
    });
});

describe("ai.taskTools.updateTask input schema", () => {
    const updateTask = taskAiTools.find(tool => tool.name === "updateTask");
    const getOneMock = vi.mocked(TasksLoader.getOne);
    const updateMock = vi.mocked(TasksLoader.update);

    beforeEach(() => {
        getOneMock.mockReset();
        updateMock.mockReset();
    });

    it("rejects updates with no requested fields", () => {
        expect(
            updateTask?.inputSchema.safeParse({ taskId: "11111111-1111-4111-8111-111111111111" }).success
        ).toBe(false);
    });
    it("accepts startdate as an ISO string", () => {
        const result = updateTask?.inputSchema.safeParse({
            taskId: "11111111-1111-4111-8111-111111111111",
            startdate: "2026-07-08T00:00:00.000Z",
        });
        expect(result?.success).toBe(true);
    });

    it("accepts null startdate to clear the field", () => {
        const result = updateTask?.inputSchema.safeParse({
            taskId: "11111111-1111-4111-8111-111111111111",
            startdate: null,
        });
        expect(result?.success).toBe(true);
    });

    it("accepts the common task detail fields exposed by the app", () => {
        const result = updateTask?.inputSchema.safeParse({
            taskId: "11111111-1111-4111-8111-111111111111",
            description: "Refined task brief",
            dodate: "2026-07-08T00:00:00.000Z",
            priority: PRIORITY.HIGH,
            statusTagId: "550e8400-e29b-41d4-a716-446655440000",
            estimateMinutes: 90,
            progress: 40,
            tint: "#00aa88",
        });
        expect(result?.success).toBe(true);
    });

    it("accepts null to clear the clearable detail fields", () => {
        const result = updateTask?.inputSchema.safeParse({
            taskId: "11111111-1111-4111-8111-111111111111",
            dodate: null,
            priority: null,
            statusTagId: null,
            estimateMinutes: null,
            tint: null,
        });
        expect(result?.success).toBe(true);
    });

    it("moves startdate one hour earlier when it would end up after the due date", async () => {
        getOneMock.mockResolvedValue({
            id: "11111111-1111-4111-8111-111111111111",
            title: "Task",
            description: "",
            project: "22222222-2222-4222-8222-222222222222",
            projectInfo: null,
            stack: "33333333-3333-4333-8333-333333333333",
            tags: [],
            status: null,
            startdate: new Date("2026-07-10T12:00:00.000Z"),
            duedate: new Date("2026-07-10T09:00:00.000Z"),
            dodate: null,
            cover: null,
            done: false,
            estimate: 0,
            progress: 0,
            assignees: [],
            priority: null,
            parent: null,
            subtasksOrder: [],
            tint: null,
            dependencies: [],
            hourlyRate: 0,
            locations: [],
            links: [],
            fields: {},
            timeSpent: 0,
            comments: 0,
            attachments: 0,
            reminders: [],
            completed: null,
            archived: null,
            permissions: {
                id: "11111111-1111-4111-8111-111111111111",
                owner: "user-1",
                type: "task",
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
            } as any,
            created: new Date(),
            updated: new Date(),
        } as any);
        updateMock.mockResolvedValue({
            id: "11111111-1111-4111-8111-111111111111",
            title: "Task",
            description: "",
            project: "22222222-2222-4222-8222-222222222222",
            projectInfo: null,
            stack: "33333333-3333-4333-8333-333333333333",
            tags: [],
            status: null,
            startdate: new Date("2026-07-10T08:00:00.000Z"),
            duedate: new Date("2026-07-10T09:00:00.000Z"),
            dodate: null,
            cover: null,
            done: false,
            estimate: 0,
            progress: 0,
            assignees: [],
            priority: null,
            parent: null,
            subtasksOrder: [],
            tint: null,
            dependencies: [],
            hourlyRate: 0,
            locations: [],
            links: [],
            fields: {},
            timeSpent: 0,
            comments: 0,
            attachments: 0,
            reminders: [],
            completed: null,
            archived: null,
            permissions: {
                id: "11111111-1111-4111-8111-111111111111",
                owner: "user-1",
                type: "task",
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
            } as any,
            created: new Date(),
            updated: new Date(),
        } as any);

        await updateTask?.execute({
            taskId: "11111111-1111-4111-8111-111111111111",
            startdate: "2026-07-10T12:00:00.000Z",
        } as never);

        expect(updateMock).toHaveBeenCalledWith(
            "11111111-1111-4111-8111-111111111111",
            expect.objectContaining({
                startdate: new Date("2026-07-10T08:00:00.000Z"),
            })
        );
    });

    it("moves duedate one hour later when it would end up before the start date", async () => {
        getOneMock.mockResolvedValue({
            id: "11111111-1111-4111-8111-111111111111",
            title: "Task",
            description: "",
            project: "22222222-2222-4222-8222-222222222222",
            projectInfo: null,
            stack: "33333333-3333-4333-8333-333333333333",
            tags: [],
            status: null,
            startdate: new Date("2026-07-10T09:00:00.000Z"),
            duedate: new Date("2026-07-10T11:00:00.000Z"),
            dodate: null,
            cover: null,
            done: false,
            estimate: 0,
            progress: 0,
            assignees: [],
            priority: null,
            parent: null,
            subtasksOrder: [],
            tint: null,
            dependencies: [],
            hourlyRate: 0,
            locations: [],
            links: [],
            fields: {},
            timeSpent: 0,
            comments: 0,
            attachments: 0,
            reminders: [],
            completed: null,
            archived: null,
            permissions: {
                id: "11111111-1111-4111-8111-111111111111",
                owner: "user-1",
                type: "task",
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
            } as any,
            created: new Date(),
            updated: new Date(),
        } as any);
        updateMock.mockResolvedValue({
            id: "11111111-1111-4111-8111-111111111111",
            title: "Task",
            description: "",
            project: "22222222-2222-4222-8222-222222222222",
            projectInfo: null,
            stack: "33333333-3333-4333-8333-333333333333",
            tags: [],
            status: null,
            startdate: new Date("2026-07-10T09:00:00.000Z"),
            duedate: new Date("2026-07-10T10:00:00.000Z"),
            dodate: null,
            cover: null,
            done: false,
            estimate: 0,
            progress: 0,
            assignees: [],
            priority: null,
            parent: null,
            subtasksOrder: [],
            tint: null,
            dependencies: [],
            hourlyRate: 0,
            locations: [],
            links: [],
            fields: {},
            timeSpent: 0,
            comments: 0,
            attachments: 0,
            reminders: [],
            completed: null,
            archived: null,
            permissions: {
                id: "11111111-1111-4111-8111-111111111111",
                owner: "user-1",
                type: "task",
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
            } as any,
            created: new Date(),
            updated: new Date(),
        } as any);

        await updateTask?.execute({
            taskId: "11111111-1111-4111-8111-111111111111",
            duedate: "2026-07-10T07:00:00.000Z",
        } as never);

        expect(updateMock).toHaveBeenCalledWith(
            "11111111-1111-4111-8111-111111111111",
            expect.objectContaining({
                duedate: new Date("2026-07-10T10:00:00.000Z"),
            })
        );
    });
});

describe("task filter navigation and chat parity", () => {
    const person = "00000000-0000-4000-8000-000000000001";
    it("preserves assignees and an explicit overdue filter in navigation", async () => {
        const tool = taskAiTools.find(t => t.name === "findTasks")!;
        const input = tool.inputSchema.parse({ assigneeUserIds: [person], overdueOnly: true });
        const output = (await tool.execute(input as never)) as { hashPath: string };
        const params = new URL(output.hashPath, "http://test").searchParams;
        expect(params.get("assignees")).toBe(person);
        expect(params.get("overdue")).toBe("true");
    });
    it("passes the same overdue predicate to the authorized chat loader", async () => {
        vi.mocked(TasksLoader.getAll).mockResolvedValue([]);
        const tool = taskAiTools.find(t => t.name === "listTasks")!;
        const input = tool.inputSchema.parse({ overdueOnly: true });
        await tool.execute(input as never);
        expect(TasksLoader.getAll).toHaveBeenCalledWith({ overdue: "true" });
    });
});

describe("task filters for tags, statuses, priority, progress and date windows", () => {
    const tagA = "00000000-0000-4000-8000-00000000000a";
    const tagB = "00000000-0000-4000-8000-00000000000b";
    const statusId = "00000000-0000-4000-8000-00000000000c";

    it("treats a tag-only request as a filter and keeps it in the navigation path", async () => {
        const tool = taskAiTools.find(t => t.name === "findTasks")!;
        const input = tool.inputSchema.parse({ tagIds: [tagA, tagB], statusTagIds: [statusId] });
        const output = (await tool.execute(input as never)) as { hashPath: string };
        const params = new URL(output.hashPath, "http://test").searchParams;
        expect(params.get("tags")).toBe(`${tagA},${tagB}`);
        expect(params.get("status")).toBe(statusId);
    });

    it("carries priority, progress operators and ISO date windows into the navigation path", async () => {
        const tool = taskAiTools.find(t => t.name === "findTasks")!;
        const input = tool.inputSchema.parse({
            projectId: tagA,
            priority: "high",
            progress: "gt:60",
            dueFrom: "2026-10-12T00:00:00.000Z",
            dueTo: "2026-10-18T23:59:59.999Z",
            startFrom: "2026-10-01T00:00:00.000Z",
            startTo: "2026-10-05T23:59:59.999Z",
        });
        const output = (await tool.execute(input as never)) as { hashPath: string };
        const params = new URL(output.hashPath, "http://test").searchParams;
        expect(params.get("priority")).toBe("high");
        expect(params.get("progress")).toBe("gt:60");
        expect(params.get("dueFrom")).toBe("2026-10-12T00:00:00.000Z");
        expect(params.get("dueTo")).toBe("2026-10-18T23:59:59.999Z");
        expect(params.get("startFrom")).toBe("2026-10-01T00:00:00.000Z");
        expect(params.get("startTo")).toBe("2026-10-05T23:59:59.999Z");
    });

    it("passes the same filters to the authorized chat loader", async () => {
        vi.mocked(TasksLoader.getAll).mockResolvedValue([]);
        const tool = taskAiTools.find(t => t.name === "listTasks")!;
        const input = tool.inputSchema.parse({
            tagIds: [tagA],
            statusTagIds: [statusId],
            priority: "high",
            progress: "lt:20",
            dueFrom: "2026-10-12T00:00:00.000Z",
            dueTo: "2026-10-18T23:59:59.999Z",
        });
        await tool.execute(input as never);
        expect(TasksLoader.getAll).toHaveBeenCalledWith({
            tags: [tagA],
            status: [statusId],
            priority: "high",
            progress: "lt:20",
            dueFrom: "2026-10-12T00:00:00.000Z",
            dueTo: "2026-10-18T23:59:59.999Z",
        });
    });

    it("rejects malformed progress operators and unknown priority values", () => {
        const tool = taskAiTools.find(t => t.name === "findTasks")!;
        expect(tool.inputSchema.safeParse({ projectId: tagA, progress: "above:60" }).success).toBe(false);
        expect(tool.inputSchema.safeParse({ projectId: tagA, priority: "urgent" }).success).toBe(false);
        expect(tool.inputSchema.safeParse({ projectId: tagA, progress: "gt:150" }).success).toBe(false);
    });

    it("validates every date bound and rejects impossible or ambiguous dates", async () => {
        const tool = taskAiTools.find(t => t.name === "findTasks")!;
        for (const field of ["dueFrom", "dueTo", "startFrom", "startTo"]) {
            for (const value of ["not-a-date", "2026-02-30", "2026-10-12T00:00:00"]) {
                expect(tool.inputSchema.safeParse({ projectId: tagA, [field]: value } as any).success).toBe(
                    false
                );
            }
        }
    });

    it("normalises bare model dates to UTC day bounds in both tool paths", async () => {
        const find = taskAiTools.find(t => t.name === "findTasks")!;
        const input = find.inputSchema.parse({ projectId: tagA, dueFrom: "2026-10-12", dueTo: "2026-10-18" });
        const output = (await find.execute(input as never)) as { hashPath: string };
        const params = new URL(output.hashPath, "http://test").searchParams;
        expect(params.get("dueFrom")).toBe("2026-10-12T00:00:00.000Z");
        expect(params.get("dueTo")).toBe("2026-10-18T00:00:00.000Z");

        vi.mocked(TasksLoader.getAll).mockResolvedValue([]);
        const list = taskAiTools.find(t => t.name === "listTasks")!;
        const listInput = list.inputSchema.parse({ dueFrom: "2026-10-12", startTo: "2026-10-05" });
        await list.execute(listInput as never);
        expect(TasksLoader.getAll).toHaveBeenCalledWith({
            dueFrom: "2026-10-12T00:00:00.000Z",
            startTo: "2026-10-05T00:00:00.000Z",
        });
    });
});
