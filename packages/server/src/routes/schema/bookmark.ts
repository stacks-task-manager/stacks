// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Bookmark create payload for the sidebar.
 */
import { z } from 'zod';

/** Validated bookmark row from the client. */
export const BookmarkSchema = z.object({
    title: z.string(),
    pinned: z.boolean(),
    type: z.string(),
    url: z.string(),
});