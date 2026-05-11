// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Query validation for listing files attached to records.
 */
import { FILES_TYPE } from "@stacks/types";
import z from "zod/v4";

/** Optional category filter for file listings. */
export const FilesFilterSchema = z.object({
    type: z.union(Object.values(FILES_TYPE).map(v => z.literal(v)) as [any, ...any[]]).optional(),
});
