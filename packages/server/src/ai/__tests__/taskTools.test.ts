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
        update: vi.fn(),
    },
}));

import { TasksLoader } from "../../loaders";
import { taskAiTools } from "../toolRegistry/taskTools";

describe("ai.taskTools.updateTask input schema", () => {
    const updateTask = taskAiTools.find(tool => tool.name === "updateTask");
    const getOneMock = vi.mocked(TasksLoader.getOne);
    const updateMock = vi.mocked(TasksLoader.update);

    beforeEach(() => {
        getOneMock.mockReset();
        updateMock.mockReset();
    });

    it("accepts startdate as an ISO string", () => {
        const result = updateTask?.inputSchema.safeParse({
            taskId: "task-1",
            startdate: "2026-07-08T00:00:00.000Z",
        });
        expect(result?.success).toBe(true);
    });

    it("accepts null startdate to clear the field", () => {
        const result = updateTask?.inputSchema.safeParse({
            taskId: "task-1",
            startdate: null,
        });
        expect(result?.success).toBe(true);
    });

    it("accepts the common task detail fields exposed by the app", () => {
        const result = updateTask?.inputSchema.safeParse({
            taskId: "task-1",
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
            taskId: "task-1",
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
            id: "task-1",
            title: "Task",
            description: "",
            project: "project-1",
            projectInfo: null,
            stack: "stack-1",
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
                id: "task-1",
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
            id: "task-1",
            title: "Task",
            description: "",
            project: "project-1",
            projectInfo: null,
            stack: "stack-1",
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
                id: "task-1",
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
            taskId: "task-1",
            startdate: "2026-07-10T12:00:00.000Z",
        } as never);

        expect(updateMock).toHaveBeenCalledWith(
            "task-1",
            expect.objectContaining({
                startdate: new Date("2026-07-10T08:00:00.000Z"),
            })
        );
    });

    it("moves duedate one hour later when it would end up before the start date", async () => {
        getOneMock.mockResolvedValue({
            id: "task-1",
            title: "Task",
            description: "",
            project: "project-1",
            projectInfo: null,
            stack: "stack-1",
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
                id: "task-1",
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
            id: "task-1",
            title: "Task",
            description: "",
            project: "project-1",
            projectInfo: null,
            stack: "stack-1",
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
                id: "task-1",
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
            taskId: "task-1",
            duedate: "2026-07-10T07:00:00.000Z",
        } as never);

        expect(updateMock).toHaveBeenCalledWith(
            "task-1",
            expect.objectContaining({
                duedate: new Date("2026-07-10T10:00:00.000Z"),
            })
        );
    });
});
