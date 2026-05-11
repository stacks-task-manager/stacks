// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import { randomUUID } from "crypto";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Reminders API", () => {
    test("GET /api/reminders/:recordId - should require authentication", async () => {
        const res = await app.request(`/api/reminders/${randomUUID()}`);
        expect(res.status).toBe(401);
    });

    test("POST /api/reminders - should create and delete a reminder", async () => {
        const headers = await getAuthenticatedHeaders();
        const recordId = randomUUID();

        const createRes = await app.request("/api/reminders", {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                date: new Date().toISOString(),
                title: "Test reminder",
                subtitle: "Test subtitle",
                recordId,
                recordType: "task",
                url: "/task/test",
            }),
        });
        expect(createRes.status).toBe(200);
        const created = await createRes.json();
        expect(created.success).toBe(true);
        expect(created.data).toHaveProperty("id");
        const reminderId = created.data.id as string;

        const getRes = await app.request(`/api/reminders/${recordId}`, { headers });
        expect(getRes.status).toBe(200);
        const list = await getRes.json();
        expect(list.success).toBe(true);
        expect(Array.isArray(list.data)).toBe(true);
        expect(list.data.some((r: any) => r.id === reminderId)).toBe(true);

        const deleteRes = await app.request(`/api/reminders/${reminderId}`, {
            method: "DELETE",
            headers,
        });
        expect(deleteRes.status).toBe(200);

        const verifyRes = await app.request(`/api/reminders/${recordId}`, { headers });
        expect(verifyRes.status).toBe(200);
        const verified = await verifyRes.json();
        expect(verified.success).toBe(true);
        expect(Array.isArray(verified.data)).toBe(true);
        expect(verified.data.some((r: any) => r.id === reminderId)).toBe(false);
    });
});
