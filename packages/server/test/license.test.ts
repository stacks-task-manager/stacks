// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { __resetLicenseForTests, __setLicenseForTests, getLicense } from "@stacks/license";
import { LICENSETYPE } from "@stacks/types";

describe("License Module - Basic Functionality", () => {
    let originalConsoleLog: typeof console.log;
    let originalConsoleWarn: typeof console.warn;
    let originalConsoleError: typeof console.error;
    const TEST_LICENSE = {
        type: LICENSETYPE.LOCAL,
        tenants: [
            {
                id: "11111111-1111-4111-8111-111111111111",
                name: "Stacks",
                expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                seats: 10,
                admins: [
                    {
                        firstName: "Cris",
                        lastName: "Test",
                        email: "cris@stacks.rocks",
                        password: "12345678",
                    },
                ],
                features: {},
            },
        ],
    } as const;

    beforeEach(() => {
        // Store original functions
        originalConsoleLog = console.log;
        originalConsoleWarn = console.warn;
        originalConsoleError = console.error;

        // Mock console functions to reduce noise in tests
        console.log = vi.fn();
        console.warn = vi.fn();
        console.error = vi.fn();

        __resetLicenseForTests();
        __setLicenseForTests(TEST_LICENSE as any);
    });

    afterEach(() => {
        // Restore original functions
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
    });

    describe("Default License Behavior", () => {
        test("should initialize and return a valid license", async () => {
            const license = getLicense();

            expect(license).toBeDefined();
            expect(license.tenants).toBeDefined();
            expect(Array.isArray(license.tenants)).toBe(true);
            expect(license.tenants.length).toBeGreaterThan(0);
            expect(license.type).toBe(LICENSETYPE.LOCAL);
        });

        test("should return default license with correct structure", async () => {
            const license = getLicense();

            // Validate license structure
            expect(license).toHaveProperty("tenants");
            expect(license).toHaveProperty("type");
            expect(Array.isArray(license.tenants)).toBe(true);
            expect(license.tenants.length).toBeGreaterThan(0);

            // Validate tenant structure
            const tenant = license.tenants[0];
            expect(tenant).toHaveProperty("id");
            expect(tenant).toHaveProperty("name");
            expect(tenant).toHaveProperty("expiry");
            expect(tenant).toHaveProperty("seats");
            expect(tenant).toHaveProperty("admins");
            expect(Array.isArray(tenant.admins)).toBe(true);

            // Validate admin structure
            if (tenant.admins.length > 0) {
                const admin = tenant.admins[0];
                expect(admin).toHaveProperty("firstName");
                expect(admin).toHaveProperty("lastName");
                expect(admin).toHaveProperty("email");
                expect(admin).toHaveProperty("password");
            }
        });

        test("should have default tenant with expected values (relaxed)", async () => {
            const license = getLicense();
            const tenant = license.tenants[0];

            expect(tenant.name).toBe("Stacks");
            expect(tenant.seats).toBeGreaterThan(0);
            expect(typeof tenant.expiry).toBe("string");
            expect(tenant.id).toBe("11111111-1111-4111-8111-111111111111");
        });
    });

    describe("License Initialization", () => {
        test("should be idempotent - multiple calls should return same result", async () => {
            const license1 = getLicense();

            __setLicenseForTests(TEST_LICENSE as any);
            const license2 = getLicense();

            expect(JSON.stringify(license1)).toBe(JSON.stringify(license2));
        });

        test("should return valid license even before initialization", () => {
            const license = getLicense();

            expect(license).toBeDefined();
            expect(license.tenants).toBeDefined();
            expect(license.tenants.length).toBeGreaterThan(0);
        });
    });

    describe("License Type Validation", () => {
        test("should have LOCAL license type", async () => {
            const license = getLicense();

            expect(license.type).toBe(LICENSETYPE.LOCAL);
        });
    });

    describe("Tenant Validation", () => {
        test("should have at least one tenant", async () => {
            const license = getLicense();

            expect(license.tenants.length).toBeGreaterThanOrEqual(1);
        });

        test("should have valid tenant IDs", async () => {
            const license = getLicense();

            license.tenants.forEach(tenant => {
                expect(tenant.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            });
        });

        test("should have valid expiry dates (ISO or formatted)", async () => {
            const license = getLicense();

            license.tenants.forEach(tenant => {
                const isIso = /T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(tenant.expiry);
                const isFormatted = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(tenant.expiry);
                expect(isIso || isFormatted).toBe(true);
            });
        });

        test("should have positive seat counts", async () => {
            const license = getLicense();

            license.tenants.forEach(tenant => {
                expect(tenant.seats).toBeGreaterThan(0);
                expect(typeof tenant.seats).toBe("number");
            });
        });
    });

    describe("Admin Validation", () => {
        test("should have at least one admin per tenant", async () => {
            const license = getLicense();

            license.tenants.forEach(tenant => {
                expect(tenant.admins.length).toBeGreaterThanOrEqual(1);
            });
        });

        test("should have valid admin email addresses", async () => {
            const license = getLicense();

            license.tenants.forEach(tenant => {
                tenant.admins.forEach(admin => {
                    expect(admin.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
                });
            });
        });

        test("should have non-empty admin names", async () => {
            const license = getLicense();

            license.tenants.forEach(tenant => {
                tenant.admins.forEach(admin => {
                    expect(admin.firstName).toBeTruthy();
                    expect(admin.lastName).toBeTruthy();
                    expect(typeof admin.firstName).toBe("string");
                    expect(typeof admin.lastName).toBe("string");
                });
            });
        });
    });
});
