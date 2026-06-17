// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Google Auth API", () => {
    test("GET /api/google/status - should require authentication", async () => {
        const res = await app.request("/api/google/status");
        expect(res.status).toBe(401);
    });

    test("GET /api/google/status - should return unauthenticated when no tokens", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/google/status", { headers });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body).toHaveProperty("data");
        expect(body.data).toHaveProperty("isAuthenticated");
        expect(body.data.isAuthenticated).toBe(false);
        expect(body.data.provider).toBe("google");
    });

    test("DELETE /api/google/disconnect - should succeed", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/google/disconnect", {
            method: "DELETE",
            headers,
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
    });

    test("GET /api/google/auth-url - should return an auth URL", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/google/auth-url", { headers });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("authUrl");
        expect(typeof body.data.authUrl).toBe("string");
    });
});
