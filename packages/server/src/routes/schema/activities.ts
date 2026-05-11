// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Request body validation for activity creation.
 */
import { z } from "zod/v4";

/** Payload for creating a task activity (log or message). */
export const NewActivitySchema = z.object({
    title: z.string().optional(),
    resourceId: z.uuid(),
    resourceType: z.enum(["task"]),
    type: z.enum(["log", "message"]),
    parent: z.uuid().optional(),
    content: z.string().optional(),
    change: z.union([z.string(), z.json()]).optional(),
});
