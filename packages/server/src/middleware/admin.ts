// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Admin authorization middleware.
 *
 * Reuses the role already loaded by `requireAuth` (`userRole` in context) so
 * admin-only routes do not pay for a second `RoleEntity.findOne`.
 */
import { translate } from "@stacks/translations";
import type { MiddlewareHandler, Context } from "hono";

/** Middleware that requires the authenticated user's role to be flagged admin. */
export const requireAdmin: MiddlewareHandler = async (c: Context, next) => {
    const user = c.get("user");
    const role = c.get("userRole") as { id: string; title: string; admin?: boolean } | undefined;

    if (!user || !role) {
        return c.replyError(
            new Error(translate("Authentication required")),
            { errorCode: "AUTH_REQUIRED" },
            401
        );
    }

    if (!role.admin) {
        return c.replyError(
            new Error(translate("Admin access required")),
            { errorCode: "ADMIN_REQUIRED" },
            403
        );
    }

    c.set("adminRole", { id: role.id, name: role.title, admin: Boolean(role.admin) });

    await next();
};

/** Utility for handlers: true when the authenticated user has an admin role attached. */
export const isUserAdmin = (c: Context): boolean => {
    const role = c.get("userRole") as { admin?: boolean } | undefined;
    return Boolean(role?.admin);
};
