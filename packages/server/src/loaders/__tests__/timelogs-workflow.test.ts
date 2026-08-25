// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TIMELOG_STATUS } from "@stacks/types";

vi.mock("@stacks/db", () => ({
    DocumentEntity: {},
    PermissionEntity: { belongsTo: vi.fn() },
    ProjectEntity: { findAll: vi.fn() },
    TaskEntity: {},
    TimelogEntity: {
        associations: {},
        hasOne: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
    },
}));

vi.mock("../context", () => ({
    getCurrentUser: vi.fn(),
}));

vi.mock("../projects", () => ({
    ProjectsLoader: { getOne: vi.fn() },
}));

vi.mock("../tasks", () => ({
    TasksLoader: { getAll: vi.fn(), getOne: vi.fn() },
}));

vi.mock("../notifications", () => ({
    NotificationsLoader: { add: vi.fn() },
}));

vi.mock("../utils", () => ({
    createOne: vi.fn(),
    deleteAll: vi.fn(),
    sanitizeWhere: (where: object) => where,
    updateOne: vi.fn(),
    withTransaction: async (_transaction: unknown, callback: (transaction: object) => unknown) =>
        callback({ id: "transaction" }),
}));

vi.mock("../../events", () => ({ sendRealtimeUpdate: vi.fn() }));
vi.mock("../../utils/cache", () => ({ invalidateApiCacheForCurrentRequest: vi.fn() }));

import { ProjectEntity, TimelogEntity } from "@stacks/db";
import { getCurrentUser } from "../context";
import { NotificationsLoader } from "../notifications";
import { TasksLoader } from "../tasks";
import { TimelogsLoader } from "../timelogs";

const row = (value: object) => ({ toJSON: () => value });
const projectId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const ownerId = "33333333-3333-4333-8333-333333333333";
const reviewerId = "44444444-4444-4444-8444-444444444444";

const timelog = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    project: projectId,
    task: taskId,
    person: ownerId,
    date: new Date("2026-08-24T12:00:00.000Z"),
    duration: 3600,
    status: TIMELOG_STATUS.INREVIEW,
    projectInfo: { approvers: [reviewerId] },
    ...overrides,
});

describe("TimelogsLoader review workflow", () => {
    const findAllMock = vi.mocked(TimelogEntity.findAll);
    const updateMock = vi.mocked(TimelogEntity.update);
    const projectFindAllMock = vi.mocked(ProjectEntity.findAll);
    const notificationAddMock = vi.mocked(NotificationsLoader.add);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getCurrentUser).mockReturnValue({
            id: ownerId,
            tenant: "tenant-1",
            admin: false,
        } as any);
        vi.mocked(TasksLoader.getAll).mockResolvedValue([{ id: taskId }] as any);
        updateMock.mockResolvedValue([1] as any);
        notificationAddMock.mockResolvedValue({} as any);
    });

    it("applies the person filter to list queries", async () => {
        findAllMock.mockResolvedValue([] as any);

        await TimelogsLoader.getAll({ person: ownerId });

        expect(findAllMock).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ person: ownerId }) })
        );
    });

    it("submits only pending records owned by the current person and awaits reviewer notifications", async () => {
        const pending = timelog("55555555-5555-4555-8555-555555555555", {
            status: TIMELOG_STATUS.PENDING,
        });
        findAllMock.mockResolvedValue([row(pending)] as any);
        projectFindAllMock.mockResolvedValue([row({ id: projectId, approvers: [reviewerId] })] as any);

        await expect(TimelogsLoader.review("2026-08-23", "2026-08-29")).resolves.toBe(true);

        expect(findAllMock).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    person: ownerId,
                    status: TIMELOG_STATUS.PENDING,
                }),
            })
        );
        expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({ status: TIMELOG_STATUS.INREVIEW }),
            expect.objectContaining({ where: expect.objectContaining({ id: [pending.id] }) })
        );
        expect(notificationAddMock).toHaveBeenCalledTimes(1);
        expect(notificationAddMock).toHaveBeenCalledWith(
            expect.objectContaining({ recipient: reviewerId, data: [pending] }),
            { id: "transaction" }
        );
    });

    it("scopes review decisions to in-review records and notifies each owner once", async () => {
        vi.mocked(getCurrentUser).mockReturnValue({
            id: reviewerId,
            tenant: "tenant-1",
            admin: false,
        } as any);
        const first = timelog("66666666-6666-4666-8666-666666666666");
        const second = timelog("77777777-7777-4777-8777-777777777777");
        findAllMock.mockResolvedValue([row(first), row(second)] as any);
        updateMock.mockResolvedValue([2] as any);

        const result = await TimelogsLoader.updateStatus(TIMELOG_STATUS.APPROVED, {
            person: ownerId,
            start: "2026-08-01",
            end: "2026-08-31",
        });

        expect(findAllMock).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    person: ownerId,
                    status: TIMELOG_STATUS.INREVIEW,
                }),
            })
        );
        expect(result).toHaveLength(2);
        expect(notificationAddMock).toHaveBeenCalledTimes(1);
        expect(notificationAddMock).toHaveBeenCalledWith(expect.objectContaining({ recipient: ownerId }), {
            id: "transaction",
        });
    });

    it("does not let a project approver approve their own timelog", async () => {
        vi.mocked(getCurrentUser).mockReturnValue({
            id: reviewerId,
            tenant: "tenant-1",
            admin: false,
        } as any);
        findAllMock.mockResolvedValue([
            row(timelog("88888888-8888-4888-8888-888888888888", { person: reviewerId })),
        ] as any);

        await expect(
            TimelogsLoader.updateStatus(TIMELOG_STATUS.APPROVED, { person: reviewerId })
        ).resolves.toEqual([]);

        expect(updateMock).not.toHaveBeenCalled();
        expect(notificationAddMock).not.toHaveBeenCalled();
    });
});
