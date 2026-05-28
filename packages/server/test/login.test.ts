// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import app from "../src/index";
import { connectDb, RoleEntity, TenantEntity, UserEntity } from "@stacks/db";
import { hash } from "bcryptjs";

const cookieHeaderFromSetCookie = (setCookies: string[]): string => {
    return setCookies.map(c => c.split(";")[0]).join("; ");
};

describe("Login HTML", () => {
    test("GET /login returns login page HTML", async () => {
        const res = await app.request("/login");
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toMatch(/text\/html/);
        const text = await res.text();
        expect(text).toContain('data-testid="login-card"');
        expect(text).toContain("Forgot password?");
    });

    test("GET /login?e=<base64> appends error to flash messages", async () => {
        const encoded = Buffer.from("custom error message").toString("base64");
        const res = await app.request(`/login?e=${encoded}`);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain("custom error message");
    });

    test("GET /login/password-recovery returns recovery page HTML", async () => {
        const res = await app.request("/login/password-recovery");
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toMatch(/text\/html/);
        const text = await res.text();
        expect(text).toContain("Password recovery");
    });

    test("GET /login/password-reset returns reset page HTML", async () => {
        const res = await app.request("/login/password-reset");
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toMatch(/text\/html/);
        const text = await res.text();
        expect(text).toContain("Password reset");
    });

    test("POST /login with missing email redirects to /login", async () => {
        const res = await app.request("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "password=test123",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login");
    });

    test("POST /login with invalid credentials redirects to /login", async () => {
        const res = await app.request("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "email=nonexistent@example.com&password=wrongpass",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login");
    });

    test("POST /login with valid credentials redirects to /app and sets cookies", async () => {
        // Use the test credentials set up by globalSetup
        const res = await app.request("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "email=cris@stacks.rocks&password=12345678",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/app");
        // Auth cookies should be set
        const setCookies = res.headers.getSetCookie();
        expect(setCookies.length).toBeGreaterThan(0);
        const hasAuthToken = setCookies.some(c => c.includes("auth_token="));
        expect(hasAuthToken).toBe(true);
    });

    test("POST /login/password-recovery with non-existent email redirects to /password-recovery", async () => {
        const res = await app.request("/login/password-recovery", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "email=nonexistent@example.com",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/password-recovery");
    });

    test("POST /login with missing password redirects to /login", async () => {
        const res = await app.request("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "email=cris@stacks.rocks",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login");
    });

    test("POST /login/password-recovery with valid email redirects to /login/password-reset", async () => {
        const res = await app.request("/login/password-recovery", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "email=cris@stacks.rocks",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login/password-reset");
    });

    test("POST /login/password-recovery with validation error (missing email) redirects to /login", async () => {
        const res = await app.request("/login/password-recovery", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login");
    });

    test("GET /login/password-recovery renders flash errors from previous POST", async () => {
        const post = await app.request("/login/password-recovery", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "email=nonexistent@example.com",
        });
        expect(post.status).toBe(302);
        expect(post.headers.get("location")).toBe("/password-recovery");

        const cookie = cookieHeaderFromSetCookie(post.headers.getSetCookie());
        const get = await app.request("/login/password-recovery", {
            headers: {
                Cookie: cookie,
            },
        });
        expect(get.status).toBe(200);
        const html = await get.text();
        expect(html).toContain("Invalid email");
    });
});

describe("Login HTML — edge cases", () => {
    let tenantId: string;
    let roleId: string;
    let hashedPassword: string;

    beforeEach(async () => {
        if (!hashedPassword) {
            hashedPassword = await hash("12345678", 10);
        }
        await connectDb(true);

        if (!tenantId) {
            const tenant = await TenantEntity.findOne({ where: {} });
            if (!tenant) throw new Error("No tenant found for test user creation");
            tenantId = tenant.get("id") as unknown as string;
        }

        if (!roleId) {
            const role = (await RoleEntity.findOne({ where: { title: "User", tenant: tenantId } })) as any;
            roleId = role?.get("id") as unknown as string;
            if (!roleId) {
                const newRole = await RoleEntity.create({
                    title: "TestRole",
                    description: "Test role",
                    disabled: false,
                    tenant: tenantId,
                    createdBy: "00000000-0000-0000-0000-000000000000",
                    updatedBy: "00000000-0000-0000-0000-000000000000",
                });
                roleId = newRole.get("id") as unknown as string;
            }
        }
    });

    test("POST /login/password-recovery with disabled user shows error", async () => {
        const user = await UserEntity.create({
            email: `disabled-${randomUUID()}@test.com`,
            password: hashedPassword,
            firstName: "Disabled",
            lastName: "User",
            disabled: true,
            system: false,
            tenant: tenantId,
            role: roleId,
        });
        const res = await app.request("/login/password-recovery", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `email=${encodeURIComponent(user.get("email") as string)}`,
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/password-recovery");
        await UserEntity.destroy({ where: { id: user.get("id") as unknown as string } });
    });

    test("POST /login/password-recovery with non-activated user shows error", async () => {
        const user = await UserEntity.create({
            email: `pending-${randomUUID()}@test.com`,
            password: hashedPassword,
            firstName: "Pending",
            lastName: "User",
            token: "some-activation-token",
            system: false,
            tenant: tenantId,
            role: roleId,
        });
        const res = await app.request("/login/password-recovery", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `email=${encodeURIComponent(user.get("email") as string)}`,
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/password-recovery");
        await UserEntity.destroy({ where: { id: user.get("id") as unknown as string } });
    });

    test("POST /login/password-recovery with system user shows error", async () => {
        // The seeded system user has email system@getstacksapp.com
        const res = await app.request("/login/password-recovery", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "email=system@getstacksapp.com",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/password-recovery");
    });

    test("POST /login with non-activated user redirects and sets flash error", async () => {
        const user = await UserEntity.create({
            email: `unactivated-${randomUUID()}@test.com`,
            password: hashedPassword,
            firstName: "Unactivated",
            lastName: "User",
            token: "some-activation-token",
            system: false,
            tenant: tenantId,
            role: roleId,
        });

        const post = await app.request("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `email=${encodeURIComponent(user.get("email") as string)}&password=12345678`,
        });
        expect(post.status).toBe(302);
        expect(post.headers.get("location")).toBe("/login");

        const cookie = cookieHeaderFromSetCookie(post.headers.getSetCookie());
        const get = await app.request("/login", {
            headers: {
                Cookie: cookie,
            },
        });
        expect(get.status).toBe(200);
        const html = await get.text();
        expect(html).toContain("User account not yet activated");

        await UserEntity.destroy({ where: { id: user.get("id") as unknown as string } });
    });
});
