// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Role listing, creation, and updates.
 */
import { Hono } from "hono";
import type { Context } from "hono";

import { RolesLoader } from "../loaders";
import { validator } from "../middleware/validator";
import { asyncHandler } from "../utils/errorHandler";
import { RoleSchema } from "./schema/roles";
import { parseUuidParam } from "./schema/common";

const roles = new Hono();

/** GET `/` — Lists all roles. */
roles.get(
    "/",
    asyncHandler(async (c: Context) => {
        const roles = await RolesLoader.getAll();
        return c.replySuccess(roles);
    })
);

/** POST `/` — Creates a role from validated JSON. */
roles.post(
    "/",
    validator(RoleSchema),
    asyncHandler(async (c: Context) => {
        const roleData = c.req.valid("json");
        const role = await RolesLoader.create(roleData);
        return c.replySuccess(role);
    })
);

/** PATCH `/:id` — Updates a role by id. */
roles.patch(
    "/:id",
    validator(RoleSchema),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const roleData = c.req.valid("json");
        parseUuidParam(id);
        await RolesLoader.update(id, roleData);
        return c.replySuccess();
    })
);

export default roles;
