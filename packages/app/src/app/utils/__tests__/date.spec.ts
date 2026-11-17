// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { getNamedDateFilterRange } from "app/utils/date";

const NOW = new Date("2026-11-13T01:00:00.000Z");

describe("getNamedDateFilterRange", () => {
    it("resolves named ranges in the requested time zone", () => {
        expect(getNamedDateFilterRange("today", NOW, "UTC")).toEqual(["2026-11-13", "2026-11-13"]);
        expect(getNamedDateFilterRange("today", NOW, "America/Los_Angeles")).toEqual([
            "2026-11-12",
            "2026-11-12",
        ]);
    });

    it("uses the supplied week start", () => {
        expect(getNamedDateFilterRange("thisWeek", NOW, "UTC", 1)).toEqual(["2026-11-09", "2026-11-15"]);
        expect(getNamedDateFilterRange("thisWeek", NOW, "UTC", 0)).toEqual(["2026-11-08", "2026-11-14"]);
    });

    it("handles month and year boundaries", () => {
        expect(getNamedDateFilterRange("nextMonth", new Date("2026-12-15T12:00:00.000Z"), "UTC")).toEqual([
            "2027-01-01",
            "2027-01-31",
        ]);
    });

    it("returns null for custom and unknown filters", () => {
        expect(getNamedDateFilterRange("2026-11-01|2026-11-30", NOW, "UTC")).toBeNull();
        expect(getNamedDateFilterRange("unknown", NOW, "UTC")).toBeNull();
    });
});
