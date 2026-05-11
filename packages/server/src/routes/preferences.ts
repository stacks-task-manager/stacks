// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * User preferences patch endpoint (reads are served via boot).
 */
import { Hono } from "hono";
import type { Context } from "hono";

import { validator } from "../middleware/validator";
import { PreferencesLoader } from "../loaders/preferences";
import { PreferencesSchema } from "./schema/preferences";
import { asyncHandler } from "../utils/errorHandler";

const preferences = new Hono();

/** PATCH `/` — Upserts preferences for the authenticated user. */
preferences.patch(
    "/",
    validator(PreferencesSchema),
    asyncHandler(async (c: Context) => {
        const preferencesData = c.req.valid("json");
        await PreferencesLoader.update(preferencesData);
        return c.replySuccess();
    })
);

export default preferences;
