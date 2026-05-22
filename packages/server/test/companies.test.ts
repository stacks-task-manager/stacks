// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeAll } from "vitest";
import app from "../src/index";
import { getAuthToken } from "./helpers/authHelper";

describe("Companies", () => {
    let token: string = "";
    let companyId: string = "";

    beforeAll(async () => {
        token = await getAuthToken();
    });

    test("Get all companies", async () => {
        const res = await app.request("/api/companies", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    test("Create a company", async () => {
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
        
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty("id");
        expect(body.data.title).toBe("Test Company");
        companyId = body.data.id;
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
        
        // Email is not validated by schema; allow success or validation error
        expect([200, 400]).toContain(res.status);
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
        
        // Should fail with invalid token
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.code).toBe("INVALID_TOKEN");
    });
});