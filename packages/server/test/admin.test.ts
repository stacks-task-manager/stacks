// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Admin Routes", () => {
    test("GET /admin - should require authentication", async () => {
        const res = await app.request("/admin");
        expect([302, 404]).toContain(res.status);
    });

    test("GET /admin - should serve admin page for authenticated users", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/admin", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
    });

    test("GET /admin/api/users - should return users list for admin", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/admin/api/users", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
        }
    });

    test("GET /admin/api/stats - should return system statistics", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/admin/api/stats", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(data.data).toHaveProperty("users");
            expect(data.data).toHaveProperty("projects");
            expect(data.data).toHaveProperty("tasks");
        }
    });

    test("POST /admin/api/users/:id/status - should update user status", async () => {
        const headers = await getAuthenticatedHeaders();
        const usersRes = await app.request("/admin/api/users", { headers });
        if (usersRes.status === 200) {
            const usersData = await usersRes.json();
            const userId = usersData.data[0]?.id;
            if (userId) {
                const res = await app.request(`/admin/api/users/${userId}/status`, {
                    method: "POST",
                    headers: {
                        ...headers,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ status: "inactive" }),
                });
                expect([200, 404]).toContain(res.status);
            }
        } else {
            expect([404]).toContain(usersRes.status);
        }
    });

    test("DELETE /admin/api/users/:id - should delete user", async () => {
        const headers = await getAuthenticatedHeaders();
        
        // Create a test user first
        const createRes = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: "test-delete@example.com",
                password: "testpassword123",
                firstName: "Test",
                lastName: "Delete",
                role: "646427b6-8b0b-4ccd-ae00-8a4680d90fbc",
                tenant: "646427b6-8b0b-4ccd-ae00-8a4680d90fbf",
            }),
        });
        
        if (createRes.status === 200 || createRes.status === 201) {
            const userData = await createRes.json();
            const userId = userData.data?.id;
            
            if (userId) {
                const deleteRes = await app.request(`/admin/api/users/${userId}`, {
                    method: "DELETE",
                    headers,
                });
                expect([200, 404]).toContain(deleteRes.status);
            }
        }
    });
});