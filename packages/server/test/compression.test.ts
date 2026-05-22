// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";
import { getAuthenticatedHeaders } from "./helpers/authHelper";

/**
 * Verifies `hono/compress` on `/api/*`: browsers send Accept-Encoding; this asserts the header contract.
 */
describe("API response compression", () => {
    test("sets Content-Encoding: gzip when client accepts gzip", async () => {
        const headers = await getAuthenticatedHeaders();
        const res = await app.request("/api/home", {
            headers: {
                ...headers,
                "Accept-Encoding": "gzip",
            },
        });

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toMatch(/application\/json/);
        expect(res.headers.get("content-encoding")).toBe("gzip");
    });
});
