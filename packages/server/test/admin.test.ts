// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, expect, test } from "vitest";
import app from "../src/index";

describe("unmounted legacy admin routes", () => {
    test.each([
        ["GET", "/admin"],
        ["GET", "/admin/api/users"],
        ["GET", "/admin/api/stats"],
        ["POST", "/admin/api/users/00000000-0000-4000-8000-000000000001/status"],
        ["DELETE", "/admin/api/users/00000000-0000-4000-8000-000000000001"],
    ] as const)("returns 404 for legacy %s %s", async (method, path) => {
        const res = await app.request(path, { method });

        expect(res.status).toBe(404);
    });
});
