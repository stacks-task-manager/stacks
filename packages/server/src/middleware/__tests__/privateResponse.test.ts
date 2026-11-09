import { afterEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { cacheMiddleware, MemoryCache } from "../../utils/cache";
import { privateResponse } from "../privateResponse";

describe("privateResponse", () => {
    const previousCache = process.env.CACHE;
    afterEach(() => {
        if (previousCache === undefined) delete process.env.CACHE;
        else process.env.CACHE = previousCache;
    });

    it("marks cache misses and hits private without disabling the internal response cache", async () => {
        process.env.CACHE = "true";
        const cache = new MemoryCache({ maxSize: 10 });
        const app = new Hono();
        app.use("*", privateResponse);
        app.get("/personal", cacheMiddleware({ cache, keyGenerator: () => "personal" }), c =>
            c.json({ value: "user-specific" })
        );

        try {
            const miss = await app.request("/personal");
            const hit = await app.request("/personal");

            expect(miss.headers.get("cache-control")).toBe("private, no-store");
            expect(hit.headers.get("cache-control")).toBe("private, no-store");
            expect(miss.headers.get("x-cache")).toBe("MISS");
            expect(hit.headers.get("x-cache")).toBe("HIT");
        } finally {
            cache.destroy();
        }
    });

    it("marks error responses private too", async () => {
        const app = new Hono();
        app.use("*", privateResponse);
        app.get("/failure", () => {
            throw new Error("private failure");
        });

        const response = await app.request("/failure");

        expect(response.status).toBe(500);
        expect(response.headers.get("cache-control")).toBe("private, no-store");
    });
});
