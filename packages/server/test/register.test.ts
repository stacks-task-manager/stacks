// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";

describe("Register HTML", () => {
    test("GET /register returns register page HTML with tenant options", async () => {
        const res = await app.request("/register");
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toMatch(/text\/html/);
        const text = await res.text();
        expect(text).toContain("Create your account");
        expect(text).toContain('id="tenant"');
        expect(text).toContain("Please select a tenant");
    });

    test("GET /register - renders tenant option placeholder", async () => {
        const res = await app.request("/register");
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("<option value=\"\" selected>Please select a tenant</option>");
    });
});
