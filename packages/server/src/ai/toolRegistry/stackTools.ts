// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: kanban stacks (create, move, update).
 */
import { z } from "zod";
import { TASKSORTING, type IStack } from "@stacks/types";
import { ProjectsLoader, StacksLoader } from "../../loaders";
import { defineTool } from "./defineTool";

/** Board / column tools (`StacksLoader`). */
export const stackAiTools = [
    defineTool({
        name: "createStack",
        description: `Create a new board column. Requires projectId.`,
        inputSchema: z
            .object({
                projectId: z
                    .string()
                    .describe(
                        "Project UUID from current UI or listProjects(search). Resolve a supplied project name now; never ask for its UUID"
                    ),
                title: z.string().min(1).describe("Column title"),
                insertIndex: z
                    .number()
                    .int()
                    .min(0)
                    .optional()
                    .describe(
                        "0-based absolute position; omit to append. For relative placement use beforeStackId or afterStackId."
                    ),
                beforeStackId: z
                    .string()
                    .optional()
                    .describe(
                        "Existing column ID to insert immediately before (in front of); resolve with listStacks"
                    ),
                afterStackId: z
                    .string()
                    .optional()
                    .describe("Existing column ID to insert immediately after; resolve with listStacks"),
            })
            .refine(
                input =>
                    [input.insertIndex, input.beforeStackId, input.afterStackId].filter(
                        value => value !== undefined
                    ).length <= 1,
                { message: "Specify only one insertion position" }
            ),
        execute: async ({ projectId, title, insertIndex, beforeStackId, afterStackId }) => {
            const data = { title, project: projectId } as IStack;
            const stack = await StacksLoader.create(
                data,
                beforeStackId !== undefined
                    ? { beforeStackId }
                    : afterStackId !== undefined
                    ? { afterStackId }
                    : insertIndex
            );
            return {
                id: stack.id,
                title: stack.title,
                projectId: stack.project,
            };
        },
    }),

    defineTool({
        name: "listStacks",
        description: `List columns in one project. Resolve a project name with listProjects first. projectId is required; ask which project only if it is absent from the user message and current UI.`,
        inputSchema: z.object({
            projectId: z
                .string()
                .describe(
                    "Project UUID from current UI or listProjects(search). Resolve a supplied project name now; never ask for its UUID"
                ),
        }),
        execute: async ({ projectId }) => {
            const project = await ProjectsLoader.getOne(projectId);
            const stacks = await StacksLoader.getAll(projectId);
            const order = project.stacksOrder;
            const position = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
            return [...stacks]
                .sort((a, b) => position(a.id) - position(b.id))
                .map((s, index) => ({
                    index,
                    id: s.id,
                    title: s.title,
                    project: s.project,
                    projectId: s.project,
                    tint: s.tint ?? null,
                    collapsed: Boolean(s.collapsed),
                    maxTasks: s.maxTasks ?? null,
                    sorting: s.sorting ?? null,
                    taskCount: s.tasksOrder?.length ?? 0,
                }));
        },
    }),

    defineTool({
        name: "updateStack",
        description:
            "Update an existing board column/stack. Supports title, tint color, collapsed state, max task limit, and sorting.",
        inputSchema: z
            .object({
                stackId: z
                    .string()
                    .describe(
                        "Existing column UUID from listStacks(projectId); resolve the project first via current UI or listProjects"
                    ),
                title: z.string().min(1).optional().describe("New column title"),
                tint: z.string().nullable().optional().describe("Column tint/color value, or null to clear"),
                collapsed: z.boolean().optional().describe("Whether the column is collapsed"),
                maxTasks: z
                    .number()
                    .int()
                    .min(1)
                    .nullable()
                    .optional()
                    .describe("Maximum number of tasks allowed, or null to clear"),
                sorting: z
                    .nativeEnum(TASKSORTING)
                    .nullable()
                    .optional()
                    .describe("Sorting mode identifier, or null for manual ordering"),
            })
            .refine(
                input =>
                    input.title !== undefined ||
                    input.tint !== undefined ||
                    input.collapsed !== undefined ||
                    input.maxTasks !== undefined ||
                    input.sorting !== undefined,
                {
                    message: "At least one field must be provided",
                }
            ),
        execute: async ({ stackId, title, tint, collapsed, maxTasks, sorting }) => {
            const patch: Partial<IStack> = {};
            if (title !== undefined) {
                patch.title = title;
            }
            if (tint !== undefined) {
                patch.tint = tint ?? undefined;
            }
            if (collapsed !== undefined) {
                patch.collapsed = collapsed;
            }
            if (maxTasks !== undefined) {
                patch.maxTasks = maxTasks ?? undefined;
            }
            if (sorting !== undefined) {
                patch.sorting = sorting ?? undefined;
            }

            const stack = await StacksLoader.update(stackId, patch);
            return {
                id: stack.id,
                title: stack.title,
                projectId: stack.project,
                tint: stack.tint ?? null,
                collapsed: Boolean(stack.collapsed),
                maxTasks: stack.maxTasks ?? null,
                sorting: stack.sorting ?? null,
            };
        },
    }),
    defineTool({
        name: "deleteStack",
        description:
            "Delete a board column/stack and the tasks in it. Resolve a column name with listStacks first.",
        inputSchema: z.object({ stackId: z.string().describe("Column/stack UUID") }),
        execute: async ({ stackId }) => {
            const deleted = await StacksLoader.remove(stackId);
            if (!deleted) throw new Error("Column could not be deleted");
            await ProjectsLoader.removeStackOrder(deleted.project, deleted.id);
            return { id: deleted.id, title: deleted.title, projectId: deleted.project, deleted: true };
        },
    }),
];
