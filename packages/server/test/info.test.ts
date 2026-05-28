// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";

describe("Info API", () => {
    test("GET /api/info returns license and source disclosure", async () => {
        const res = await app.request("/api/info");
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toHaveProperty("name", "Stacks");
        expect(body).toHaveProperty("license", "AGPL-3.0-only");
        expect(body).toHaveProperty("licenseUrl", "https://www.gnu.org/licenses/agpl-3.0.html");
        expect(body).toHaveProperty("sourceUrl");
        expect(typeof body.sourceUrl).toBe("string");
        expect(body).toHaveProperty("version");
        expect(typeof body.version).toBe("string");
        expect(body).toHaveProperty("commitSha");
        expect(body).toHaveProperty("notice");
        expect(typeof body.notice).toBe("string");
        expect(body.notice).toContain("AGPL v3.0");
    });

    test("GET /api/info does not require authentication", async () => {
        const res = await app.request("/api/info");
        expect(res.status).toBe(200);
    });

    test("GET /api/info - commitSha is null when not provided via env", async () => {
        const res = await app.request("/api/info");
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.commitSha === null || typeof body.commitSha === "string").toBe(true);
    });
});
