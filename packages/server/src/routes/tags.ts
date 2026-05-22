// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Tag create, update, and list routes.
 */
import { Hono, type Context } from "hono";

import { TagsLoader } from "../loaders";
import { validator } from "../middleware/validator";
import { asyncHandler } from "../utils/errorHandler";
import { TagSchema } from "./schema/tags";

const tags = new Hono();

/** POST `/` — Creates a tag from validated JSON. */
tags.post(
    "/",
    validator(TagSchema),
    asyncHandler(async (c: Context) => {
        const tagData = c.req.valid("json");
        const newTag = await TagsLoader.create(tagData);
        return c.replySuccess(newTag);
    })
);

/** PATCH `/:id` — Updates an existing tag. */
tags.patch(
    "/:id",
    validator(TagSchema),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const tagData = c.req.valid("json");
        await TagsLoader.update(id, tagData);
        return c.replySuccess();
    })
);

/** GET `/` — Lists all tags. */
tags.get(
    "/",
    asyncHandler(async (c: Context) => {
        const tags = await TagsLoader.getAll();
        return c.replySuccess(tags);
    })
);

export default tags;
