// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * In-app notification creation payload.
 */
import { z } from "zod/v4";

/** Body for creating a task-linked notification. */
export const NewNotificationSchema = z.object({
    subject: z.string(),
    message: z.string(),
    recordId: z.uuid(),
    recordType: z.enum(["task"]),
});
