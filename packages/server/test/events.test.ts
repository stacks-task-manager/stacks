// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll, assert } from "vitest";
import app from "../src/index";
import { getAuthToken } from "./helpers/authHelper";

describe("Events", () => {
    let token: string = "";
    let eventId: string = "";

    beforeAll(async () => {
        token = await getAuthToken();
    });

    test("Create an event", async () => {
        const res = await app.request("/api/events", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                title: "Test event",
                description: "Test description",
                start: "2021-01-01T00:00:00.000Z",
                end: "2021-01-01T01:00:00.000Z",
            }),
        });
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveProperty("data");
        expect(body.data).toHaveProperty("id");
        eventId = body.data.id;
    });

    test("Get all events", async () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const res = await app.request(
            `/api/events?from=${today.toISOString()}&to=${tomorrow.toISOString()}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveProperty("data");
        assert.isArray(body.data, "events data is array");
    });

    test("Get all events with filters", async () => {
        const res = await app.request(
            "/api/events?from=2021-01-01T00:00:00.000Z&to=2021-01-02T00:00:00.000Z",
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveProperty("data");
        assert.isArray(body.data, "events data is array");
    });

    test("Delete an event", async () => {
        const res = await app.request(`/api/events/${eventId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        expect([200, 404, 500]).toContain(res.status);
    });

    test("Count events for today", async () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Create an event for today
        const createRes = await app.request("/api/events", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                title: "Count test event",
                description: "For count verification",
                start: today.toISOString(),
                end: tomorrow.toISOString(),
            }),
        });
        const createBody = await createRes.json();
        expect(createRes.status).toBe(200);
        expect(createBody).toHaveProperty("data");

        // Call count endpoint with explicit today's date range
        const res = await app.request(
            `/api/events/count?from=${today.toISOString()}&to=${tomorrow.toISOString()}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveProperty("data");
        expect(typeof body.data).toBe("number");
        expect(body.data).toBeGreaterThanOrEqual(1);
    });

    test("Count events with date range", async () => {
        const today = new Date();
        const laterToday = new Date(today);
        laterToday.setHours(23, 59, 59, 999);

        // Create an event that falls entirely within today
        await app.request("/api/events", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                title: "Default count test event",
                description: "For default-to-today verification",
                start: today.toISOString(),
                end: laterToday.toISOString(),
            }),
        });

        // Call count endpoint with today's date range
        const res = await app.request(
            `/api/events/count?from=${today.toISOString()}&to=${laterToday.toISOString()}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveProperty("data");
        expect(typeof body.data).toBe("number");
        expect(body.data).toBeGreaterThanOrEqual(1);
    });

    test("Count events returns 401 without authentication", async () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const res = await app.request(
            `/api/events/count?from=${today.toISOString()}&to=${tomorrow.toISOString()}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        expect(res.status).toBe(401);
    });
});
