// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Statuses API", () => {
    test("GET /api/statuses - should require authentication", async () => {
        const res = await app.request("/api/statuses");
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.code).toBe("UNAUTHORIZED");
    });

    test("GET /api/statuses - authenticated requests hit unknown route", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/statuses", {
            headers,
        });
        expect(res.status).toBe(404);
    });
});