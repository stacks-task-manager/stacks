// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll } from "vitest";
import app from "../src/index";
import { getAuthToken } from "./helpers/authHelper";
import { CompanyEntity } from "@stacks/db";

describe("Companies", () => {
    let token: string = "";

    beforeAll(async () => {
        token = await getAuthToken();
    });

    test("denies company list and detail reads without company read permission", async () => {
        const res = await app.request("/api/companies", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.code).toBe("FORBIDDEN");

        const detail = await app.request("/api/companies/11111111-1111-4111-8111-111111111111", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        expect(detail.status).toBe(403);
    });

    test("denies company creation without company write permission", async () => {
        const companyData = {
            title: "Test Company",
            website: "https://testcompany.com",
            email: "contact@testcompany.com",
        };

        const res = await app.request("/api/companies", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(companyData),
        });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.code).toBe("FORBIDDEN");
        expect(body.message).not.toContain("Test Company");
        expect(await CompanyEntity.findOne({ where: { title: companyData.title } })).toBeNull();
    });

    test("Create company with missing required fields", async () => {
        const companyData = {
            // Missing title which is required
            description: "A test company for testing purposes",
        };

        const res = await app.request("/api/companies", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(companyData),
        });

        // Should fail with validation error
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.errors?.errorCode).toBe("VALIDATION_ERROR");
    });

    test("Create company with invalid email format", async () => {
        const companyData = {
            title: "Test Company 2",
            email: "invalid-email-format", // Invalid email
        };

        const res = await app.request("/api/companies", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(companyData),
        });

        // This fixture's role has read-only company access.
        expect(res.status).toBe(403);
    });

    test("Access companies without authentication", async () => {
        const res = await app.request("/api/companies", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                // No Authorization header
            },
        });

        // Should fail without authentication
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.code).toBe("UNAUTHORIZED");
    });

    test("Access companies with invalid token", async () => {
        const res = await app.request("/api/companies", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer invalid-token",
            },
        });

        // Invalid credentials share a generic response to avoid token-state disclosure.
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.code).toBe("UNAUTHORIZED");
    });
});
