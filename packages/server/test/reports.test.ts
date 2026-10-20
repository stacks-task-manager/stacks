// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterAll, beforeAll, describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import app from "../src/index";
import { RoleEntity, SessionEntity, UserEntity } from "@stacks/db";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { issueSession } from "../src/services/sessions";

let adminHeaders: { Authorization: string };
let fixtureUserId: string;
let fixtureSessionId: string;

describe("Reports API", () => {
    beforeAll(async () => {
        const { email } = JSON.parse(readFileSync("testUser.json", "utf8")) as { email: string };
        const seededUser = await UserEntity.findOne({ where: { email } });
        if (!seededUser) throw new Error("Test user not found");
        const role = await RoleEntity.findOne({ where: { title: "User", tenant: seededUser.tenant } });
        if (!role) throw new Error("Default test role not found");
        const user = await UserEntity.create({
            email: `${randomUUID()}@example.test`,
            password: await bcrypt.hash(randomUUID(), 10),
            firstName: "Report Admin",
            lastName: "Security Fixture",
            role: String(role.id),
            tenant: String(seededUser.tenant),
            admin: true,
            real: false,
        });
        fixtureUserId = String(user.id);
        const session = await issueSession(fixtureUserId, String(seededUser.tenant), 120);
        fixtureSessionId = session.sid;
        adminHeaders = { Authorization: `Bearer ${session.token}` };
    });

    afterAll(async () => {
        if (fixtureSessionId) await SessionEntity.destroy({ where: { id: fixtureSessionId }, force: true });
        if (fixtureUserId) await UserEntity.destroy({ where: { id: fixtureUserId }, force: true });
    });

    test("GET /api/reports - should require authentication", async () => {
        const res = await app.request("/api/reports");
        expect(res.status).toBe(401);
    });

    test("GET /api/reports - should return report list for admin users", async () => {
        const res = await app.request("/api/reports", { headers: adminHeaders });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    test("GET /api/reports/:type - should return a report for admin users", async () => {
        const res = await app.request("/api/reports/project_health", { headers: adminHeaders });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("type");
    });

    test("GET /api/reports/:type?span=week - should return report with meta", async () => {
        const res = await app.request("/api/reports/project_health?span=week", { headers: adminHeaders });
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
        const res = await app.request("/api/reports/estimated_vs_logged", { headers: adminHeaders });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.meta).toMatchObject({
            span: null,
            rangeStart: null,
            rangeEnd: null,
        });
    });

    test("GET /api/reports/:type?span=invalid - should return 400", async () => {
        const res = await app.request("/api/reports/project_health?span=invalid", { headers: adminHeaders });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
    });
});
