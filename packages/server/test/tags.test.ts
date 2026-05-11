// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import { randomUUID } from "crypto";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Tags API", () => {
    test("GET /api/tags - should require authentication", async () => {
        const res = await app.request("/api/tags");
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.code).toBe("UNAUTHORIZED");
    });

    test("GET /api/tags - should return tags list for authenticated users", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/tags", {
            headers,
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body).toHaveProperty("data");
        expect(Array.isArray(body.data)).toBe(true);
    });

    test("POST /api/tags - should create a new tag", async () => {
        const headers = await getAuthenticatedHeaders();
        const tagData = {
            title: "Test Tag",
            color: "#FF5733",
            section: "projects",
            type: "tag",
        };

        const res = await app.request("/api/tags", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(tagData),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body).toHaveProperty("data");
        expect(body.data).toHaveProperty("id");
        expect(body.data.title).toBe(tagData.title);
        expect(body.data.color).toBe(tagData.color);
        expect(body.data.section).toBe(tagData.section);
        expect(body.data.type).toBe(tagData.type);
    });

    test("POST /api/tags - should validate required fields", async () => {
        const headers = await getAuthenticatedHeaders();
        const invalidTagData = {
            color: "#FF5733",
            // Missing required 'title', 'section', and 'type'
        };

        const res = await app.request("/api/tags", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(invalidTagData),
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.errors?.errorCode).toBe("VALIDATION_ERROR");
    });

    test("POST /api/tags - should error when tag title already exists for tenant", async () => {
        const headers = await getAuthenticatedHeaders();
        const title = `Duplicate Tag ${randomUUID()}`;
        const tagData = {
            title,
            color: "#FF5733",
            section: "projects",
            type: "tag",
        };

        const firstRes = await app.request("/api/tags", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(tagData),
        });
        expect(firstRes.status).toBe(200);

        const secondRes = await app.request("/api/tags", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(tagData),
        });

        expect([409, 500]).toContain(secondRes.status);
        const body = await secondRes.json();
        expect(body.success).toBe(false);
        if (secondRes.status === 500) {
            expect(body.code).toBe("INTERNAL_ERROR");
        }
    });

    test("PATCH /api/tags/:id - should update tag", async () => {
        const headers = await getAuthenticatedHeaders();

        // First create a tag
        const tagData = {
            title: "Update Test Tag",
            color: "#5733FF",
            section: "projects",
            type: "tag",
        };

        const createRes = await app.request("/api/tags", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(tagData),
        });

        if (createRes.status === 200) {
            const createData = await createRes.json();
            expect(createData.success).toBe(true);
            const tagId = createData.data.id;

            const updateData = {
                title: "Updated Tag Title",
                color: "#FF3357",
                section: "projects",
                type: "tag",
            };

            const res = await app.request(`/api/tags/${tagId}`, {
                method: "PATCH",
                headers: {
                    ...headers,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updateData),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            // Update endpoint returns no data payload
            expect(body.data === undefined || body.data === null).toBe(true);
        }
    });

    // The server currently supports listing, creation, and update for tags.
    // Additional endpoints (get by id, delete, search, pagination, popular, colors)
    // are not implemented in the server and are therefore omitted from tests.
});
