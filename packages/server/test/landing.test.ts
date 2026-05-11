// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";

describe("Landing", () => {
    test("GET / returns HTML hub page", async () => {
        const res = await app.request("/");
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(res.headers.get("content-type")).toMatch(/text\/html/);
        expect(text).toContain("Why choose Stacks?");
        expect(text).toContain("What makes Stacks great");
        expect(text).toContain('href="/login"');
        expect(text).toContain('href="/register"');
        expect(text).toContain('href="/app"');
        expect(text).toContain('href="/health"');
        expect(text).toContain('href="/ping"');
        expect(text).not.toContain("{{versionServer}}");
        expect(text).not.toContain("{{versionApp}}");
    });
});
