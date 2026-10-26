// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, expect, it, vi } from "vitest";
import type { Transaction } from "sequelize";
const mocks = vi.hoisted(() => ({ find: vi.fn(), remove: vi.fn(), logs: vi.fn(), order: vi.fn() }));
vi.mock("@stacks/db", () => ({
    TaskEntity: { hasOne: vi.fn(), hasMany: vi.fn(), belongsTo: vi.fn() },
    PermissionEntity: { belongsTo: vi.fn() },
    AttachmentEntity: {},
    DocumentEntity: {},
    sequelize: { fn: vi.fn(), col: vi.fn() },
}));
vi.mock("../context", () => ({ getCurrentUser: () => ({ id: "owner", tenant: "tenant" }) }));
vi.mock("../timelogs", () => ({
    TimelogsLoader: { removeByProject: mocks.logs, removeByTasks: mocks.logs },
}));
vi.mock("../stacks", () => ({ StacksLoader: { removeTaskOrder: mocks.order } }));
vi.mock("../projects", () => ({ ProjectsLoader: {} }));
vi.mock("../permissions", () => ({ PermissionsLoader: {} }));
vi.mock("../notifications", () => ({ NotificationsLoader: {} }));
vi.mock("../../services/automations", () => ({ AutomationsService: {} }));
vi.mock("../../events", () => ({ sendRealtimeUpdate: vi.fn() }));
vi.mock("../../utils/cache", () => ({ invalidateApiCacheForCurrentRequest: vi.fn() }));
vi.mock("../utils", () => ({
    findAll: mocks.find,
    deleteAll: mocks.remove,
    afterTransactionCommit: vi.fn(),
    withTransaction: async (transaction: unknown, action: Function) => action(transaction),
}));
import { TasksLoader } from "../tasks";
const task = { id: "task", stack: "Temp", permissions: {} };
beforeEach(() => {
    vi.clearAllMocks();
    mocks.find.mockResolvedValue([task]);
    mocks.remove.mockResolvedValue([task]);
});
it("cleans up timelogs before soft-deleting column tasks, inside the same transaction", async () => {
    const transaction = { id: "delete-column" } as unknown as Transaction;
    let deleted = false;
    mocks.logs.mockImplementation(async () => {
        if (deleted) throw new Error("The task is no longer visible for total recalculation");
    });
    mocks.remove.mockImplementation(async () => {
        deleted = true;
        return [task];
    });
    await expect(TasksLoader.removeByStack("Temp", transaction)).resolves.toEqual([task]);
    expect(mocks.find).toHaveBeenCalledWith(
        expect.objectContaining({ filter: { stack: "Temp" }, transaction })
    );
    expect(mocks.logs).toHaveBeenCalledWith(["task"], transaction);
    expect(mocks.order).toHaveBeenCalledWith("Temp", "task", transaction);
});
it("does not delete tasks when timelog cleanup fails", async () => {
    mocks.logs.mockRejectedValue(new Error("Forbidden"));
    await expect(TasksLoader.removeByStack("Temp", {} as Transaction)).rejects.toThrow("Forbidden");
    expect(mocks.remove).not.toHaveBeenCalled();
});

it("removes stack task IDs before soft-deleting them", async () => {
    const transaction = { id: "delete-stack" } as unknown as Transaction;
    let tasksDeleted = false;

    mocks.logs.mockResolvedValue([]);
    mocks.order.mockImplementation(async () => {
        if (tasksDeleted) throw new Error("Task not found");
    });
    mocks.remove.mockImplementation(async () => {
        tasksDeleted = true;
        return [task];
    });

    await expect(TasksLoader.removeByStack("Temp", transaction)).resolves.toEqual([task]);

    expect(mocks.order).toHaveBeenCalledWith("Temp", "task", transaction);
    expect(mocks.remove).toHaveBeenCalledWith(
        expect.objectContaining({ filter: { stack: "Temp" }, transaction })
    );
});

it("removes project tasks from stack order before soft-deleting them", async () => {
    const transaction = { id: "delete-project" } as unknown as Transaction;
    const tasks = [
        { id: "task-1", stack: "Temp", permissions: {} },
        { id: "task-2", stack: "Temp", permissions: {} },
    ];
    let tasksDeleted = false;

    mocks.find.mockResolvedValue(tasks);
    mocks.logs.mockResolvedValue([]);
    mocks.order.mockImplementation(async () => {
        if (tasksDeleted) throw new Error("Task not found");
    });
    mocks.remove.mockImplementation(async () => {
        tasksDeleted = true;
        return tasks;
    });

    await expect(TasksLoader.removeByProject("project", transaction)).resolves.toEqual(tasks);

    expect(mocks.logs).toHaveBeenCalledWith("project", transaction);
    expect(mocks.order).toHaveBeenNthCalledWith(1, "Temp", "task-1", transaction);
    expect(mocks.order).toHaveBeenNthCalledWith(2, "Temp", "task-2", transaction);
    expect(mocks.remove).toHaveBeenCalledWith(
        expect.objectContaining({ filter: { project: "project" }, transaction })
    );
});
