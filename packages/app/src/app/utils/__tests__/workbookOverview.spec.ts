// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { PRIORITY, type ITask } from "@stacks/types";

import { buildWorkbookOverview, formatDueDate, isOverdueTask } from "../workbookOverview";

const NOW = new Date("2026-01-01T00:30:00Z");
const TIME_ZONE = "America/Los_Angeles";

const task = (overrides: Partial<ITask>): ITask =>
    ({
        id: "task-1",
        title: "Test task",
        project: "project-1",
        done: false,
        progress: 0,
        startdate: null,
        duedate: null,
        assignees: [],
        priority: PRIORITY.NONE,
        estimate: 0,
        timeSpent: 0,
        completed: null,
        archived: null,
        ...overrides,
    }) as ITask;

const dateBeforeNow = (offsetDays: number) => new Date(NOW.getTime() - offsetDays * 86_400_000);

describe("buildWorkbookOverview", () => {
    it("computes task totals and completion momentum", () => {
        const tasks = [
            task({ id: "1" }),
            task({ id: "2", progress: 50 }),
            task({ id: "3", done: true, completed: dateBeforeNow(1) }),
        ];

        const overview = buildWorkbookOverview(
            tasks,
            [{ id: "project-1", title: "Project One" }],
            NOW,
            TIME_ZONE
        );

        expect(overview.tasksTotal).toBe(3);
        expect(overview.tasksIdle).toBe(1);
        expect(overview.tasksInProgress).toBe(1);
        expect(overview.tasksCompleted).toBe(1);
        expect(overview.momentum.percent).toBe(33);
    });

    it("groups deadlines by calendar day in the workbook time zone", () => {
        const tasks = [
            task({ id: "1", duedate: new Date("2026-01-01T01:00:00Z") }),
            task({ id: "2", duedate: new Date("2026-01-01T20:00:00Z") }),
            task({ id: "3", duedate: new Date("2025-12-30T20:00:00Z") }),
        ];

        const overview = buildWorkbookOverview(tasks, [], NOW, TIME_ZONE);

        expect(overview.tasksOverdue).toBe(1);
        expect(overview.deadline.overdue).toBe(1);
        expect(overview.deadline.days[0]).toEqual({ label: "Today", count: 1 });
        expect(overview.deadline.days[1]).toEqual({ label: "Tomorrow", count: 1 });
    });

    it("counts tasks starting today from their start date", () => {
        const tasks = [
            task({ id: "1", startdate: new Date("2026-01-01T01:00:00Z") }),
            task({ id: "2", duedate: new Date("2026-01-01T01:00:00Z") }),
            task({ id: "3", startdate: new Date("2025-12-30T20:00:00Z") }),
        ];

        const overview = buildWorkbookOverview(tasks, [], NOW, TIME_ZONE);

        expect(overview.tasksStartingToday).toBe(1);
    });

    it("counts planning gaps for open tasks only", () => {
        const tasks = [task({ id: "1" }), task({ id: "2", done: true })];

        const overview = buildWorkbookOverview(tasks, [], NOW, TIME_ZONE);

        expect(overview.planningGaps).toEqual({ noDueDate: 1, noStartDate: 1, noAssignees: 1 });
    });

    it("lists the five most recently completed tasks", () => {
        const tasks = Array.from({ length: 7 }, (_, index) =>
            task({ id: String(index), done: true, completed: dateBeforeNow(index) })
        );

        const overview = buildWorkbookOverview(tasks, [], NOW, TIME_ZONE);

        expect(overview.recentCompleted).toHaveLength(5);
        expect(overview.recentCompleted[0].id).toBe("0");
    });
});

describe("buildWorkbookOverview overBudget", () => {
    it("ranks open tasks spending more than their estimate by overrun percentage", () => {
        const tasks = [
            task({ id: "1", title: "A", estimate: 60, timeSpent: 90 }), // +50%
            task({ id: "2", title: "B", estimate: 120, timeSpent: 300 }), // +150%
            task({ id: "3", title: "C", estimate: 60, timeSpent: 30 }), // under budget
            task({
                id: "4",
                title: "D",
                done: true,
                completed: dateBeforeNow(1),
                estimate: 60,
                timeSpent: 90,
            }), // completed → excluded
        ];

        const overview = buildWorkbookOverview(tasks, [], NOW, TIME_ZONE);

        expect(overview.overBudget.count).toBe(2);
        expect(overview.overBudget.tasks.map(task => task.id)).toEqual(["2", "1"]);
        expect(overview.overBudget.tasks[0].overrunPct).toBe(150);
    });

    it("ignores tasks without an estimate or with no logged time", () => {
        const overview = buildWorkbookOverview(
            [task({ id: "1", title: "A", estimate: 0, timeSpent: 60 })],
            [],
            NOW,
            TIME_ZONE
        );

        expect(overview.overBudget.count).toBe(0);
    });
});

describe("buildWorkbookOverview leadTime", () => {
    it("computes average completion days and median open task age", () => {
        const tasks = [
            // completed 3 days after creation
            task({ id: "1", done: true, completed: dateBeforeNow(1), created: dateBeforeNow(4) }),
            // completed 5 days after creation
            task({ id: "2", done: true, completed: dateBeforeNow(1), created: dateBeforeNow(6) }),
            // open tasks aged 2 and 8 days → median 5
            task({ id: "3", created: dateBeforeNow(2) }),
            task({ id: "4", created: dateBeforeNow(8) }),
        ];

        const overview = buildWorkbookOverview(tasks, [], NOW, TIME_ZONE);

        expect(overview.leadTime.avgCompletionDays).toBe(4); // (3 + 5) / 2
        expect(overview.leadTime.medianOpenAgeDays).toBe(5); // median of [2, 8]
    });

    it("returns null when there is no data", () => {
        const overview = buildWorkbookOverview([], [], NOW, TIME_ZONE);

        expect(overview.leadTime.avgCompletionDays).toBeNull();
        expect(overview.leadTime.medianOpenAgeDays).toBeNull();
    });
});

describe("formatDueDate", () => {
    it("labels today and tomorrow in the requested time zone", () => {
        expect(formatDueDate(new Date("2026-01-01T01:00:00Z"), NOW, TIME_ZONE)).toBe("Today");
        expect(formatDueDate(new Date("2026-01-01T20:00:00Z"), NOW, TIME_ZONE)).toBe("Tomorrow");
    });
});

describe("isOverdueTask", () => {
    it("returns true only for open tasks past their due date", () => {
        const yesterday = new Date("2025-12-30T20:00:00Z");
        const today = new Date("2026-01-01T01:00:00Z");

        expect(isOverdueTask(task({ duedate: yesterday }), NOW, TIME_ZONE)).toBe(true);
        expect(isOverdueTask(task({ duedate: today }), NOW, TIME_ZONE)).toBe(false);
        expect(isOverdueTask(task({ done: true, duedate: yesterday }), NOW, TIME_ZONE)).toBe(false);
        expect(isOverdueTask(task({}), NOW, TIME_ZONE)).toBe(false);
    });
});
