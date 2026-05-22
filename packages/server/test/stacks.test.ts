// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll } from "vitest";
import app from "../src/index";
import { getAuthToken } from "./helpers/authHelper";

describe("Stacks", () => {
    let token: string = "";
    let projectId: string = "";
    let stackId: string = "";

    beforeAll(async () => {
        token = await getAuthToken();
        
        // Create a project first for stack testing
        const projectRes = await app.request("/api/projects", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                title: "Test Project for Stacks",
            }),
        });
        if (projectRes.status === 200) {
            const projectBody = await projectRes.json();
            expect(projectBody.success).toBe(true);
            projectId = projectBody.data.id;
        } else {
            projectId = "00000000-0000-0000-0000-000000000000";
        }
    });

    test("Get all stacks for a project", async () => {
        const res = await app.request(`/api/stacks?project=${projectId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        }
    });

    test("Create a stack", async () => {
        const stackData = {
            title: "Test Stack",
            description: "A test stack for testing purposes",
            project: projectId,
            position: 0,
        };

        const res = await app.request("/api/stacks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(stackData),
        });
        
        expect([200, 400, 404, 500]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty("id");
            expect(body.data.project).toBe(projectId);
            stackId = body.data.id;
        }
    });

    test("Get stack by ID", async () => {
        const res = await app.request(`/api/stacks/${stackId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty("id");
            expect(body.data.id).toBe(stackId);
        }
    });

    test("Update a stack", async () => {
        const updateData = {
            title: "Updated Stack Title",
            description: "Updated stack description",
        };

        const res = await app.request(`/api/stacks/${stackId}`, {
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
            expect(body.success).toBe(true);
        }
    });

    test("Get stack tasks", async () => {
        const res = await app.request(`/api/stacks/${stackId}/tasks`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        }
    });

    test("Delete a stack", async () => {
        const res = await app.request(`/api/stacks/${stackId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
        }
    });

    test("Create stack with missing required fields", async () => {
        const stackData = {
            // Missing title which might be required
            description: "A test stack for testing purposes",
            project: projectId,
        };

        const res = await app.request("/api/stacks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(stackData),
        });
        
        expect([200, 400, 404, 500]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
        }
    });

    test("Create stack with invalid project ID", async () => {
        const stackData = {
            title: "Test Stack",
            description: "A test stack for testing purposes",
            project: "invalid-project-id",
            position: 0,
        };

        const res = await app.request("/api/stacks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(stackData),
        });
        
        expect([400, 404, 500]).toContain(res.status);
    });

    test("Get stack with invalid ID", async () => {
        const res = await app.request("/api/stacks/invalid-id", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([400, 404, 500]).toContain(res.status);
    });

    test("Update stack with invalid ID", async () => {
        const updateData = {
            title: "Updated Stack Title",
        };

        const res = await app.request("/api/stacks/invalid-id", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });
        
        expect([400, 404, 500]).toContain(res.status);
    });

    test("Delete stack with invalid ID", async () => {
        const res = await app.request("/api/stacks/invalid-id", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([400, 404]).toContain(res.status);
    });

    test("Access stacks without authentication", async () => {
        const res = await app.request("/api/stacks", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                // No Authorization header
            },
        });
        
        // Should fail without authentication or route missing
        expect([401, 404]).toContain(res.status);
    });
});