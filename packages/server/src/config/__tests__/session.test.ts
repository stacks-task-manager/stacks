// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Session policy (T05): pure checks over synthetic tokens, no DB involved.
 */
import { describe, expect, it } from "vitest";
import { SESSION_AUDIENCE, SESSION_ISSUER, SESSION_LIFETIME_SECONDS, authCookieOptions, cookieMaxAgeSeconds, isSecureCookieRequest } from "../session";

/** Builds an unsigned stand-in for a session token; only the claims matter here. */
const mintClaims = (claims: Record<string, any>): string => {
    const encode = (value: string) => Buffer.from(value).toString("base64");
    return [encode('{"alg":"HS256","typ":"JWT"}'), encode(JSON.stringify(claims)), "signature"].join(".");
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe("session lifetime and cookie bounds", () => {
    it("publishes a seven-day absolute lifetime with fixed issuer and audience", () => {
        expect(SESSION_LIFETIME_SECONDS).toBe(60 * 60 * 24 * 7);
        expect(SESSION_ISSUER).toBe("stacks");
        expect(SESSION_AUDIENCE).toBe("stacks-client");
    });

    it("bounds cookie Max-Age by the token's own remaining expiry", () => {
        const exp = nowSeconds() + 1234;
        const maxAge = cookieMaxAgeSeconds(mintClaims({ exp }));
        expect(maxAge).toBeLessThanOrEqual(1234);
        expect(maxAge).toBeGreaterThan(1224);
    });

    it("drops Max-Age for expired or unusable claims instead of going negative", () => {
        expect(cookieMaxAgeSeconds(mintClaims({ exp: nowSeconds() - 1 }))).toBeUndefined();
        expect(cookieMaxAgeSeconds(mintClaims({}))).toBeUndefined();
        expect(cookieMaxAgeSeconds("not-a-jwt")).toBeUndefined();
    });

    it("always sets the protective flags and never widens them", () => {
        const options = authCookieOptions(mintClaims({ exp: nowSeconds() + 600 }), true);
        expect(options.httpOnly).toBe(true);
        expect(options.sameSite).toBe("Lax");
        expect(options.path).toBe("/");
        expect(options.secure).toBe(true);
        expect(options.maxAge).toBeLessThanOrEqual(600);
    });

    it("keeps a local development cookie non-Secure only when the request is not HTTPS", () => {
        expect(isSecureCookieRequest("https")).toBe(true);
        expect(isSecureCookieRequest("https, http")).toBe(true);
        expect(isSecureCookieRequest("http")).toBe(false);
        expect(isSecureCookieRequest(null)).toBe(false);
    });
});
