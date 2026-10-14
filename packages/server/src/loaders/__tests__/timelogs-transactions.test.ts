// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "sequelize";
const mocks = vi.hoisted(() => ({
    findAll: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    getTask: vi.fn(),
    getTasks: vi.fn(),
    updateTask: vi.fn(),
    transaction: { id: "outer" },
    callbacks: [] as Array<() => void>,
}));
vi.mock("@stacks/db", () => ({
    DocumentEntity: {},
    ProjectEntity: {},
    TaskEntity: {},
    PermissionEntity: { belongsTo: vi.fn() },
    TimelogEntity: { associations: {}, hasOne: vi.fn(), findAll: mocks.findAll },
}));
vi.mock("../context", () => ({ getCurrentUser: () => ({ id: "owner", tenant: "tenant", admin: true }) }));
vi.mock("../tasks", () => ({
    TasksLoader: { getOne: mocks.getTask, getAll: mocks.getTasks, update: mocks.updateTask },
}));
vi.mock("../projects", () => ({ ProjectsLoader: {} }));
vi.mock("../notifications", () => ({ NotificationsLoader: {} }));
vi.mock("../../events", () => ({ sendRealtimeUpdate: vi.fn() }));
vi.mock("../../utils/cache", () => ({ invalidateApiCacheForCurrentRequest: vi.fn() }));
vi.mock("../utils", () => ({
    createOne: mocks.create,
    deleteAll: mocks.remove,
    sanitizeWhere: (where: object) => ({ ...where, tenant: "tenant", deleted: null }),
    withTransaction: async (existing: unknown, action: Function) => action(existing ?? mocks.transaction),
    afterTransactionCommit: (_transaction: unknown, callback: () => void) => mocks.callbacks.push(callback),
}));
import { TimelogsLoader } from "../timelogs";
import { sendRealtimeUpdate } from "../../events";
const log = { id: "log", task: "task", duration: 60 };
beforeEach(() => {
    vi.clearAllMocks();
    mocks.callbacks.length = 0;
    mocks.getTask.mockResolvedValue({ id: "task", permissions: {} });
    mocks.getTasks.mockResolvedValue([{ id: "task" }]);
    mocks.create.mockResolvedValue(log);
    mocks.remove.mockResolvedValue([log]);
    mocks.findAll.mockResolvedValue([{ toJSON: () => log }]);
    mocks.updateTask.mockResolvedValue({ id: "task" });
});
describe("timelog aggregate transaction propagation", () => {
    it("recomputes bulk-deletion totals in the caller's transaction", async () => {
        const transaction = { id: "delete-column" } as unknown as Transaction;
        // Simulates the lock cycle seen in PostgreSQL: a second transaction cannot update the locked task.
        mocks.updateTask.mockImplementation(async (_id, _patch, tx) => {
            if (tx !== transaction)
                throw new Error("A second transaction would wait on the deleted task lock");
            return { id: "task" };
        });
        mocks.findAll.mockResolvedValueOnce([{ toJSON: () => log }]).mockResolvedValue([]);
        await TimelogsLoader.removeByTasks(["task"], transaction);
        expect(mocks.getTask).toHaveBeenCalledWith("task", transaction);
        expect(mocks.updateTask).toHaveBeenCalledWith("task", { timeSpent: 0 }, transaction);
        expect(mocks.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ transaction, where: { task: "task", tenant: "tenant", deleted: null } })
        );
    });
    it("reads authorized tasks in the same transaction during bulk cleanup", async () => {
        const transaction = { id: "delete-column" } as unknown as Transaction;
        await TimelogsLoader.removeByTasks(["task"], transaction);
        for (const args of mocks.getTasks.mock.calls) expect(args[2]).toBe(transaction);
        expect(mocks.remove).toHaveBeenCalledWith(expect.objectContaining({ transaction }));
        expect(mocks.updateTask).toHaveBeenCalledWith("task", { timeSpent: 60 }, transaction);
    });
    it("includes a newly created timelog in the same transaction's total", async () => {
        await TimelogsLoader.create(log as any);
        expect(mocks.updateTask).toHaveBeenCalledWith("task", { timeSpent: 60 }, mocks.transaction);
        expect(sendRealtimeUpdate).not.toHaveBeenCalled();
        expect(mocks.callbacks.length).toBe(1);
        mocks.callbacks[0]();
        expect(sendRealtimeUpdate).toHaveBeenCalledOnce();
    });
});
