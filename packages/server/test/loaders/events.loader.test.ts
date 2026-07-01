// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { beforeEach, describe, expect, test, vi } from "vitest";
import googleOAuthService from "../../src/services/googleOAuthService";
import { EventsLoader } from "../../src/loaders/events";
import { requestContext } from "../../src/services/requestContext";

const makeContext = () =>
    ({
        user: { id: "user-1", tenant: "tenant-1", admin: false },
        role: { id: "role-1", title: "User", access: {} },
        instanceId: "instance-1",
        requestId: "req-1",
        timestamp: Date.now(),
    }) as any;

describe("EventsLoader.remove", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    test("deletes only the selected Google recurring instance when scope is single", async () => {
        const cancelSpy = vi.spyOn(googleOAuthService, "cancelCalendarEventInstance").mockResolvedValue();
        const deleteSpy = vi.spyOn(googleOAuthService, "deleteCalendarEvent").mockResolvedValue();

        const result = await requestContext.run(makeContext(), async () => {
            return EventsLoader.remove("google_calendar_id_series_20260701T090000Z", {
                scope: "single",
                calendarId: "calendar_id",
                googleEventId: "series_20260701T090000Z",
                recurringEventId: "series",
            });
        });

        expect(result).toBe(true);
        expect(cancelSpy).toHaveBeenCalledWith("user-1", "calendar_id", "series_20260701T090000Z");
        expect(deleteSpy).not.toHaveBeenCalled();
    });

    test("deletes the parent Google recurring series when scope is series", async () => {
        const deleteSpy = vi.spyOn(googleOAuthService, "deleteCalendarEvent").mockResolvedValue();

        const result = await requestContext.run(makeContext(), async () => {
            return EventsLoader.remove("google_calendar_id_series_20260701T090000Z", {
                scope: "series",
                calendarId: "calendar_id",
                googleEventId: "series_20260701T090000Z",
                recurringEventId: "series",
            });
        });

        expect(result).toBe(true);
        expect(deleteSpy).toHaveBeenCalledWith("user-1", "calendar_id", "series");
    });
});
