// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Browser CSRF transport: the cookie that carries the browser nonce and the two
 * places a browser may return the token derived from it.
 */
import { isSecureCookieRequest } from "./session";

export const BROWSER_NONCE_COOKIE = "browser_nonce";
export const CSRF_TOKEN_HEADER = "x-csrf-token";
export const CSRF_FORM_FIELD = "csrf";

/**
 * The nonce cookie is not a credential, but it is the value the token is bound
 * to, so it gets the same protective flags as the auth cookie.
 */
export function browserNonceCookieOptions(forwardedProto?: string | null) {
    return {
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const,
        secure: isSecureCookieRequest(forwardedProto),
    };
}
