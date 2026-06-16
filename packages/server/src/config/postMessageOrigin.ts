// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { Context } from "hono";

/**
 * Target origin for OAuth popup postMessage. Prefer APP_ORIGIN in production;
 * falls back to the request Origin header, then "*".
 */
export function postMessageTargetOrigin(c: Context): string {
    const configured = process.env.APP_ORIGIN?.trim();
    if (configured) {
        return configured;
    }
    const fromRequest = c.req.header("origin")?.trim();
    if (fromRequest) {
        return fromRequest;
    }
    try {
        return new URL(c.req.url).origin;
    } catch {
        return "*";
    }
}
