// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, test, expect } from "vitest";
import { EmailQueueEntity, RoleEntity, TenantEntity, UserEntity } from "@stacks/db";
import { EMAIL_TEMPLATES } from "@stacks/types";
import app from "../src/index";

describe("Register HTML", () => {
    afterEach(() => {
        process.env.REGISTRATION_ENABLED = "true";
    });

    test("GET /register is blocked when registration is disabled", async () => {
        process.env.REGISTRATION_ENABLED = "false";
        const res = await app.request("/register");
        expect(res.status).toBe(403);
        expect(await res.text()).toContain("Registration is disabled by the administrator");
    });

    test("POST /register is blocked when registration is disabled", async () => {
        process.env.REGISTRATION_ENABLED = "false";
        const res = await app.request("/register", { method: "POST" });
        expect(res.status).toBe(403);
    });

    test("GET /register returns register page HTML with tenant options", async () => {
        const res = await app.request("/register");
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toMatch(/text\/html/);
        const text = await res.text();
        expect(text).toContain("Create your account");
        expect(text).toContain('id="tenant"');
        expect(text).toContain('action="/register"');
        expect(text).toContain('name="firstName"');
        expect(text).toContain('name="lastName"');
        expect(text).not.toContain('name="role"');
        expect(text).toContain("Please select a tenant");
    });

    test("GET /register - renders tenant option placeholder", async () => {
        const res = await app.request("/register");
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain('<option value="" selected>Please select a tenant</option>');
    });

    test("POST /register validates native form submissions instead of returning 404", async () => {
        const res = await app.request("/register", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "email=invalid",
        });
        expect(res.status).toBe(400);
    });

    test("POST /register creates an account from the native form", async () => {
        const tenant = await TenantEntity.findOne({ where: { disabled: false } });
        const role = await RoleEntity.findOne({
            where: { tenant: tenant!.get("id"), title: "User", disabled: false, deleted: null },
        });
        const email = `register-form-${Date.now()}@example.com`;
        const body = new URLSearchParams({
            email,
            password: "password1",
            firstName: "Form",
            lastName: "User",
            tenant: String(tenant!.get("id")),
        });

        try {
            const res = await app.request("/register", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: body.toString(),
            });
            expect(res.status, await res.clone().text()).toBe(302);
            expect(res.headers.get("location")).toContain("/login?s=");
            const user = await UserEntity.findOne({ where: { email } });
            expect(user).not.toBeNull();
            expect(user!.get("disabled")).toBe(true);
            expect(user!.get("role")).toBe(role!.get("id"));
            expect(user!.get("token")).toBeTruthy();
            const emailRow = await EmailQueueEntity.findOne({
                where: { userId: user!.get("id"), template: EMAIL_TEMPLATES.REGISTRATION },
            });
            expect(emailRow).not.toBeNull();
            expect(emailRow!.get("data")).toMatchObject({
                verificationLink: `/auth/activate/${user!.get("token")}`,
            });

            const activation = await app.request("/auth/activate", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    token: String(user!.get("token")),
                    password1: "activated1",
                    password2: "activated1",
                }).toString(),
            });
            expect(activation.status).toBe(200);
            await user!.reload();
            expect(user!.get("disabled")).toBe(false);
            expect(user!.get("token")).toBeNull();
        } finally {
            const user = await UserEntity.findOne({ where: { email } });
            if (user) {
                await EmailQueueEntity.destroy({ where: { userId: user.get("id") }, force: true });
            }
            await UserEntity.destroy({ where: { email }, force: true });
        }
    });
});
