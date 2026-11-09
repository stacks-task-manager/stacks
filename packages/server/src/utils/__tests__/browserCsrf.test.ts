// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * T08: the browser token is an HMAC of a nonce only the server can issue, and a
 * form body only yields a token when the field is actually present.
 */
import { describe, expect, it } from "vitest";
import {
    browserTokenMatches,
    createBrowserNonce,
    deriveBrowserToken,
    formTokenFields,
    isBrowserUnsafeMethod,
    isFormContentType,
} from "../browserCsrf";

const SECRET = "unit-test-cookie-secret";

describe("browser nonce and token derivation", () => {
    it("issues a base64url nonce that never repeats", () => {
        const nonces = new Set<string>();
        for (let index = 0; index < 50; index++) {
            const nonce = createBrowserNonce();
            expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
            expect(nonce.length).toBe(43);
            nonces.add(nonce);
        }
        expect(nonces.size).toBe(50);
    });

    it("derives the same token for the same nonce and secret", () => {
        const nonce = createBrowserNonce();
        expect(deriveBrowserToken(nonce, SECRET)).toBe(deriveBrowserToken(nonce, SECRET));
    });

    it("changes the token when the nonce or the secret changes", () => {
        const nonce = createBrowserNonce();
        const token = deriveBrowserToken(nonce, SECRET);
        expect(deriveBrowserToken(nonce + "x", SECRET) === token).toBe(false);
        expect(deriveBrowserToken(nonce, SECRET + "x") === token).toBe(false);
        expect(browserTokenMatches(token, nonce, SECRET)).toBe(true);
        expect(browserTokenMatches(token, nonce + "x", SECRET)).toBe(false);
        expect(browserTokenMatches(token, nonce, SECRET + "x")).toBe(false);
    });

    it("rejects a missing or forged candidate", () => {
        const nonce = createBrowserNonce();
        expect(browserTokenMatches(undefined, nonce, SECRET)).toBe(false);
        expect(browserTokenMatches("", nonce, SECRET)).toBe(false);
        expect(browserTokenMatches("forged-token", nonce, SECRET)).toBe(false);
        expect(browserTokenMatches(deriveBrowserToken(nonce, SECRET), "", SECRET)).toBe(false);
    });
});

describe("request shapes the policy inspects", () => {
    it("treats the four browser-unsafe methods alike", () => {
        for (const method of ["post", "put", "patch", "delete"]) {
            expect(isBrowserUnsafeMethod(method)).toBe(true);
            expect(isBrowserUnsafeMethod(method.toUpperCase())).toBe(true);
        }
        for (const method of ["GET", "HEAD", "OPTIONS"]) {
            expect(isBrowserUnsafeMethod(method)).toBe(false);
        }
    });

    it("only inspects form content types", () => {
        expect(isFormContentType("application/x-www-form-urlencoded")).toBe(true);
        expect(isFormContentType("multipart/form-data; boundary=abc")).toBe(true);
        expect(isFormContentType("application/json")).toBe(false);
        expect(isFormContentType("application/octet-stream")).toBe(false);
    });
});

describe("hidden form field extraction", () => {
    it("reads a hidden field that the form actually carries", () => {
        const body = new FormData();
        body.append("email", "a@b.example.com");
        body.append("csrf", "tok123");
        body.append("password", "x");
        expect(formTokenFields(body, "csrf")).toStrictEqual(["tok123"]);
    });

    it("keeps duplicate fields so the caller can reject a smuggled pair", () => {
        const body = new FormData();
        body.append("csrf", "one");
        body.append("email", "x");
        body.append("csrf", "two");
        expect(formTokenFields(body, "csrf")).toStrictEqual(["one", "two"]);
    });

    it("returns nothing when the field is absent", () => {
        const body = new FormData();
        body.append("email", "x");
        body.append("password", "y");
        expect(formTokenFields(body, "csrf")).toStrictEqual([]);
        expect(formTokenFields(null, "csrf")).toStrictEqual([]);
    });

    it("does not confuse a field name that merely contains the target", () => {
        const body = new FormData();
        body.append("csrfx", "one");
        body.append("xcsrf", "two");
        body.append("_csrf", "three");
        expect(formTokenFields(body, "csrf")).toStrictEqual([]);
    });

    it("treats a file part as not being a token", () => {
        const body = new FormData();
        body.append("csrf", new Blob(["tok123"]));
        expect(formTokenFields(body, "csrf")).toStrictEqual([""]);
    });
});
