// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POLLINGTYPE } from "@stacks/types";

vi.mock("@stacks/db", () => ({
    CalendarEntity: {
        hasOne: vi.fn(),
        findAll: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    EventEntity: {
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

vi.mock("../../services/googleOAuthService", () => ({
    default: {
        hasValidTokens: vi.fn(),
        getCalendarEvents: vi.fn(),
        getCalendars: vi.fn(),
        createCalendarEvent: vi.fn(),
        updateCalendarEvent: vi.fn(),
        moveCalendarEvent: vi.fn(),
        deleteCalendarEvent: vi.fn(),
    },
}));

import { CalendarEntity, EventEntity } from "@stacks/db";
import { requestContext } from "../../services/requestContext";
import type { User } from "../../types";
import { EventsLoader } from "../events";

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

const visibleCalendarId = "11111111-1111-4111-8111-111111111111";
const inaccessibleCalendarId = "22222222-2222-4222-8222-222222222222";

const calendarRow = (id: string) => ({
    id,
    title: id,
    source: "local",
    tenant: "tenant-1",
    PermissionEntity: {
        id,
        owner: "user-1",
        type: POLLINGTYPE.CALENDAR,
        isPublic: true,
        visibleUsers: [],
        visibleRoles: [],
    },
});

describe("EventsLoader calendar ACL", () => {
    const findAllCalendarMock = vi.mocked(CalendarEntity.findAll);
    const findOneCalendarMock = vi.mocked(CalendarEntity.findOne);
    const findAllEventMock = vi.mocked(EventEntity.findAll);
    const createEventMock = vi.mocked(EventEntity.create);

    beforeEach(() => {
        vi.clearAllMocks();
        findAllCalendarMock.mockResolvedValue([calendarRow(visibleCalendarId)] as any);
        findAllEventMock.mockResolvedValue([] as any);
    });

    it("intersects requested local calendar filters with visible calendars", async () => {
        await runWithContext(() =>
            EventsLoader.getAll({
                from: "2026-01-01T00:00:00.000Z",
                to: "2026-01-31T00:00:00.000Z",
                calendars: [visibleCalendarId, inaccessibleCalendarId],
            })
        );

        const call = findAllEventMock.mock.calls[0][0] as any;
        const calendarFilter = call.where.calendar;
        const operator = Object.getOwnPropertySymbols(calendarFilter)[0];
        expect(calendarFilter[operator]).toEqual([visibleCalendarId]);
    });

    it("rejects event creation into a local calendar the user cannot see", async () => {
        findOneCalendarMock.mockResolvedValue(null);

        await expect(
            runWithContext(() =>
                EventsLoader.create({
                    title: "Blocked",
                    description: "",
                    start: new Date("2026-01-01T10:00:00.000Z"),
                    end: new Date("2026-01-01T11:00:00.000Z"),
                    allDay: false,
                    assignees: [],
                    source: "local",
                    calendar: inaccessibleCalendarId,
                })
            )
        ).rejects.toThrow(/calendar not found/i);

        expect(createEventMock).not.toHaveBeenCalled();
    });
});
