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
import { validator } from "../middleware/validator";
import { PermissionUpdateSchema } from "./schema/permissions";
import { parseUuidParam } from "./schema/common";

const permissions = new Hono();

/** PATCH `/:id` — Updates permission fields from JSON body; 404 if not found. */
permissions.patch(
    "/:id",
    validator(PermissionUpdateSchema),
    asyncHandler(async (c: Context) => {
        const id = parseUuidParam(c.req.param("id")!);
        const body = c.req.valid("json");

        const result = await PermissionsLoader.update(id, body);
        if (!result) {
            throw Errors.notFound(translate("Permission not found"));
        }

        return c.replySuccess();
    })
);

export default permissions;
