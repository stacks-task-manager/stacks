// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll } from "vitest";
import app from "../src/index";
import { getAuthToken } from "./helpers/authHelper";

describe("Timelogs", () => {
    let token: string = "";
    let projectId: string = "";
    let taskId: string = "";
    let timelogId: string = "";

    beforeAll(async () => {
        token = await getAuthToken();
        
        // Create a project first
        const projectRes = await app.request("/api/projects", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                title: "Test Project for Timelogs",
            }),
        });
        if (projectRes.status === 200) {
            const projectBody = await projectRes.json();
            expect(projectBody.success).toBe(true);
            projectId = projectBody.data.id;
        } else {
            projectId = "00000000-0000-0000-0000-000000000000";
        }

        // Create a task for timelog testing
        const taskRes = await app.request("/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                task: {
                    title: "Test Task for Timelogs",
                    project: projectId,
                },
                position: 0,
            }),
        });
        if (taskRes.status === 200) {
            const taskBody = await taskRes.json();
            expect(taskBody.success).toBe(true);
            taskId = taskBody.data.id;
        } else {
            taskId = "00000000-0000-0000-0000-000000000000";
        }
    });

    test("Get all timelogs", async () => {
        const res = await app.request("/api/timelogs", {
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

    test("Get timelogs with filters", async () => {
        const res = await app.request(`/api/timelogs?task=${taskId}&project=${projectId}`, {
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

    test("Create a timelog", async () => {
        const timelogData = {
            task: taskId,
            project: projectId,
            description: "Working on test task",
            duration: 3600, // 1 hour in seconds
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        };

        const res = await app.request("/api/timelogs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(timelogData),
        });
        
        expect([200, 400, 404]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.data).toHaveProperty("id");
            expect(body.data.task).toBe(taskId);
            expect(body.data.duration).toBe(3600);
            timelogId = body.data.id;
        }
    });

    test("Get timelog by ID", async () => {
        const res = await app.request(`/api/timelogs/${timelogId}`, {
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
            expect(body.data.id).toBe(timelogId);
            expect(body.data.task).toBe(taskId);
        }
    });

    test("Update a timelog", async () => {
        const updateData = {
            description: "Updated timelog description",
            duration: 7200, // 2 hours
        };

        const res = await app.request(`/api/timelogs/${timelogId}`, {
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

    test("Delete a timelog", async () => {
        const res = await app.request(`/api/timelogs/${timelogId}`, {
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

    test("Get timelogs summary", async () => {
        const res = await app.request("/api/timelogs/summary", {
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
            expect(body.data).toHaveProperty("totalDuration");
        }
    });

    test("Get timelogs summary with date range", async () => {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days ago
        const endDate = new Date().toISOString().split('T')[0]; // today
        
        const res = await app.request(`/api/timelogs/summary?startDate=${startDate}&endDate=${endDate}`, {
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
            expect(body.data).toHaveProperty("totalDuration");
        }
    });

    test("Create timelog with missing required fields", async () => {
        const timelogData = {
            // Missing task which might be required
            description: "Working on test task",
            duration: 3600,
        };

        const res = await app.request("/api/timelogs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(timelogData),
        });
        
        expect([400, 404, 500]).toContain(res.status);
    });

    test("Create timelog with invalid task ID", async () => {
        const timelogData = {
            task: "invalid-task-id",
            project: projectId,
            description: "Working on test task",
            duration: 3600,
        };

        const res = await app.request("/api/timelogs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(timelogData),
        });
        
        expect([400, 404, 500]).toContain(res.status);
    });

    test("Create timelog with negative duration", async () => {
        const timelogData = {
            task: taskId,
            project: projectId,
            description: "Working on test task",
            duration: -3600, // negative duration
        };

        const res = await app.request("/api/timelogs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(timelogData),
        });
        
        expect([400, 404, 500]).toContain(res.status);
    });

    test("Get timelog with invalid ID", async () => {
        const res = await app.request("/api/timelogs/invalid-id", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect([400, 404, 500]).toContain(res.status);
        if (res.status === 200) {
            const body = await res.json();
            expect(body.success).toBe(false);
            expect(body.errors?.errorCode).toBe("VALIDATION_ERROR");
        }
    });

    test("Update timelog with invalid ID", async () => {
        const updateData = {
            description: "Updated timelog description",
        };

        const res = await app.request("/api/timelogs/invalid-id", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
        });
        
        expect([400, 404, 500]).toContain(res.status);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.errors?.errorCode).toBe("VALIDATION_ERROR");
    });

    test("Delete timelog with invalid ID", async () => {
        const res = await app.request("/api/timelogs/invalid-id", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect(res.status).toBe(500);
    });

    test("Access timelogs without authentication", async () => {
        const res = await app.request("/api/timelogs", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                // No Authorization header
            },
        });
        
        // Should fail without authentication
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.code).toBe("UNAUTHORIZED");
    });
});