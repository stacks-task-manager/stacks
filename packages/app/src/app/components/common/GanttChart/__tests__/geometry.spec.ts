import { addDays, differenceInCalendarDays, endOfDay } from "date-fns";
import {
    barGeometry,
    clampPaneWidth,
    dateAt,
    flattenRows,
    MIN_PANE_WIDTH,
    editDates,
    visibleWindow,
    timelineTicks,
    pixelsPerDay,
} from "app/components/common/GanttChart/geometry";
import { GanttRow, GanttScale } from "app/components/common/GanttChart/types";

const origin = new Date(2026, 2, 28);
const row = (id: string, children: GanttRow[] = []): GanttRow => ({
    id,
    name: id,
    startDate: null,
    endDate: null,
    children,
});

describe("Gantt calendar geometry", () => {
    it.each<GanttScale>(["day", "week", "month", "quarter", "halfYear"])(
        "round-trips calendar days at %s scale",
        scale => {
            const date = addDays(origin, 3);
            const bar = barGeometry(origin, date, endOfDay(date), pixelsPerDay[scale]);
            expect(bar.width).toBe(pixelsPerDay[scale]);
            expect(dateAt(origin, bar.left, pixelsPerDay[scale])).toEqual(date);
        }
    );
    it("uses calendar days across DST rather than elapsed milliseconds", () => {
        const start = new Date(2026, 2, 28, 10);
        const result = editDates(start, endOfDay(start), "move", 2);
        expect(result.startDate.getDate()).toBe(30);
        expect(result.startDate.getHours()).toBe(10);
        expect(differenceInCalendarDays(result.endDate, result.startDate)).toBe(0);
    });
    it("clamps resize endpoints to a one-day minimum", () => {
        const end = endOfDay(addDays(origin, 2));
        expect(editDates(origin, end, "left", 10).startDate).toEqual(addDays(origin, 2));
        expect(editDates(origin, end, "right", -10).endDate).toEqual(endOfDay(origin));
    });
    it("crosses leap days and year boundaries", () => {
        const start = new Date(2024, 1, 28);
        expect(editDates(start, endOfDay(start), "move", 2).startDate).toEqual(new Date(2024, 2, 1));
        expect(dateAt(new Date(2025, 11, 31), 36, 36)).toEqual(new Date(2026, 0, 1));
    });
    it("clamps the task pane within shared width boundaries", () => {
        expect(clampPaneWidth(300, 1000)).toBe(300);
        expect(clampPaneWidth(20, 1000)).toBe(MIN_PANE_WIDTH);
        expect(clampPaneWidth(2000, 1000)).toBe(880);
        expect(clampPaneWidth(300, 200)).toBe(MIN_PANE_WIDTH);
        expect(clampPaneWidth(300.4, 1000)).toBe(300);
        expect(clampPaneWidth(300.5, 1000)).toBe(301);
    });
    it("creates bounded ticks for every scale in the visible viewport", () => {
        for (const scale of Object.keys(pixelsPerDay) as GanttScale[]) {
            const ticks = timelineTicks(origin, 5000, 1000, scale);
            expect(ticks.length).toBeGreaterThan(0);
            expect(ticks.length).toBeLessThan(60);
            expect(ticks.every(tick => tick.width > 0)).toBe(true);
        }
    });
});

describe("Gantt visible hierarchy", () => {
    it("keeps order and depth while collapsing descendants", () => {
        const rows = [row("parent", [row("child", [row("grandchild")])]), row("sibling")];
        expect(flattenRows(rows, new Set()).map(item => [item.row.id, item.depth])).toEqual([
            ["parent", 0],
            ["child", 1],
            ["grandchild", 2],
            ["sibling", 0],
        ]);
        expect(flattenRows(rows, new Set(["parent"])).map(item => item.row.id)).toEqual([
            "parent",
            "sibling",
        ]);
    });
    it("tracks sibling continuation guides for nested rows", () => {
        const rows = [
            row("root-a", [row("sibling-a", [row("grandchild")]), row("sibling-b")]),
            row("root-b"),
        ];

        expect(
            flattenRows(rows, new Set()).map(item => [item.row.id, item.guides, item.hasNextSibling])
        ).toEqual([
            ["root-a", [], true],
            ["sibling-a", [], true],
            ["grandchild", [1], false],
            ["sibling-b", [], false],
            ["root-b", [], false],
        ]);
    });
    it("bounds rendered rows for a thousand-row project", () => {
        const window = visibleWindow(24000, 600, 1000);
        expect(window.end - window.start).toBeLessThan(30);
        expect(window.start).toBeLessThan(500);
        expect(window.end).toBeGreaterThan(512);
        expect(visibleWindow(0, 600, 0)).toEqual({ start: 0, end: 0 });
    });
});
