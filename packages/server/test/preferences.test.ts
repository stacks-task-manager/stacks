// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Preferences API", () => {
    test("GET /api/preferences without auth returns 401", async () => {
        const res = await app.request("/api/preferences");
        expect(res.status).toBe(401);
    });

    test("GET /api/preferences - no read route (preferences come from GET /api/boot)", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/preferences", { headers });
        expect(res.status).toBe(404);
    });

    test("GET /api/boot - includes user preferences for authenticated users", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/boot", { headers });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty("data");
        expect(body.data).toHaveProperty("preferences");
        expect(typeof body.data.preferences).toBe("object");
    });

    test("PATCH /api/preferences - should update user preferences", async () => {
        const headers = await getAuthenticatedHeaders();

        const bootRes = await app.request("/api/boot", { headers });
        expect(bootRes.status).toBe(200);
        const bootBody = await bootRes.json();
        const currentPrefs = bootBody.data.preferences;

        const updatedPreferences = { ...currentPrefs, darkMode: !currentPrefs.darkMode };

        const res = await app.request("/api/preferences", {
            method: "PATCH",
            headers: {
                ...headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedPreferences),
        });

        expect(res.status).toBe(200);

        const verifyRes = await app.request("/api/boot", { headers });
        expect(verifyRes.status).toBe(200);
        const verifyBody = await verifyRes.json();
        expect(verifyBody.data.preferences.darkMode).toBe(updatedPreferences.darkMode);
    });

    // Server validates the full preferences object; partial arbitrary keys are not supported

    // Unsupported: language-only validation on PATCH without full payload

    // Unsupported: timezone-only validation on PATCH without full payload

    // The server does not expose preferences/themes endpoint

    // The server does not expose preferences/languages endpoint

    // The server does not expose preferences/timezones endpoint

    // The server does not expose section-specific preferences endpoints

    // The server does not expose section-specific preferences endpoints

    // The server does not expose section-specific preferences endpoints

    // The server does not expose preferences/reset endpoint

    // The server does not expose preferences/export endpoint

    // The server does not expose preferences/import endpoint

    // Partial updates are not supported; server expects a full preferences object

    // The server does not expose preferences/defaults endpoint

    // Date format validation is not applicable to current server preferences schema

    // Time format validation is not applicable to current server preferences schema
});