// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI tools: kanban stacks (create, move, update).
 */
import { z } from "zod";
import type { IStack } from "@stacks/types";
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
                taskCount: s.tasksOrder?.length ?? 0,
            }));
        },
    }),
];
