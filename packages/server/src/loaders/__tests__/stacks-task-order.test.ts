// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Op, type Transaction } from "sequelize";

const mocks = vi.hoisted(() => ({
    findOne: vi.fn(),
    visibleTasks: vi.fn(),
    countTasks: vi.fn(),
    update: vi.fn(),
    authorize: vi.fn(),
}));
vi.mock("@stacks/db", () => ({
    StackEntity: { hasOne: vi.fn() },
    PermissionEntity: { belongsTo: vi.fn() },
    TaskEntity: { count: mocks.countTasks },
}));
vi.mock("../context", () => ({ getCurrentUser: () => ({ id: "owner", tenant: "tenant" }) }));
vi.mock("../projects", () => ({ ProjectsLoader: { getOne: vi.fn(async () => ({ id: "project" })) } }));
vi.mock("../tasks", () => ({ TasksLoader: {} }));
vi.mock("../permissions", () => ({ PermissionsLoader: {} }));
vi.mock("../../events", () => ({ sendRealtimeUpdate: vi.fn() }));
vi.mock("../../utils/cache", () => ({ invalidateApiCacheForCurrentRequest: vi.fn() }));
vi.mock("../utils", () => ({
    findOne: mocks.findOne,
    findAll: mocks.visibleTasks,
    updateOne: mocks.update,
    assertCanWriteResource: mocks.authorize,
    afterTransactionCommit: vi.fn(),
    withTransaction: async (transaction: unknown, action: Function) => action(transaction),
}));
import { StacksLoader } from "../stacks";

const transaction = {} as Transaction;
const stack = { id: "stack", project: "project", tasksOrder: ["private", "visible"] };
let tasks: Array<{ id: string; tenant: string; project: string; deleted: Date | null; visible: boolean }>;

beforeEach(() => {
    vi.resetAllMocks();
    tasks = [
        { id: "private", tenant: "tenant", project: "project", deleted: null, visible: false },
        { id: "visible", tenant: "tenant", project: "project", deleted: null, visible: true },
        { id: "new", tenant: "tenant", project: "project", deleted: null, visible: true },
    ];
    mocks.findOne.mockResolvedValue(stack);
    mocks.update.mockImplementation(async ({ data }) => ({ ...stack, ...data }));
    mocks.visibleTasks.mockImplementation(async ({ filter }) =>
        tasks.filter(
            task => filter.id[Op.in].includes(task.id) && task.project === filter.project && task.visible
        )
    );
    mocks.countTasks.mockImplementation(
        async ({ where }) =>
            tasks.filter(
                task =>
                    where.id[Op.in].includes(task.id) &&
                    task.project === where.project &&
                    task.tenant === where.tenant &&
                    task.deleted === where.deleted
            ).length
    );
});

describe("stack task order authorization", () => {
    it("adds a visible task while retaining a private existing task", async () => {
        await expect(StacksLoader.addTaskOrder("stack", "new", "bottom", transaction)).resolves.toMatchObject(
            {
                tasksOrder: ["private", "visible", "new"],
            }
        );
    });

    it("removes a visible task while retaining a private existing task", async () => {
        await expect(StacksLoader.removeTaskOrder("stack", "visible", transaction)).resolves.toMatchObject({
            tasksOrder: ["private"],
        });
    });

    it("allows reordering existing private entries", async () => {
        await expect(
            StacksLoader.update("stack", { tasksOrder: ["visible", "private"] }, transaction)
        ).resolves.toMatchObject({
            tasksOrder: ["visible", "private"],
        });
    });

    it("rejects inserting a private task that was not in the stored order", async () => {
        tasks.push({ id: "hidden-new", tenant: "tenant", project: "project", deleted: null, visible: false });
        await expect(
            StacksLoader.addTaskOrder("stack", "hidden-new", "bottom", transaction)
        ).rejects.toThrow();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it.each([
        ["another project", { project: "foreign-project" }],
        ["another tenant", { tenant: "foreign-tenant" }],
        ["a deleted task", { deleted: new Date() }],
    ])("rejects preserved entries referencing %s", async (_label, changes) => {
        Object.assign(tasks[0], changes);
        await expect(StacksLoader.addTaskOrder("stack", "new", "bottom", transaction)).rejects.toThrow();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it.each([
        ["another project", { project: "foreign-project" }],
        ["another tenant", { tenant: "foreign-tenant" }],
        ["a deleted task", { deleted: new Date() }],
    ])("rejects new entries referencing %s", async (_label, changes) => {
        Object.assign(tasks[2], changes);
        await expect(StacksLoader.addTaskOrder("stack", "new", "bottom", transaction)).rejects.toThrow();
        expect(mocks.update).not.toHaveBeenCalled();
    });

    it("checks stack ownership before resolving task membership", async () => {
        mocks.authorize.mockImplementation(() => {
            throw new Error("Forbidden");
        });
        await expect(StacksLoader.addTaskOrder("stack", "new", "bottom", transaction)).rejects.toThrow(
            "Forbidden"
        );
        expect(mocks.countTasks).not.toHaveBeenCalled();
        expect(mocks.visibleTasks).not.toHaveBeenCalled();
        expect(mocks.update).not.toHaveBeenCalled();
    });
});
