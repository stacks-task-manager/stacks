// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * In-app notifications: list, mark read, and delete.
 */
import type { Context } from "hono";
import { Hono } from "hono";

import { NotificationsLoader } from "../loaders";
import { asyncHandler } from "../utils/errorHandler";
import { parseUuidParam } from "./schema/common";

const notifications = new Hono();

/** GET `/` — Returns all notifications for the current user. */
notifications.get(
    "/",
    asyncHandler(async (c: Context) => {
        const list = await NotificationsLoader.getAll();
        return c.replySuccess(list);
    })
);

/** PATCH `/:id` — Marks a notification as read. */
notifications.patch(
    "/:id",
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        await NotificationsLoader.read(id);
        return c.replySuccess();
    })
);

/** DELETE `/:id` — Deletes a notification. */
notifications.delete(
    "/:id",
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        await NotificationsLoader.remove(id);
        return c.replySuccess();
    })
);

export default notifications;
