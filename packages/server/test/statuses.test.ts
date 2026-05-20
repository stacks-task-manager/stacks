// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

describe("Statuses API", () => {
    test("GET /api/statuses - returns 404 (route not mounted)", async () => {
        const res = await app.request("/api/statuses");
        expect(res.status).toBe(404);
    });

    test("GET /api/statuses - authenticated requests hit unknown route", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/statuses", {
            headers,
        });
        expect(res.status).toBe(404);
    });
});