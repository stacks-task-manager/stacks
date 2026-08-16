// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: kanban stacks (create, move, update).
 */
import { z } from "zod";
import { TASKSORTING, type IStack } from "@stacks/types";
import { StacksLoader } from "../../loaders";
import { defineTool } from "./defineTool";

/** Board / column tools (`StacksLoader`). */
export const stackAiTools = [
    defineTool({
        name: "createStack",
        description: `Create a new board column. Requires projectId.`,
        inputSchema: z.object({
            projectId: z.string().describe("Project UUID"),
            title: z.string().min(1).describe("Column title"),
            insertIndex: z
                .number()
                .int()
                .min(0)
                .optional()
                .describe("0-based position; omit to append"),
        }),
        execute: async ({ projectId, title, insertIndex }) => {
            const data = { title, project: projectId } as IStack;
            const stack = await StacksLoader.create(data, insertIndex);
            return {
                id: stack.id,
                title: stack.title,
                projectId: stack.project,
            };
        },
    }),

    defineTool({
        name: "listStacks",
        description: `List columns in a project.`,
        inputSchema: z.object({
            projectId: z.string().describe("Project UUID"),
        }),
        execute: async ({ projectId }) => {
            const stacks = await StacksLoader.getAll(projectId);
            return stacks.map(s => ({
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
                stackId: z.string().describe("Stack/column UUID"),
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
];
