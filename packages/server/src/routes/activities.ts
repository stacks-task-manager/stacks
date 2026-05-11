// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * HTTP routes for resource activities (timeline entries).
 */
import { Hono } from "hono";
import type { Context } from "hono";

import { ActivitiesLoader } from "../loaders/activities";
import { asyncHandler } from "../utils/errorHandler";

const activities = new Hono();

/** GET `/:id` — Returns activities for the resource identified by `id`. */
activities.get(
    "/:id",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const activities = await ActivitiesLoader.getAllByResources([id]);
        return c.replySuccess(activities);
    })
);

/** POST `/` — Creates a new activity from the JSON body. */
activities.post(
    "/",
    asyncHandler(async (c: Context) => {
        const data = await c.req.json();
        const activity = await ActivitiesLoader.create(data);
        return c.replySuccess(activity);
    })
);

export default activities;
