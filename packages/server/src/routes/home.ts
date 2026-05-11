// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Authenticated home stub payload (todos, sorting, notes placeholders).
 */
import { Hono } from "hono";
import type { Context } from "hono";

import { asyncHandler } from "../utils/errorHandler";

const home = new Hono();

/** GET `/` — Returns minimal home data for the current user. */
home.get(
    "/",
    asyncHandler(async (c: Context) => {
        return c.replySuccess({
            todos: [],
            todoSorting: "",
            notes: "",
        });
    })
);

export default home;
