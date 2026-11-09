// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * `packages/db/src/entities/Task.ts:11` declares `description` with `allowNull: true`, so the
 * tasks the app receives can carry `description: null`. The query predicate in
 * `packages/app/src/app/hooks/tasks.ts` must not throw for those rows.
 */
jest.mock("app/components/common", () => ({}));
jest.mock("app/store/actions", () => ({ TasksActions: {} }));
jest.mock("app/store/people", () => ({ PeopleStore: {} }));
jest.mock("app/store/projectFilters", () => ({ defaultFilters: {}, ProjectFiltersStore: {} }));
jest.mock("app/store/tasks", () => ({ TasksStore: {} }));
jest.mock("app/views/Project/Table/store", () => ({ TableStore: {} }));
jest.mock("app/hooks/project", () => ({ useCurrentProject: () => null }));
jest.mock("app/hooks/projectFilters", () => ({ useProjectFilters: () => null }));
jest.mock("app/hooks/router", () => ({ getHashPathname: () => null }));
jest.mock("app/hooks/stacks", () => ({ useStack: () => null, useStacks: () => null }));
jest.mock("app/hooks/store", () => ({ shallowEqual: (a: any, b: any) => a === b }));
jest.mock("app/utils/date", () => ({ isAfterToday: () => false, isOverdue: () => false }));
jest.mock("app/utils/taskOrder", () => ({ sortByIdOrder: (items: any[]) => items }));

import { buildTaskPredicates } from "app/hooks/tasks";
import type { ITask } from "@stacks/types";
import { POLLINGTYPE } from "@stacks/types";
import type { IFilters } from "app/store/projectFilters";

const taskWithoutDescription: ITask = {
    id: "task-1",
    title: "Searchable title",
    description: "",
    project: "project-1",
    stack: "stack-1",
    done: false,
    progress: 0,
    tags: [],
    assignees: [],
    parent: null,
    archived: null,
    startdate: null,
    duedate: null,
    dodate: null,
    projectInfo: null,
    status: null,
    cover: null,
    estimate: 0,
    priority: null,
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
    tenant: "tenant-1",
    created: new Date(0),
    updated: new Date(0),
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
};

// Simulate the persisted DB value, which is nullable despite the shared string declaration.
Object.assign(taskWithoutDescription, { description: null });

const filters: IFilters = {
    state: "todo",
    query: "",
    tags: [],
    assignees: [],
    overdue: false,
    inProgress: false,
};

describe("task filter predicates", () => {
    it("matches a task title when the task has no description", () => {
        const preds = buildTaskPredicates({ ...filters, query: "searchable" }, null);
        expect(preds.every(predicate => predicate(taskWithoutDescription))).toBe(true);
    });

    it("does not match an unrelated title when the description is null", () => {
        const preds = buildTaskPredicates({ ...filters, query: "no-such-word" }, null);
        expect(preds.every(predicate => predicate(taskWithoutDescription))).toBe(false);
    });
});
