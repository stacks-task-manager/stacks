// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar event payloads and list filters.
 */
import { z } from "zod";

/** Partial update for an existing event. */
export const EventUpdateSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    assignees: z.string().array().optional(),
});

/** Full event body for creation. */
export const EventSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    assignees: z.string().array().optional(),
});

/** Query filters for listing events (span + anchor date). */
export const EventsFilteredSchema = z
    .object({
        span: z.enum(["day", "week", "month"]).optional(),
        date: z.string().datetime().optional(),
    })
    .strict();
