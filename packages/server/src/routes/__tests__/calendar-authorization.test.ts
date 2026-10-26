// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { expect, it, vi } from "vitest";
import { Hono } from "hono";
import { ROLE_ACTIONS, ROLE_SECTIONS } from "@stacks/types";
import { registerResponseHelpers } from "../../services/response";
import { errorHandler } from "../../utils/errorHandler";

const mocks = vi.hoisted(() => ({
    calendarGetAll: vi.fn(),
    calendarCreate: vi.fn(),
    calendarGetOne: vi.fn(),
    calendarUpdate: vi.fn(),
    calendarRemove: vi.fn(),
    eventGetAll: vi.fn(),
    eventCountAll: vi.fn(),
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
        countAll: mocks.eventCountAll,
        create: mocks.eventCreate,
        update: mocks.eventUpdate,
        move: mocks.eventMove,
        remove: mocks.eventRemove,
    },
}));

import calendarsRoutes from "../calendars";
import eventsRoutes from "../events";

const mountApi = (access: Record<string, unknown> = {}) => {
    const app = new Hono();
    registerResponseHelpers(app);
    app.onError(errorHandler);
    app.use(async (c, next) => {
        c.set("user", { id: "viewer-id", tenant: "tenant-a", admin: false } as any);
        c.set("userRole", { access } as any);
        await next();
    });
    app.route("/api/calendars", calendarsRoutes);
    app.route("/api/events", eventsRoutes);
    return app;
};

it("denies calendar and event reads without calendar read access", async () => {
    vi.clearAllMocks();
    const app = mountApi();
    const calendarId = "11111111-1111-4111-8111-111111111111";

    const responses = await Promise.all([
        app.request("/api/calendars"),
        app.request(`/api/calendars/${calendarId}`),
        app.request("/api/events?from=2026-10-01T00:00:00.000Z&to=2026-10-31T00:00:00.000Z"),
        app.request("/api/events/count?from=2026-10-01T00:00:00.000Z&to=2026-10-31T00:00:00.000Z"),
    ]);

    expect(responses.map(response => response.status)).toEqual([403, 403, 403, 403]);
    expect(mocks.calendarGetAll).not.toHaveBeenCalled();
    expect(mocks.calendarGetOne).not.toHaveBeenCalled();
    expect(mocks.eventGetAll).not.toHaveBeenCalled();
    expect(mocks.eventCountAll).not.toHaveBeenCalled();
});

it("denies calendar and event mutations without calendar write access", async () => {
    vi.clearAllMocks();
    const app = mountApi({ [ROLE_SECTIONS.CALENDAR]: { [ROLE_ACTIONS.READ]: true } });
    const calendarId = "11111111-1111-4111-8111-111111111111";
    const eventId = "22222222-2222-4222-8222-222222222222";
    mocks.calendarGetAll.mockResolvedValue([]);
    mocks.eventGetAll.mockResolvedValue([]);
    mocks.eventCountAll.mockResolvedValue(0);

    const reads = await Promise.all([
        app.request("/api/calendars"),
        app.request("/api/events?from=2026-10-01T00:00:00.000Z&to=2026-10-31T00:00:00.000Z"),
        app.request("/api/events/count?from=2026-10-01T00:00:00.000Z&to=2026-10-31T00:00:00.000Z"),
    ]);
    expect(reads.map(response => response.status)).toEqual([200, 200, 200]);

    const responses = await Promise.all([
        app.request("/api/calendars", { method: "POST" }),
        app.request(`/api/calendars/${calendarId}`, { method: "PATCH" }),
        app.request(`/api/calendars/${calendarId}`, { method: "DELETE" }),
        app.request("/api/events", { method: "POST" }),
        app.request(`/api/events/${eventId}`, { method: "PATCH" }),
        app.request(`/api/events/${eventId}/move`, { method: "PATCH" }),
        app.request(`/api/events/${eventId}`, { method: "DELETE" }),
    ]);

    expect(responses.map(response => response.status)).toEqual(Array(7).fill(403));
    expect(mocks.calendarGetAll).toHaveBeenCalledOnce();
    expect(mocks.eventGetAll).toHaveBeenCalledOnce();
    expect(mocks.eventCountAll).toHaveBeenCalledOnce();
    expect(mocks.calendarCreate).not.toHaveBeenCalled();
    expect(mocks.calendarUpdate).not.toHaveBeenCalled();
    expect(mocks.calendarRemove).not.toHaveBeenCalled();
    expect(mocks.eventCreate).not.toHaveBeenCalled();
    expect(mocks.eventUpdate).not.toHaveBeenCalled();
    expect(mocks.eventMove).not.toHaveBeenCalled();
    expect(mocks.eventRemove).not.toHaveBeenCalled();
});

it("rejects malformed event ids before update, move, or delete dispatch", async () => {
    vi.clearAllMocks();
    mocks.eventUpdate.mockResolvedValue(true);
    mocks.eventMove.mockResolvedValue(true);
    mocks.eventRemove.mockResolvedValue(true);
    const app = mountApi({
        [ROLE_SECTIONS.CALENDAR]: { [ROLE_ACTIONS.READ]: true, [ROLE_ACTIONS.WRITE]: true },
    });

    const responses = await Promise.all([
        app.request("/api/events/not-an-event-id", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: "{}",
        }),
        app.request("/api/events/not-an-event-id/move", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ calendar: "calendar-1", source: "local" }),
        }),
        app.request("/api/events/not-an-event-id", { method: "DELETE" }),
    ]);

    expect(responses.map(response => response.status)).toEqual([400, 400, 400]);
    expect(mocks.eventUpdate).not.toHaveBeenCalled();
    expect(mocks.eventMove).not.toHaveBeenCalled();
    expect(mocks.eventRemove).not.toHaveBeenCalled();
});

it("accepts local UUID and Google composite event ids at the route boundary", async () => {
    vi.clearAllMocks();
    mocks.eventUpdate.mockResolvedValue(true);
    mocks.eventMove.mockResolvedValue(true);
    mocks.eventRemove.mockResolvedValue(true);
    const app = mountApi({
        [ROLE_SECTIONS.CALENDAR]: { [ROLE_ACTIONS.READ]: true, [ROLE_ACTIONS.WRITE]: true },
    });
    const localId = "22222222-2222-4222-8222-222222222222";
    const googleId = "google_team_calendar@example.com_event123";

    const responses = await Promise.all([
        app.request(`/api/events/${localId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: "{}",
        }),
        app.request(`/api/events/${googleId}/move`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ calendar: "calendar-2", source: "google" }),
        }),
        app.request(`/api/events/${googleId}`, { method: "DELETE" }),
    ]);

    expect(responses.map(response => response.status)).toEqual([200, 200, 200]);
    expect(mocks.eventUpdate).toHaveBeenCalledWith(localId, {});
    expect(mocks.eventMove).toHaveBeenCalledWith(googleId, "calendar-2", "google");
    expect(mocks.eventRemove).toHaveBeenCalledWith(googleId, {});
});
