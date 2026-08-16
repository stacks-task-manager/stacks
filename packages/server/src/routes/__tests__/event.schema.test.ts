// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, it } from "vitest";
import { EventDeleteSchema } from "../schema/event";

describe("EventDeleteSchema", () => {
    it("keeps parameterless local and legacy deletes valid", () => {
        expect(EventDeleteSchema.safeParse({}).success).toBe(true);
    });

    it("accepts a Google single-instance delete", () => {
        expect(
            EventDeleteSchema.safeParse({
                scope: "single",
                calendarId: "calendar-1",
                googleEventId: "instance-1",
                recurringEventId: "series-1",
            }).success
        ).toBe(true);
    });

    it("accepts a Google series delete with its parent id", () => {
        expect(
            EventDeleteSchema.safeParse({
                scope: "series",
                calendarId: "calendar-1",
                googleEventId: "instance-1",
                recurringEventId: "series-1",
            }).success
        ).toBe(true);
    });

    it.each([
        { scope: "single" },
        { calendarId: "calendar-1" },
        { googleEventId: "instance-1" },
        { calendarId: "", googleEventId: "instance-1" },
        { calendarId: "calendar-1", googleEventId: "" },
        { scope: "series", calendarId: "calendar-1", googleEventId: "instance-1" },
    ])("rejects malformed Google delete metadata: %j", value => {
        expect(EventDeleteSchema.safeParse(value).success).toBe(false);
    });
});
