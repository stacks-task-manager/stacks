// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Pure browser-CSRF primitives.
 *
 * A browser is given a random nonce in a signed HttpOnly cookie and the token it
 * must send back is an HMAC of that nonce keyed by the cookie secret, so a
 * cross-site form cannot read the cookie and cannot forge the token. Cookie
 * flags live in `config/browserCsrf`; the request gate lives in `middleware/auth`.
 */
import { createHmac, randomBytes } from "node:crypto";
import { timingSafeEqual } from "node:crypto";

/** Nonce width: 32 random bytes, the same opaque width the OAuth flows use. */
const NONCE_BYTES = 32;

/** Base64url without padding, so the value survives a cookie and a form field. */
function encodeOpaque(value: Buffer): string {
    return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createBrowserNonce(): string {
    return encodeOpaque(randomBytes(NONCE_BYTES));
}

/** The only token a browser may present for a given nonce. */
export function deriveBrowserToken(nonce: string, secret: string): string {
    return encodeOpaque(createHmac("sha256", secret).update(nonce).digest());
}

/** Constant-time compare of a candidate token against the derived one. */
export function browserTokenMatches(candidate: string | undefined, nonce: string, secret: string): boolean {
    if (!candidate || !nonce) {
        return false;
    }

    const expected = Buffer.from(deriveBrowserToken(nonce, secret), "utf8");
    const actual = Buffer.from(candidate, "utf8");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** The methods an HTML form or a cross-site fetch can issue. */
export function isBrowserUnsafeMethod(method: string): boolean {
    return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

/**
 * Whether a content type carries a form body whose hidden fields we can read.
 * Anything else (a raw upload stream, JSON) is never inspected.
 */
export function isFormContentType(contentType: string): boolean {
    const type = contentType.toLowerCase();
    return type.startsWith("application/x-www-form-urlencoded") || type.startsWith("multipart/form-data");
}

/**
 * Every value a parsed form body carries for `field`, duplicates included so the
 * caller can reject a body that tries to smuggle more than one token. Callers
 * must first check {@link isFormContentType} so a raw upload stream is never
 * parsed here.
 */
export function formTokenFields(body: FormData | null, field: string): string[] {
    if (!body) {
        return [];
    }
    const values: string[] = [];
    body.entries().forEach(([name, value]) => {
        if (name === field) {
            values.push(typeof value === "string" ? value : "");
        }
    });
    return values;
}
