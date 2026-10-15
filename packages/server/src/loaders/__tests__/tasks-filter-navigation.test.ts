// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Op, Sequelize, DataTypes } from "sequelize";
import { TasksFilteredSchema } from "../../routes/schema/task";
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
vi.mock("../projects", () => ({ ProjectsLoader: { getAll: async () => [{ id: "visible-project" }] } }));
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

beforeEach(() => {
    vi.clearAllMocks();
    mocks.find.mockResolvedValue([]);
});
afterEach(() => {
    vi.useRealTimers();
});
it("uses JSONB containment for each requested assignee instead of array overlap", async () => {
    const users = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];
    await TasksLoader.getAll({ assignees: users });
    const filter = mocks.find.mock.calls[0][0].filter;
    const sql = new Sequelize({ dialect: "postgres", logging: false });
    try {
        const model = sql.define("Task", { assignees: DataTypes.JSONB });
        const generator = sql.getQueryInterface().queryGenerator as any;
        const where = generator.getWhereConditions({ assignees: filter.assignees }, "Task", model);
        expect(where).not.toContain("&&");
        expect(where).toContain("@>");
        expect(where).toContain(" OR ");
        expect(where).toContain(users[0]);
        expect(where).toContain(users[1]);
    } finally {
        await sql.close();
    }
    expect(filter[Op.and]).toContainEqual({ project: { [Op.in]: ["visible-project"] } });
});
it("adds an overdue due-date predicate and excludes completed tasks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
    expect(TasksFilteredSchema.safeParse({ overdue: "true" }).success).toBe(true);
    await TasksLoader.getAll({ overdue: true } as any);
    const filter = mocks.find.mock.calls[0][0].filter;
    expect(filter[Op.and]).toContainEqual({ done: false, duedate: { [Op.lt]: new Date() } });
    expect(filter[Op.and]).toContainEqual({ project: { [Op.in]: ["visible-project"] } });
});
