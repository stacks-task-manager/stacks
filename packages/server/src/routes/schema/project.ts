// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Project metadata PATCH: dates, health, automations, stacks order, etc.
 */
import { z } from "zod/v4";

/** Validated project fields from the project settings dialog. */
export const ProjectSchema = z.object({
    description: z.string().optional(),
    startDate: z.union([z.string(), z.null()]).optional(),
    endDate: z.union([z.string(), z.null()]).optional(),
    health: z.string().optional(),
    company: z.uuid().optional(),
    defaultView: z.string().optional(),
    currency: z.string().optional(),
    hourlyRate: z.number().optional(),
    views: z.string().array().optional(),
    automations: z.json().optional(),
    projectOwner: z.union([z.uuid(), z.null()]).optional(),
    fields: z.json().optional(),
    includeSubtasks: z.boolean().optional(),
    backgroundUrl: z.union([z.string(), z.null()]).optional(),
    approvers: z.string().array().optional(),
    estimate: z.union([z.number().min(0), z.null()]).optional(),
    notes: z.string().optional(),
    stacksOrder: z.array(z.string()).optional(),
});
