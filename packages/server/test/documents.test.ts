// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll } from "vitest";
import app from "../src/index";
import { getAuthToken } from "./helpers/authHelper";

describe("Documents", () => {
    let token: string = "";
    let documentId: string = "";

    beforeAll(async () => {
        token = await getAuthToken();
    });

    test("Get all documents with tags and statuses", async () => {
        const res = await app.request("/api/documents", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("data");
        expect(body.data).toHaveProperty("documents");
        expect(body.data).toHaveProperty("tags");
        expect(Array.isArray(body.data.documents)).toBe(true);
        expect(Array.isArray(body.data.tags)).toBe(true);
    });

    test("Create a document", async () => {
        const documentData = {
            title: "Test Document",
            type: "notepad",
            parent: null,
            data: {},
        };

        const res = await app.request("/api/documents", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(documentData),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("data");
        expect(body.data).toHaveProperty("id");
        expect(body.data.title).toBe("Test Document");
        documentId = body.data.id;
    });

    test("Update a document", async () => {
        const updateData = {
            title: "Updated Test Document",
            content: "This is updated content",
            description: "Updated description",
        };

        const res = await app.request(`/api/documents/${documentId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });

        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body).toHaveProperty("success");
        }
    });

    test("Rejects moving a document under one of its descendants", async () => {
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        };
        const createFolder = async (title: string) => {
            const response = await app.request("/api/documents", {
                method: "POST",
                headers,
                body: JSON.stringify({ title, type: "folder", parent: null }),
            });
            expect(response.status).toBe(200);
            return (await response.json()).data.id as string;
        };

        const parentId = await createFolder("Cycle test parent");
        const childId = await createFolder("Cycle test child");

        const allowedMove = await app.request(`/api/documents/${childId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ parent: parentId }),
        });
        expect(allowedMove.status).toBe(200);

        const cycleMove = await app.request(`/api/documents/${parentId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ parent: childId }),
        });
        expect(cycleMove.status).toBe(404);

        const list = await app.request("/api/documents", { headers });
        const documents = (await list.json()).data.documents as Array<{ id: string; parent: string }>;
        expect(documents.find(document => document.id === parentId)?.parent).toBe(
            "00000000-0000-0000-0000-000000000000"
        );
        expect(documents.find(document => document.id === childId)?.parent).toBe(parentId);
    });

    test("Delete a document", async () => {
        const res = await app.request(`/api/documents/${documentId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        expect([200, 404]).toContain(res.status);
    });

    test("Create document with missing required fields", async () => {
        const documentData = {
            // Missing title which might be required
            content: "This is a test document content",
        };

        const res = await app.request("/api/documents", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(documentData),
        });

        // Should fail with validation error
        expect(res.status).toBe(400);
    });

    test("Update document with invalid ID", async () => {
        const updateData = {
            title: "Updated Test Document",
            content: "This is updated content",
        };

        const res = await app.request("/api/documents/invalid-id", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });

        expect(res.status).toBe(400);
    });

    test("Delete document with invalid ID", async () => {
        const res = await app.request("/api/documents/invalid-id", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        expect(res.status).toBe(400);
    });

    test("Access documents without authentication", async () => {
        const res = await app.request("/api/documents", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                // No Authorization header
            },
        });

        // Should fail without authentication
        expect(res.status).toBe(401);
    });

    test("Create document with invalid data types", async () => {
        const documentData = {
            title: 123, // Should be string
            content: true, // Should be string
        };

        const res = await app.request("/api/documents", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(documentData),
        });

        // Should fail with validation error
        expect(res.status).toBe(400);
    });
});
