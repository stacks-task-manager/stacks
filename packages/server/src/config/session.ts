// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Auth session policy: one absolute lifetime, fixed issuer/audience, and the
 * protective cookie flags shared by every browser transport.
 */

export const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_ISSUER = "stacks";
export const SESSION_AUDIENCE = "stacks-client";

/**
 * A session cookie may never outlive the token it carries, so its Max-Age is the
 * remaining token lifetime. Tokens without a usable `exp` get no Max-Age (the
 * cookie stays a session cookie instead of a long-lived one).
 */
export function cookieMaxAgeSeconds(token: string): number | undefined {
    const exp = tokenClaims(token)?.exp;
    if (typeof exp !== "number" || !Number.isFinite(exp)) {
        return undefined;
    }
    const remaining = exp - Math.floor(Date.now() / 1000);
    return remaining > 0 ? remaining : undefined;
}

export function tokenClaims(token: string): Record<string, any> | null {
    const parts = token.split(".");
    if (parts.length !== 3) {
        return null;
    }
    try {
        return JSON.parse(Buffer.from(parts[1], "base64").toString());
    } catch (error) {
        return null;
    }
}

/**
 * Non-Secure is only allowed for explicit local development/test origins; a
 * proxied HTTPS deployment or a production build always sets `Secure`.
 */
export function isSecureCookieRequest(forwardedProto?: string | null): boolean {
    if (process.env.NODE_ENV === "production") {
        return true;
    }
    return (forwardedProto ?? "").trim().split(",")[0] === "https";
}

/** Cookie settings for the signed `auth_token`; bounded by the token's expiry. */
export function authCookieOptions(token: string, secure: boolean) {
    const maxAge = cookieMaxAgeSeconds(token);
    return {
        httpOnly: true,
        sameSite: "Lax" as const,
        path: "/",
        secure,
        ...(maxAge === undefined ? {} : { maxAge }),
    };
}

/** Settings for the non-authoritative hint cookies (`uid`, `tenant`). */
export const HINT_COOKIE_OPTS = { path: "/", httpOnly: true, sameSite: "Lax" as const };
