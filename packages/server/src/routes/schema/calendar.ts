// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Calendar schemas for local calendars.
 */
import { z } from "zod/v4";

export const CalendarCreateSchema = z.object({
    title: z.string().min(1).max(255),
    color: z.string().optional(),
    isDefault: z.boolean().optional().default(false),
});

export const CalendarSchema = CalendarCreateSchema.extend({
    id: z.uuid(),
});

export const CalendarsListSchema = z.array(CalendarSchema);
