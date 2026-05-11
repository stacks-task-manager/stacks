// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Search API", () => {
    test("GET /api/search - should require authentication", async () => {
        const res = await app.request("/api/search?query=test");
        expect(res.status).toBe(401);
    });

    test("GET /api/search - should validate query parameter", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/search", { headers });
        expect(res.status).toBe(400);
    });

    test("GET /api/search - should return search results", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/search?query=test", { headers });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });
});
