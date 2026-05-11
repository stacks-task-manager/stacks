// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { Context } from "hono";

/**
 * Client IP from the request. Forwarded headers are only trusted when
 * TRUST_PROXY_HEADERS=1 (place the app behind a reverse proxy you control).
 */
export function getClientIP(c: Context): string {
    const trustForwarded = process.env.TRUST_PROXY_HEADERS === "1";

    if (trustForwarded) {
        const forwardedFor = c.req.header("x-forwarded-for");
        if (forwardedFor) {
            return forwardedFor.split(",")[0].trim();
        }
        const realIP = c.req.header("x-real-ip");
        if (realIP) {
            return realIP.trim();
        }
        const cf = c.req.header("cf-connecting-ip");
        if (cf) {
            return cf.trim();
        }
    }

    return "unknown";
}
