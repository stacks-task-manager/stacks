// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * HTTP routes for resource activities (timeline entries).
 */
import { Hono } from "hono";
import type { Context } from "hono";

import { ActivitiesLoader } from "../loaders/activities";
import { validator } from "../middleware/validator";
import { asyncHandler } from "../utils/errorHandler";
import { parseUuidParam } from "./schema/common";
import { NewActivitySchema } from "./schema/activities";

const activities = new Hono();

/** GET `/:id` — Returns activities for the resource identified by `id`. */
activities.get(
    "/:id",
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        const activities = await ActivitiesLoader.getAllByResources([id]);
        return c.replySuccess(activities);
    })
);

/** POST `/` — Creates a new activity from the JSON body. */
activities.post(
    "/",
    validator(NewActivitySchema),
    asyncHandler(async (c: Context) => {
        const data = c.req.valid("json");
        const activity = await ActivitiesLoader.create(data);
        return c.replySuccess(activity);
    })
);

export default activities;
