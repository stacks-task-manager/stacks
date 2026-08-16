// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POLLINGACTIONS, POLLINGTYPE } from "@stacks/types";

vi.mock("@stacks/db", () => ({
    CalendarEntity: { hasOne: vi.fn() },
    EventEntity: { hasOne: vi.fn() },
    PermissionEntity: { belongsTo: vi.fn() },
    sequelize: { transaction: vi.fn() },
}));

vi.mock("../../events", () => ({ sendRealtimeUpdate: vi.fn() }));

vi.mock("../../services/googleOAuthService", () => ({
    default: {
        cancelCalendarEventInstance: vi.fn(),
        deleteCalendarEvent: vi.fn(),
    },
}));

import { sendRealtimeUpdate } from "../../events";
import googleOAuthService from "../../services/googleOAuthService";
import { requestContext } from "../../services/requestContext";
import { EventsLoader } from "../events";

const context = {
    user: { id: "user-1", tenant: "tenant-1", admin: false },
    role: { id: "role-1", title: "User", access: {} },
    instanceId: "instance-1",
    requestId: "req-1",
    timestamp: Date.now(),
} as any;

const run = <T>(fn: () => T) => requestContext.run(context, fn);
const cancelInstance = vi.mocked(googleOAuthService.cancelCalendarEventInstance);
const deleteGoogleEvent = vi.mocked(googleOAuthService.deleteCalendarEvent);
const sendUpdate = vi.mocked(sendRealtimeUpdate);

describe("EventsLoader.remove Google events", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("cancels only the selected recurring instance and emits a realtime deletion", async () => {
        await expect(
            run(() =>
                EventsLoader.remove("google_calendar-1_instance-1", {
                    scope: "single",
                    calendarId: "calendar-1",
                    googleEventId: "instance-1",
                    recurringEventId: "series-1",
                })
            )
        ).resolves.toBe(true);

        expect(cancelInstance).toHaveBeenCalledWith("user-1", "calendar-1", "instance-1");
        expect(deleteGoogleEvent).not.toHaveBeenCalled();
        expect(sendUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                type: POLLINGTYPE.EVENT,
                record: "google_calendar-1_instance-1",
                action: POLLINGACTIONS.DELETED,
            })
        );
    });

    it("deletes the parent id for an entire recurring series", async () => {
        await run(() =>
            EventsLoader.remove("google_calendar-1_instance-1", {
                scope: "series",
                calendarId: "calendar-1",
                googleEventId: "instance-1",
                recurringEventId: "series-1",
            })
        );

        expect(deleteGoogleEvent).toHaveBeenCalledWith("user-1", "calendar-1", "series-1");
        expect(cancelInstance).not.toHaveBeenCalled();
    });

    it("deletes an ordinary Google event parsed from its composite id", async () => {
        await expect(run(() => EventsLoader.remove("google_calendar-1_event-1"))).resolves.toBe(true);
        expect(deleteGoogleEvent).toHaveBeenCalledWith("user-1", "calendar-1", "event-1");
    });

    it("rejects series deletion without a parent recurring id", async () => {
        await expect(
            run(() =>
                EventsLoader.remove("google_calendar-1_instance-1", {
                    scope: "series",
                    calendarId: "calendar-1",
                    googleEventId: "instance-1",
                })
            )
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(deleteGoogleEvent).not.toHaveBeenCalled();
    });

    it.each([
        [401, 401],
        [403, 403],
    ])("maps Google status %i to API status %i", async (googleStatus, apiStatus) => {
        deleteGoogleEvent.mockRejectedValueOnce({ response: { status: googleStatus } });
        await expect(run(() => EventsLoader.remove("google_calendar-1_event-1"))).rejects.toMatchObject({
            statusCode: apiStatus,
        });
    });

    it("maps missing Google credentials to a bad request", async () => {
        deleteGoogleEvent.mockRejectedValueOnce(new Error("No valid Google tokens found"));
        await expect(run(() => EventsLoader.remove("google_calendar-1_event-1"))).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    it("returns false for an event Google no longer has", async () => {
        deleteGoogleEvent.mockRejectedValueOnce({ response: { status: 404 } });
        await expect(run(() => EventsLoader.remove("google_calendar-1_event-1"))).resolves.toBe(false);
        expect(sendUpdate).not.toHaveBeenCalled();
    });
});
