import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Hono } from "hono";

import { registerApiRoutes } from "./api";

describe("development app public assets", () => {
    beforeEach(() => {
        vi.stubEnv("NODE_ENV", "development");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    test.each(["favicon.ico", "manifest.json", "logo192.png", "logo512.png", "robots.txt", "notepad.css"])(
        "serves public asset %s instead of a 404 or SPA fallback",
        async asset => {
            const app = new Hono();
            registerApiRoutes(app);

            const response = await app.request(`/${asset}`);

            expect(response.status).toBe(200);
            expect(response.headers.get("content-type")).not.toMatch(/^text\/html/);
            expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
        }
    );
});
