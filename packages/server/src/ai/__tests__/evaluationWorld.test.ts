// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it, vi } from "vitest";
vi.mock("../../loaders", () => ({}));
vi.mock("../../loaders/context", () => ({ getCurrentUser: () => ({ id: "user" }) }));
import { createMock, ids } from "../../../scripts/ai-eval/world";
const world = () => createMock({ id: "world", locale: "en", request: "" });
const call = (mock: ReturnType<typeof world>, toolName: string, input: Record<string, unknown> = {}) =>
    mock({ toolName, input });
describe("synthetic backend contracts", () => {
    it("creates immediately before or after a resolved column", async () => {
        const mock = world();
        const created = (await call(mock, "createStack", {
            projectId: ids.Website,
            title: "Test",
            beforeStackId: ids.Done,
        })) as { id: string };
        let columns = (await call(mock, "listStacks", { projectId: ids.Website })) as { id: string }[];
        expect(columns[columns.findIndex(row => row.id === ids.Done) - 1].id).toBe(created.id);
        const after = (await call(mock, "createStack", {
            projectId: ids.Website,
            title: "After",
            afterStackId: ids.Done,
        })) as { id: string };
        columns = (await call(mock, "listStacks", { projectId: ids.Website })) as { id: string }[];
        expect(columns[columns.findIndex(row => row.id === ids.Done) + 1].id).toBe(after.id);
        await expect(
            call(mock, "createStack", {
                projectId: ids.Website,
                title: "Invalid",
                beforeStackId: ids.Done,
                insertIndex: 0,
            })
        ).rejects.toThrow("only one");
    });
    it("rejects unknown mutation names and invalid arguments rather than fabricating success", async () => {
        const mock = world();
        await expect(call(mock, "deleteSomething", {})).rejects.toThrow("Missing synthetic output");
        await expect(call(mock, "listTasks", {})).rejects.toThrow("at least one filter");
        await expect(call(mock, "updateTask", { taskId: ids["Buy milk"], progress: 150 })).rejects.toThrow();
    });
    it("applies project, task, column, status and assignment filters", async () => {
        const mock = world();
        for (const input of [
            { projectId: ids.Acme },
            { taskIds: [ids.Done] },
            { stackId: ids.Done },
            { doneFilter: "done" },
            { unassignedOnly: true },
            { assigneeUserIds: [ids.Alex] },
        ])
            expect(await call(mock, "listTasks", input)).toEqual([]);
        expect(
            await call(mock, "listTasks", {
                projectId: ids.Website,
                doneFilter: "open",
                assigneeUserIds: [ids.me],
            })
        ).toHaveLength(1);
        await call(mock, "updateTask", {
            taskId: ids["Buy milk"],
            done: true,
            assigneeUserIds: [],
            description: "Find this content",
        });
        expect(
            await call(mock, "listTasks", {
                searchQuery: "this content",
                doneFilter: "done",
                unassignedOnly: true,
            })
        ).toHaveLength(1);
        expect(await call(mock, "listTasks", { doneFilter: "open" })).toEqual([]);
    });
    it("reflects date edits and date-window filtering", async () => {
        const mock = world();
        await call(mock, "updateTask", {
            taskId: ids["Buy milk"],
            startdate: "2026-10-14T00:00:00Z",
            duedate: "2026-10-15T00:00:00Z",
        });
        expect(await call(mock, "listTasks", { from: "2026-10-13", to: "2026-10-13" })).toEqual([]);
        expect(await call(mock, "listTasks", { from: "2026-10-14", to: "2026-10-14" })).toHaveLength(1);
        expect(await call(mock, "listCalendarEvents", { span: "day", date: "2026-10-14" })).toHaveLength(1);
        expect(await call(mock, "listCalendarEvents", { span: "day", date: "2026-10-16" })).toEqual([]);
    });
    it("applies contact, role and birthday filters", async () => {
        const mock = world();
        for (const input of [
            { hasEmail: false },
            { hasCellPhone: true },
            { roleTitle: "Admin" },
            { birthdayMonth: 12 },
        ])
            expect(await call(mock, "searchPeople", input)).toMatchObject({ people: [], total: 0 });
        expect(
            await call(mock, "searchPeople", { birthdayMonth: 11, hasEmail: true, city: "Berlin", limit: 1 })
        ).toMatchObject({ total: 1, returned: 1, truncated: false });
    });
    it("returns real entity ids and supports dependent creates and moves", async () => {
        const mock = world();
        const project = (await call(mock, "createProject", { title: "New project" })) as any;
        const column = (await call(mock, "createStack", {
            projectId: project.id,
            title: "New column",
        })) as any;
        const task = (await call(mock, "createTask", { projectId: project.id, title: "New task" })) as any;
        expect(new Set([project.id, column.id, task.id]).size).toBe(3);
        expect(task).toMatchObject({ projectId: project.id, stackId: column.id });
        await expect(call(mock, "moveTask", { taskId: task.id, stackId: ids.Done })).rejects.toThrow(
            "different project"
        );
        await call(mock, "moveTask", { taskId: ids["Buy milk"], stackId: ids.Done });
        expect(await call(mock, "getTask", { taskId: ids["Buy milk"] })).toMatchObject({ stack: ids.Done });
    });
    it("deletes a column and its tasks and preserves isolation between runs", async () => {
        const mock = world();
        expect(await call(mock, "deleteStack", { stackId: ids.Review })).toMatchObject({
            id: ids.Review,
            deleted: true,
        });
        await expect(call(mock, "getTask", { taskId: ids["Buy milk"] })).rejects.toThrow("not found");
        expect(await call(mock, "listTasks", { projectId: ids.Website })).toEqual([]);
        expect(await call(mock, "getProject", { projectId: ids.Website })).toMatchObject({
            stacksOrder: [ids.Done, ids["Column XYZ"], ids.Temp],
        });
        expect(await call(world(), "getTask", { taskId: ids["Buy milk"] })).toMatchObject({
            id: ids["Buy milk"],
        });
    });
    it("returns explicit event outcomes and rejects removed entity references", async () => {
        const mock = world();
        expect(await call(mock, "updateCalendarEvent", { eventId: ids.Standup, title: "Changed" })).toEqual({
            id: ids.Standup,
            updated: true,
        });
        expect(await call(mock, "getCalendarEvent", { eventId: ids.Standup })).toMatchObject({
            title: "Changed",
        });
        expect(await call(mock, "deleteCalendarEvent", { eventId: ids.Standup })).toEqual({
            id: ids.Standup,
            deleted: true,
        });
        expect(await call(mock, "listCalendarEvents", { span: "month" })).toEqual([]);
        await expect(call(mock, "deleteCalendarEvent", { eventId: ids.Standup })).rejects.toThrow(
            "not found"
        );
    });
    it("enforces unique calendar names and final default-calendar protection", async () => {
        const mock = world();
        await expect(call(mock, "createLocalCalendar", { title: "Work" })).rejects.toThrow("already exists");
        expect(await call(mock, "deleteLocalCalendar", { calendarId: ids.Work })).toEqual({
            id: ids.Work,
            deleted: true,
        });
        await expect(call(mock, "deleteLocalCalendar", { calendarId: ids.Personal })).rejects.toThrow(
            "only default"
        );
    });
});
