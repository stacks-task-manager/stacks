// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { requestContext } from "../../services/requestContext";

const mocks = vi.hoisted(() => ({
    canRead: vi.fn(),
    canWrite: vi.fn(),
    getCurrentUser: vi.fn(),
    calendarGetAll: vi.fn(),
    calendarCreate: vi.fn(),
    calendarGetOne: vi.fn(),
    calendarUpdate: vi.fn(),
    calendarRemove: vi.fn(),
    eventGetAll: vi.fn(),
    eventGetOne: vi.fn(),
    eventCreate: vi.fn(),
    eventUpdate: vi.fn(),
    eventMove: vi.fn(),
    eventRemove: vi.fn(),
}));

vi.mock("../../loaders", () => ({
    CalendarsLoader: {
        getAll: mocks.calendarGetAll,
        create: mocks.calendarCreate,
        getOne: mocks.calendarGetOne,
        update: mocks.calendarUpdate,
        remove: mocks.calendarRemove,
    },
    EventsLoader: {
        getAll: mocks.eventGetAll,
        getOne: mocks.eventGetOne,
        create: mocks.eventCreate,
        update: mocks.eventUpdate,
        move: mocks.eventMove,
        remove: mocks.eventRemove,
    },
}));
vi.mock("../../loaders/context", () => ({
    canRead: mocks.canRead,
    canWrite: mocks.canWrite,
    getCurrentUser: mocks.getCurrentUser,
}));

import { eventAiTools } from "../toolRegistry/eventTools";

const runAsViewer = <T>(fn: () => T) =>
    requestContext.run(
        {
            user: { id: "viewer-id", tenant: "tenant-a", admin: false } as any,
            role: { id: "role-1", title: "Viewer", access: {} } as any,
            instanceId: "test",
            requestId: "request-1",
            timestamp: Date.now(),
        },
        fn
    );

it("denies calendar AI reads without calendar read access", async () => {
    vi.clearAllMocks();
    mocks.canRead.mockReturnValue(false);
    mocks.calendarGetAll.mockResolvedValue([]);
    mocks.eventGetAll.mockResolvedValue([]);
    mocks.eventGetOne.mockResolvedValue({ id: "event-1", start: null, end: null });
    const args: Record<string, unknown> = {
        listCalendars: {},
        listCalendarEvents: { span: "day" },
        getCalendarEvent: { eventId: "event-1" },
    };

    for (const [name, input] of Object.entries(args)) {
        const tool = eventAiTools.find(candidate => candidate.name === name)!;
        await expect(runAsViewer(() => tool.execute(input as never))).rejects.toMatchObject({
            statusCode: 403,
        });
    }
    expect(mocks.calendarGetAll).not.toHaveBeenCalled();
    expect(mocks.eventGetAll).not.toHaveBeenCalled();
    expect(mocks.eventGetOne).not.toHaveBeenCalled();
});

it("denies calendar AI mutations without calendar write access", async () => {
    vi.clearAllMocks();
    mocks.canWrite.mockReturnValue(false);
    mocks.getCurrentUser.mockReturnValue({ id: "viewer-id", tenant: "tenant-a" });
    mocks.calendarGetAll.mockResolvedValue([]);
    const calendarId = "11111111-1111-4111-8111-111111111111";
    const args: Record<string, unknown> = {
        createLocalCalendar: { title: "New" },
        updateLocalCalendar: { calendarId, title: "New" },
        deleteLocalCalendar: { calendarId },
        createCalendarEvent: {
            title: "New event",
            start: "2026-10-18T09:00:00.000Z",
            end: "2026-10-18T10:00:00.000Z",
            source: "local",
        },
        updateCalendarEvent: { eventId: "event-1", title: "New" },
        moveCalendarEvent: { eventId: "event-1", source: "local", calendarId },
        deleteCalendarEvent: { eventId: "event-1" },
    };

    for (const [name, input] of Object.entries(args)) {
        const tool = eventAiTools.find(candidate => candidate.name === name)!;
        await expect(runAsViewer(() => tool.execute(input as never))).rejects.toMatchObject({
            statusCode: 403,
        });
    }
    expect(mocks.calendarCreate).not.toHaveBeenCalled();
    expect(mocks.calendarUpdate).not.toHaveBeenCalled();
    expect(mocks.calendarRemove).not.toHaveBeenCalled();
    expect(mocks.eventCreate).not.toHaveBeenCalled();
    expect(mocks.eventUpdate).not.toHaveBeenCalled();
    expect(mocks.eventMove).not.toHaveBeenCalled();
    expect(mocks.eventRemove).not.toHaveBeenCalled();
});
