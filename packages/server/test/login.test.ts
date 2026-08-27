// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, test, expect, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import app from "../src/index";
import { connectDb, EmailQueueEntity, RoleEntity, TenantEntity, UserEntity } from "@stacks/db";
import { EMAIL_TEMPLATES } from "@stacks/types";
import { compare, hash } from "bcryptjs";

const cookieHeaderFromSetCookie = (setCookies: string[]): string => {
    return setCookies.map(c => c.split(";")[0]).join("; ");
};

describe("Login HTML", () => {
    afterEach(() => {
        process.env.REGISTRATION_ENABLED = "true";
        process.env.PASSWORD_RECOVERY_ENABLED = "true";
    });

    test("login hides disabled public account links", async () => {
        process.env.REGISTRATION_ENABLED = "false";
        process.env.PASSWORD_RECOVERY_ENABLED = "false";
        const res = await app.request("/login");
        const text = await res.text();
        expect(text).not.toContain('data-testid="login-register-link"');
        expect(text).not.toContain('data-testid="login-forget-password-link"');
    });

    test.each([
        ["GET", "/login/password-recovery"],
        ["POST", "/login/password-recovery"],
        ["GET", "/login/password-reset"],
    ])("%s %s is blocked when recovery is disabled", async (method, path) => {
        process.env.PASSWORD_RECOVERY_ENABLED = "false";
        const res = await app.request(path, { method });
        expect(res.status).toBe(403);
        expect(await res.text()).toContain("Password recovery is disabled by the administrator");
    });

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

    test("GET /login/password-reset rejects requests without an emailed token", async () => {
        const res = await app.request("/login/password-reset");
        expect(res.status).toBe(400);
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

    test("password recovery emails a token and resets only through that link", async () => {
        const user = await UserEntity.findOne({ where: { email: "cris@stacks.rocks" } });
        const originalPassword = user!.get("password") as string;
        try {
            const res = await app.request("/login/password-recovery", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: "email=cris@stacks.rocks",
            });
            expect(res.status).toBe(302);
            expect(res.headers.get("location")).toBe("/login");

            const emailRow = await EmailQueueEntity.findOne({
                where: { userId: user!.get("id"), template: EMAIL_TEMPLATES.PASSWORD_RESET },
                order: [["id", "DESC"]],
            });
            expect(emailRow).not.toBeNull();
            const resetLink = (emailRow!.get("data") as { resetLink: string }).resetLink;
            const token = new URL(resetLink, "http://localhost").searchParams.get("token")!;

            await user!.reload();
            const expiresAt = user!.get("passwordResetTokenExpiresAt") as Date;
            user!.set("passwordResetTokenExpiresAt", new Date(Date.now() - 1));
            await user!.save();
            expect((await app.request(resetLink)).status).toBe(400);
            user!.set("passwordResetTokenExpiresAt", expiresAt);
            await user!.save();

            const page = await app.request(resetLink);
            expect(page.status).toBe(200);
            expect(await page.text()).toContain("Recover account for <strong>cris@stacks.rocks</strong>");

            const reset = await app.request("/login/password-reset", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    token,
                    password1: "new-password1",
                    password2: "new-password1",
                }).toString(),
            });
            expect(reset.status).toBe(302);
            expect(reset.headers.get("location")).toBe("/login");
            await user!.reload();
            expect(await compare("new-password1", user!.get("password") as string)).toBe(true);
            expect(user!.get("passwordResetTokenHash")).toBeNull();

            const replay = await app.request(resetLink);
            expect(replay.status).toBe(400);
        } finally {
            user!.set("password", originalPassword);
            user!.set("passwordResetTokenHash", null);
            user!.set("passwordResetTokenExpiresAt", null);
            await user!.save();
            await EmailQueueEntity.destroy({
                where: { userId: user!.get("id"), template: EMAIL_TEMPLATES.PASSWORD_RESET },
                force: true,
            });
        }
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
