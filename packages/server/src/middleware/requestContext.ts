// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Request Context Middleware
 *
 * Middleware that wraps authenticated requests in a request context,
 * making the user object available throughout the request lifecycle
 * without needing to pass it as a parameter.
 */

import type { MiddlewareHandler } from "hono";
import { randomUUID } from "crypto";
import { requestContext } from "../services/requestContext";
import type { User } from "../types/user";
import { IRole } from "@stacks/types";

/**
 * Middleware that sets up request context for authenticated requests
 *
 * This middleware should be used after authentication middleware
 * to wrap the request in a context that provides access to the user
 * object throughout the request lifecycle.
 *
 * @param c - Hono context object
 * @param next - Next middleware function
 * @returns Response or continues to next middleware
 */
export const withRequestContext: MiddlewareHandler = async (c, next) => {
    // Get the user from the context (set by auth middleware)
    const user = c.get("user") as User;
    const instanceId = c.get("instanceId") as string;

    if (!user) {
        // If no user is available, continue without context
        // This allows the middleware to be used on routes that don't require auth
        await next();
        return;
    }

    const role = c.get("userRole") as IRole;
    if (!role) {
        // If no user is available, continue without context
        // This allows the middleware to be used on routes that don't require auth
        await next();
        return;
    }

    // Create request context
    const context = {
        user,
        instanceId,
        role,
        requestId: randomUUID(),
        timestamp: Date.now(),
    };

    // Run the rest of the request within the context
    return requestContext.run(context, async () => {
        c.set("requestId", context.requestId);
        await next();
    });
};
