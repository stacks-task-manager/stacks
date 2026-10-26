// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Script-context encoding (S04): pure logic over synthetic fixtures.
 */
import { describe, expect, it } from "vitest";
import { createInlineScriptNonce, scriptSafeJson } from "../scriptContext";

describe("script context encoding", () => {
    it("escapes the HTML script terminator inside embedded strings", () => {
        const json = scriptSafeJson({ error: '</script><img src=x onerror="window.__securityProbe=1">' });
        expect(json).not.toContain("<");
        expect(json).toContain("\\u003c");
        expect(JSON.parse(json)).toEqual({
            error: '</script><img src=x onerror="window.__securityProbe=1">',
        });
    });

    it("escapes Unicode line separators that are invalid in JavaScript strings", () => {
        const json = scriptSafeJson({ v: "a\u2028b\u2029c" });
        expect(json).not.toContain("\u2028");
        expect(json).not.toContain("\u2029");
        expect(json).toContain("\\u2028");
        expect(json).toContain("\\u2029");
        expect(JSON.parse(json)).toEqual({ v: "a\u2028b\u2029c" });
    });

    it("leaves ordinary payloads unchanged", () => {
        expect(scriptSafeJson({ type: "GOOGLE_AUTH_SUCCESS" })).toBe('{"type":"GOOGLE_AUTH_SUCCESS"}');
        expect(scriptSafeJson("http://localhost:3000")).toBe('"http://localhost:3000"');
    });

    it("produces a fresh nonce per call", () => {
        const nonces = new Set<string>();
        for (let i = 0; i < 50; i += 1) {
            nonces.add(createInlineScriptNonce());
        }
        expect(nonces.size).toBe(50);
    });
});
