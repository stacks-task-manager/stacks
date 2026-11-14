// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { addDays, format, parseISO } from "date-fns";
import { PRIORITY, type ITask } from "@stacks/types";

import { toCalendarDateKey } from "app/utils/date";

/** A single day entry in the workbook deadline horizon. */
export interface IWorkbookDeadlineDay {
    label: string;
    count: number;
}

/** Overdue count plus per-day breakdown for the next 7 days. */
export interface IWorkbookDeadline {
    overdue: number;
    days: IWorkbookDeadlineDay[];
}

/** Task counts per project inside a workbook. */
export interface IWorkbookProjectWorkload {
    id: string;
    title: string;
    total: number;
    inProgress: number;
    done: number;
}

/** Open tasks missing planning data, grouped by gap type. */
export interface IWorkbookPlanningGaps {
    noDueDate: number;
    noStartDate: number;
    noAssignees: number;
}

/** Completion totals and progress percentage for a workbook. */
export interface IWorkbookMomentum {
    total: number;
    completed: number;
    progress: number;
    percent: number;
}

/** A recently completed task shown in the workbook overview. */
export interface IWorkbookRecentCompletion {
    id: string;
    title: string;
    project: string;
    doneAt?: Date | null;
}

export interface IWorkbookOverview {
    tasksTotal: number;
    tasksIdle: number;
    tasksInProgress: number;
    tasksCompleted: number;
    tasksArchived: number;
    tasksStartingToday: number;
    tasksOverdue: number;
    projects: IWorkbookProjectWorkload[];
    deadline: IWorkbookDeadline;
    critical: number;
    high: number;
    medium: number;
    low: number;
    assigneeIds: string[];
    workload: Map<string, number>;
    timeEstimatedTotal: number;
    timeLoggedTotal: number;
    timeRemaining: number;
    planningGaps: IWorkbookPlanningGaps;
    momentum: IWorkbookMomentum;
    recentCompleted: IWorkbookRecentCompletion[];
}

interface IProjectReference {
    id: string;
    title: string;
}

/**
 * Builds the workbook overview data from tasks, their projects and assignees.
 * The clock and time zone are injectable so date-only counts match workbook filters.
 */
export function buildWorkbookOverview(
    tasks: ITask[],
    projects: IProjectReference[],
    now = new Date(),
    timeZone = "UTC"
): IWorkbookOverview {
    const projectNames = new Map(projects.map(project => [project.id, project.title]));
    const todayKey = toCalendarDateKey(now, timeZone);
    const projectCounts = new Map<string, IWorkbookProjectWorkload>();
    const dueDateCounts = new Map<string, number>();
    const workload = new Map<string, number>();
    const completedTasks: ITask[] = [];

    let tasksIdle = 0;
    let tasksInProgress = 0;
    let tasksCompleted = 0;
    let tasksArchived = 0;
    let tasksStartingToday = 0;
    let tasksOverdue = 0;
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let timeEstimatedTotal = 0;
    let timeLoggedTotal = 0;
    let noDueDate = 0;
    let noStartDate = 0;
    let noAssignees = 0;

    for (const task of tasks) {
        if (task.done) {
            tasksCompleted += 1;
            if (task.completed) completedTasks.push(task);
        } else if (task.progress > 0) {
            tasksInProgress += 1;
        } else {
            tasksIdle += 1;
        }
        if (task.archived) tasksArchived += 1;

        if (!task.done) {
            if (task.startdate && toCalendarDateKey(task.startdate, timeZone) === todayKey) {
                tasksStartingToday += 1;
            }
            if (task.duedate) {
                if (isOverdueTask(task, now, timeZone)) tasksOverdue += 1;
                const dueDateKey = toCalendarDateKey(task.duedate, timeZone);
                dueDateCounts.set(dueDateKey, (dueDateCounts.get(dueDateKey) ?? 0) + 1);
            } else {
                noDueDate += 1;
            }
            if (!task.startdate) noStartDate += 1;
            if (!task.assignees?.length) noAssignees += 1;
        }

        const project = projectCounts.get(task.project) ?? {
            id: task.project,
            title: projectNames.get(task.project) ?? task.projectInfo?.title ?? "Unknown project",
            total: 0,
            inProgress: 0,
            done: 0,
        };
        project.total += 1;
        if (task.done) project.done += 1;
        else if (task.progress > 0) project.inProgress += 1;
        projectCounts.set(task.project, project);

        if (task.priority === PRIORITY.CRITICAL) critical += 1;
        if (task.priority === PRIORITY.HIGH) high += 1;
        if (task.priority === PRIORITY.MEDIUM) medium += 1;
        if (task.priority === PRIORITY.LOW) low += 1;

        for (const personId of task.assignees ?? []) {
            workload.set(personId, (workload.get(personId) ?? 0) + 1);
        }

        timeEstimatedTotal += task.estimate ?? 0;
        timeLoggedTotal += task.timeSpent ?? 0;
    }

    const deadline: IWorkbookDeadline = { overdue: tasksOverdue, days: [] };
    for (let offset = 0; offset < 7; offset++) {
        const key = format(addDays(parseISO(todayKey), offset), "yyyy-MM-dd");
        const count = dueDateCounts.get(key) ?? 0;
        if (count > 0) deadline.days.push({ label: formatCalendarLabel(key, todayKey), count });
    }

    const timeRemaining = Math.max(0, timeEstimatedTotal - timeLoggedTotal);
    const momentum: IWorkbookMomentum = {
        total: tasks.length,
        completed: tasksCompleted,
        progress: tasksInProgress,
        percent: tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 0,
    };
    const recentCompleted: IWorkbookRecentCompletion[] = completedTasks
        .sort((a, b) => new Date(b.completed!).getTime() - new Date(a.completed!).getTime())
        .slice(0, 5)
        .map(task => ({
            id: task.id,
            title: task.title,
            project: task.project,
            doneAt: task.completed,
        }));

    return {
        tasksTotal: tasks.length,
        tasksIdle,
        tasksInProgress,
        tasksCompleted,
        tasksArchived,
        tasksStartingToday,
        tasksOverdue,
        projects: [...projectCounts.values()],
        deadline,
        critical,
        high,
        medium,
        low,
        assigneeIds: [...workload.keys()],
        workload,
        timeEstimatedTotal,
        timeLoggedTotal,
        timeRemaining,
        planningGaps: { noDueDate, noStartDate, noAssignees },
        momentum,
        recentCompleted,
    };
}

function formatCalendarLabel(key: string, todayKey: string): string {
    if (key === todayKey) return "Today";
    if (key === format(addDays(parseISO(todayKey), 1), "yyyy-MM-dd")) return "Tomorrow";
    return format(parseISO(key), "MMM d");
}

/** Formats a due date as "Today", "Tomorrow" or the formatted date. */
export function formatDueDate(date: Date, now = new Date(), timeZone = "UTC"): string {
    const todayKey = toCalendarDateKey(now, timeZone);
    return formatCalendarLabel(toCalendarDateKey(date, timeZone), todayKey);
}

/** Returns true when the task is not done and its due date has passed. */
export function isOverdueTask(task: ITask, now = new Date(), timeZone = "UTC"): boolean {
    if (task.done || !task.duedate) return false;
    return toCalendarDateKey(task.duedate, timeZone) < toCalendarDateKey(now, timeZone);
}
