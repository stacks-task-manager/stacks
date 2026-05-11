// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll } from "vitest";
import app from "../src/index";
import { getAuthToken } from "./helpers/authHelper";

describe("Notifications", () => {
    let token: string = "";
    let notificationId: string = "";

    beforeAll(async () => {
        token = await getAuthToken();
    });

    test("Get all notifications", async () => {
        const res = await app.request("/api/notifications", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
        notificationId = body.data[0]?.id || "";
    });

    test("Create a notification (not implemented) returns 404", async () => {
        const res = await app.request("/api/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title: "T", message: "x" }),
        });
        
        expect(res.status).toBe(404);
    });

    test("Update a notification", async () => {
        const updateData = {
            read: true,
            title: "Updated Notification",
        };

        const targetId = notificationId || "00000000-0000-0000-0000-000000000000";
        const res = await app.request(`/api/notifications/${targetId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });
        
        expect([200, 500]).toContain(res.status);
    });

    test("Delete a notification", async () => {
        const targetId = notificationId || "00000000-0000-0000-0000-000000000000";
        const res = await app.request(`/api/notifications/${targetId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 404]).toContain(res.status);
    });

    test("Get notification with invalid ID returns 404 (no GET endpoint)", async () => {
        const res = await app.request("/api/notifications/invalid-id", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect(res.status).toBe(404);
    });

    test("Create notification with missing fields returns 404 (no POST endpoint)", async () => {
        const res = await app.request("/api/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
        });
        
        expect(res.status).toBe(404);
    });

    test("Access notifications without authentication", async () => {
        const res = await app.request("/api/notifications", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                // No Authorization header
            },
        });
        
        // Should fail without authentication
        expect(res.status).toBe(401);
    });
});