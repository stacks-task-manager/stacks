// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Bookmark CRUD routes for the current user.
 */
import type { Context } from "hono";
import { Hono } from "hono";
import { translate } from "@stacks/translations";

import { BookmarksLoader } from "../loaders/bookmarks";
import { validator } from "../middleware/validator";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";
import { BookmarkSchema } from "./schema/bookmark";

const bookmarks = new Hono();

/** GET `/` — Lists all bookmarks for the authenticated user. */
bookmarks.get(
    "/",
    asyncHandler(async (c: Context) => {
        const bookmarks = await BookmarksLoader.getAll();
        return c.replySuccess(bookmarks);
    })
);

/** POST `/` — Creates a bookmark from validated JSON. */
bookmarks.post(
    "/",
    validator(BookmarkSchema),
    asyncHandler(async (c: Context) => {
        const bookmarkData = c.req.valid("json");
        const newBookmark = await BookmarksLoader.create(bookmarkData);
        return c.replySuccess(newBookmark);
    })
);

/** DELETE `/:id` — Removes the bookmark with the given id. */
bookmarks.delete(
    "/:id",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const deleted = await BookmarksLoader.remove(id);

        if (!deleted) {
            throw Errors.notFound(translate("Bookmark not found"));
        }

        return c.replySuccess();
    })
);

export default bookmarks;
