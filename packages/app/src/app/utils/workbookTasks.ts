// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { ITask, IWorkbookFilters } from "@stacks/types";
import type { TablePersistentData } from "app/components/common";
import { getNamedDateFilterRange, toCalendarDateKey } from "app/utils/date";

export type WorkbookTaskTree = TablePersistentData<ITask>;

export interface WorkbookTaskResult {
    tasks: ITask[];
    treeTasks: ITask[];
}

const DATE_FILTER_FIELDS = {
    startDate: "startdate",
    doDate: "dodate",
    dueDate: "duedate",
} as const;

function dateRangeForFilter(filter: string, now: Date, timeZone: string): [string, string] | null {
    const namedRange = getNamedDateFilterRange(filter, now, timeZone, 1);
    if (namedRange) return namedRange;

    const [start, finish] = filter.split("|");
    return start && finish ? [start.slice(0, 10), finish.slice(0, 10)] : null;
}

function matchesDateFilter(
    filter: string,
    value: Date | null | undefined,
    now: Date,
    timeZone: string
): boolean {
    if (!value) return false;
    const range = dateRangeForFilter(filter, now, timeZone);
    if (!range) return true;
    const key = toCalendarDateKey(value, timeZone);
    return key >= range[0] && key <= range[1];
}

/** Case-insensitive task search used by workbook views. */
export function matchesWorkbookSearch(task: ITask, query?: string): boolean {
    const normalized = query?.trim().toLowerCase();
    if (!normalized) return true;
    return (
        task.title.toLowerCase().includes(normalized) ||
        (task.description ?? "").toLowerCase().includes(normalized)
    );
}

/**
 * Applies the persisted workbook filter semantics to one ACL-visible task.
 * Array filters use OR within a category; categories combine with AND.
 */
export function matchesWorkbookFilters(
    task: ITask,
    filters: IWorkbookFilters,
    currentUserId: string,
    now = new Date(),
    timeZone = "UTC"
): boolean {
    if (filters.projects.length > 0 && !filters.projects.includes(task.project)) return false;
    if (filters.tags.length > 0 && !(task.tags ?? []).some(tag => filters.tags.includes(tag))) return false;
    if (filters.statuses.length > 0 && (!task.status || !filters.statuses.includes(task.status)))
        return false;
    if (filters.state === "todo" && task.done) return false;
    if (filters.state === "done" && !task.done) return false;
    if (filters.priority && task.priority !== filters.priority) return false;

    const assignees = task.assignees ?? [];
    if (filters.nobody && assignees.length > 0) return false;
    if (filters.me && !assignees.includes(currentUserId)) return false;
    if (!filters.nobody && !filters.me) {
        if (filters.skipMe && assignees.includes(currentUserId)) return false;
        if (filters.onlyAssigned && assignees.length === 0) return false;
    }
    if (filters.assignees.length > 0 && !filters.assignees.some(assignee => assignees.includes(assignee))) {
        return false;
    }

    for (const [filterKey, taskKey] of Object.entries(DATE_FILTER_FIELDS)) {
        const filter = filters[filterKey as keyof typeof DATE_FILTER_FIELDS];
        if (filter && !matchesDateFilter(filter, task[taskKey], now, timeZone)) return false;
    }

    if (filters.overdue) {
        if (task.done || !task.duedate) return false;
        if (toCalendarDateKey(task.duedate, timeZone) >= toCalendarDateKey(now, timeZone)) return false;
    }
    if (filters.inProgress && (task.done || !task.progress)) return false;
    if (filters.loggedTime && task.timeSpent <= 0) return false;

    return true;
}

/**
 * Returns strict matches plus ACL-visible ancestors/descendants needed to preserve task tree shape.
 */
export function selectWorkbookTasks(
    tasks: ITask[],
    filters: IWorkbookFilters,
    currentUserId: string,
    now = new Date(),
    timeZone = "UTC",
    query?: string
): WorkbookTaskResult {
    const strict = tasks.filter(
        task =>
            matchesWorkbookFilters(task, filters, currentUserId, now, timeZone) &&
            matchesWorkbookSearch(task, query)
    );
    const byId = new Map(tasks.map(task => [task.id, task]));
    const children = new Map<string, ITask[]>();
    for (const task of tasks) {
        if (!task.parent) continue;
        const siblings = children.get(task.parent) ?? [];
        siblings.push(task);
        children.set(task.parent, siblings);
    }

    const selectedIds = new Set(strict.map(task => task.id));
    for (const task of strict) {
        let parentId = task.parent;
        const visited = new Set<string>([task.id]);
        while (parentId && !visited.has(parentId) && byId.has(parentId)) {
            selectedIds.add(parentId);
            visited.add(parentId);
            parentId = byId.get(parentId)?.parent ?? null;
        }

        const stack = [...(children.get(task.id) ?? [])];
        const descendantsSeen = new Set<string>();
        while (stack.length > 0) {
            const descendant = stack.pop()!;
            if (descendantsSeen.has(descendant.id)) continue;
            descendantsSeen.add(descendant.id);
            selectedIds.add(descendant.id);
            stack.push(...(children.get(descendant.id) ?? []));
        }
    }

    return {
        tasks: strict,
        treeTasks: tasks.filter(task => selectedIds.has(task.id)),
    };
}

export function groupWorkbookTasks(tasks: ITask[]): WorkbookTaskTree[] {
    const nodes = new Map<string, WorkbookTaskTree>(tasks.map(task => [task.id, { ...task, children: [] }]));
    const roots: WorkbookTaskTree[] = [];
    for (const task of tasks) {
        const node = nodes.get(task.id);
        if (!node) continue;
        const parent = task.parent ? nodes.get(task.parent) : undefined;
        if (parent) parent.children!.push(node);
        else roots.push(node);
    }
    return roots;
}
