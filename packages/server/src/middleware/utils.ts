// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { Context } from "hono";
import { getSignedCookie } from "hono/cookie";
import { getCookieSecret } from "../config/secrets";

/**
 * Authentication token extraction from Authorization header or signed cookie.
 */

interface TokenResult {
    token?: string;
    source: "header" | "cookie" | "none";
    error?: string;
}

export const getAuthToken = async (c: Context): Promise<string | undefined> => {
    try {
        const result = await getAuthTokenWithSource(c);
        return result.token;
    } catch (error) {
        console.error("Error extracting auth token:", error);
        return undefined;
    }
};

export const getAuthTokenWithSource = async (c: Context): Promise<TokenResult> => {
    try {
        const authHeader = c.req.header("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7).trim();
            if (token) {
                return {
                    token,
                    source: "header",
                };
            }
        }

        const cookieSecret = getCookieSecret();
        const cookieToken = await getSignedCookie(c, cookieSecret, "auth_token");
        if (cookieToken) {
            return {
                token: cookieToken,
                source: "cookie",
            };
        }

        return {
            source: "none",
        };
    } catch (error) {
        console.error("Error extracting auth token with source:", error);
        return {
            source: "none",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
};
