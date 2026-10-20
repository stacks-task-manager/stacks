// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { Context } from "hono";
import { isIP } from "net";

/**
 * Client IP from the Node adapter's socket. Forwarded headers are only trusted
 * when TRUST_PROXY_HEADERS=1 and a controlled proxy overwrites them.
 */
export function getClientIP(c: Context): string {
    const incoming = (c as any).env?.incoming;
    const peerAddress = validAddress(incoming?.socket?.remoteAddress);
    const trustForwarded = process.env.TRUST_PROXY_HEADERS === "1";

    if (trustForwarded) {
        const forwarded = singleAddress(c.req.header("x-forwarded-for"));
        if (forwarded) return forwarded;

        const realIP = singleAddress(c.req.header("x-real-ip"));
        if (realIP) return realIP;

        const cloudflareIP = singleAddress(c.req.header("cf-connecting-ip"));
        if (cloudflareIP) return cloudflareIP;
    }

    return peerAddress ?? "unknown";
}

function validAddress(value: string | undefined): string | undefined {
    const address = value?.trim();
    return address && isIP(address) ? address : undefined;
}

function singleAddress(value: string | undefined): string | undefined {
    if (!value || value.includes(",")) return undefined;
    return validAddress(value);
}
