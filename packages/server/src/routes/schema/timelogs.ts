// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timelog write, filter, approval, and review request bodies.
 */
import { TIMELOG_STATUS } from "@stacks/types";
import { z } from "zod/v4";

/** Creates a time entry on a task for a person and project. */
export const NewTimelogSchema = z.object({
    billed: z.boolean().optional(),
    billable: z.boolean().optional(),
    date: z.string(),
    person: z.uuid(),
    project: z.uuid(),
    task: z.uuid(),
    description: z.string(),
    duration: z.number().int().positive(),
});

/** PATCH fields including optional approval state. */
export const UpdateTimelogSchema = NewTimelogSchema.extend({
    approved: z.boolean().optional(),
});

/** Query filters for listing timelogs (project, task, person, range, status). */
export const TimelogFilterSchema = z.object({
    project: z.uuid().optional(),
    task: z.uuid().optional(),
    person: z.uuid().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    status: z.enum(TIMELOG_STATUS).optional(),
});

/** Bulk or scoped approval request for submitted hours. */
export const ApproveTimelogSchema = z.object({
    person: z.uuid().optional(),
    task: z.uuid().optional(),
    project: z.uuid().optional(),
    timelog: z.uuid().optional(),
    reason: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
});

/** Date range for reviewing timelogs in approvals UI. */
export const ReviewTimelogSchema = z.object({
    start: z.string(),
    end: z.string(),
});
