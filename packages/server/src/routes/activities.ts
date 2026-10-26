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
import { CommentMutationSchema, NewActivitySchema } from "./schema/activities";

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

/** PATCH `/:id` — Updates an owned task comment. */
activities.patch(
    "/:id",
    validator(CommentMutationSchema.extend({ content: CommentMutationSchema.shape.content.unwrap() })),
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        const data = c.req.valid("json");
        const activity = await ActivitiesLoader.update(data.resourceId, id, data.content);
        return c.replySuccess(activity);
    })
);

/** DELETE `/:id` — Soft-deletes an owned task comment. */
activities.delete(
    "/:id",
    validator(CommentMutationSchema.omit({ content: true })),
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        const data = c.req.valid("json");
        await ActivitiesLoader.remove(data.resourceId, id);
        return c.replySuccess({ id });
    })
);

export default activities;
