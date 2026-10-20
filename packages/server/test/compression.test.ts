// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import { Hono } from "hono";
import { compress } from "hono/compress";

/**
 * Verifies `hono/compress` on an API route without relying on the shared
 * authenticated integration-test session, which other files can revoke.
 */
describe("API response compression", () => {
    test("sets Content-Encoding: gzip when client accepts gzip", async () => {
        const app = new Hono();
        app.use("/api/*", compress());
        app.get("/api/compression-test", c => c.json({ payload: "x".repeat(2048) }));

        const res = await app.request("/api/compression-test", {
            headers: {
                "Accept-Encoding": "gzip",
            },
        });

        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toMatch(/application\/json/);
        expect(res.headers.get("content-encoding")).toBe("gzip");
    });
});
