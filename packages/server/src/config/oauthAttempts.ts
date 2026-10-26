// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Google OAuth attempt policy: one absolute lifetime for a flow, the name of the
 * browser-nonce cookie, and its flags. The cookie is a same-site hint, never a
 * credential, so it is never allowed to outlive the attempt it binds.
 */

export const OAUTH_ATTEMPT_LIFETIME_MS = 10 * 60 * 1000;

export const OAUTH_NONCE_COOKIE = "stacks_oauth_nonce";

/**
 * Cookie settings for the browser-nonce cookie. `Secure` follows the same rule as
 * the auth cookie: production and proxied-HTTPS requests only.
 */
export function oauthNonceCookieOptions(secure: boolean) {
    return {
        httpOnly: true,
        sameSite: "Lax" as const,
        path: "/",
        secure,
        maxAge: Math.floor(OAUTH_ATTEMPT_LIFETIME_MS / 1000),
    };
}
