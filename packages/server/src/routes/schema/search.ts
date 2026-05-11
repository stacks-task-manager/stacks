// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Global search query string validation.
 */
import { z } from "zod/v4";

/** Query params for GET `/api/search`. */
export const SearchSchema = z.object({
    query: z.string(),
});