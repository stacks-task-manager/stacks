// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Tasks hooks and selectors.
 */
import {
    addDays,
    addMonths,
    addWeeks,
    endOfDay,
    endOfMonth,
    isBefore,
    isSameDay,
    isSameWeek,
    isToday,
    isTomorrow,
    isValid,
    isWithinInterval,
    startOfDay,
    startOfMonth,
    subDays,
    subMonths,
} from "date-fns";
import intersection from "lodash/intersection";
import { useEffect, useMemo } from "react";
import { matchPath, useParams } from "react-router-dom";

import { APPICONS, GROUPING_TYPE, ICONS, ITask, PRIORITY, PRIORITYICON } from "@stacks/types";
import { TablePersistentData, TablePersistentGroupData } from "app/components/common";
import { TasksActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { IFilters } from "app/store/projectFilters";
import { TasksStore } from "app/store/tasks";
import { isAfterToday, isOverdue } from "app/utils/date";
import { TableStore } from "app/views/Project/Table/store";
import { useCurrentProject } from "./project";
import { useProjectFilters } from "./projectFilters";
import { getHashPathname } from "./router";
import { useStack, useStacks } from "./stacks";
import { shallowEqual } from "./store";
import { useLoadWhen } from "./useLoadWhen";

/** Non-archived task whose start/duedate falls in `[dateFrom, dateTo]` (inclusive days). */
export function taskInDateRange(task: ITask, dateFrom: Date, dateTo: Date): boolean {
    if (task.archived) return false;
    const taskDate = task.startdate || task.duedate;
    if (!taskDate) return false;
    return isWithinInterval(taskDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
}

function filterByDate(filterDate: string, date?: Date | null) {
    if (!date) return true;

    if (filterDate === "today") {
        return !isSameDay(new Date(), new Date(date));
    } else if (filterDate === "yesterday") {
        return !isSameDay(subDays(new Date(), 1), new Date(date));
    } else if (filterDate === "tomorrow") {
        return !isSameDay(addDays(new Date(), 1), new Date(date));
    } else if (filterDate === "thisWeek") {
        return !isSameWeek(new Date(), new Date(date));
    } else if (filterDate === "lastWeek") {
        return !isSameWeek(subDays(new Date(), 7), new Date(date));
    } else if (filterDate === "nextWeek") {
        return !isSameWeek(addDays(new Date(), 7), new Date(date));
    } else if (filterDate === "thisMonth") {
        const start = startOfMonth(new Date());
        const finish = endOfMonth(new Date());
        return !isWithinInterval(new Date(date), { start, end: finish });
    } else if (filterDate === "lastMonth") {
        const start = startOfMonth(subMonths(new Date(), 1));
        const finish = endOfMonth(subMonths(new Date(), 1));
        return !isWithinInterval(new Date(date), { start, end: finish });
    } else if (filterDate === "nextMonth") {
        const start = startOfMonth(addMonths(new Date(), 1));
        const finish = endOfMonth(addMonths(new Date(), 1));
        return !isWithinInterval(new Date(date), { start, end: finish });
    }

    const dates = filterDate.split("|");
    const start = new Date(dates[0]);
    const finish = new Date(dates[1]);

    if (!isValid(start) || !isValid(finish)) return true;

    return !isWithinInterval(new Date(date), { start, end: finish });
}

/**
 * Build predicates for client-side task filtering. Reuse the same array for many tasks
 * (resolve `currentUserId` once per batch).
 */
export function buildTaskPredicates(
    filters: IFilters,
    currentUserId: string | null | undefined
): Array<(task: ITask) => boolean> {
    if (!filters) return [() => true];

    const preds: Array<(task: ITask) => boolean> = [];

    if (filters.project != null) {
        preds.push(t => t.project === filters.project!);
    }

    if (filters.stack?.id) {
        preds.push(t => t.stack === filters.stack!.id);
    }

    if (filters.query && filters.query.length > 0) {
        const q = filters.query.toLowerCase();
        preds.push(
            t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
        );
    }

    if (filters.state !== "all") {
        if (filters.state === "todo") preds.push(t => !t.done);
        if (filters.state === "done") preds.push(t => t.done);
    }

    if (filters.priority) {
        preds.push(t => filters.priority === t.priority);
    }

    if (filters.tags && filters.tags.length > 0) {
        preds.push(t => intersection(filters.tags, t.tags).length > 0);
    }

    if (filters.status) {
        preds.push(t => Boolean(t.status) && t.status === filters.status);
    }

    preds.push(t => {
        if (!filters.nobody && !filters.me) {
            if (filters.skipMe) {
                if (t.assignees && currentUserId && t.assignees.includes(currentUserId)) return false;
            }
            if (filters.onlyAssigned) {
                if (t.assignees == null || t.assignees.length === 0) return false;
            }
        }
        if (filters.nobody) {
            if (t.assignees && t.assignees.length > 0) return false;
        }
        if (filters.me) {
            if (!t.assignees || t.assignees.length === 0) return false;
            if (currentUserId && !t.assignees.includes(currentUserId)) return false;
        }
        return true;
    });

    if (filters.assignees && filters.assignees.length > 0) {
        preds.push(
            t =>
                Boolean(t.assignees?.length) &&
                filters.assignees!.some(a => t.assignees!.includes(a))
        );
    }

    if (filters.startDate) {
        const sd = filters.startDate;
        preds.push(t => !filterByDate(sd, t.startdate));
    }
    if (filters.doDate) {
        const dd = filters.doDate;
        preds.push(t => !filterByDate(dd, t.dodate));
    }
    if (filters.dueDate) {
        const dd = filters.dueDate;
        preds.push(t => !filterByDate(dd, t.duedate));
    }

    if (filters.overdue) {
        preds.push(t => {
            if (t.done || !t.duedate) return false;
            if (isBefore(new Date(), new Date(t.duedate))) return false;
            return true;
        });
    }

    if (filters.inProgress) {
        preds.push(t => !(t.done || !t.progress));
    }

    preds.push(t => t.parent == null || Boolean(filters.showSubtasks));

    return preds;
}

export function filterTask(
    task: ITask,
    filters: IFilters,
    currentUserId: string | null | undefined = PeopleStore.get().me
): boolean {
    if (!filters) return true;
    return buildTaskPredicates(filters, currentUserId).every(p => p(task));
}

/**
 * Returns an array of tasks for the current project
 * @returns
 */
export const useFilteredProjectTasks = () => {
    const { filters } = useProjectFilters();
    const tasks = TasksStore.use(state => state.tasks, shallowEqual);
    const currentUserId = PeopleStore.use(state => state.me, shallowEqual);

    return useMemo(() => {
        const preds = buildTaskPredicates(filters, currentUserId);
        return tasks.filter(task => preds.every(p => p(task)) && !task.archived);
    }, [tasks, filters, currentUserId]);
};

export const useProjectTasksByIds = (taskIds: string[]) => {
    const { id } = useParams();
    return TasksStore.use(
        state =>
            state.tasks.filter(task => task.project === id && taskIds.includes(task.id) && !task.archived),
        shallowEqual
    );
};

/**
 * Returns an array of filtered task ids for the current project based on the provided task ids from a stack
 * @param taskIds
 * @returns
 */
export const useFilteredProjectTasksIds = (taskIds: string[]) => {
    const { filters } = useProjectFilters();
    const tasks = TasksStore.use(
        state => state.tasks.filter(task => taskIds.includes(task.id) && !task.archived),
        shallowEqual
    );
    const currentUserId = PeopleStore.use(state => state.me, shallowEqual);

    return useMemo(() => {
        const preds = buildTaskPredicates(filters, currentUserId);
        return tasks.filter(task => preds.every(p => p(task))).map(task => task.id);
    }, [tasks, filters, currentUserId]);
};

export const useSortTaskIds = (tasks: string[], stackId: string) => {
    const stack = useStack(stackId);
    const tasksOrder = stack?.tasksOrder || [];
    return useMemo(
        () => [...tasks].sort((a, b) => tasksOrder.indexOf(a) - tasksOrder.indexOf(b)),
        [tasks, tasksOrder]
    );
};

export const useSortTask = (tasks: ITask[], stackId: string) => {
    const stack = useStack(stackId);
    const tasksOrder = stack?.tasksOrder || [];
    return useMemo(
        () => [...tasks].sort((a, b) => tasksOrder.indexOf(a.id) - tasksOrder.indexOf(b.id)),
        [tasks, tasksOrder]
    );
};

/**
 * Returns a specific task
 * @param taskId
 * @returns
 */
export const useTask = (
    taskId: string | null | undefined
): { task: ITask | undefined; isLoading: boolean } => {
    const resolvedId = taskId ?? "";

    const isLoading = TasksStore.use(
        state => state.isLoading || (Boolean(resolvedId) && state.loadingChunk.includes(resolvedId))
    );

    const task = TasksStore.use(state =>
        resolvedId ? state.tasks.find(t => t.id === resolvedId) : undefined
    );

    useLoadWhen(
        !task && !isLoading && Boolean(taskId),
        () => {
            void TasksActions.loadSegment([taskId!]);
        },
        [taskId, task, isLoading]
    );

    return useMemo(() => ({ isLoading, task }), [isLoading, task]);
};

/**
 * Returns an array of tasks for the provided task ids
 * @param taskIds Array of task ids to filter
 * @returns Array of tasks for the provided task ids
 */
export const useTasks = (taskIds: string[]): { tasks: ITask[]; isLoading: boolean } => {
    const { isLoading, tasks } = TasksStore.use(
        state => ({
            tasks: state.tasks.filter(task => {
                return taskIds.includes(task.id);
            }),
            isLoading: state.isLoading || state.loadingChunk.some(id => taskIds.includes(id)),
        }),
        shallowEqual
    );

    useEffect(() => {
        if (!isLoading && tasks.length !== taskIds.length) {
            (async () => {
                await TasksActions.loadSegment(taskIds);
            })();
        }
    }, [taskIds, tasks, isLoading]);

    return {
        isLoading,
        tasks,
    };
};

export const getTask = (taskId: string) => {
    return TasksStore.get().tasks.find(task => task.id === taskId);
};

/**
 * Returns the current task based on the id provided in the URL
 * @returns
 */
export const useCurrentTask = () => {
    const params = useParams<{ id: string; tid: string }>();
    const { task, isLoading } = useTask(params.tid ?? params.id);

    return { task, isLoading, taskId: params.tid, projectId: params.id };
};

export const getCurrentTaskId = () => {
    const path = getHashPathname();
    const match1 = matchPath("/task/:id", path);
    const match2 = matchPath("/project/:id/:tid", path);
    const match3 = matchPath("/mytasks/:id", path);

    return match1?.params.id ?? match2?.params.tid ?? match3?.params.id ?? "";
};

/**
 * Returns a project's tasks
 * @param projectId
 * @returns
 */
export const useProjectTasks = (projectId: string): ITask[] => {
    return TasksStore.use(
        state => state.tasks.filter(task => task.project === projectId && !task.archived),
        shallowEqual
    );
};

export const getProjectTasks = (projectId: string): ITask[] => {
    return TasksStore.get().tasks.filter(task => task.project === projectId && !task.archived);
};

export const getStackTasks = (stackId: string): ITask[] => {
    return TasksStore.get().tasks.filter(task => task.stack === stackId && !task.archived);
};

export const getStackTasksIds = (stackId: string): string[] => {
    return TasksStore.get()
        .tasks.filter(task => task.stack === stackId)
        .map(task => task.id);
};
/**
 * Returns a project's tasks ids
 * @param projectId
 * @returns
 */
export const useProjectTasksIds = (projectId: string) => {
    return TasksStore.use(
        state => state.tasks.filter(task => task.project === projectId).map(task => task.id),
        shallowEqual
    );
};

export const getProjectTasksIds = (projectId: string) => {
    return getProjectTasks(projectId).map(task => task.id);
};

function buildNestedTaskTree(allTasks: ITask[]): TablePersistentData<ITask>[] {
    const idSet = new Set(allTasks.map(t => t.id));
    const childrenByParent = new Map<string, ITask[]>();

    for (const t of allTasks) {
        const parentId = t.parent;
        if (parentId && idSet.has(parentId)) {
            const list = childrenByParent.get(parentId) ?? [];
            list.push(t);
            childrenByParent.set(parentId, list);
        }
    }

    const build = (t: ITask): TablePersistentData<ITask> => {
        const kids = childrenByParent.get(t.id) ?? [];
        const nestedKids = kids.map(build);
        return nestedKids.length ? { ...t, children: nestedKids } : { ...t };
    };

    const roots = allTasks.filter(t => t.parent == null || !idSet.has(t.parent));
    return roots.map(build);
}

type TaskDateField = "duedate" | "startdate";

function partitionTasksByCalendarBuckets(tasks: ITask[], field: TaskDateField) {
    const get = (t: ITask) => (field === "duedate" ? t.duedate : t.startdate);
    return {
        overdue: tasks.filter(t => !t.done && get(t) && isOverdue(get(t)!)),
        today: tasks.filter(t => !t.done && get(t) && isToday(get(t)!)),
        tomorrow: tasks.filter(t => !t.done && get(t) && isTomorrow(get(t)!)),
        thisWeek: tasks.filter(t => !t.done && get(t) && isSameWeek(new Date(get(t)!), new Date())),
        nextWeek: tasks.filter(
            t => !t.done && get(t) && isSameWeek(new Date(get(t)!), addWeeks(new Date(), 1))
        ),
        upcoming: tasks.filter(t => !t.done && get(t) && isAfterToday(get(t)!)),
        missing: tasks.filter(t => !t.done && !get(t)),
    };
}

function tableGroupsFromDateBuckets(
    buckets: ReturnType<typeof partitionTasksByCalendarBuckets>,
    spec: {
        row: Array<{
            groupId: string;
            title: string;
            key: keyof ReturnType<typeof partitionTasksByCalendarBuckets>;
            emptyDescription: string;
            defaultExpanded?: boolean;
        }>;
    }
): TablePersistentGroupData<ITask>[] {
    return spec.row.map(r => ({
        groupId: r.groupId,
        title: r.title,
        data: buckets[r.key],
        defaultExpanded: r.defaultExpanded,
        blankSlate: !buckets[r.key].length
            ? { description: r.emptyDescription, icon: APPICONS.CALENDAR }
            : undefined,
    }));
}

const DUE_DATE_GROUP_SPEC = {
    row: [
        {
            groupId: "overdue",
            title: "Overdue",
            key: "overdue" as const,
            emptyDescription: "There are no overdue tasks",
            defaultExpanded: true,
        },
        { groupId: "due-today", title: "Due today", key: "today" as const, emptyDescription: "There are no tasks due today" },
        {
            groupId: "due-tomorrow",
            title: "Due tomorrow",
            key: "tomorrow" as const,
            emptyDescription: "There are no tasks due tomorrow",
        },
        {
            groupId: "due-this-week",
            title: "Due this week",
            key: "thisWeek" as const,
            emptyDescription: "There are no tasks due this week",
        },
        {
            groupId: "due-next-week",
            title: "Due next week",
            key: "nextWeek" as const,
            emptyDescription: "There are no tasks due next week",
        },
        { groupId: "upcoming", title: "Upcoming", key: "upcoming" as const, emptyDescription: "There are no upcoming due tasks" },
        {
            groupId: "no-due",
            title: "No due date",
            key: "missing" as const,
            emptyDescription: "There are no tasks with a due date",
        },
    ],
};

const START_DATE_GROUP_SPEC = {
    row: [
        {
            groupId: "started",
            title: "Started",
            key: "overdue" as const,
            emptyDescription: "There are no tasks that have already started",
            defaultExpanded: true,
        },
        {
            groupId: "starting-today",
            title: "Starting today",
            key: "today" as const,
            emptyDescription: "There are no tasks that start today",
        },
        {
            groupId: "starting-tomorrow",
            title: "Starting tomorrow",
            key: "tomorrow" as const,
            emptyDescription: "There are no tasks that start tomorrow",
        },
        {
            groupId: "starting-this-week",
            title: "Starting this week",
            key: "thisWeek" as const,
            emptyDescription: "There are no tasks that start this week",
        },
        {
            groupId: "starting-next-week",
            title: "Starting next week",
            key: "nextWeek" as const,
            emptyDescription: "There are no tasks that start next week",
        },
        { groupId: "upcoming", title: "Upcoming", key: "upcoming" as const, emptyDescription: "There are no tasks that start soon" },
        {
            groupId: "no-start",
            title: "No start date",
            key: "missing" as const,
            emptyDescription: "There are no tasks without a start date",
        },
    ],
};

const PRIORITY_GROUP_SPEC: Array<{
    groupId: string;
    title: string;
    priority: PRIORITY;
    emptyDescription: string;
    icon: PRIORITYICON | APPICONS | ICONS;
    defaultExpanded?: boolean;
}> = [
    { groupId: "critical", title: "Critical", priority: PRIORITY.CRITICAL, emptyDescription: "There are no critical priority tasks", icon: PRIORITYICON.CRITICAL, defaultExpanded: true },
    { groupId: "high", title: "High", priority: PRIORITY.HIGH, emptyDescription: "There are no high priority tasks", icon: PRIORITYICON.HIGH, defaultExpanded: true },
    { groupId: "medium", title: "Medium", priority: PRIORITY.MEDIUM, emptyDescription: "There are no medium priority tasks", icon: PRIORITYICON.MEDIUM },
    { groupId: "low", title: "Low", priority: PRIORITY.LOW, emptyDescription: "There are no low priority tasks", icon: PRIORITYICON.LOW },
    { groupId: "none", title: "None", priority: PRIORITY.NONE, emptyDescription: "There are no unprioritized tasks", icon: ICONS.FLAG },
];

/**
 * Returns the grouped tasks for the Projects Table View
 * @returns
 */
export const useGrouppedProjectTasks = () => {
    const { project } = useCurrentProject();
    const grouping = TableStore.use(state => state.grouping, shallowEqual);
    const tasksPlain = useFilteredProjectTasks();

    const tasks = grouping === GROUPING_TYPE.UNGROUPED ? buildNestedTaskTree(tasksPlain) : tasksPlain;

    const stacks = useStacks();

    return useMemo(() => {
        if (!project) return [];

        if (grouping === GROUPING_TYPE.STACK) {
            const group: TablePersistentGroupData<ITask>[] = [];

            let index = 0;
            for (const stack of stacks) {
                const tasksOrder = stack?.tasksOrder || [];
                const stackTasks = tasks
                    .filter(task => task.stack === stack.id)
                    .sort((a, b) => tasksOrder.indexOf(a.id) - tasksOrder.indexOf(b.id));

                group.push({
                    groupId: stack.id,
                    title: stack.title,
                    data: stackTasks,
                    defaultExpanded: !index,
                    blankSlate: !stackTasks.length
                        ? {
                              title: `${stack.title} stack empty`,
                              description: "There are no tasks in this stack",
                              icon: APPICONS.TASK,
                          }
                        : undefined,
                });
                index++;
            }

            return group;
        }

        if (grouping === GROUPING_TYPE.DUEDATE) {
            return tableGroupsFromDateBuckets(
                partitionTasksByCalendarBuckets(tasks, "duedate"),
                DUE_DATE_GROUP_SPEC
            );
        }

        if (grouping === GROUPING_TYPE.STARTDATE) {
            return tableGroupsFromDateBuckets(
                partitionTasksByCalendarBuckets(tasks, "startdate"),
                START_DATE_GROUP_SPEC
            );
        }

        if (grouping === GROUPING_TYPE.PRIORITY) {
            return PRIORITY_GROUP_SPEC.map(spec => {
                const data = tasks.filter(task =>
                    spec.priority === PRIORITY.NONE
                        ? task.priority === PRIORITY.NONE || task.priority == null
                        : task.priority === spec.priority
                );
                return {
                    groupId: spec.groupId,
                    title: spec.title,
                    data,
                    defaultExpanded: spec.defaultExpanded,
                    blankSlate: !data.length
                        ? { description: spec.emptyDescription, icon: spec.icon }
                        : undefined,
                };
            });
        }

        if (grouping === GROUPING_TYPE.PEOPLE) {
            const { people } = PeopleStore.get();
            const group: TablePersistentGroupData<ITask>[] = [];
            for (const person of people) {
                group.push({
                    groupId: person.id,
                    title: `${person.firstName} ${person.lastName}`,
                    data: tasks.filter(task => task.assignees?.includes(person.id)),
                });
            }

            const groupFilled = group.filter(group => group.data.length > 0);

            groupFilled.push({
                groupId: "unassigned",
                title: "Unassigned",
                data: tasks.filter(task => !Boolean(task.assignees?.length)),
            });

            return groupFilled;
        }

        return buildNestedTaskTree(tasks);
    }, [project, tasks, grouping, stacks]);
};

/**
 * Get the subtasks of a task
 * @param parentId The parent task id
 * @param done Whether to filter by done or not
 * @returns The subtasks of the task
 */
export const useSubtasks = (parentId?: string, done?: boolean): { subtasks: ITask[]; isLoading: boolean } => {
    return TasksStore.use(state => {
        const parentLoading = Boolean(parentId && state.loadingChunk.includes(parentId));
        return {
            subtasks: state.tasks
                .filter(task => task.parent === parentId)
                .filter(task => (done !== undefined ? task.done === done : true)),
            // .sort((a, b) => (a.siblingPosition || 0) - (b.siblingPosition || 0)),
            isLoading: parentLoading,
        };
    }, shallowEqual);
};

/**
 * Get the subtasks of a task
 * @param parentId The parent task id
 * @param done Whether to filter by done or not
 * @returns The subtasks of the task
 */
export const getSubtasks = (parentId?: string, done?: boolean): ITask[] => {
    return TasksStore.get()
        .tasks.filter(task => task.parent === parentId)
        .filter(task => (done !== undefined ? task.done === done : true));
    // .sort((a, b) => (a.siblingPosition || 0) - (b.siblingPosition || 0));
};

/**
 * Get the dependants of a task
 * @param parentId The parent task id
 * @param done Whether to filter by done or not
 * @returns The dependants of the task
 */
export const useDependants = (taskId: string, done?: boolean): { tasks: ITask[]; isLoading: boolean } => {
    const defaultReturn = {
        tasks: [],
        isLoading: false,
        task: null,
    };

    const { tasks, isLoading, task } = TasksStore.use(state => {
        if (state.isLoading) {
            return defaultReturn;
        }
        const mainTask = state.tasks.find(task => task.id === taskId);
        const dependencies = mainTask?.dependencies || [];
        const isLoading =
            state.isLoading ||
            state.loadingChunk.includes(taskId) ||
            state.loadingChunk.some(id => dependencies.includes(id));

        return {
            tasks: state.tasks
                .filter(task => dependencies.includes(task.id))
                .filter(task => (done !== undefined ? task.done === done : true)),
            isLoading,
            task: mainTask,
        };
    }, shallowEqual);

    useEffect(() => {
        if (!task && !isLoading && taskId) {
            (async () => {
                await TasksActions.loadSegment([taskId]);
            })();
        }
    }, [task?.id, isLoading, taskId]);

    const depsKey = useMemo(() => (task?.dependencies ?? []).join("|"), [task?.dependencies]);

    useEffect(() => {
        if (!task || isLoading) return;
        const dependenciesToLoad = task.dependencies ?? [];
        if (dependenciesToLoad.length > 0) {
            (async () => {
                await TasksActions.loadSegment(dependenciesToLoad);
            })();
        }
    }, [depsKey, isLoading]);

    return {
        isLoading,
        tasks,
    };
};

/**
 * Get the number of dependants of a task
 * @param taskId The task id
 * @param done Whether to filter by done or not
 * @returns The number of dependants of the task
 */
export const useDependantsCount = (taskId: string, done?: boolean): number => {
    const { tasks, isLoading } = useDependants(taskId, done);
    return isLoading ? 0 : tasks.length;
};

export const useStackTasks = (stackId?: string): ITask[] => {
    return TasksStore.use(
        state => state.tasks.filter(task => task.stack === stackId && !task.archived),
        // .sort((a, b) => (a.position || 0) - (b.position || 0)),
        shallowEqual
    );
};

export const useTasksByPeriod = (dateFrom: Date, dateTo: Date) => {
    return TasksStore.use(state => {
        return {
            tasks: state.tasks.filter(task => taskInDateRange(task, dateFrom, dateTo)),
            isLoading: state.isLoading,
        };
    }, shallowEqual);
};

export const useArchivedTasks = (projectId?: string): { tasks: ITask[]; isLoading: boolean } => {
    return TasksStore.use(state => {
        return {
            tasks: state.tasks.filter(task => task.archived && task.project === projectId),
            isLoading: state.isLoadingArchived,
        };
    }, shallowEqual);
};
