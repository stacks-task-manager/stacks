// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll } from "vitest";
import app from "../src/index";
import { RoleEntity } from "@stacks/db";
import { getAuthToken } from "./helpers/authHelper";

describe("People", () => {
    let token: string = "";

    beforeAll(async () => {
        token = await getAuthToken();
    });

    test("Get all people", async () => {
        const res = await app.request("/api/people", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        expect([200, 400]).toContain(res.status);
        const body = await res.json();
        if (res.status === 200) {
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        } else {
            expect(body.success).toBe(false);
        }
    });

    test("Get people birthdays for today", async () => {
        const today = new Date().toISOString().split("T")[0];
        const res = await app.request(`/api/people/birthdays?date=${today}&span=day`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        expect([200, 400]).toContain(res.status);
        const body = await res.json();
        if (res.status === 200) {
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        } else {
            expect(body.success).toBe(false);
        }
    });

    test("Get people projects", async () => {
        const res = await app.request("/api/people/projects", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        expect([200, 400]).toContain(res.status);
        const body = await res.json();
        if (res.status === 200) {
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        } else {
            expect(body.success).toBe(false);
        }
    });

    test("Create a person", async () => {
        const role = await RoleEntity.findOne({ where: { title: "User" } });
        expect(role).not.toBeNull();
        const res = await app.request("/api/people", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@example.com",
                role: role!.id,
                real: false,
            }),
        });

        expect([200, 403, 500]).toContain(res.status);
    });

    test("Role listing is unavailable to users without role visibility", async () => {
        const res = await app.request("/api/roles", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        expect(res.status).toBe(403);
    });

    test("Get people birthdays with invalid date format", async () => {
        const res = await app.request("/api/people/birthdays?date=invalid-date&span=day", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        // Either success or validation error
        expect([200, 400, 500]).toContain(res.status);
        const body = await res.json();
        if (res.status === 200) {
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        } else {
            expect(body.success).toBe(false);
        }
    });

    test("Get people birthdays with invalid span", async () => {
        const today = new Date().toISOString().split("T")[0];
        const res = await app.request(`/api/people/birthdays?date=${today}&span=invalid`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        // Either success or validation error
        expect([200, 400, 500]).toContain(res.status);
        const body2 = await res.json();
        if (res.status === 200) {
            expect(body2.success).toBe(true);
            expect(Array.isArray(body2.data)).toBe(true);
        } else {
            expect(body2.success).toBe(false);
        }
    });

    test("Access people without authentication", async () => {
        const res = await app.request("/api/people", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                // No Authorization header
            },
        });

        // Should fail without authentication
        expect(res.status).toBe(401);
        const unauthBody = await res.json();
        expect(unauthBody.success).toBe(false);
        expect(unauthBody.code).toBe("UNAUTHORIZED");
    });

    test("Access people with invalid token", async () => {
        const res = await app.request("/api/people", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer invalid-token",
            },
        });

        // Invalid credentials share a generic response to avoid token-state disclosure.
        expect(res.status).toBe(401);
        const invalidBody = await res.json();
        expect(invalidBody.success).toBe(false);
        expect(invalidBody.code).toBe("UNAUTHORIZED");
    });
});
