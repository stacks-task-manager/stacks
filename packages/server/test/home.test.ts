// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Home API", () => {
    test("GET /api/home - should require authentication", async () => {
        const res = await app.request("/api/home");
        expect(res.status).toBe(401);
    });

    test("GET /api/home - should return basic home data for authenticated users", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/home", {
            headers,
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("data");
        const homeData = body.data;
        expect(homeData).toHaveProperty("todos");
        expect(homeData).toHaveProperty("todoSorting");
        expect(homeData).toHaveProperty("notes");
    });

    test("GET /api/home/stats - returns 404 (not implemented)", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/home/stats", {
            headers,
        });
        expect(res.status).toBe(404);
    });

    test("GET /api/home/recent-activities - returns 404 (not implemented)", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/home/recent-activities", {
            headers,
        });
        expect(res.status).toBe(404);
    });

    test("GET /api/home/upcoming-tasks - returns 404 (not implemented)", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/home/upcoming-tasks", {
            headers,
        });
        expect(res.status).toBe(404);
    });

    test("GET /api/home/overdue-tasks - returns 404 (not implemented)", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/home/overdue-tasks", {
            headers,
        });
        expect(res.status).toBe(404);
    });

    test("GET /api/home/project-progress - returns 404 (not implemented)", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/home/project-progress", {
            headers,
        });
        expect(res.status).toBe(404);
    });

    test("GET /api/home/time-tracking - returns 404 (not implemented)", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/home/time-tracking", {
            headers,
        });
        expect(res.status).toBe(404);
    });

    test("GET /api/home with date range - should return basic home data", async () => {
        const headers = await getAuthenticatedHeaders();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // 7 days ago
        const endDate = new Date();
        
        const res = await app.request(
            `/api/home?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
            { headers }
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("data");
    });

    test("GET /api/home/notifications - returns 404 (not implemented)", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/home/notifications", {
            headers,
        });
        expect(res.status).toBe(404);
    });
});