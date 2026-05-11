// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Notepad content and cover updates.
 */
import { z } from "zod/v4";

/** PATCH body for a notepad document. */
export const NotepadUpdateSchema = z.object({
    content: z.string().optional(),
    cover: z.union([z.string(), z.null()]).optional(),
});
