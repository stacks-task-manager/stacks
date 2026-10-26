// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Op, Sequelize, DataTypes } from "sequelize";
import { TasksFilteredSchema } from "../../routes/schema/task";
const mocks = vi.hoisted(() => ({
    find: vi.fn(),
    count: vi.fn(),
    remove: vi.fn(),
    logs: vi.fn(),
    order: vi.fn(),
}));
vi.mock("@stacks/db", () => ({
    TaskEntity: { hasOne: vi.fn(), hasMany: vi.fn(), belongsTo: vi.fn(), count: mocks.count },
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
    sanitizeWherePermissions: (filter: unknown) => filter,
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
it("matches any of the requested tags through JSONB containment", async () => {
    const tags = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];
    expect(TasksFilteredSchema.safeParse({ tags }).success).toBe(true);
    await TasksLoader.getAll({ tags } as any);
    const filter = mocks.find.mock.calls[0][0].filter;
    expect(filter.tags[Op.or]).toHaveLength(2);
    expect(filter.tags[Op.or][0]).toEqual({ [Op.contains]: [tags[0]] });
    expect(filter.tags[Op.or][1]).toEqual({ [Op.contains]: [tags[1]] });
});
it("matches statuses against the single status uuid column", async () => {
    const status = ["00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000004"];
    expect(TasksFilteredSchema.safeParse({ status }).success).toBe(true);
    await TasksLoader.getAll({ status } as any);
    const filter = mocks.find.mock.calls[0][0].filter;
    expect(filter.status).toEqual(status);
});
it("filters by an exact priority", async () => {
    expect(TasksFilteredSchema.safeParse({ priority: "critical" }).success).toBe(true);
    expect(TasksFilteredSchema.safeParse({ priority: "urgent" }).success).toBe(false);
    await TasksLoader.getAll({ priority: "critical" } as any);
    const filter = mocks.find.mock.calls[0][0].filter;
    expect(filter.priority).toBe("critical");
});
it("compares progress against the requested operator and rejects malformed operators", async () => {
    expect(TasksFilteredSchema.safeParse({ progress: "gt:60" }).success).toBe(true);
    expect(TasksFilteredSchema.safeParse({ progress: "above:60" }).success).toBe(false);
    expect(TasksFilteredSchema.safeParse({ progress: "gt:150" }).success).toBe(false);
    // Every operator branch is pinned: a branch that answers another operator must fail here
    const operators: [string, symbol, number][] = [
        ["gt", Op.gt, 60],
        ["gte", Op.gte, 60],
        ["lt", Op.lt, 20],
        ["lte", Op.lte, 20],
        ["eq", Op.eq, 0],
    ];
    for (const [operator, expectedOp, value] of operators) {
        await TasksLoader.getAll({ progress: `${operator}:${value}` } as any);
        const filter = mocks.find.mock.calls.at(-1)![0].filter;
        expect(filter.progress).toEqual({ [expectedOp]: value });
    }
    // A rejected operator never reaches SQL
    await expect(TasksLoader.getAll({ progress: "above:60" } as any)).rejects.toMatchObject({
        statusCode: 400,
    });
    await expect(TasksLoader.getAll({ progress: "gt:150" } as any)).rejects.toMatchObject({
        statusCode: 400,
    });
});
it("constrains the due and start dates to the requested windows", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
    const dueFrom = "2026-10-12T00:00:00.000Z";
    const dueTo = "2026-10-18T23:59:59.999Z";
    const startFrom = "2026-10-01T00:00:00.000Z";
    expect(TasksFilteredSchema.safeParse({ dueFrom, dueTo, startFrom }).success).toBe(true);
    await TasksLoader.getAll({ dueFrom, dueTo, startFrom } as any);
    const andClauses = mocks.find.mock.calls[0][0].filter[Op.and];
    const dueWindow = andClauses.find((clause: object) => Boolean((clause as any).duedate)) as any;
    const dueBounds = dueWindow?.duedate?.[Op.between] as unknown;
    expect(dueBounds).toHaveLength(2);
    const [dueLow, dueHigh] = dueBounds as Date[];
    // A window names whole days in UTC, so the bounds are that day exactly, never the
    // host-local day (which would widen the window for hosts away from UTC)
    expect(dueLow.getTime()).toBe(new Date(Date.UTC(2026, 9, 12)).getTime());
    expect(dueHigh.getTime()).toBe(new Date(Date.UTC(2026, 9, 18, 23, 59, 59, 999)).getTime());
    const startWindow = andClauses.find((clause: object) => Boolean((clause as any).startdate)) as any;
    const startLow = startWindow?.startdate?.[Op.gte] as unknown;
    expect(startLow).toBeInstanceOf(Date);
    expect((startLow as Date).getTime()).toBeLessThanOrEqual(new Date(startFrom).getTime());
    expect(andClauses).toContainEqual({ project: { [Op.in]: ["visible-project"] } });
});
it("keeps date windows on the requested UTC days in a host timezone away from UTC", async () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";

    try {
        // Prove the test is exercising a non-UTC host timezone (PDT is UTC-7 on this date).
        expect(new Date("2026-10-12T00:00:00.000Z").getTimezoneOffset()).toBe(420);
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
        const startFrom = "2026-10-12";
        const startTo = "2026-10-13";
        expect(
            TasksFilteredSchema.safeParse({
                startFrom: `${startFrom}T00:00:00.000Z`,
                startTo: `${startTo}T23:59:59.999Z`,
            }).success
        ).toBe(true);
        await TasksLoader.getAll({ startFrom, startTo } as any);
        const startWindow = (mocks.find.mock.calls[0][0].filter as any)[Op.and].find((clause: any) =>
            Boolean(clause.startdate)
        );
        expect(startWindow?.startdate).toEqual({
            [Op.between]: [new Date(Date.UTC(2026, 9, 12)), new Date(Date.UTC(2026, 9, 13, 23, 59, 59, 999))],
        });
        // A one-sided window stays a single bound, and its bound is still the whole UTC day
        await TasksLoader.getAll({ dueFrom: "2026-10-12T12:34:56.789Z" } as any);
        const dueWindow = (mocks.find.mock.calls[1][0].filter as any)[Op.and].find((clause: any) =>
            Boolean(clause.duedate)
        );
        expect(dueWindow?.duedate).toEqual({ [Op.gte]: new Date(Date.UTC(2026, 9, 12)) });
        // Malformed bounds are rejected instead of becoming Invalid Date in the SQL layer
        await expect(TasksLoader.getAll({ dueTo: "2026-02-30" } as any)).rejects.toMatchObject({
            statusCode: 400,
        });
        await expect(TasksLoader.getAll({ startFrom: "not-a-date" } as any)).rejects.toMatchObject({
            statusCode: 400,
        });
        // Shapes `new Date` would accept against the host clock are rejected, so no bound can move day
        await expect(TasksLoader.getAll({ dueFrom: "2026-10-12 01:00" } as any)).rejects.toMatchObject({
            statusCode: 400,
        });
        await expect(TasksLoader.getAll({ dueTo: "October 12, 2026" } as any)).rejects.toMatchObject({
            statusCode: 400,
        });
        await expect(TasksLoader.getAll({ startTo: "2026-10-12T99:99" } as any)).rejects.toMatchObject({
            statusCode: 400,
        });
        // A timezone-qualified bound keeps the UTC day that instant falls on, whatever the host is
        await TasksLoader.getAll({ dueFrom: "2026-10-12T01:00:00+02:00" } as any);
        const offsetWindow = (mocks.find.mock.calls[2][0].filter as any)[Op.and].find((clause: any) =>
            Boolean(clause.duedate)
        );
        expect(offsetWindow?.duedate).toEqual({ [Op.gte]: new Date(Date.UTC(2026, 9, 11)) });
    } finally {
        if (originalTimezone === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = originalTimezone;
        }
    }
});
it("counts the same filtered set the list route returns", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
    const filters = {
        tags: ["00000000-0000-4000-8000-0000000000ab"],
        progress: "eq:0",
        startFrom: "2026-10-12T00:00:00.000Z",
    } as any;
    expect(TasksFilteredSchema.safeParse(filters).success).toBe(true);
    await TasksLoader.getAll(filters);
    await TasksLoader.countAll(filters);
    const listFilter = mocks.find.mock.calls[0][0].filter;
    const countFilter = mocks.count.mock.calls[0][0].where;
    expect(countFilter[Op.and]).toEqual(listFilter[Op.and]);
});
it("combines project, priority, progress, and date windows in one query", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
    const dueFrom = "2026-10-12T00:00:00.000Z";
    const dueTo = "2026-10-18T23:59:59.999Z";
    const startFrom = "2026-10-01T00:00:00.000Z";
    const projectId = "00000000-0000-4000-8000-0000000000aa";
    expect(
        TasksFilteredSchema.safeParse({
            project: projectId,
            priority: "high",
            progress: "gte:50",
            dueFrom,
            dueTo,
            startFrom,
        }).success
    ).toBe(true);
    await TasksLoader.getAll({
        project: projectId,
        priority: "high",
        progress: "gte:50",
        dueFrom,
        dueTo,
        startFrom,
    } as any);
    const filter = mocks.find.mock.calls[0][0].filter;
    expect(filter.project).toBe(projectId);
    expect(filter.priority).toBe("high");
    expect(filter.progress).toEqual({ [Op.gte]: 50 });
    const andClauses = filter[Op.and];
    expect(andClauses.some((clause: object) => Boolean((clause as any).duedate))).toBe(true);
    expect(andClauses.some((clause: object) => Boolean((clause as any).startdate))).toBe(true);
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
