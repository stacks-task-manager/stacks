// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ITask } from "@stacks/types";

import { SCHEDULED_DAY_HOURS, convertToTimeline } from "../timelineData";

interface TaskFixture {
    id?: string;
    title?: string;
    startdate?: string;
    duedate?: string;
}
const task = (fixture: TaskFixture) =>
    ({
        ...fixture,
        startdate: fixture.startdate ? new Date(fixture.startdate) : undefined,
        duedate: fixture.duedate ? new Date(fixture.duedate) : undefined,
    }) as ITask;

describe("convertToTimeline", () => {
    it("creates one row per task spanning its date range", () => {
        const rows = convertToTimeline([
            task({ id: "1", title: "A", startdate: "2026-01-05T09:00:00Z", duedate: "2026-01-07T18:00:00Z" }),
        ]);

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe("1");
        expect(rows[0].title).toBe("A");
        expect(rows[0].days.length).toBeGreaterThanOrEqual(3);
        expect(rows[0].days.every(day => day.hours === SCHEDULED_DAY_HOURS)).toBe(true);
    });

    it("uses the due date as a single-day range when no start date is set", () => {
        const rows = convertToTimeline([task({ id: "2", title: "B", duedate: "2026-01-07T18:00:00Z" })]);

        expect(rows).toHaveLength(1);
        expect(rows[0].days.length).toBeGreaterThanOrEqual(1);
    });

    it("skips tasks without dates", () => {
        const rows = convertToTimeline([task({ id: "3", title: "C" })]);

        expect(rows).toHaveLength(0);
    });
});
