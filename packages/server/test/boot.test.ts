// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Boot API", () => {
    test("GET /api/boot without auth returns 401", async () => {
        const res = await app.request("/api/boot");
        expect(res.status).toBe(401);
    });

    test("GET /api/boot - returns license, translations, preferences, and AI chat config", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/boot", {
            headers,
        });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toHaveProperty("success", true);
        expect(body).toHaveProperty("data");

        const data = body.data;
        expect(data).toHaveProperty("license");
        expect(data).toHaveProperty("translations");
        expect(data).toHaveProperty("preferences");
        expect(data).toHaveProperty("aiChat");

        // License shape
        expect(data.license).toHaveProperty("type");
        expect(Array.isArray(data.license.tenants)).toBe(true);

        // Translations are an object (merged locale map)
        expect(typeof data.translations).toBe("object");

        // Preferences are an object
        expect(typeof data.preferences).toBe("object");

        // AI chat config is an object
        expect(typeof data.aiChat).toBe("object");
    });

    test("GET /api/boot - translations depend on Accept-Language header", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/boot", {
            headers: {
                ...headers,
                "Accept-Language": "en",
            },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.translations).toBeDefined();
    });
});
