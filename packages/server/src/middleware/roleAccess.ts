// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { Context, Next } from "hono";
import { ROLE_ACTIONS, ROLE_SECTIONS, IRoleActions } from "@stacks/types";
import { translate } from "@stacks/translations";
import { Errors } from "../errors";

/**
 * Gate a route behind a role section + action (default `read`). Admins pass
 * through. Relies on `requireAuth` having set `user` and `userRole` on the
 * Hono context. Downstream errors propagate to the global error handler.
 */
export const requireRoleAccess = (section: ROLE_SECTIONS, action: keyof IRoleActions = ROLE_ACTIONS.READ) => {
    return async (c: Context, next: Next) => {
        const user = c.get("user");
        const userRole = c.get("userRole");

        if (!user) {
            throw Errors.unauthorized(translate("User not authenticated"));
        }

        if (user.admin) {
            await next();
            return;
        }

        const sectionAccess = userRole?.access?.[section];
        if (!sectionAccess) {
            throw Errors.forbidden(translate("Access denied"));
        }
        if (!sectionAccess[action]) {
            throw Errors.forbidden(translate("Insufficient permissions"));
        }

        await next();
    };
};
