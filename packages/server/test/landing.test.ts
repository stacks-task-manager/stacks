// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, test, expect } from "vitest";
import app from "../src/index";

describe("Landing", () => {
    afterEach(() => {
        process.env.REGISTRATION_ENABLED = "true";
        process.env.PASSWORD_RECOVERY_ENABLED = "true";
    });

    test("GET / returns HTML hub page", async () => {
        const res = await app.request("/");
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(res.headers.get("content-type")).toMatch(/text\/html/);
        expect(text).toContain("Why choose Stacks?");
        expect(text).toContain("What makes Stacks great");
        expect(text).toContain("How it works");
        expect(text).toContain("Backup, export, and deploy with care");
        expect(text).toContain("prefers-reduced-motion: reduce");
        expect(text).toContain("product-preview");
        expect(text).not.toContain("placehold.co");
        expect(text).toContain('href="/login"');
        expect(text).toContain('href="/register"');
        expect(text).toContain('href="/app"');
        expect(text).toContain('href="/health"');
        expect(text).toContain('href="/ping"');
        expect(text).not.toContain("{{versionServer}}");
        expect(text).not.toContain("{{versionApp}}");
    });

    test("feature-dependent links and recovery notice reflect disabled flags", async () => {
        process.env.REGISTRATION_ENABLED = "false";
        process.env.PASSWORD_RECOVERY_ENABLED = "false";
        const res = await app.request("/");
        const text = await res.text();
        expect(text).not.toContain('href="/register"');
        expect(text).toContain("disabled on this server");
        expect(text).toContain('href="/login"');
        expect(text).toContain('href="/app"');
    });
});
