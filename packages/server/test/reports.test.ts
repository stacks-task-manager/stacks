// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";
import { UserEntity } from "@stacks/db";

async function makeCurrentTestUserAdmin() {
    const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
    const user = await UserEntity.findOne({ where: { email } });
    if (!user) {
        throw new Error("Test user not found");
    }
    await user.update({ admin: true });
}

describe("Reports API", () => {
    test("GET /api/reports - should require authentication", async () => {
        const res = await app.request("/api/reports");
        expect(res.status).toBe(401);
    });

    test("GET /api/reports - should return report list for admin users", async () => {
        const headers = await getAuthenticatedHeaders();
        await makeCurrentTestUserAdmin();

        const res = await app.request("/api/reports", { headers });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    test("GET /api/reports/:type - should return a report for admin users", async () => {
        const headers = await getAuthenticatedHeaders();
        await makeCurrentTestUserAdmin();

        const res = await app.request("/api/reports/project_health", { headers });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("type");
    });

    test("GET /api/reports/:type?span=week - should return report with meta", async () => {
        const headers = await getAuthenticatedHeaders();
        await makeCurrentTestUserAdmin();

        const res = await app.request("/api/reports/project_health?span=week", { headers });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.meta).toMatchObject({
            span: "week",
            rangeStart: expect.any(String),
            rangeEnd: expect.any(String),
        });
    });

    test("GET /api/reports/:type - all-time omits span in meta", async () => {
        const headers = await getAuthenticatedHeaders();
        await makeCurrentTestUserAdmin();

        const res = await app.request("/api/reports/estimated_vs_logged", { headers });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.meta).toMatchObject({
            span: null,
            rangeStart: null,
            rangeEnd: null,
        });
    });

    test("GET /api/reports/:type?span=invalid - should return 400", async () => {
        const headers = await getAuthenticatedHeaders();
        await makeCurrentTestUserAdmin();

        const res = await app.request("/api/reports/project_health?span=invalid", { headers });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
    });
});
