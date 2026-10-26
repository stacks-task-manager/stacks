import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimitKeyHash, rateLimitWindowStart, startRateLimitCounterCleanup } from "../rateLimit";

afterEach(() => {
    vi.useRealTimers();
});

describe("rate limit counter keys", () => {
    it("stores an opaque HMAC instead of an account identifier", () => {
        const email = "Private.User@example.com";
        const key = rateLimitKeyHash("login-account", email, "test-secret");

        expect(key).toMatch(/^[a-f0-9]{64}$/);
        expect(key).not.toContain(email);
        expect(key).toBe(rateLimitKeyHash("login-account", email, "test-secret"));
        expect(key).not.toBe(rateLimitKeyHash("login-account", email, "another-secret"));
        expect(key).not.toBe(rateLimitKeyHash("recovery-account", email, "test-secret"));
    });

    it("uses deterministic fixed windows at the boundary", () => {
        expect(rateLimitWindowStart(59_999, 60_000)).toBe(0);
        expect(rateLimitWindowStart(60_000, 60_000)).toBe(60_000);
    });

    it("rejects invalid windows instead of creating unbounded counters", () => {
        expect(() => rateLimitWindowStart(1, 0)).toThrow(RangeError);
        expect(() => rateLimitWindowStart(-1, 60_000)).toThrow(RangeError);
    });

    it("runs bounded cleanup immediately and on an unreferenced minute timer", async () => {
        vi.useFakeTimers();
        const cleanup = vi.fn().mockResolvedValue(0);
        const timer = startRateLimitCounterCleanup(cleanup);
        await Promise.resolve();
        expect(cleanup).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(60_000);
        expect(cleanup).toHaveBeenCalledTimes(2);
        clearInterval(timer);
    });
});
