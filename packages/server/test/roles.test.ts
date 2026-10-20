// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import { randomUUID } from "node:crypto";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Roles API", () => {
    test("GET /api/roles - should require authentication", async () => {
        const res = await app.request("/api/roles");
        expect(res.status).toBe(401);
    });

    test("GET /api/roles - should deny users without role visibility", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/roles", { headers });
        expect(res.status).toBe(403);
    });

    test("POST /api/roles - should deny role creation to non-admins", async () => {
        const headers = await getAuthenticatedHeaders();
        const roleData = {
            title: "Test Role",
            description: "Test role description",
            access: {
                projects: { view: true },
            },
        };

        const res = await app.request("/api/roles", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(roleData),
        });

        expect(res.status).toBe(403);
    });

    test("PATCH /api/roles/:id - should deny role updates to non-admins", async () => {
        const headers = await getAuthenticatedHeaders();
        const patchRes = await app.request(`/api/roles/${randomUUID()}`, {
            method: "PATCH",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ title: "attempted update", access: { projects: { view: true } } }),
        });
        expect(patchRes.status).toBe(403);
    });
});
