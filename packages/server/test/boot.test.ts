// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import { __setLicenseForTests, getLicense } from "@stacks/license";
import type { ILicense } from "@stacks/types";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";
import { TEST_LICENSE } from "./helpers/testLicense";

describe("Boot API", () => {
    test("GET /api/boot without auth returns 401", async () => {
        const res = await app.request("/api/boot");
        expect(res.status).toBe(401);
    });

    test("GET /api/boot - returns license, translations, preferences, and AI chat config", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/boot", {
            headers,
        });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toHaveProperty("success", true);
        expect(body).toHaveProperty("data");

        const data = body.data;
        expect(data.session).toMatchObject({
            userId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
            tenantId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
        });
        expect(data).toHaveProperty("license");
        expect(data).toHaveProperty("translations");
        expect(data).toHaveProperty("preferences");
        expect(data).toHaveProperty("aiChat");

        // License shape
        expect(data.license).toHaveProperty("type");
        expect(Array.isArray(data.license.tenants)).toBe(true);

        // Translations are an object (merged locale map)
        expect(typeof data.translations).toBe("object");

        // Preferences are an object
        expect(typeof data.preferences).toBe("object");

        // AI chat config is an object
        expect(typeof data.aiChat).toBe("object");
    });

    test("GET /api/boot - translations depend on Accept-Language header", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/boot", {
            headers: {
                ...headers,
                "Accept-Language": "en",
            },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.translations).toBeDefined();
    });

    test("GET /api/boot does not disclose license administrator credentials", async () => {
        const originalLicense = getLicense();
        const licenseWithSentinels: ILicense = {
            ...TEST_LICENSE,
            tenants: [
                {
                    ...TEST_LICENSE.tenants[0],
                    admins: [
                        {
                            firstName: "BOOT_SECRET_FIRST",
                            lastName: "BOOT_SECRET_LAST",
                            email: "boot-secret@example.test",
                            password: "BOOT_SECRET_PASSWORD",
                        },
                    ],
                },
            ],
        };

        try {
            __setLicenseForTests(licenseWithSentinels);
            const headers = await getAuthenticatedHeaders();
            const res = await app.request("/api/boot", { headers });
            expect(res.status).toBe(200);

            const { data } = await res.json();
            expect(data.license.tenants[0].admins).toEqual([]);
            expect(JSON.stringify(data)).not.toContain("BOOT_SECRET_FIRST");
            expect(JSON.stringify(data)).not.toContain("boot-secret@example.test");
            expect(JSON.stringify(data)).not.toContain("BOOT_SECRET_PASSWORD");
            expect(data.license.type).toBe(TEST_LICENSE.type);
        } finally {
            __setLicenseForTests(originalLicense);
        }
    });
});
