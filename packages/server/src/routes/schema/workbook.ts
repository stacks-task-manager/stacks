// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { z } from "zod/v4";
import { PermissionSchema } from "./permissions";

export const WorkbookFiltersSchema = z
    .object({
        projects: z.uuid().array().max(500),
        tags: z.uuid().array().max(500),
        statuses: z.uuid().array().max(500),
        state: z.enum(["all", "done", "todo"]),
        priority: z.enum(["critical", "high", "medium", "low", "none"]).optional(),
        assignees: z.uuid().array().max(500),
        nobody: z.boolean().optional(),
        me: z.boolean().optional(),
        startDate: z.string().max(100).optional(),
        doDate: z.string().max(100).optional(),
        dueDate: z.string().max(100).optional(),
        overdue: z.boolean(),
        inProgress: z.boolean(),
        loggedTime: z.boolean().optional(),
        skipMe: z.boolean().optional(),
        onlyAssigned: z.boolean().optional(),
    })
    .strict();

export const WorkbookCreateSchema = z.object({
    title: z.string().trim().min(1).max(255),
    filters: WorkbookFiltersSchema,
    permissions: PermissionSchema.default({
        isPublic: true,
        visibleUsers: [],
        visibleRoles: [],
    }),
});

export const WorkbookUpdateSchema = z
    .object({
        title: z.string().trim().min(1).max(255).optional(),
        filters: WorkbookFiltersSchema.optional(),
    })
    .strict()
    .refine(data => data.title !== undefined || data.filters !== undefined, {
        message: "At least one field must be provided",
    });
