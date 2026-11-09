// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * T04 / S04 — the Google OAuth callback embeds request data inside an inline <script>
 * element. JSON serialization keeps the HTML script terminator verbatim, so a callback
 * `error` (or an Origin-derived postMessage target) containing `</script>` closes the
 * script element and introduces markup the browser then executes.
 * Expected: a constant public error code, script-context escaping for embedded values,
 * and a per-response inline-script nonce mirrored into a CSP header.
 */
import { describe, test, expect } from "vitest";
import app from "../../src/index";
import { getAuthenticatedHeaders } from "../helpers/authHelper";

const probe = '</script><img src=x onerror="window.__securityProbe=1">';
const aliases = ["/api/google/callback", "/api/integrations/google/callback"];

const occurrences = (text: string, needle: string) => text.split(needle).length - 1;
const withoutAppOrigin = async <T>(run: () => Promise<T>): Promise<T> => {
    const original = process.env.APP_ORIGIN;
    delete process.env.APP_ORIGIN;
    try {
        return await run();
    } finally {
        if (original === undefined) delete process.env.APP_ORIGIN;
        else process.env.APP_ORIGIN = original;
    }
};

describe("Google OAuth callback script context", () => {
    test("provider query errors are never reflected as markup", async () => {
        const headers = await getAuthenticatedHeaders();
        for (const path of aliases) {
            const res = await app.request(`${path}?error=${encodeURIComponent(probe)}`, { headers });
            expect(res.status).toBe(200);
            const html = await res.text();
            expect(res.headers.get("content-type")).toContain("text/html");
            expect(html).toContain("GOOGLE_AUTH_ERROR");
            expect(html).not.toContain("__securityProbe");
            expect(html).not.toContain("<img");
            expect(occurrences(html, "</script>")).toBe(1);
        }
    });

    test("request-derived postMessage targets are escaped for script context", async () => {
        await withoutAppOrigin(async () => {
            const headers = { ...(await getAuthenticatedHeaders()), Origin: probe };
            const res = await app.request("/api/google/callback?error=access_denied", { headers });
            expect(res.status).toBe(200);
            const html = await res.text();
            expect(html).toContain("\\u003cimg");
            expect(html).not.toContain("<img");
            expect(occurrences(html, "</script>")).toBe(1);
        });
    });

    test("inline script carries a per-response nonce in the CSP header", async () => {
        const headers = await getAuthenticatedHeaders();
        const first = await app.request("/api/google/callback?error=access_denied", { headers });
        const second = await app.request("/api/google/callback?error=access_denied", { headers });
        expect(first.status).toBe(200);
        expect(second.status).toBe(200);

        const firstNonce = (await first.text()).match(/<script nonce="([^"]+)"/);
        const secondNonce = (await second.text()).match(/<script nonce="([^"]+)"/);
        expect(firstNonce).not.toBeNull();
        expect(secondNonce).not.toBeNull();
        expect(firstNonce?.[1]).not.toBe(secondNonce?.[1]);

        const csp = first.headers.get("content-security-policy");
        expect(csp).not.toBeNull();
        expect(csp).toContain(`'nonce-${firstNonce?.[1]}'`);
    });

    test("both route aliases serve the same inert document for ordinary errors", async () => {
        const headers = await getAuthenticatedHeaders();
        for (const path of aliases) {
            const res = await app.request(`${path}?error=access_denied`, { headers });
            expect(res.status).toBe(200);
            const html = await res.text();
            expect(html).toContain("GOOGLE_AUTH_ERROR");
            expect(html).toContain('code":"oauth_error"');
            expect(occurrences(html, "</script>")).toBe(1);
            expect(occurrences(html, "<script")).toBe(1);
        }
    });
});
