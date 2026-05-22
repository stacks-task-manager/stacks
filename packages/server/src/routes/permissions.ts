// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Permission record updates by id.
 */
import { Hono } from "hono";
import type { Context } from "hono";
import { translate } from "@stacks/translations";

import { PermissionsLoader } from "../loaders/permissions";
import { Errors } from "../errors";
import { asyncHandler } from "../utils/errorHandler";

const permissions = new Hono();

/** PATCH `/:id` — Updates permission fields from JSON body; 404 if not found. */
permissions.patch(
    "/:id",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const body = await c.req.json();

        const result = await PermissionsLoader.update(id, body);
        if (!result) {
            throw Errors.notFound(translate("Permission not found"));
        }

        return c.replySuccess();
    })
);

export default permissions;
