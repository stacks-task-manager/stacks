// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll } from "vitest";
import app from "../src/index";
import { getAuthToken } from "./helpers/authHelper";

describe("Projects", () => {
    let token: string = "";
    let projectId = "";

    beforeAll(async () => {
        token = await getAuthToken();
        const res = await app.request("/api/documents", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        projectId = body.data.todos;
        if (!projectId) {
            const createRes = await app.request("/api/documents", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: "Todos",
                    parent: null,
                    type: "project",
                }),
            });
            expect(createRes.status).toBe(200);
            const createBody = await createRes.json();
            expect(createBody.success).toBe(true);
            projectId = createBody.data.id;
        }
        expect(typeof projectId).toBe("string");
    });

    test("Get project by ID", async () => {
        const res = await app.request(`/api/projects/${projectId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("id");
        expect(body.data.id).toBe(projectId);
    });

    test("Get project stacks", async () => {
        const res = await app.request(`/api/projects/${projectId}/stacks`, {
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
    });

    test("Get project overview", async () => {
        const res = await app.request(`/api/projects/${projectId}/overview`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("stacksCount");
        expect(body.data).toHaveProperty("stacksOverview");
    });

    test("Update project with invalid ID", async () => {
        const res = await app.request("/api/projects/invalid-id", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                description: "Updated Project",
            }),
        });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
    });

    test("Get project with invalid ID", async () => {
        const res = await app.request("/api/projects/invalid-id", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
    });
});
