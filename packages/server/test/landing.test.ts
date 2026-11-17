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
        expect(text).toContain("Stacks — Self-hosted project management");
        expect(text).toContain("Your work.");
        expect(text).toContain("Your server. Your data. Your rules.");
        expect(text).toContain("Ready when you are.");
        expect(text).toContain('href="/static/assets/css/landing.css"');
        expect(text).toContain('data-testid="landing-product-preview"');
        expect(text).toContain('data-testid="landing-mobile-menu"');
        expect(text).toContain('data-testid="landing-instance-status"');
        expect(text).not.toContain("placehold.co");
        expect(text).toContain('href="/login"');
        expect(text).toContain('href="/register"');
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
        expect(text).toContain("An administrator must create or invite accounts.");
        expect(text).toContain("Contact your administrator for account help.");
        expect(text).toContain('href="/login"');
        expect(text).toContain('data-testid="landing-registration-disabled"');
    });
});
