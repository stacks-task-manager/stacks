// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: tasks listing, filters, and mutations.
 */
import { translate } from "@stacks/translations";
import { PRIORITY, type ITask } from "@stacks/types";
import { z } from "zod";
import { Errors } from "../../errors";
import { ProjectsLoader, StacksLoader, TasksLoader } from "../../loaders";
import type { GetAllFilters } from "../../loaders/tasks";
import { aiDateInput } from "./dateInput";
import { defineTool } from "./defineTool";

function pickDefaultStackId(projectId: string, stacksOrder: string[], stacks: { id: string }[]): string {
    for (const id of stacksOrder) {
        if (stacks.some(s => s.id === id)) {
            return id;
        }
    }
    return stacks[0]?.id ?? "";
}

const uuidOrArray = z.union([z.string().uuid(), z.array(z.string().uuid()).min(1)]);
const ONE_HOUR_MS = 60 * 60 * 1000;

function isValidDate(value: Date | null | undefined): value is Date {
    return value instanceof Date && !Number.isNaN(value.getTime());
}

function shiftDateHours(date: Date, direction: -1 | 1): Date {
    return new Date(date.getTime() + direction * ONE_HOUR_MS);
}

/**
 * Normalise an `aiDateInput`-validated value into the full UTC ISO date-time (`…Z`) that the tasks
 * route schema and the loader's whole-UTC-day windows expect, so a model cannot send a bare `YYYY-MM-DD`
 * (which the route rejects) or a `+HH:MM` offset (which the loader would read in its own day).
 * @param value ISO date or timezone-qualified date-time already accepted by `aiDateInput`
 * @returns ISO date-time with an explicit `Z` timezone
 */
function utcWindowDate(value: string): string {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : new Date(value).toISOString();
}

/**
 * Filter shape shared by the tasks listing tools: the accepted keys of the
 * `findTasks` / `listTasks` input schema, as seen by the helpers below.
 */
type ListTasksFilterInput = {
    project?: string | string[];
    projectId?: string;
    taskIds?: string | string[];
    stackId?: string;
    parentTaskId?: string;
    searchQuery?: string;
    from?: string;
    to?: string;
    archivedOnly?: boolean;
    overdueOnly?: boolean;
    assigneeUserIds?: string | string[];
    assignedOnly?: boolean;
    unassignedOnly?: boolean;
    doneFilter?: "all" | "open" | "done";
    tagIds?: string | string[];
    statusTagIds?: string | string[];
    priority?: "critical" | "high" | "medium" | "low" | "none";
    progress?: string;
    dueFrom?: string;
    dueTo?: string;
    startFrom?: string;
    startTo?: string;
};

function listTasksHasFilter(d: ListTasksFilterInput): boolean {
    const project = d.project ?? d.projectId;
    if (project !== undefined) {
        return true;
    }
    if (d.taskIds !== undefined) {
        return Array.isArray(d.taskIds) ? d.taskIds.length > 0 : true;
    }
    if (d.stackId) {
        return true;
    }
    if (d.parentTaskId) {
        return true;
    }
    if (d.searchQuery !== undefined && d.searchQuery.trim().length > 0) {
        return true;
    }
    if (d.from || d.to) {
        return true;
    }
    if (d.overdueOnly === true) return true;
    if (d.archivedOnly === true) {
        return true;
    }
    if (d.assigneeUserIds !== undefined) {
        return Array.isArray(d.assigneeUserIds) ? d.assigneeUserIds.length > 0 : true;
    }
    if (d.assignedOnly === true) {
        return true;
    }
    if (d.unassignedOnly === true) {
        return true;
    }
    if (d.doneFilter === "open" || d.doneFilter === "done") {
        return true;
    }
    if (d.tagIds !== undefined) {
        return Array.isArray(d.tagIds) ? d.tagIds.length > 0 : true;
    }
    if (d.statusTagIds !== undefined) {
        return Array.isArray(d.statusTagIds) ? d.statusTagIds.length > 0 : true;
    }
    if (d.priority !== undefined) {
        return true;
    }
    if (d.progress !== undefined) {
        return true;
    }
    if (d.dueFrom || d.dueTo || d.startFrom || d.startTo) {
        return true;
    }
    return false;
}

function buildListTasksFilters(input: ListTasksFilterInput): GetAllFilters {
    const f: GetAllFilters = {};
    const project = input.project ?? input.projectId;
    if (project !== undefined) {
        f.project = Array.isArray(project) ? project : project;
    }
    if (input.taskIds !== undefined) {
        f.ids = Array.isArray(input.taskIds) ? input.taskIds : input.taskIds;
    }
    if (input.stackId) {
        f.stack = input.stackId;
    }
    if (input.parentTaskId) {
        f.parent = input.parentTaskId;
    }
    const q = input.searchQuery?.trim();
    if (q) {
        f.query = q;
    }
    if (input.from) {
        f.from = input.from;
    }
    if (input.to) {
        f.to = input.to;
    }
    if (input.overdueOnly === true) f.overdue = "true";
    if (input.archivedOnly === true) {
        f.archived = "true";
    }
    if (input.assigneeUserIds !== undefined) {
        f.assignees = Array.isArray(input.assigneeUserIds) ? input.assigneeUserIds : input.assigneeUserIds;
    }
    if (input.assignedOnly === true) {
        f.assigned = "true";
    }
    if (input.unassignedOnly === true) {
        f.unassigned = "true";
    }
    if (input.doneFilter === "open") {
        f.open = "true";
    } else if (input.doneFilter === "done") {
        f.completed = "true";
    }
    if (input.tagIds !== undefined) {
        f.tags = input.tagIds;
    }
    if (input.statusTagIds !== undefined) {
        f.status = input.statusTagIds;
    }
    if (input.priority !== undefined) {
        f.priority = input.priority;
    }
    if (input.progress !== undefined) {
        f.progress = input.progress;
    }
    if (input.dueFrom) {
        f.dueFrom = utcWindowDate(input.dueFrom);
    }
    if (input.dueTo) {
        f.dueTo = utcWindowDate(input.dueTo);
    }
    if (input.startFrom) {
        f.startFrom = utcWindowDate(input.startFrom);
    }
    if (input.startTo) {
        f.startTo = utcWindowDate(input.startTo);
    }
    return f;
}

/** Maps findTasks / listTasks tool input to `/tasks` route query string (same keys as the app `Tasks` view). */
export function findTasksInputToQueryString(input: ListTasksFilterInput): string {
    const params = new URLSearchParams();

    const project = input.project ?? input.projectId;
    if (project !== undefined) {
        params.set("project", Array.isArray(project) ? project.join(",") : project);
    }
    if (input.taskIds !== undefined) {
        params.set("ids", Array.isArray(input.taskIds) ? input.taskIds.join(",") : input.taskIds);
    }
    if (input.stackId) {
        params.set("stack", input.stackId);
    }
    if (input.parentTaskId) {
        params.set("parent", input.parentTaskId);
    }
    const q = input.searchQuery?.trim();
    if (q) {
        params.set("query", q);
    }
    if (input.from) {
        params.set("from", input.from);
    }
    if (input.to) {
        params.set("to", input.to);
    }
    if (input.overdueOnly === true) params.set("overdue", "true");
    if (input.archivedOnly === true) {
        params.set("archived", "true");
    }
    if (input.assigneeUserIds !== undefined) {
        params.set(
            "assignees",
            Array.isArray(input.assigneeUserIds) ? input.assigneeUserIds.join(",") : input.assigneeUserIds
        );
    }
    if (input.assignedOnly === true) {
        params.set("assigned", "true");
    }
    if (input.unassignedOnly === true) {
        params.set("unassigned", "true");
    }
    if (input.doneFilter === "open") {
        params.set("open", "true");
    } else if (input.doneFilter === "done") {
        params.set("completed", "true");
    }
    if (input.tagIds !== undefined) {
        params.set("tags", Array.isArray(input.tagIds) ? input.tagIds.join(",") : input.tagIds);
    }
    if (input.statusTagIds !== undefined) {
        params.set(
            "status",
            Array.isArray(input.statusTagIds) ? input.statusTagIds.join(",") : input.statusTagIds
        );
    }
    if (input.priority !== undefined) {
        params.set("priority", input.priority);
    }
    if (input.progress !== undefined) {
        params.set("progress", input.progress);
    }
    if (input.dueFrom) {
        params.set("dueFrom", utcWindowDate(input.dueFrom));
    }
    if (input.dueTo) {
        params.set("dueTo", utcWindowDate(input.dueTo));
    }
    if (input.startFrom) {
        params.set("startFrom", utcWindowDate(input.startFrom));
    }
    if (input.startTo) {
        params.set("startTo", utcWindowDate(input.startTo));
    }

    return params.toString();
}

/** Task-related AI tools (`TasksLoader`, plus `ProjectsLoader` / `StacksLoader` for create). */
export const taskAiTools = [
    defineTool({
        name: "findTasks",
        description: `Default for task-list requests: "show me", "list tasks", "which tasks", filtering and task searches. Open the filtered Tasks view directly without asking whether to navigate or printing rows. Returns hashPath (/tasks?...). Use listProjects first if you need a projectId. Use listTasks to enumerate rows only when the user explicitly requests them here/in chat/as text or says not to navigate. "assigned to me / <person>" → assigneeUserIds (NOT assignedOnly).`,
        inputSchema: z
            .object({
                projectId: z
                    .string()
                    .uuid()
                    .optional()
                    .describe("Single project UUID; prefer projectId over the project alias"),
                project: uuidOrArray.optional().describe("Project UUID or list of them"),
                taskIds: uuidOrArray.optional().describe("Specific task UUID(s)"),
                stackId: z.string().uuid().optional().describe("Tasks in this stack UUID"),
                parentTaskId: z.string().uuid().optional().describe("Subtasks of this parent task UUID"),
                searchQuery: z.string().optional().describe("Case-insensitive title/description match"),
                from: z.string().optional().describe("ISO date — start of startdate/duedate range"),
                to: z.string().optional().describe("ISO date — end of range (paired with from)"),
                archivedOnly: z.boolean().optional().describe("True = only archived tasks"),
                overdueOnly: z
                    .boolean()
                    .optional()
                    .describe(
                        "True = incomplete tasks with a due date before now. Preserve other requested filters such as assigneeUserIds."
                    ),
                assigneeUserIds: uuidOrArray
                    .optional()
                    .describe(
                        "User UUID(s) assigned to the task. Use this for 'assigned to me / <person>'; pass current user id for 'me'."
                    ),
                assignedOnly: z
                    .boolean()
                    .optional()
                    .describe(
                        "True = tasks with ANY assignee (not 'assigned to me' — use assigneeUserIds for that)."
                    ),
                unassignedOnly: z.boolean().optional().describe("True = tasks with no assignees."),
                doneFilter: z.enum(["all", "open", "done"]).optional(),
                tagIds: uuidOrArray
                    .optional()
                    .describe(
                        "Task tag UUID(s) — resolve tag names with listTags now. Multiple tags match tasks carrying any of them."
                    ),
                statusTagIds: uuidOrArray
                    .optional()
                    .describe(
                        "Status tag UUID(s) (tags of type status) — resolve status names with listTags now. Multiple statuses match any of them."
                    ),
                priority: z.nativeEnum(PRIORITY).optional().describe("Exact priority match"),
                progress: z
                    .string()
                    .regex(/^(gt|gte|lt|lte|eq):(0|[1-9]|[1-9][0-9]|100)$/)
                    .optional()
                    .describe(
                        'Progress percentage operator: "gt:60" above 60%, "gte:60" at least, "lt:20" below, "lte:20" at most, "eq:0" at zero.'
                    ),
                dueFrom: aiDateInput
                    .optional()
                    .describe(
                        'ISO date or date-time — first day of the due-date window (whole UTC day). Resolve "due today / this week / next week / next month" into dueFrom and dueTo now; keep overdueOnly for plain "overdue".'
                    ),
                dueTo: aiDateInput
                    .optional()
                    .describe(
                        "ISO date or date-time — last day of the due-date window (whole UTC day, paired with dueFrom)"
                    ),
                startFrom: aiDateInput
                    .optional()
                    .describe(
                        'ISO date or date-time — first day of the start-date window (whole UTC day). Resolve "starts today / this week / next week" into startFrom and startTo now'
                    ),
                startTo: aiDateInput
                    .optional()
                    .describe(
                        "ISO date or date-time — last day of the start-date window (whole UTC day, paired with startFrom)"
                    ),
            })
            .refine(d => listTasksHasFilter(d), {
                message:
                    "Provide at least one filter (e.g. projectId, project, taskIds, searchQuery, stackId, date range, assignees, archivedOnly, or doneFilter open/done).",
            })
            .refine(d => !(d.assignedOnly && d.unassignedOnly), {
                message: "Cannot combine assignedOnly and unassignedOnly.",
                path: ["unassignedOnly"],
            })
            .refine(d => !(d.unassignedOnly && d.assigneeUserIds !== undefined), {
                message: "Cannot combine unassignedOnly with assigneeUserIds.",
                path: ["assigneeUserIds"],
            }),
        execute: async input => {
            const queryString = findTasksInputToQueryString(input);
            return {
                queryString,
                hashPath: queryString.length > 0 ? `/tasks?${queryString}` : "/tasks",
            };
        },
    }),

    defineTool({
        name: "listTasks",
        description: `Return task rows for explicit in-chat/as-text listings, or internal counts, analysis, summaries, and name-to-id resolution. Ordinary task-list requests ("show me", "list tasks", "which tasks", task searches) default to findTasks. Do not enumerate rows in chat unless explicitly requested, and do not use an internal lookup as a substitute for opening the requested task view. "assigned to me / <person>" → assigneeUserIds (NOT assignedOnly).`,
        inputSchema: z
            .object({
                projectId: z
                    .string()
                    .uuid()
                    .optional()
                    .describe("Single project UUID; prefer projectId over the project alias"),
                project: uuidOrArray.optional().describe("Project UUID or list of them"),
                taskIds: uuidOrArray.optional().describe("Specific task UUID(s)"),
                stackId: z.string().uuid().optional().describe("Tasks in this stack UUID"),
                parentTaskId: z.string().uuid().optional().describe("Subtasks of this parent task UUID"),
                searchQuery: z.string().optional().describe("Case-insensitive title/description match"),
                from: z.string().optional().describe("ISO date — start of startdate/duedate range"),
                to: z.string().optional().describe("ISO date — end of range (paired with from)"),
                archivedOnly: z.boolean().optional().describe("True = only archived tasks"),
                overdueOnly: z
                    .boolean()
                    .optional()
                    .describe(
                        "True = incomplete tasks with a due date before now. Preserve other requested filters such as assigneeUserIds."
                    ),
                assigneeUserIds: uuidOrArray
                    .optional()
                    .describe(
                        "User UUID(s) assigned to the task. Use this for 'assigned to me / <person>'; pass current user id for 'me'."
                    ),
                assignedOnly: z
                    .boolean()
                    .optional()
                    .describe(
                        "True = tasks with ANY assignee (not 'assigned to me' — use assigneeUserIds for that)."
                    ),
                unassignedOnly: z.boolean().optional().describe("True = tasks with no assignees."),
                doneFilter: z
                    .enum(["all", "open", "done"])
                    .optional()
                    .describe("open = not completed, done = completed only, all = omit filter"),
                tagIds: uuidOrArray
                    .optional()
                    .describe(
                        "Task tag UUID(s) — resolve tag names with listTags now. Multiple tags match tasks carrying any of them."
                    ),
                statusTagIds: uuidOrArray
                    .optional()
                    .describe(
                        "Status tag UUID(s) (tags of type status) — resolve status names with listTags now. Multiple statuses match any of them."
                    ),
                priority: z.nativeEnum(PRIORITY).optional().describe("Exact priority match"),
                progress: z
                    .string()
                    .regex(/^(gt|gte|lt|lte|eq):(0|[1-9]|[1-9][0-9]|100)$/)
                    .optional()
                    .describe(
                        'Progress percentage operator: "gt:60" above 60%, "gte:60" at least, "lt:20" below, "lte:20" at most, "eq:0" at zero.'
                    ),
                dueFrom: aiDateInput
                    .optional()
                    .describe(
                        'ISO date or date-time — first day of the due-date window (whole UTC day). Resolve "due today / this week / next week / next month" into dueFrom and dueTo now; keep overdueOnly for plain "overdue".'
                    ),
                dueTo: aiDateInput
                    .optional()
                    .describe(
                        "ISO date or date-time — last day of the due-date window (whole UTC day, paired with dueFrom)"
                    ),
                startFrom: aiDateInput
                    .optional()
                    .describe(
                        'ISO date or date-time — first day of the start-date window (whole UTC day). Resolve "starts today / this week / next week" into startFrom and startTo now'
                    ),
                startTo: aiDateInput
                    .optional()
                    .describe(
                        "ISO date or date-time — last day of the start-date window (whole UTC day, paired with startFrom)"
                    ),
            })
            .refine(d => listTasksHasFilter(d), {
                message:
                    "Provide at least one filter (e.g. projectId, project, taskIds, searchQuery, stackId, date range, assignees, archivedOnly, or doneFilter open/done).",
            })
            .refine(d => !(d.assignedOnly && d.unassignedOnly), {
                message: "Cannot combine assignedOnly and unassignedOnly.",
                path: ["unassignedOnly"],
            })
            .refine(d => !(d.unassignedOnly && d.assigneeUserIds !== undefined), {
                message: "Cannot combine unassignedOnly with assigneeUserIds.",
                path: ["assigneeUserIds"],
            }),
        execute: async input => {
            const tasks = await TasksLoader.getAll(buildListTasksFilters(input));
            return tasks.map((t: ITask) => ({
                id: t.id,
                title: t.title,
                done: t.done,
                duedate: t.duedate ? new Date(t.duedate).toISOString() : null,
                assignees: t.assignees ?? [],
                project: t.project,
            }));
        },
    }),

    defineTool({
        name: "getTask",
        description: `Read full details of one existing task by resolved taskId. Returns id, title, description, done, duedate, assignees, project, and stack references. This read does not navigate. Resolve a title through available authorized host lookups before calling.`,
        inputSchema: z.object({
            taskId: z
                .string()
                .uuid()
                .describe("Task UUID resolved through authorized context or an available task lookup"),
        }),
        execute: async ({ taskId }) => {
            const t = await TasksLoader.getOne(taskId);
            return {
                id: t.id,
                title: t.title,
                description: t.description ?? "",
                done: t.done,
                duedate: t.duedate ? new Date(t.duedate).toISOString() : null,
                assignees: t.assignees ?? [],
                project: t.project,
                stack: t.stack,
            };
        },
    }),

    defineTool({
        name: "deleteTask",
        description:
            "Permanently delete one task by resolved taskId. Returns its id, title, and deleted flag. This is a destructive action; direct MCP execution deletes immediately without the built-in chat confirmation.",
        inputSchema: z.object({
            taskId: z
                .string()
                .uuid()
                .describe("Task UUID resolved through authorized context or an available task lookup"),
        }),
        execute: async ({ taskId }) => {
            const task = await TasksLoader.removeById(taskId);
            return { id: task.id, title: task.title, deleted: true };
        },
    }),

    defineTool({
        name: "createTask",
        description: `Create a new task in a resolved project, optionally in a specified column. For changes to an existing task, use updateTask when available. Omitted stack uses the project's default column. Include only requested title, description, due date, and assignees; do not infer assignment or a due date. Returns the created task's id, title, projectId, stackId, and done state.`,
        inputSchema: z.object({
            projectId: z
                .string()
                .uuid()
                .describe("Resolved project UUID from authorized context or an available project lookup"),
            stackId: z
                .string()
                .uuid()
                .optional()
                .describe("Resolved column UUID from listStacks; omit to use the default column"),
            title: z
                .string()
                .min(1)
                .describe("Exact new task title only; exclude the project name and surrounding request text"),
            duedate: aiDateInput
                .optional()
                .describe(
                    "Due date as an ISO calendar date or timezone-qualified date-time; date-only values mean midnight UTC"
                ),
            assigneeUserIds: z
                .array(z.string().uuid())
                .optional()
                .describe("Resolved assignee user UUIDs; omit to leave the new task unassigned"),
            description: z.string().optional().describe("Task description"),
        }),
        execute: async ({ projectId, stackId: stackIdArg, title, duedate, assigneeUserIds, description }) => {
            const project = await ProjectsLoader.getOne(projectId);
            const stacks = await StacksLoader.getAll(projectId);
            if (!stacks.length) {
                throw Errors.badRequest(translate("No stacks create task"));
            }
            const resolvedStackId =
                stackIdArg ?? pickDefaultStackId(projectId, project.stacksOrder ?? [], stacks);
            if (!resolvedStackId) {
                throw Errors.badRequest(translate("Could not resolve default stack"));
            }

            const base: Partial<ITask> = {
                title,
                project: projectId,
                stack: resolvedStackId,
            };
            let task = await TasksLoader.create(base);

            const patch: Partial<ITask> = {};
            if (duedate) {
                patch.duedate = new Date(duedate);
            }
            if (assigneeUserIds?.length) {
                patch.assignees = assigneeUserIds;
            }
            if (description !== undefined) {
                patch.description = description;
            }
            if (Object.keys(patch).length) {
                task = await TasksLoader.update(task.id, patch);
            }

            return {
                id: task.id,
                title: task.title,
                projectId: task.project,
                stackId: task.stack,
                done: task.done,
            };
        },
    }),

    defineTool({
        name: "moveTask",
        description: `Move a task to a different stack (board column) on the same project. Use this — not updateTask — whenever the user says move/drag/send a task to a column or to "Done"/"Todo"/etc. Get stackIds via listStacks (or use the UI block if the task's project is the current one). Optional afterTaskId places the task after a specific task id in the destination stack; otherwise it goes to the top.`,
        inputSchema: z.object({
            taskId: z
                .string()
                .uuid()
                .describe(
                    "Task UUID resolved through authorized context or an available task lookup to move"
                ),
            stackId: z.string().uuid().describe("Destination stack (column) UUID"),
            afterTaskId: z
                .string()
                .uuid()
                .optional()
                .describe(
                    "Optional: place the task immediately after this task id in the destination stack. Omit to insert at the top."
                ),
        }),
        execute: async ({ taskId, stackId, afterTaskId }) => {
            const task = await TasksLoader.getOne(taskId);
            const destStack = await StacksLoader.getOne(stackId);
            if (destStack.project !== task.project) {
                throw Errors.badRequest(
                    translate("Destination stack is in a different project than the task")
                );
            }

            await TasksLoader.move(taskId, stackId, afterTaskId);
            const updated = await TasksLoader.getOne(taskId);
            return {
                id: updated.id,
                title: updated.title,
                projectId: updated.project,
                stackId: updated.stack,
                done: updated.done,
            };
        },
    }),

    defineTool({
        name: "updateTask",
        description: `Update a task's fields (title/description/done/dates/assignees/priority/status/estimate/progress/tint). Does NOT move between columns — for that use moveTask. If you only know a title, call listTasks first (returns ids; findTasks does not). Resolve status ids via listTags when the user names a status label.`,
        inputSchema: z
            .object({
                taskId: z
                    .string()
                    .uuid()
                    .describe("Task UUID resolved through authorized context or an available task lookup"),
                title: z.string().optional(),
                description: z.string().optional().describe("Task description; pass empty string to clear"),
                done: z.boolean().optional().describe("True = mark the task complete"),
                todo: z.boolean().optional().describe("True = mark not done"),
                startdate: aiDateInput.nullable().optional().describe("ISO 8601 or null to clear"),
                duedate: aiDateInput.nullable().optional().describe("ISO 8601 or null to clear"),
                dodate: aiDateInput.nullable().optional().describe("ISO 8601 or null to clear"),
                assigneeUserIds: z
                    .array(z.string().uuid())
                    .optional()
                    .describe(
                        "Replace assignees with the specified people: searchPeople for each named person; use current user id only for me/myself. Never substitute a different person"
                    ),
                priority: z.nativeEnum(PRIORITY).nullable().optional().describe("Priority, or null to clear"),
                statusTagId: z
                    .string()
                    .uuid()
                    .nullable()
                    .optional()
                    .describe("Status tag UUID, or null to clear"),
                estimateMinutes: z
                    .number()
                    .int()
                    .min(0)
                    .nullable()
                    .optional()
                    .describe("Estimate in minutes, or null to clear"),
                progress: z.number().min(0).max(100).optional().describe("Progress percentage from 0 to 100"),
                tint: z.string().nullable().optional().describe("Task tint/color value, or null to clear"),
            })
            .refine(
                input =>
                    Object.entries(input).some(([key, value]) => key !== "taskId" && value !== undefined),
                "Provide at least one task field to update"
            ),
        execute: async ({
            taskId,
            title,
            description,
            done,
            todo,
            startdate,
            duedate,
            dodate,
            assigneeUserIds,
            priority,
            statusTagId,
            estimateMinutes,
            progress,
            tint,
        }) => {
            const patch: Partial<ITask> = {};
            if (title !== undefined) {
                patch.title = title;
            }
            if (description !== undefined) {
                patch.description = description;
            }
            if (done !== undefined) {
                patch.done = done;
            }
            if (todo === true) {
                patch.done = false;
            }
            if (startdate !== undefined) {
                patch.startdate = startdate === null ? null : new Date(startdate);
            }
            if (duedate !== undefined) {
                patch.duedate = duedate === null ? null : new Date(duedate);
            }
            if (dodate !== undefined) {
                patch.dodate = dodate === null ? null : new Date(dodate);
            }
            if (assigneeUserIds !== undefined) {
                patch.assignees = assigneeUserIds;
            }
            if (priority !== undefined) {
                patch.priority = priority;
            }
            if (statusTagId !== undefined) {
                patch.status = statusTagId ?? undefined;
            }
            if (estimateMinutes !== undefined) {
                patch.estimate = estimateMinutes ?? undefined;
            }
            if (progress !== undefined) {
                patch.progress = progress;
                patch.done = progress === 100;
            }
            if (tint !== undefined) {
                patch.tint = tint ?? undefined;
            }

            if (startdate !== undefined || duedate !== undefined) {
                const currentTask = await TasksLoader.getOne(taskId);
                const nextStart =
                    patch.startdate !== undefined
                        ? (patch.startdate as Date | null)
                        : ((currentTask.startdate ? new Date(currentTask.startdate) : null) as Date | null);
                const nextDue =
                    patch.duedate !== undefined
                        ? (patch.duedate as Date | null)
                        : ((currentTask.duedate ? new Date(currentTask.duedate) : null) as Date | null);

                if (
                    isValidDate(nextStart) &&
                    isValidDate(nextDue) &&
                    nextStart.getTime() > nextDue.getTime()
                ) {
                    if (startdate !== undefined) {
                        patch.startdate = shiftDateHours(nextDue, -1);
                    } else if (duedate !== undefined) {
                        patch.duedate = shiftDateHours(nextStart, 1);
                    }
                }
            }

            const task = await TasksLoader.update(taskId, patch);
            return {
                id: task.id,
                title: task.title,
                description: task.description ?? "",
                done: task.done,
                startdate: task.startdate ? new Date(task.startdate).toISOString() : null,
                duedate: task.duedate ? new Date(task.duedate).toISOString() : null,
                dodate: task.dodate ? new Date(task.dodate).toISOString() : null,
                assignees: task.assignees ?? [],
                priority: task.priority ?? null,
                statusTagId: task.status ?? null,
                estimateMinutes: task.estimate ?? null,
                progress: task.progress,
                tint: task.tint ?? null,
                project: task.project,
            };
        },
    }),
];
