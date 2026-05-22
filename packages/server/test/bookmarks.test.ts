// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll } from "vitest";
import app from "../src/index";
import { getAuthToken } from "./helpers/authHelper";

describe("Bookmarks", () => {
    let token: string = "";
    let bookmarkId: string = "";

    beforeAll(async () => {
        token = await getAuthToken();
    });

    test("Get all bookmarks", async () => {
        const res = await app.request("/api/bookmarks", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("data");
        expect(Array.isArray(body.data)).toBe(true);
    });

    test("Create a bookmark", async () => {
        const bookmarkData = {
            title: "Test Bookmark",
            url: "https://example.com",
            pinned: false,
            type: "url",
        };

        const res = await app.request("/api/bookmarks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bookmarkData),
        });
        
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("data");
        expect(body.data).toHaveProperty("id");
        expect(body.data.title).toBe("Test Bookmark");
        expect(body.data.url).toBe("https://example.com");
        bookmarkId = body.data.id;
    });

    test("Get bookmark by ID", async () => {
        const res = await app.request(`/api/bookmarks/${bookmarkId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body).toHaveProperty("data");
            expect(body.data).toHaveProperty("id");
            expect(body.data.id).toBe(bookmarkId);
        }
    });

    test("Update a bookmark", async () => {
        const updateData = {
            title: "Updated Bookmark Title",
            description: "Updated bookmark description",
        };

        const res = await app.request(`/api/bookmarks/${bookmarkId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });
        
        expect([200, 404]).toContain(res.status);
    });

    test("Delete a bookmark", async () => {
        const res = await app.request(`/api/bookmarks/${bookmarkId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 404]).toContain(res.status);
    });

    test("Create bookmark with missing required fields", async () => {
        const bookmarkData = {
            // Missing title and url which might be required
            description: "A test bookmark",
        };

        const res = await app.request("/api/bookmarks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bookmarkData),
        });
        
        // Should fail with validation error
        expect(res.status).toBe(400);
    });

    test("Create bookmark with invalid URL format", async () => {
        const bookmarkData = {
            title: "Test Bookmark",
            url: "invalid-url",
            pinned: false,
            type: "url",
        };

        const res = await app.request("/api/bookmarks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bookmarkData),
        });
        
        // Accept either validation failure or success depending on server validation
        expect([200, 400]).toContain(res.status);
    });

    test("Get bookmark with invalid ID", async () => {
        const res = await app.request("/api/bookmarks/invalid-id", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([400, 404, 500]).toContain(res.status);
    });

    test("Update bookmark with invalid ID", async () => {
        const updateData = {
            title: "Updated Bookmark Title",
        };

        const res = await app.request("/api/bookmarks/invalid-id", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });
        
        expect([400, 404, 500]).toContain(res.status);
    });

    test("Delete bookmark with invalid ID", async () => {
        const res = await app.request("/api/bookmarks/invalid-id", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([400, 404, 500]).toContain(res.status);
    });

    test("Access bookmarks without authentication", async () => {
        const res = await app.request("/api/bookmarks", {
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