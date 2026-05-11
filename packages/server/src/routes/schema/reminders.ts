// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Reminder creation body tied to a task record.
 */
import { z } from "zod/v4";

/** New reminder fields for POST `/api/reminders`. */
export const NewReminderSchema = z.object({
    date: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    recordId: z.uuid(),
    recordType: z.enum(["task"]),
    url: z.string().optional(),
});
