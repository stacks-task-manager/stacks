// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, test, expect } from "vitest";
import app from "../src/index";

describe("Auth", () => {
    afterEach(() => {
        process.env.REGISTRATION_ENABLED = "true";
    });

    test("registration API is blocked before payload validation when disabled", async () => {
        process.env.REGISTRATION_ENABLED = "off";
        const res = await app.request("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.message).toContain("Registration is disabled by the administrator");
    });

    test("Register with invalid email format", async () => {
        const registerData = {
            email: "lorem.ipsum", // Invalid email format
            password: "12345678",
            tenant: "646427b6-8b0b-4ccd-ae00-8a4680d90fbf",
            firstName: "John",
            lastName: "Doe",
        };

        const res = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(registerData),
        });
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.success).toBe(false);
        // Validator middleware returns error details under errors.errorCode
        expect(body.errors?.errorCode).toBe("VALIDATION_ERROR");
    });

    test("Login with invalid email format", async () => {
        const loginData = {
            email: "lorem.ipsum", // Invalid email format
            password: "12345678",
        };

        const res = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(loginData),
        });
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.errors?.errorCode).toBe("VALIDATION_ERROR");
    });

    test("Login with invalid credentials", async () => {
        const loginData = {
            email: "lorem.ipsum@test.com",
            password: "12345678",
        };

        const res = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(loginData),
        });
        expect(res.status).toBe(401);

        const body = await res.json();
        expect(body.success).toBe(false);
        // AppError via errorHandler sets a top-level code
        expect(body.code).toBe("UNAUTHORIZED");
    });

    test("Register with missing required fields", async () => {
        const registerData = {
            email: "test@example.com",
            password: "12345678",
            // Missing tenant, firstName, lastName
        };

        const res = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(registerData),
        });
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.errors?.errorCode).toBe("VALIDATION_ERROR");
    });

    test("Register rejects a client-supplied role", async () => {
        const registerData = {
            email: "test@example.com",
            password: "12345678",
            role: "646427b6-8b0b-4ccd-ae00-8a4680d90fbc",
            tenant: "646427b6-8b0b-4ccd-ae00-8a4680d90fbf",
            firstName: "John",
            lastName: "Doe",
        };

        const res = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(registerData),
        });
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.errors?.errorCode).toBe("VALIDATION_ERROR");
    });

    test("Register with short password", async () => {
        const registerData = {
            email: "test@example.com",
            password: "123", // Too short
            tenant: "646427b6-8b0b-4ccd-ae00-8a4680d90fbf",
            firstName: "John",
            lastName: "Doe",
        };

        const res = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(registerData),
        });
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.errors?.errorCode).toBe("VALIDATION_ERROR");
    });

    test("Login with missing password", async () => {
        const loginData = {
            email: "test@example.com",
            // Missing password
        };

        const res = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(loginData),
        });
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.errors?.errorCode).toBe("VALIDATION_ERROR");
    });
});
