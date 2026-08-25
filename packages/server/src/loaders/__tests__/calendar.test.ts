// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POLLINGACTIONS, POLLINGTYPE } from "@stacks/types";

const afterCommitCallbacks: Array<() => void | Promise<void>> = [];
const transaction = {
    afterCommit: vi.fn((callback: () => void | Promise<void>) => afterCommitCallbacks.push(callback)),
    commit: vi.fn(async () => {
        for (const callback of afterCommitCallbacks) await callback();
    }),
    rollback: vi.fn(),
};

vi.mock("@stacks/db", () => ({
    CalendarEntity: {
        hasOne: vi.fn(),
        findAll: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    PermissionEntity: {
        belongsTo: vi.fn(),
        create: vi.fn(),
        findOne: vi.fn(),
        update: vi.fn(),
    },
    sequelize: {
        transaction: vi.fn(),
    },
}));

vi.mock("../../events", () => ({
    sendRealtimeUpdate: vi.fn(),
}));

vi.mock("../../utils/cache", () => ({
    invalidateApiCacheForCurrentRequest: vi.fn(),
}));

import { CalendarEntity, PermissionEntity, sequelize } from "@stacks/db";
import { sendRealtimeUpdate } from "../../events";
import { requestContext } from "../../services/requestContext";
import type { User } from "../../types";
import { CalendarsLoader } from "../calendar";

const baseContext = (overrides: Partial<User> = {}) => ({
    user: {
        id: "user-1",
        tenant: "tenant-1",
        role: "role-1",
        admin: false,
        email: "u@example.com",
        name: "U",
        ...overrides,
    } as User,
    instanceId: "instance-1",
    role: { id: "role-1", title: "r", access: {} } as any,
    requestId: "req-1",
    timestamp: Date.now(),
});

const runWithContext = <T>(fn: () => T, overrides: Partial<User> = {}) =>
    requestContext.run(baseContext(overrides), fn);

const calendarId = "11111111-1111-4111-8111-111111111111";

const calendarRow = (overrides: Record<string, any> = {}) => ({
    id: calendarId,
    title: "Team",
    color: "#336699",
    primary: false,
    source: "local",
    readOnly: false,
    tenant: "tenant-1",
    createdBy: "user-1",
    updatedBy: "user-1",
    PermissionEntity: {
        id: calendarId,
        owner: "user-1",
        type: POLLINGTYPE.CALENDAR,
        isPublic: true,
        visibleUsers: [],
        visibleRoles: [],
    },
    ...overrides,
});

describe("CalendarsLoader", () => {
    const createCalendarMock = vi.mocked(CalendarEntity.create);
    const findAllCalendarMock = vi.mocked(CalendarEntity.findAll);
    const findOneCalendarMock = vi.mocked(CalendarEntity.findOne);
    const updateCalendarMock = vi.mocked(CalendarEntity.update);
    const createPermissionMock = vi.mocked(PermissionEntity.create);
    const transactionMock = vi.mocked(sequelize.transaction);
    const sendRealtimeUpdateMock = vi.mocked(sendRealtimeUpdate);

    beforeEach(() => {
        vi.clearAllMocks();
        afterCommitCallbacks.length = 0;
        transaction.rollback.mockResolvedValue(undefined);
        transactionMock.mockResolvedValue(transaction as any);
        createCalendarMock.mockResolvedValue({
            toJSON: () => calendarRow({ PermissionEntity: undefined }),
        } as any);
        createPermissionMock.mockResolvedValue({
            toJSON: () => ({
                id: calendarId,
                owner: "user-1",
                type: POLLINGTYPE.CALENDAR,
                isPublic: true,
                visibleUsers: [],
                visibleRoles: [],
            }),
        } as any);
    });

    it("creates a local calendar permission row and broadcasts a calendar create update", async () => {
        const calendar = await runWithContext(() =>
            CalendarsLoader.create({ title: "Team", color: "#336699", primary: false })
        );

        expect(calendar.permissions).toMatchObject({
            id: calendarId,
            owner: "user-1",
            type: POLLINGTYPE.CALENDAR,
        });
        expect(createPermissionMock).toHaveBeenCalledWith(
            expect.objectContaining({
                id: calendarId,
                type: POLLINGTYPE.CALENDAR,
                isPublic: true,
            }),
            { transaction }
        );
        expect(sendRealtimeUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: POLLINGTYPE.CALENDAR,
                action: POLLINGACTIONS.CREATE,
                record: calendarId,
            })
        );
        expect(transaction.commit).toHaveBeenCalled();
    });

    it("allows local calendar creation to opt out of public visibility", async () => {
        await runWithContext(() =>
            CalendarsLoader.create({ title: "Private", color: "#336699", primary: false, isPublic: false })
        );

        expect(createPermissionMock).toHaveBeenCalledWith(
            expect.objectContaining({
                id: calendarId,
                type: POLLINGTYPE.CALENDAR,
                isPublic: false,
            }),
            { transaction }
        );
    });

    it("loads calendars through the permission-aware join", async () => {
        findAllCalendarMock.mockResolvedValue([calendarRow()] as any);

        const calendars = await runWithContext(() => CalendarsLoader.getAll());

        expect(calendars[0].permissions).toMatchObject({ type: POLLINGTYPE.CALENDAR });
        expect(findAllCalendarMock).toHaveBeenCalledWith(
            expect.objectContaining({
                include: [expect.objectContaining({ model: PermissionEntity, required: false })],
                raw: true,
                nest: true,
            })
        );
    });

    it("rejects updates by visible non-owners", async () => {
        findOneCalendarMock.mockResolvedValue(
            calendarRow({
                PermissionEntity: {
                    id: calendarId,
                    owner: "user-2",
                    type: POLLINGTYPE.CALENDAR,
                    isPublic: true,
                    visibleUsers: [],
                    visibleRoles: [],
                },
            }) as any
        );

        await expect(
            runWithContext(() => CalendarsLoader.update(calendarId, { title: "Private" }))
        ).rejects.toThrow(/calendar update not allowed/i);

        expect(updateCalendarMock).not.toHaveBeenCalled();
    });
});
