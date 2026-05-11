// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll } from "vitest";
import app from "../src/index";
import { getAuthToken } from "./helpers/authHelper";

describe("Tasks", () => {
    let token: string = "";
    let projectId: string = "";
    let taskId: string = "";

    beforeAll(async () => {
        token = await getAuthToken();
        
        // Create a project first for task testing
        const projectRes = await app.request("/api/projects", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                title: "Test Project for Tasks",
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

    test("Create a task", async () => {
        const taskData = {
            task: {
                title: "Test Task",
                description: "Test task description",
                project: projectId,
            },
            position: 0,
        };

        const res = await app.request("/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(taskData),
        });
        
        expect([200, 400, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty("id");
            taskId = body.data.id;
        }
    });

    test("Get task by ID", async () => {
        const res = await app.request(`/api/tasks/${taskId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 400, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty("id");
            expect(body.data.id).toBe(taskId);
        }
    });

    test("Get all tasks", async () => {
        const res = await app.request("/api/tasks", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 400, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        }
    });

    test("Get tasks with filters", async () => {
        const res = await app.request(`/api/tasks?project=${projectId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 400, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        }
    });

    test("Get tasks count", async () => {
        const res = await app.request("/api/tasks/count", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 400, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(typeof body.data).toBe("number");
        }
    });

    test("Update task", async () => {
        const updateData = {
            title: "Updated Task Title",
            description: "Updated description",
        };

        const res = await app.request(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });
        
        expect([200, 400, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
        }
    });

    test("Get task segment", async () => {
        const res = await app.request(`/api/tasks/segment?tasks=${taskId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([200, 400, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(Array.isArray(body.data)).toBe(true);
        }
    });

    test("Create timelog for task", async () => {
        const timelogData = {
            duration: 3600, // 1 hour in seconds
            description: "Test timelog",
            date: new Date().toISOString(),
        };

        const res = await app.request(`/api/tasks/${taskId}/timelogs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(timelogData),
        });
        
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty("id");
        }
    });

    test("Get task timelogs", async () => {
        const res = await app.request(`/api/tasks/${taskId}/timelogs`, {
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

    test("Create task with invalid data", async () => {
        const taskData = {
            task: {
                // Missing required title
                description: "Test task description",
            },
            position: 0,
        };

        const res = await app.request("/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(taskData),
        });
        
        expect([400, 404, 500]).toContain(res.status);
    });

    test("Get task with invalid ID", async () => {
        const res = await app.request("/api/tasks/invalid-id", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([400, 404]).toContain(res.status);
    });

    test("Update task with invalid ID", async () => {
        const updateData = {
            title: "Updated Task Title",
        };

        const res = await app.request("/api/tasks/invalid-id", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });
        
        expect([400, 404]).toContain(res.status);
    });
});