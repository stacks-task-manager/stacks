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
        description: `Create a board column in a resolved project. Returns its id, title, and projectId. Omit placement to append; specify only one of insertIndex, beforeStackId, or afterStackId. Use listStacks to resolve relative placement; do not create a duplicate to rename an existing column.`,
        inputSchema: z
            .object({
                projectId: z
                    .string()
                    .uuid()
                    .describe(
                        "Project UUID resolved through authorized context or an available project lookup"
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
                    .uuid()
                    .optional()
                    .describe(
                        "Existing column ID to insert immediately before (in front of); resolve with listStacks"
                    ),
                afterStackId: z
                    .string()
                    .uuid()
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
        description: `Read columns in one resolved project, in board order. Returns zero-based index, id, title, projectId, tint, collapsed state, maxTasks, sorting, and taskCount. Use ids from this result for column changes and task destinations. Obtain projectId from authorized host context or an available project lookup.`,
        inputSchema: z.object({
            projectId: z
                .string()
                .uuid()
                .describe("Project UUID resolved through authorized context or an available project lookup"),
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
            "Update an existing board column by resolved stackId. Supply at least one requested field: title, tint, collapsed, maxTasks, or sorting. Omitted fields remain unchanged; documented null values clear settings. Returns the updated column fields. Does not move tasks or create a column.",
        inputSchema: z
            .object({
                stackId: z
                    .string()
                    .uuid()
                    .describe(
                        "Existing column UUID from listStacks; obtain its project reference from authorized context or an available project lookup"
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
            .strict()
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
            "Permanently delete a resolved board column and the tasks in it. Resolve its name with listStacks and account for the contained tasks before requesting deletion. Returns the deleted column reference. Direct MCP execution performs deletion without the built-in chat confirmation.",
        inputSchema: z.object({ stackId: z.string().uuid().describe("Column/stack UUID") }),
        execute: async ({ stackId }) => {
            const deleted = await StacksLoader.remove(stackId);
            if (!deleted) throw new Error("Column could not be deleted");
            await ProjectsLoader.removeStackOrder(deleted.project, deleted.id);
            return { id: deleted.id, title: deleted.title, projectId: deleted.project, deleted: true };
        },
    }),
];
