// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: tasks listing, filters, and mutations.
 */
import { translate } from "@stacks/translations";
import type { ITask } from "@stacks/types";
import { z } from "zod";
import { Errors } from "../../errors";
import { ProjectsLoader, StacksLoader, TasksLoader } from "../../loaders";
import type { GetAllFilters } from "../../loaders/tasks";
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

function listTasksHasFilter(d: {
    project?: string | string[];
    projectId?: string;
    taskIds?: string | string[];
    stackId?: string;
    parentTaskId?: string;
    searchQuery?: string;
    from?: string;
    to?: string;
    archivedOnly?: boolean;
    assigneeUserIds?: string | string[];
    assignedOnly?: boolean;
    unassignedOnly?: boolean;
    doneFilter?: "all" | "open" | "done";
}): boolean {
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
    return false;
}

function buildListTasksFilters(input: {
    project?: string | string[];
    projectId?: string;
    taskIds?: string | string[];
    stackId?: string;
    parentTaskId?: string;
    searchQuery?: string;
    from?: string;
    to?: string;
    archivedOnly?: boolean;
    assigneeUserIds?: string | string[];
    assignedOnly?: boolean;
    unassignedOnly?: boolean;
    doneFilter?: "all" | "open" | "done";
}): GetAllFilters {
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
    return f;
}

/** Maps findTasks / listTasks tool input to `/tasks` hash-route query string (same keys as the app `Tasks` view). */
function findTasksInputToQueryString(input: {
    project?: string | string[];
    projectId?: string;
    taskIds?: string | string[];
    stackId?: string;
    parentTaskId?: string;
    searchQuery?: string;
    from?: string;
    to?: string;
    archivedOnly?: boolean;
    assigneeUserIds?: string | string[];
    assignedOnly?: boolean;
    unassignedOnly?: boolean;
    doneFilter?: "all" | "open" | "done";
}): string {
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

    return params.toString();
}

/** Task-related AI tools (`TasksLoader`, plus `ProjectsLoader` / `StacksLoader` for create). */
export const taskAiTools = [
    defineTool({
        name: "findTasks",
        description: `Find / search / show / open tasks in the app UI. Returns hashPath (#/tasks?...) to navigate. Use listProjects first if you need a projectId. For listing tasks inside the chat instead, use listTasks. "assigned to me / <person>" → assigneeUserIds (NOT assignedOnly).`,
        inputSchema: z
            .object({
                projectId: z.string().uuid().optional().describe("Single project UUID"),
                project: uuidOrArray.optional().describe("Project UUID or list of them"),
                taskIds: uuidOrArray.optional().describe("Specific task UUID(s)"),
                stackId: z.string().uuid().optional().describe("Tasks in this stack UUID"),
                parentTaskId: z.string().uuid().optional().describe("Subtasks of this parent task UUID"),
                searchQuery: z.string().optional().describe("Case-insensitive title/description match"),
                from: z
                    .string()
                    .optional()
                    .describe("ISO date — start of startdate/duedate range"),
                to: z.string().optional().describe("ISO date — end of range (paired with from)"),
                archivedOnly: z.boolean().optional().describe("True = only archived tasks"),
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
                hashPath: queryString.length > 0 ? `#/tasks?${queryString}` : "#/tasks",
            };
        },
    }),

    defineTool({
        name: "listTasks",
        description: `Return task rows for you to summarize in chat. Use only when the user explicitly asks to list/enumerate/bullet tasks in conversation. For find/search/show-in-UI use findTasks. "assigned to me / <person>" → assigneeUserIds (NOT assignedOnly).`,
        inputSchema: z
            .object({
                projectId: z.string().uuid().optional().describe("Single project UUID"),
                project: uuidOrArray.optional().describe("Project UUID or list of them"),
                taskIds: uuidOrArray.optional().describe("Specific task UUID(s)"),
                stackId: z.string().uuid().optional().describe("Tasks in this stack UUID"),
                parentTaskId: z.string().uuid().optional().describe("Subtasks of this parent task UUID"),
                searchQuery: z.string().optional().describe("Case-insensitive title/description match"),
                from: z
                    .string()
                    .optional()
                    .describe("ISO date — start of startdate/duedate range"),
                to: z.string().optional().describe("ISO date — end of range (paired with from)"),
                archivedOnly: z.boolean().optional().describe("True = only archived tasks"),
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
        description: `Load one task by id. Use when a task id is in the UI block or the user asks about a specific task.`,
        inputSchema: z.object({
            taskId: z.string().describe("Task UUID"),
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
        name: "createTask",
        description: `Create a task in a project. Requires projectId (listProjects if you only have a name). Picks the default stack from the project's stack order.`,
        inputSchema: z.object({
            projectId: z.string().describe("Project UUID"),
            stackId: z.string().optional().describe("Stack UUID (optional)"),
            title: z.string().min(1).describe("Task title"),
            duedate: z.string().optional().describe("Due date ISO 8601"),
            assigneeUserIds: z.array(z.string()).optional().describe("Assignee user UUIDs"),
            description: z.string().optional().describe("Task description"),
        }),
        execute: async ({ projectId, stackId: stackIdArg, title, duedate, assigneeUserIds, description }) => {
            const project = await ProjectsLoader.getOne(projectId);
            const stacks = await StacksLoader.getAll(projectId);
            if (!stacks.length) {
                throw Errors.badRequest(translate("No stacks in project; cannot create task"));
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
            taskId: z.string().uuid().describe("Task UUID to move"),
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
        description: `Update a task's fields (title/done/duedate/assignees). Does NOT move between columns — for that use moveTask. If you only know a title, call listTasks first (returns ids; findTasks does not).`,
        inputSchema: z.object({
            taskId: z.string().describe("Task UUID"),
            title: z.string().optional(),
            done: z.boolean().optional().describe("True = mark done (there is no delete-task tool)"),
            todo: z.boolean().optional().describe("True = mark not done"),
            duedate: z.string().nullable().optional().describe("ISO 8601 or null to clear"),
            assigneeUserIds: z.array(z.string()).optional().describe("Replace assignees with these UUIDs"),
        }),
        execute: async ({ taskId, title, done, todo, duedate, assigneeUserIds }) => {
            const patch: Partial<ITask> = {};
            if (title !== undefined) {
                patch.title = title;
            }
            if (done !== undefined) {
                patch.done = done;
            }
            if (todo === true) {
                patch.done = false;
            }
            if (duedate !== undefined) {
                patch.duedate = duedate === null ? null : new Date(duedate);
            }
            if (assigneeUserIds !== undefined) {
                patch.assignees = assigneeUserIds;
            }
            const task = await TasksLoader.update(taskId, patch);
            return {
                id: task.id,
                title: task.title,
                done: task.done,
                duedate: task.duedate ? new Date(task.duedate).toISOString() : null,
                assignees: task.assignees ?? [],
                project: task.project,
            };
        },
    }),
];
