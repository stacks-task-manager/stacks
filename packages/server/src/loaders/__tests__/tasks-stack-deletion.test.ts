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
vi.mock("../timelogs", () => ({ TimelogsLoader: { removeByTasks: mocks.logs } }));
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
