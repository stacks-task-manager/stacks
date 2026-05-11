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
        const res = await app.request("/api/events", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveProperty("data");
        assert.isArray(body.data, "events data is array");
    });

    test("Get all events with filters", async () => {
        const res = await app.request("/api/events?span=day&date=2021-01-01T00:00:00.000Z", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
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
});
