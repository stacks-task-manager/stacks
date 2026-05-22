// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Global search endpoint over workspace content.
 */
import { Hono } from "hono";
import type { Context } from "hono";

import { SearchLoader } from "../loaders";
import { validator } from "../middleware/validator";
import { asyncHandler } from "../utils/errorHandler";
import { SearchSchema } from "./schema/search";

const search = new Hono();

/** GET `/` — Runs {@link SearchLoader.query} with validated query string. */
search.get(
    "/",
    validator(SearchSchema, "query"),
    asyncHandler(async (c: Context) => {
        const { query } = c.req.valid("query");
        const results = await SearchLoader.query(query);
        return c.replySuccess(results);
    })
);

export default search;
