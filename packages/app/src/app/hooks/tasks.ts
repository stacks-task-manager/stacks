// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Tasks hooks and selectors.
 */
import {
    addWeeks,
    endOfDay,
    isBefore,
    isSameWeek,
    isToday,
    isTomorrow,
    isValid,
    isWithinInterval,
    startOfDay,
} from "date-fns";
import intersection from "lodash/intersection";
import { useEffect, useMemo } from "react";
import { matchPath, useParams } from "react-router-dom";

import { APPICONS, GROUPING_TYPE, ICONS, IStack, ITask, PRIORITY, PRIORITYICON } from "@stacks/types";
import { TablePersistentData, TablePersistentGroupData } from "app/components/common";
import { TasksActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { IFilters } from "app/store/projectFilters";
import { TasksStore, orderTasksWithFallback } from "app/store/tasks";
import { getNamedDateFilterRange, isAfterToday, isOverdue, toCalendarDateKey } from "app/utils/date";
import { sortByIdOrder } from "app/utils/taskOrder";
import { TableStore } from "app/views/Project/Table/store";
import { useCurrentProjectValue } from "./project";
import { useProjectFilters } from "./projectFilters";
import { getHashPathname } from "./router";
import { useStack, useStacks } from "./stacks";
import { shallowEqual, strictEqual } from "./store";
import { useLoadWhen } from "./useLoadWhen";

const EMPTY_TASKS: ITask[] = [];
const EMPTY_IDS: string[] = [];
const EMPTY_SUBTASKS = { subtasks: EMPTY_TASKS, isLoading: false };

/**
 * Non-archived task whose start/duedate falls in `[dateFrom, dateTo]` (inclusive days).
 * When `loose` is true, returns true if the task's date range overlaps with the query range at all.
 */
export function taskInDateRange(task: ITask, dateFrom: Date, dateTo: Date, loose = false): boolean {
    if (task.archived) return false;
    if (!task.startdate && !task.duedate) return false;

    if (loose && task.startdate && task.duedate) {
        // Task overlaps if it starts before the range ends and ends after the range begins
        return task.startdate <= endOfDay(dateTo) && task.duedate >= startOfDay(dateFrom);
    }

    const taskDate = task.startdate || task.duedate!;
    return isWithinInterval(taskDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
}

/**
 * Returns true when the given date does not match the specified date filter (an inverted predicate used for client-side filtering).
 * @param filterDate Date filter key ("today", "yesterday", "tomorrow", "thisWeek", "lastWeek", "nextWeek", "thisMonth", "lastMonth", "nextMonth", or a "start|end" date range)
 * @param date The task's date to test, or null/undefined
 * @param loose When true, accepts a date that falls within the range boundaries
 * @returns True when the date falls outside the filtered range
 */
function filterByDate(filterDate: string, date?: Date | null, loose = false) {
    if (!date) return true;

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const namedRange = getNamedDateFilterRange(filterDate, new Date(), timeZone);
    if (namedRange) {
        const key = toCalendarDateKey(new Date(date), timeZone);
        return key < namedRange[0] || key > namedRange[1];
    }

    const dates = filterDate.split("|");
    const start = new Date(dates[0]);
    const finish = new Date(dates[1]);

    if (!isValid(start) || !isValid(finish)) return true;

    if (loose) {
        // Task overlaps if its date is within or touches the range boundaries
        return !(new Date(date) >= start && new Date(date) <= finish);
    }
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
        preds.push(t => t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q));
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
            t => Boolean(t.assignees?.length) && filters.assignees!.some(a => t.assignees!.includes(a))
        );
    }

    if (filters.startDate) {
        const sd = filters.startDate;
        preds.push(t => !filterByDate(sd, t.startdate, Boolean(t.startdate && t.duedate)));
    }
    if (filters.doDate) {
        const dd = filters.doDate;
        preds.push(t => !filterByDate(dd, t.dodate, Boolean(t.dodate && t.startdate)));
    }
    if (filters.dueDate) {
        const dd = filters.dueDate;
        preds.push(t => !filterByDate(dd, t.duedate, Boolean(t.duedate && t.startdate)));
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

/**
 * Returns whether a single task passes every active filter.
 * @param task The task to test
 * @param filters The filters to apply
 * @param currentUserId The id of the current user, used by the "me"/"skipMe" filters; defaults to the current user
 * @returns True when the task passes every active filter
 */
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
export const useFilteredProjectTasks = ({ includeSubtasks = false }: { includeSubtasks?: boolean } = {}) => {
    const { filters } = useProjectFilters();
    const tasks = TasksStore.use(state => state.tasks, shallowEqual);
    const currentUserId = PeopleStore.use(state => state.me, shallowEqual);

    return useMemo(() => {
        const preds = buildTaskPredicates(
            includeSubtasks ? { ...filters, showSubtasks: true } : filters,
            currentUserId
        );
        return tasks.filter(task => preds.every(p => p(task)) && !task.archived);
    }, [tasks, filters, currentUserId, includeSubtasks]);
};

/**
 * Returns the non-archived tasks of the current route's project whose ids are in the given list.
 * @param taskIds The task ids to include
 * @returns The matching non-archived tasks
 */
export const useProjectTasksByIds = (taskIds: string[]) => {
    const { id } = useParams();
    return TasksStore.use(state => {
        const tasks = taskIds.flatMap(taskId => {
            const task = state.tasksById.get(taskId);
            return task && task.project === id && !task.archived ? [task] : [];
        });
        return tasks.length ? tasks : EMPTY_TASKS;
    }, shallowEqual);
};

/**
 * Returns an array of filtered task ids for the current project based on the provided task ids from a stack
 * @param taskIds
 * @returns
 */
export const useFilteredProjectTasksIds = (taskIds: string[]) => {
    const { filters } = useProjectFilters();
    const tasks = TasksStore.use(state => {
        const tasks = taskIds.flatMap(taskId => {
            const task = state.tasksById.get(taskId);
            return task && !task.archived ? [task] : [];
        });
        return tasks.length ? tasks : EMPTY_TASKS;
    }, shallowEqual);
    const currentUserId = PeopleStore.use(state => state.me, shallowEqual);

    return useMemo(() => {
        const preds = buildTaskPredicates(filters, currentUserId);
        return tasks.filter(task => preds.every(p => p(task))).map(task => task.id);
    }, [tasks, filters, currentUserId]);
};

/**
 * Returns the given task ids sorted according to a stack's stored task order.
 * @param tasks The task ids to sort
 * @param stackId The id of the stack whose order to use
 * @returns The task ids sorted by the stack's task order
 */
export const useSortTaskIds = (tasks: string[], stackId: string) => {
    const stack = useStack(stackId);
    return useMemo(() => {
        const tasksOrder = stack?.tasksOrder || [];
        return sortByIdOrder(tasks, tasksOrder, taskId => taskId);
    }, [tasks, stack?.tasksOrder]);
};

/**
 * Returns the given tasks sorted according to a stack's stored task order.
 * @param tasks The tasks to sort
 * @param stackId The id of the stack whose order to use
 * @returns The tasks sorted by the stack's task order
 */
export const useSortTask = (tasks: ITask[], stackId: string) => {
    const stack = useStack(stackId);
    return useMemo(() => {
        const tasksOrder = stack?.tasksOrder || [];
        return sortByIdOrder(tasks, tasksOrder, task => task.id);
    }, [tasks, stack?.tasksOrder]);
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

    const { isLoading, task } = TasksStore.use(
        state => ({
            isLoading: state.isLoading || (Boolean(resolvedId) && state.loadingChunk.includes(resolvedId)),
            task: resolvedId ? state.tasksById.get(resolvedId) : undefined,
        }),
        shallowEqual
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
            tasks: (() => {
                const tasks = taskIds.flatMap(taskId => {
                    const task = state.tasksById.get(taskId);
                    return task ? [task] : [];
                });
                return tasks.length ? tasks : EMPTY_TASKS;
            })(),
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

/**
 * Returns a single task from the store without subscribing to updates.
 * @param taskId The task id
 * @returns The matching task, or undefined
 */
export const getTask = (taskId: string) => {
    return TasksStore.get().tasksById.get(taskId);
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

/**
 * Returns the task id of the current route (a task, a project's task, or a my-tasks entry) parsed from the URL.
 * @returns The task id from the hash pathname, or an empty string
 */
export const getCurrentTaskId = () => {
    const path = getHashPathname();
    const match1 = matchPath("/task/:id", path);
    const match2 = matchPath("/project/:id/:tid", path);
    const match3 = matchPath("/mytasks/:id", path);
    const match4 = matchPath("/workbooks/:id/:tid", path);

    return match1?.params.id ?? match2?.params.tid ?? match3?.params.id ?? match4?.params.tid ?? "";
};

/**
 * Returns a project's tasks
 * @param projectId
 * @returns
 */
export const useProjectTasks = (projectId: string): ITask[] => {
    return TasksStore.use(state => {
        const tasks = (state.taskIdsByProject.get(projectId) ?? EMPTY_IDS).flatMap(taskId => {
            const task = state.tasksById.get(taskId);
            return task && !task.archived ? [task] : [];
        });
        return tasks.length ? tasks : EMPTY_TASKS;
    }, shallowEqual);
};

/**
 * Returns the non-archived tasks of a project from the store without subscribing to updates.
 * @param projectId The project id
 * @returns The project's non-archived tasks
 */
export const getProjectTasks = (projectId: string): ITask[] => {
    const { taskIdsByProject, tasksById } = TasksStore.get();
    return (taskIdsByProject.get(projectId) ?? []).flatMap(taskId => {
        const task = tasksById.get(taskId);
        return task && !task.archived ? [task] : [];
    });
};

/**
 * Returns the non-archived tasks of a stack from the store without subscribing to updates.
 * @param stackId The stack id
 * @returns The stack's non-archived tasks
 */
export const getStackTasks = (stackId: string): ITask[] => {
    const { taskIdsByStack, tasksById } = TasksStore.get();
    return (taskIdsByStack.get(stackId) ?? []).flatMap(taskId => {
        const task = tasksById.get(taskId);
        return task && !task.archived ? [task] : [];
    });
};

/**
 * Returns the ids of a stack's tasks from the store without subscribing to updates.
 * @param stackId The stack id
 * @returns The stack's task ids
 */
export const getStackTasksIds = (stackId: string): string[] => {
    return [...(TasksStore.get().taskIdsByStack.get(stackId) ?? [])];
};
/**
 * Returns a project's tasks ids
 * @param projectId
 * @returns
 */
export const useProjectTasksIds = (projectId: string) => {
    return TasksStore.use(state => state.taskIdsByProject.get(projectId) ?? EMPTY_IDS, shallowEqual);
};

/**
 * Returns the ids of a project's non-archived tasks from the store without subscribing to updates.
 * @param projectId The project id
 * @returns The project's task ids
 */
export const getProjectTasksIds = (projectId: string) => {
    return getProjectTasks(projectId).map(task => task.id);
};

/**
 * Builds a nested task tree, attaching each task's children beneath its parent.
 * @param allTasks The flat list of tasks to build the tree from
 * @returns The root tasks with their nested children
 */
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

/**
 * Partitions tasks into calendar buckets (overdue, today, tomorrow, this week, next week, upcoming, missing) by the given date field.
 * @param tasks The tasks to partition
 * @param field The date field to bucket by ("duedate" or "startdate")
 * @returns An object mapping each bucket name to its matching undone tasks
 */
function partitionTasksByCalendarBuckets(tasks: ITask[], field: TaskDateField) {
    const buckets = {
        overdue: [] as ITask[],
        today: [] as ITask[],
        tomorrow: [] as ITask[],
        thisWeek: [] as ITask[],
        nextWeek: [] as ITask[],
        upcoming: [] as ITask[],
        missing: [] as ITask[],
    };
    const now = new Date();
    const nextWeek = addWeeks(now, 1);

    for (const task of tasks) {
        if (task.done) continue;

        const date = field === "duedate" ? task.duedate : task.startdate;
        if (!date) {
            buckets.missing.push(task);
            continue;
        }

        if (isOverdue(date)) buckets.overdue.push(task);
        if (isToday(date)) buckets.today.push(task);
        if (isTomorrow(date)) buckets.tomorrow.push(task);
        if (isSameWeek(date, now)) buckets.thisWeek.push(task);
        if (isSameWeek(date, nextWeek)) buckets.nextWeek.push(task);
        if (isAfterToday(date)) buckets.upcoming.push(task);
    }

    return buckets;
}

/**
 * Converts date buckets into table group data using the given group spec.
 * @param buckets The date buckets produced by partitionTasksByCalendarBuckets
 * @param spec The group definitions (id, title, bucket key, empty description, and default expanded state)
 * @returns The table groups with their data and blank-slate states
 */
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
        {
            groupId: "due-today",
            title: "Due today",
            key: "today" as const,
            emptyDescription: "There are no tasks due today",
        },
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
        {
            groupId: "upcoming",
            title: "Upcoming",
            key: "upcoming" as const,
            emptyDescription: "There are no upcoming due tasks",
        },
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
        {
            groupId: "upcoming",
            title: "Upcoming",
            key: "upcoming" as const,
            emptyDescription: "There are no tasks that start soon",
        },
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
    {
        groupId: "critical",
        title: "Critical",
        priority: PRIORITY.CRITICAL,
        emptyDescription: "There are no critical priority tasks",
        icon: PRIORITYICON.CRITICAL,
        defaultExpanded: true,
    },
    {
        groupId: "high",
        title: "High",
        priority: PRIORITY.HIGH,
        emptyDescription: "There are no high priority tasks",
        icon: PRIORITYICON.HIGH,
        defaultExpanded: true,
    },
    {
        groupId: "medium",
        title: "Medium",
        priority: PRIORITY.MEDIUM,
        emptyDescription: "There are no medium priority tasks",
        icon: PRIORITYICON.MEDIUM,
    },
    {
        groupId: "low",
        title: "Low",
        priority: PRIORITY.LOW,
        emptyDescription: "There are no low priority tasks",
        icon: PRIORITYICON.LOW,
    },
    {
        groupId: "none",
        title: "None",
        priority: PRIORITY.NONE,
        emptyDescription: "There are no unprioritized tasks",
        icon: ICONS.FLAG,
    },
];

/**
 * Returns the grouped tasks for the Projects Table View
 * @returns
 */
export const useGrouppedProjectTasks = () => {
    const projectId = useCurrentProjectValue(project => project.id, strictEqual);
    const grouping = TableStore.use(state => state.grouping, shallowEqual);
    const tasksPlain = useFilteredProjectTasks();
    const stacks = useStacks();
    const people = PeopleStore.use(state => state.people, shallowEqual);

    return useMemo(() => {
        if (!projectId) return [];

        const tasks = grouping === GROUPING_TYPE.UNGROUPED ? buildNestedTaskTree(tasksPlain) : tasksPlain;

        if (grouping === GROUPING_TYPE.STACK) {
            const tasksById = new Map(tasks.map(task => [task.id, task]));

            return stacks.map((stack, index) => {
                const stackTasks = stack.tasksOrder.flatMap(taskId => {
                    const task = tasksById.get(taskId);
                    return task ? [task] : [];
                });

                return {
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
                };
            });
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
            const tasksByPriority = new Map(PRIORITY_GROUP_SPEC.map(spec => [spec.priority, [] as ITask[]]));

            for (const task of tasks) {
                const priority = task.priority ?? PRIORITY.NONE;
                (tasksByPriority.get(priority) ?? tasksByPriority.get(PRIORITY.NONE)!).push(task);
            }

            return PRIORITY_GROUP_SPEC.map(spec => {
                const data = tasksByPriority.get(spec.priority) ?? [];
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
            const tasksByPerson = new Map(people.map(person => [person.id, [] as ITask[]]));
            const unassigned: ITask[] = [];

            for (const task of tasks) {
                if (!task.assignees?.length) {
                    unassigned.push(task);
                    continue;
                }

                for (const personId of task.assignees) {
                    const personTasks = tasksByPerson.get(personId);
                    if (personTasks) personTasks.push(task);
                }
            }

            return [
                ...people.flatMap(person => {
                    const personTasks = tasksByPerson.get(person.id) ?? [];
                    return personTasks.length
                        ? [
                              {
                                  groupId: person.id,
                                  title: `${person.firstName} ${person.lastName}`,
                                  data: personTasks,
                              },
                          ]
                        : [];
                }),
                {
                    groupId: "unassigned",
                    title: "Unassigned",
                    data: unassigned,
                },
            ];
        }

        return tasks;
    }, [projectId, tasksPlain, grouping, stacks, people]);
};

/**
 * Get the subtasks of a task
 * @param parentId The parent task id
 * @param done Whether to filter by done or not
 * @returns The subtasks of the task
 */
export const useSubtasks = (
    parentId?: string,
    done?: boolean,
    enabled = true
): { subtasks: ITask[]; isLoading: boolean } => {
    const selector = useMemo(
        () => (state: ReturnType<typeof TasksStore.get>) => {
            if (!enabled || parentId == null) return EMPTY_SUBTASKS;

            const parent = state.tasksById.get(parentId);
            const indexedSubtaskIds = state.subtaskIdsByParent.get(parentId) ?? [];
            const subtaskIds = orderTasksWithFallback(
                state.tasksById,
                parent?.subtasksOrder ?? [],
                indexedSubtaskIds
            )
                .filter(subtask => done === undefined || subtask.done === done)
                .map(subtask => subtask.id);
            const subtasks = subtaskIds.flatMap(subtaskId => {
                const subtask = state.tasksById.get(subtaskId);
                return subtask ? [subtask] : [];
            });
            const loadingIds = new Set(state.loadingChunk);

            return {
                subtasks: subtasks.length ? subtasks : EMPTY_TASKS,
                isLoading:
                    loadingIds.has(parentId) || subtaskIds.some(subtaskId => loadingIds.has(subtaskId)),
            };
        },
        [done, enabled, parentId]
    );

    return TasksStore.use(selector, shallowEqual);
};

/**
 * Get the subtasks of a task
 * @param parentId The parent task id
 * @param done Whether to filter by done or not
 * @returns The subtasks of the task
 */
export const getSubtasks = (parentId?: string, done?: boolean): ITask[] => {
    if (parentId == null) return [];
    const { subtaskIdsByParent, tasksById } = TasksStore.get();
    return orderTasksWithFallback(
        tasksById,
        tasksById.get(parentId)?.subtasksOrder ?? [],
        subtaskIdsByParent.get(parentId) ?? []
    ).filter(subtask => done === undefined || subtask.done === done);
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
        const mainTask = state.tasksById.get(taskId);
        const dependencies = mainTask?.dependencies || [];
        const loadingIds = new Set(state.loadingChunk);
        const isLoading =
            state.isLoading || loadingIds.has(taskId) || dependencies.some(id => loadingIds.has(id));

        return {
            tasks: dependencies.flatMap(dependencyId => {
                const task = state.tasksById.get(dependencyId);
                return task && (done === undefined || task.done === done) ? [task] : [];
            }),
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
    }, [task?.id, isLoading, task, taskId]);

    const depsKey = useMemo(() => (task?.dependencies ?? []).join("|"), [task?.dependencies]);

    useEffect(() => {
        if (!task || isLoading) return;
        const dependenciesToLoad = task.dependencies ?? [];
        if (dependenciesToLoad.length > 0) {
            (async () => {
                await TasksActions.loadSegment(dependenciesToLoad);
            })();
        }
    }, [depsKey, isLoading, task]);

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

/**
 * Returns the non-archived tasks belonging to a stack.
 * @param stackId The stack id
 * @returns The stack's non-archived tasks
 */
export const useStackTasksFromStack = (stack?: IStack): ITask[] => {
    const { tasksById, taskIdsByStack } = TasksStore.use(
        state => ({ tasksById: state.tasksById, taskIdsByStack: state.taskIdsByStack }),
        shallowEqual
    );

    return useMemo(
        () =>
            orderTasksWithFallback(
                tasksById,
                stack?.tasksOrder ?? [],
                stack ? (taskIdsByStack.get(stack.id) ?? []) : []
            ).filter(task => task.stack === stack?.id && !task.archived),
        [stack, taskIdsByStack, tasksById]
    );
};

export const useStackTasks = (stackId?: string): ITask[] => {
    const stack = useStack(stackId);
    return useStackTasksFromStack(stack);
};

/**
 * Returns the tasks whose start or due date falls within the given period.
 * @param from The start of the period (inclusive)
 * @param to The end of the period (inclusive)
 * @param loose When true, includes tasks whose date range overlaps the period at all
 * @returns The matching tasks and the store's loading state
 */
export const useTasksByPeriod = (from: Date, to: Date, loose = false) => {
    return TasksStore.use(state => {
        return {
            tasks: state.tasks.filter(task => taskInDateRange(task, from, to, loose)),
            isLoading: state.isLoading,
        };
    }, shallowEqual);
};

/**
 * Returns the archived tasks of a project.
 * @param projectId The project id to filter by
 * @returns The project's archived tasks and the loading state
 */
export const useArchivedTasks = (projectId?: string): { tasks: ITask[]; isLoading: boolean } => {
    return TasksStore.use(state => {
        const taskIds = projectId ? (state.taskIdsByProject.get(projectId) ?? []) : [];
        const tasks = taskIds.flatMap(taskId => {
            const task = state.tasksById.get(taskId);
            return task?.archived ? [task] : [];
        });
        return {
            tasks: tasks.length ? tasks : EMPTY_TASKS,
            isLoading: state.isLoadingArchived,
        };
    }, shallowEqual);
};
