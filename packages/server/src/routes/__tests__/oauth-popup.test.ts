// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * T04 / S04 — the OAuth popup document must stay inert for any embedded value, and its
 * inline script must carry a nonce that the CSP header allows.
 */
import { describe, expect, it } from "vitest";
import { popupHtml } from "../googleAuth";

const occurrences = (text: string, needle: string) => text.split(needle).length - 1;
const probe = '</script><img src=x onerror="window.__securityProbe=1">';

describe("Google OAuth popup document", () => {
    it("the success document posts a constant payload to the opener", () => {
        const { html, headers } = popupHtml(
            "http://localhost:3000",
            { type: "GOOGLE_AUTH_SUCCESS" },
            "Done."
        );
        expect(html).toContain('postMessage({"type":"GOOGLE_AUTH_SUCCESS"}, "http://localhost:3000")');
        expect(occurrences(html, "</script>")).toBe(1);
        expect(occurrences(html, "<script")).toBe(1);
        const nonce = html.match(/<script nonce="([^"]+)"/)?.[1];
        expect(nonce).toBeTruthy();
        expect(headers["Content-Security-Policy"]).toBe(`script-src 'nonce-${nonce}'`);
    });

    it("hostile embedded values stay inside the string literal", () => {
        const { html } = popupHtml(
            "http://localhost:3000",
            { type: "GOOGLE_AUTH_ERROR", error: probe },
            "Failed."
        );
        expect(occurrences(html, "</script>")).toBe(1);
        expect(html).not.toContain("<img");
        expect(html).toContain("\\u003cimg");
        expect(html).not.toContain('<script nonce="">');
    });

    it("hostile origins cannot open a new element", () => {
        const { html } = popupHtml(probe, { type: "GOOGLE_AUTH_ERROR" }, "Failed.");
        expect(occurrences(html, "</script>")).toBe(1);
        expect(html).not.toContain("<img");
    });

    it("each document gets its own nonce", () => {
        const first = popupHtml("http://localhost:3000", { type: "GOOGLE_AUTH_SUCCESS" }, "Done.");
        const second = popupHtml("http://localhost:3000", { type: "GOOGLE_AUTH_SUCCESS" }, "Done.");
        const nonceOf = (html: string) => html.match(/<script nonce="([^"]+)"/)?.[1];
        expect(nonceOf(first.html)).not.toBe(nonceOf(second.html));
    });
});
