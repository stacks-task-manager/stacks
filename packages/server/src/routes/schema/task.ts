// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Task CRUD, move, filter, segment, and unarchive payloads.
 */
import { z } from "zod/v4";

/** Optional project id filter helper. */
export const TaskByProjectSchema = z.object({
    project: z.uuid().optional(),
});

/** Nested `task` row plus stack placement hints for creation. */
export const NewTaskSchema = z.object({
    task: z.object({
        title: z.string(),
        description: z.string().optional(),
        project: z.uuid(),
        stack: z.uuid(),
        priority: z.union([z.enum(["none", "low", "medium", "high", "critical"]), z.null()]).optional(),
        startdate: z.union([z.string(), z.null()]).optional(),
        duedate: z.union([z.string(), z.null()]).optional(),
        dodate: z.union([z.string(), z.null()]).optional(),
        status: z.union([z.string(), z.null()]).optional(),
        parent: z.uuid().optional(),
    }),
    position: z.enum(["top", "bottom"]).optional(),
    stack: z.uuid().optional(),
});

/** Reorders a task within or across stacks (`after` sibling). */
export const MoveTaskSchema = z.object({
    task: z.uuid(),
    stack: z.uuid(),
    after: z.union([z.uuid(), z.null()]).optional(),
});

/** Partial task patch: dates, assignees, estimates, location, etc. */
export const TaskUpdateSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    done: z.boolean().optional(),
    startdate: z.union([z.string(), z.null()]).optional(),
    duedate: z.union([z.string(), z.null()]).optional(),
    dodate: z.union([z.string(), z.null()]).optional(),
    tags: z.uuid().array().optional(),
    status: z.uuid().optional(),
    estimate: z.union([z.number().min(0), z.null()]).optional(),
    progress: z.number().min(0).max(100).optional(),
    priority: z.enum(["none", "low", "medium", "high", "critical"]).optional(),
    assignees: z.uuid().array().optional(),
    repeats: z.json().optional(),
    links: z.json().optional(),
    locations: z.json().optional(),
    tint: z.string().optional(),
    subtasksOrder: z.array(z.string()).optional(),
    project: z.uuid().optional(),
    stack: z.uuid().optional(),
    hourlyRate: z.union([z.number().min(0), z.null()]).optional(),
    cover: z.union([z.string(), z.null()]).optional(),
    dependencies: z.uuid().array().optional(),
});

/** Resolves a batch of task ids for board segmentation. */
export const TasksSegmentSchema = z.object({
    tasks: z.union([z.uuid().array(), z.uuid()]),
});

/** List filters; requires at least one field per refine rule. */
export const TasksFilteredSchema = z
    .object({
        ids: z.union([z.array(z.uuid()), z.uuid()]).optional(),
        project: z.union([z.array(z.uuid()), z.uuid()]).optional(),
        stack: z.union([z.array(z.uuid()), z.uuid()]).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        archived: z.enum(["true"]).optional(),
        completed: z.enum(["true"]).optional(),
        open: z.enum(["true"]).optional(),
        assigned: z.enum(["true"]).optional(),
        unassigned: z.enum(["true"]).optional(),
        assignees: z.union([z.uuid(), z.array(z.uuid())]).optional(),
        parent: z.uuid().optional(),
        query: z.string().optional(),
        limit: z.coerce.number().int().positive().max(500).optional(),
    })
    .strict()
    .refine(
        data => {
            const entries = Object.entries(data).filter(([key, value]) => {
                if (key === "limit" || value === undefined) return false;
                if (key === "query" && typeof value === "string" && value.trim() === "") return false;
                return true;
            });
            return entries.length > 0;
        },
        {
            message: "At least one filter field must be provided",
        }
    );

/** Optional target stack when restoring from archive. */
export const UnarchiveTaskSchema = z.object({
    stack: z.union([z.uuid(), z.null()]).optional(),
});
