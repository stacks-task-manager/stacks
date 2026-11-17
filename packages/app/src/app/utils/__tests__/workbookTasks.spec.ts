// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { POLLINGTYPE, PRIORITY, type ITask, type IWorkbookFilters } from "@stacks/types";
import { selectWorkbookTasks } from "app/utils/workbookTasks";

const NOW = new Date("2026-11-13T12:00:00.000Z");

const task = (overrides: Partial<ITask> = {}): ITask => ({
    id: "task-1",
    title: "Write workbook",
    description: "Port the desktop view",
    project: "project-1",
    projectInfo: null,
    stack: "stack-1",
    tags: [],
    status: null,
    startdate: null,
    duedate: null,
    dodate: null,
    cover: null,
    done: false,
    estimate: 0,
    progress: 0,
    assignees: [],
    priority: PRIORITY.NONE,
    parent: null,
    subtasksOrder: [],
    tint: null,
    dependencies: [],
    hourlyRate: 0,
    locations: [],
    links: [],
    fields: {},
    timeSpent: 0,
    comments: 0,
    attachments: 0,
    reminders: [],
    completed: null,
    archived: null,
    tenant: "tenant-1",
    created: new Date("2026-10-01T00:00:00.000Z"),
    updated: new Date("2026-11-01T00:00:00.000Z"),
    createdBy: "user-1",
    updatedBy: "user-1",
    permissions: {
        id: "task-1",
        isPublic: true,
        visibleUsers: [],
        visibleRoles: [],
        owner: "user-1",
        type: POLLINGTYPE.TASK,
    },
    ...overrides,
});

const filters = (overrides: Partial<IWorkbookFilters> = {}): IWorkbookFilters => ({
    projects: [],
    tags: [],
    statuses: [],
    state: "todo",
    assignees: [],
    overdue: false,
    inProgress: false,
    loggedTime: false,
    ...overrides,
});

describe("selectWorkbookTasks", () => {
    it("uses OR within list filters and AND across categories", () => {
        const value = task({ tags: ["tag-2"], status: "status-2", project: "project-2" });
        const result = selectWorkbookTasks(
            [value],
            filters({
                projects: ["project-1", "project-2"],
                tags: ["tag-1", "tag-2"],
                statuses: ["status-1", "status-2"],
            }),
            "user-1",
            NOW,
            "UTC"
        );
        expect(result.tasks).toEqual([value]);

        expect(
            selectWorkbookTasks([value], filters({ projects: ["project-1"] }), "user-1", NOW, "UTC").tasks
        ).toEqual([]);
    });

    it("applies state, priority, in-progress, and logged-time filters", () => {
        const value = task({ done: true, priority: PRIORITY.HIGH, progress: 50, timeSpent: 30 });
        expect(
            selectWorkbookTasks(
                [value],
                filters({ state: "done", priority: PRIORITY.HIGH, loggedTime: true }),
                "user-1",
                NOW,
                "UTC"
            ).tasks
        ).toEqual([value]);
        expect(
            selectWorkbookTasks([value], filters({ state: "todo", inProgress: true }), "user-1", NOW, "UTC")
                .tasks
        ).toEqual([]);
    });

    it("applies nobody, me, skip-me, only-assigned, and explicit assignees", () => {
        expect(
            selectWorkbookTasks([task()], filters({ nobody: true }), "user-1", NOW, "UTC").tasks
        ).toHaveLength(1);
        expect(
            selectWorkbookTasks(
                [task({ assignees: ["user-1"] })],
                filters({ me: true }),
                "user-1",
                NOW,
                "UTC"
            ).tasks
        ).toHaveLength(1);
        expect(
            selectWorkbookTasks(
                [task({ assignees: ["user-1"] })],
                filters({ skipMe: true }),
                "user-1",
                NOW,
                "UTC"
            ).tasks
        ).toHaveLength(0);
        expect(
            selectWorkbookTasks([task()], filters({ onlyAssigned: true }), "user-1", NOW, "UTC").tasks
        ).toHaveLength(0);
        expect(
            selectWorkbookTasks(
                [task({ assignees: ["user-2"] })],
                filters({ assignees: ["user-2"] }),
                "user-1",
                NOW,
                "UTC"
            ).tasks
        ).toHaveLength(1);
    });

    it("excludes tasks due today from overdue and accepts earlier due days", () => {
        expect(
            selectWorkbookTasks(
                [task({ duedate: new Date("2026-11-13T09:00:00.000Z") })],
                filters({ overdue: true }),
                "user-1",
                NOW,
                "UTC"
            ).tasks
        ).toHaveLength(0);
        expect(
            selectWorkbookTasks(
                [task({ duedate: new Date("2026-11-12T23:00:00.000Z") })],
                filters({ overdue: true }),
                "user-1",
                NOW,
                "UTC"
            ).tasks
        ).toHaveLength(1);
    });

    it("supports named and custom date ranges", () => {
        const value = task({ duedate: new Date("2026-11-13T10:00:00.000Z") });
        expect(
            selectWorkbookTasks([value], filters({ dueDate: "today" }), "user-1", NOW, "UTC").tasks
        ).toHaveLength(1);
        expect(
            selectWorkbookTasks([value], filters({ dueDate: "2026-11-13|2026-11-19" }), "user-1", NOW, "UTC")
                .tasks
        ).toHaveLength(1);
    });

    it("evaluates named date ranges in the requested time zone", () => {
        const value = task({ duedate: new Date("2026-11-13T01:00:00.000Z") });

        expect(
            selectWorkbookTasks([value], filters({ dueDate: "today" }), "user-1", NOW, "UTC").tasks
        ).toHaveLength(1);
        expect(
            selectWorkbookTasks([value], filters({ dueDate: "today" }), "user-1", NOW, "America/Los_Angeles")
                .tasks
        ).toHaveLength(0);
    });

    it("searches title and description inline", () => {
        const titleMatch = task({ id: "title", title: "Release checklist" });
        const descriptionMatch = task({ id: "description", description: "Prepare RELEASE notes" });
        const noMatch = task({ id: "other", title: "Unrelated", description: "Nothing here" });

        expect(
            selectWorkbookTasks(
                [titleMatch, descriptionMatch, noMatch],
                filters({ state: "all" }),
                "user-1",
                NOW,
                "UTC",
                " release "
            ).tasks.map(item => item.id)
        ).toEqual(["title", "description"]);
    });

    it("retains nonmatching ancestors and all descendants of matching parents", () => {
        const parent = task({ id: "parent", title: "Parent" });
        const matchingChild = task({ id: "child", parent: "parent", tags: ["selected"] });
        const sibling = task({ id: "sibling", parent: "parent" });
        const matchingParent = task({ id: "matching-parent", tags: ["selected"] });
        const descendant = task({ id: "descendant", parent: "matching-parent" });

        const result = selectWorkbookTasks(
            [parent, matchingChild, sibling, matchingParent, descendant],
            filters({ tags: ["selected"] }),
            "user-1",
            NOW,
            "UTC"
        );

        expect(result.tasks.map(item => item.id)).toEqual(["child", "matching-parent"]);
        expect(result.treeTasks.map(item => item.id)).toEqual([
            "parent",
            "child",
            "matching-parent",
            "descendant",
        ]);
    });
});
