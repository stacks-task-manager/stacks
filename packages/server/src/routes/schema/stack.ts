// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Stack shape (legacy interface) and Zod payloads for create/update/move/delete.
 */
import { z } from "zod/v4";

/** Sequelize-shaped stack row used in older typings. */
export interface Stack {
    id: string;
    title: string;
    project: string;
    tasks: string[];
    tint: string;
    collapsed: boolean;
    maxTasks: number;
    sorting: string;
    createdAt: Date;
    updatedAt: Date;
}

/** POST body for creating a stack in a project. */
export const StackSchema = z.object({
    title: z.string(),
    project: z.uuid(),
    index: z.union([z.number(), z.null()]).optional(),
});

/** PATCH fields for stack header, ordering, and task ids. */
export const StackUpdateSchema = z.object({
    title: z.string().optional(),
    tint: z.string().optional(),
    collapsed: z.boolean().optional(),
    maxTasks: z.number().optional(),
    sorting: z.string().optional(),
    tasks: z.array(z.string()).optional(),
    project: z.uuid().optional(),
    tasksOrder: z.array(z.string()).optional(),
});

/** Bulk task move between projects/stacks with full order arrays. */
export const StackTasksSchema = z.object({
    sourceProject: z.uuid(),
    sourceStackId: z.uuid().optional(),
    sourceStackTasks: z.array(z.uuid()),
    destinationProject: z.uuid(),
    destinationStackId: z.uuid(),
    destinationStackTasks: z.array(z.uuid()),
    movedTaskIds: z.array(z.uuid()),
});

/** DELETE query: `tasks=true` deletes tasks instead of the stack. */
export const StackDeleteSchema = z.object({
    tasks: z.enum(["true"]).optional(),
});

/** Reorders a stack after another stack id (or null for top). */
export const MoveStackSchema = z.object({
    stack: z.uuid(),
    after: z.union([z.uuid(), z.null()]).optional(),
});
