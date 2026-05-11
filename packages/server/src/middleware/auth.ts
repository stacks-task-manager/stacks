// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Authentication middleware for protecting routes
 *
 * This module provides JWT-based authentication middleware that verifies
 * user tokens and attaches user information to the request context.
 */
import { UserEntity } from "@stacks/db";
import { translate } from "@stacks/translations";
import type { Context, MiddlewareHandler } from "hono";
import { verify } from "hono/jwt";
import type { User } from "../types";
import { getAuthToken } from "./utils";
import { RolesLoader } from "../loaders";
import { ErrorCode } from "../errors";
import { getJwtSecret } from "../config/secrets";

// JWT payload interface for type safety
interface JWTPayload {
    uid: string;
    email?: string;
    role?: string;
    tenant?: string;
    iat?: number;
    exp?: number;
}

type JwtVerifyOutcome = { ok: true; payload: JWTPayload } | { ok: false; response: Response };

function handleJwtVerificationFailure(c: Context, error: unknown): Response {
    if (error instanceof Error) {
        const isApiRequest = c.req.path.startsWith("/api/");

        if (error.name === "JwtTokenExpired" || error.message.includes("expired")) {
            if (isApiRequest) {
                return c.replyError(
                    new Error(translate("Token expired")),
                    undefined,
                    401,
                    ErrorCode.UNAUTHORIZED
                );
            }
            return c.redirect("/login");
        }

        if (error.name === "JwtTokenInvalid" || error.message.includes("invalid")) {
            if (isApiRequest) {
                return c.replyError(
                    new Error(translate("Invalid token signature")),
                    undefined,
                    401,
                    ErrorCode.INVALID_TOKEN
                );
            }
            return c.redirect("/login");
        }
    }

    return c.replyError(
        new Error(translate("Authentication failed")),
        undefined,
        401,
        ErrorCode.UNAUTHORIZED
    );
}

/**
 * Verifies the JWT and returns the payload, or an HTTP response to return early.
 * Does not touch the database.
 */
async function verifyJwtPayload(c: Context): Promise<JwtVerifyOutcome> {
    const token = await getAuthToken(c);

    if (!token) {
        return {
            ok: false,
            response: c.replyError(
                new Error(translate("Authentication token missing")),
                undefined,
                401,
                ErrorCode.UNAUTHORIZED
            ),
        };
    }

    const jwtSecret = getJwtSecret();

    try {
        const payload = (await verify(token, jwtSecret, "HS256")) as unknown as JWTPayload;

        if (!payload || !payload.uid) {
            return {
                ok: false,
                response: c.replyError(
                    new Error(translate("Invalid authentication token")),
                    undefined,
                    401,
                    ErrorCode.INVALID_TOKEN
                ),
            };
        }

        return { ok: true, payload };
    } catch (error) {
        console.error("Authentication error:", error);
        return { ok: false, response: handleJwtVerificationFailure(c, error) };
    }
}

/**
 * Session-only auth for high-traffic routes (e.g. /app/* static assets and dev proxy).
 * Verifies the JWT but does not load the user or role from the database — those
 * requests would otherwise repeat UserEntity + RolesLoader on every JS/CSS/image fetch.
 *
 * Full user checks (disabled/deleted, role) still run on `/api/*` via {@link requireAuth}.
 */
export const requireAuthSession: MiddlewareHandler = async (c, next) => {
    const outcome = await verifyJwtPayload(c);
    if (!outcome.ok) {
        return outcome.response;
    }

    const { payload } = outcome;
    c.set("userId", payload.uid);
    c.set("user", { id: payload.uid } as User);
    c.set("instanceId", c.req.header("X-Instance-ID") ?? "");

    await next();
};

/**
 * Authentication middleware that verifies JWT tokens and loads user data
 *
 * This middleware:
 * 1. Extracts JWT token from Authorization header or signed cookie
 * 2. Verifies token signature and expiration
 * 3. Loads user data from database
 * 4. Attaches user object to context for downstream handlers
 * 5. Redirects to login on authentication failure
 *
 * @param c - Hono context object
 * @param next - Next middleware function
 * @returns Response or continues to next middleware
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
    try {
        const jwtOutcome = await verifyJwtPayload(c);
        if (!jwtOutcome.ok) {
            return jwtOutcome.response;
        }
        const { payload } = jwtOutcome;

        // Load user from database
        const user = await UserEntity.findOne({
            where: {
                id: payload.uid,
            },
        });

        if (!user) {
            // User not found - redirect to login for web requests
            // or return error for API requests
            const isApiRequest = c.req.path.startsWith("/api/");

            if (isApiRequest) {
                return c.replyError(
                    new Error(translate("User not found or deactivated")),
                    undefined,
                    401,
                    ErrorCode.UNAUTHORIZED
                );
            }

            return c.redirect(
                "/login?e=" + Buffer.from(translate("User not found or deactivated")).toString("base64")
            );
        }

        if (user.get("disabled")) {
            return c.redirect("/login?e=" + Buffer.from(translate("User disabled")).toString("base64"));
        }

        if (user.get("deleted")) {
            return c.redirect("/login?e=" + Buffer.from(translate("Account was deleted")).toString("base64"));
        }

        const role = await RolesLoader.getById(user.get("role"), user.get("tenant"));

        // Attach user data to context for downstream handlers
        c.set("user", user.toJSON());
        c.set("userId", String(user.id));
        c.set("userRole", role);
        c.set("userTenant", user.tenant);
        c.set("instanceId", c.req.header("X-Instance-ID") ?? "");

        await next();
    } catch (error) {
        console.error("Authentication error:", error);
        return c.replyError(
            new Error(translate("Authentication failed")),
            undefined,
            401,
            ErrorCode.UNAUTHORIZED
        );
    }
};
