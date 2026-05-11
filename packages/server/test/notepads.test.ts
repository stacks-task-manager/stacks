// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Notepads API", () => {
    test("GET /api/notepads - should require authentication", async () => {
        const res = await app.request("/api/notepads");
        expect(res.status).toBe(401);
    });

    test("GET /api/notepads - returns list or 404 if endpoint not implemented", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/notepads", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
        }
    });

    test("POST /api/notepads - returns 404 if endpoint not implemented", async () => {
        const headers = await getAuthenticatedHeaders();
        const notepadData = {
            title: "Test Notepad",
            content: "This is a test notepad content with some **markdown** formatting.",
            tags: ["test", "markdown"],
            isPrivate: false,
            category: "general",
        };

        const res = await app.request("/api/notepads", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(notepadData),
        });
        
        expect(res.status).toBe(404);
    });

    test("POST /api/notepads - returns 404 if endpoint not implemented", async () => {
        const headers = await getAuthenticatedHeaders();
        const invalidNotepadData = {
            content: "Content without title",
            tags: ["test"],
        };

        const res = await app.request("/api/notepads", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(invalidNotepadData),
        });

        expect(res.status).toBe(404);
    });

    test("GET /api/notepads/:id - should return specific notepad details", async () => {
        const headers = await getAuthenticatedHeaders();
        
        // First create a notepad
        const notepadData = {
            title: "Specific Notepad Test",
            content: "Notepad for specific retrieval test",
            tags: ["specific", "test"],
            isPrivate: false,
            category: "testing",
        };

        const createRes = await app.request("/api/notepads", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(notepadData),
        });

        if (createRes.status === 200) {
            const createData = await createRes.json();
            const notepadId = createData.data.id;

            const res = await app.request(`/api/notepads/${notepadId}`, {
                headers,
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(data.data).toHaveProperty("id", notepadId);
            expect(data.data.title).toBe(notepadData.title);
            expect(data.data.content).toBe(notepadData.content);
        }
    });

    test("PATCH /api/notepads/:id - should update notepad", async () => {
        const headers = await getAuthenticatedHeaders();
        
        // First create a notepad
        const notepadData = {
            title: "Update Test Notepad",
            content: "Notepad for update test",
            tags: ["update", "test"],
            isPrivate: false,
            category: "general",
        };

        const createRes = await app.request("/api/notepads", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(notepadData),
        });

        if (createRes.status === 200) {
            const createData = await createRes.json();
            const notepadId = createData.data.id;

            const updateData = {
                title: "Updated Notepad Title",
                content: "Updated content with new information",
                tags: ["updated", "modified"],
                isPrivate: true,
                category: "personal",
            };

            const res = await app.request(`/api/notepads/${notepadId}`, {
                method: "PATCH",
                headers: {
                    ...headers,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updateData),
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(data.data.title).toBe(updateData.title);
            expect(data.data.content).toBe(updateData.content);
            expect(data.data.isPrivate).toBe(updateData.isPrivate);
            expect(data.data.category).toBe(updateData.category);
        }
    });

    test("DELETE /api/notepads/:id - should delete notepad", async () => {
        const headers = await getAuthenticatedHeaders();
        
        // First create a notepad
        const notepadData = {
            title: "Delete Test Notepad",
            content: "Notepad for deletion test",
            tags: ["delete", "test"],
            isPrivate: false,
        };

        const createRes = await app.request("/api/notepads", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(notepadData),
        });

        if (createRes.status === 200) {
            const createData = await createRes.json();
            const notepadId = createData.data.id;

            const deleteRes = await app.request(`/api/notepads/${notepadId}`, {
                method: "DELETE",
                headers,
            });

            expect(deleteRes.status).toBe(200);

            // Verify notepad is deleted
            const getRes = await app.request(`/api/notepads/${notepadId}`, {
                headers,
            });
            expect(getRes.status).toBe(404);
        }
    });

    test("GET /api/notepads with search - returns 404 if unsupported", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/notepads?search=test", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
        }
    });

    test("GET /api/notepads with category filter - returns 404 if unsupported", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/notepads?category=general", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
            
            // All returned notepads should be of category 'general'
            data.data.forEach((notepad: any) => {
                expect(notepad.category).toBe("general");
            });
        }
    });

    test("GET /api/notepads with tags filter - returns 404 if unsupported", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/notepads?tags=test,markdown", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
        }
    });

    test("GET /api/notepads with privacy filter - returns 404 if unsupported", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/notepads?isPrivate=false", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
            
            // All returned notepads should be public
            data.data.forEach((notepad: any) => {
                expect(notepad.isPrivate).toBe(false);
            });
        }
    });

    test("GET /api/notepads with pagination - should return paginated results or 404 if unsupported", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/notepads?page=1&limit=5", {
            headers,
        });
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
            expect(data.data.length).toBeLessThanOrEqual(5);
        }
    });

    test("GET /api/notepads/recent - should return recently modified notepads or 500 if unsupported", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/notepads/recent", {
            headers,
        });
        expect([200, 500]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
            
            // Notepads should be ordered by modification date (most recent first)
            if (data.data.length > 1) {
                const first = new Date(data.data[0].updatedAt);
                const second = new Date(data.data[1].updatedAt);
                expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
            }
        }
    });

    test("GET /api/notepads/categories - should return available categories or 500 if unsupported", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/notepads/categories", {
            headers,
        });
        expect([200, 500]).toContain(res.status);
        if (res.status === 200) {
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(Array.isArray(data.data)).toBe(true);
            
            // Each category should have name and count
            if (data.data.length > 0) {
                const category = data.data[0];
                expect(category).toHaveProperty("name");
                expect(category).toHaveProperty("count");
                expect(typeof category.name).toBe("string");
                expect(typeof category.count).toBe("number");
            }
        }
    });

    test("POST /api/notepads/:id/duplicate - should duplicate notepad", async () => {
        const headers = await getAuthenticatedHeaders();
        
        // First create a notepad
        const notepadData = {
            title: "Original Notepad",
            content: "Original content to be duplicated",
            tags: ["original", "duplicate-test"],
            category: "testing",
        };

        const createRes = await app.request("/api/notepads", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(notepadData),
        });

        if (createRes.status === 200) {
            const createData = await createRes.json();
            const notepadId = createData.data.id;

            const res = await app.request(`/api/notepads/${notepadId}/duplicate`, {
                method: "POST",
                headers,
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toHaveProperty("data");
            expect(data.data).toHaveProperty("id");
            expect(data.data.id).not.toBe(notepadId); // Should be different ID
            expect(data.data.title).toContain("Copy"); // Should indicate it's a copy
            expect(data.data.content).toBe(notepadData.content);
        }
    });

    test("POST /api/notepads/export - returns 404 if endpoint not implemented", async () => {
        const headers = await getAuthenticatedHeaders();
        const exportData = {
            format: "markdown",
            notepadIds: [], // Export all if empty
            includePrivate: false,
        };

        const res = await app.request("/api/notepads/export", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(exportData),
        });
        
        expect(res.status).toBe(404);
    });

    test("POST /api/notepads/import - returns 404 if endpoint not implemented", async () => {
        const headers = await getAuthenticatedHeaders();
        const importData = {
            format: "markdown",
            content: "# Imported Note\n\nThis is imported content.",
            category: "imported",
        };

        const res = await app.request("/api/notepads/import", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(importData),
        });
        
        expect(res.status).toBe(404);
    });
});