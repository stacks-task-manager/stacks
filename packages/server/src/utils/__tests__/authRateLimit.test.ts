import { describe, expect, it, vi } from "vitest";
import { apiRateLimits, authAttemptLimits, checkAuthAttemptLimits } from "../authRateLimit";

describe("public authentication rate limits", () => {
    it("uses bounded defaults for login, recovery, registration, and email changes", () => {
        expect(authAttemptLimits({})).toEqual({
            windowMs: 900_000,
            login: { account: 10, ip: 100 },
            recovery: { account: 5, ip: 30 },
            registration: { account: 5, ip: 30 },
            "email-change": { account: 3, ip: 10 },
        });
    });

    it("uses shared API budgets of 600 requests per IP and 300 per user per minute", () => {
        expect(apiRateLimits({})).toEqual({
            windowMs: 60_000,
            unauthenticatedIp: 600,
            authenticatedUser: 300,
        });
    });

    it.each(["0", "-1", "1.5", "not-a-number", "1000001"])(
        "rejects invalid configured attempt bound %s",
        value => {
            expect(() => authAttemptLimits({ RATE_LIMIT_LOGIN_ACCOUNT_MAX: value })).toThrow(RangeError);
        }
    );

    it("rejects an API window shorter than one second", () => {
        expect(() => apiRateLimits({ RATE_LIMIT_API_WINDOW_MS: "999" })).toThrow(RangeError);
    });

    it("consumes both account and IP budgets and blocks without exposing an account result", async () => {
        const consume = vi
            .fn()
            .mockResolvedValueOnce({ allowed: false, count: 11, resetAt: 90_000 })
            .mockResolvedValueOnce({ allowed: true, count: 1, resetAt: 90_000 });

        const result = await checkAuthAttemptLimits("login", "  Person@Example.com ", "203.0.113.9", {
            now: 30_000,
            consume,
            env: {},
        });

        expect(consume).toHaveBeenCalledTimes(2);
        expect(consume).toHaveBeenNthCalledWith(
            1,
            "login-account",
            "person@example.com",
            10,
            900_000,
            30_000
        );
        expect(consume).toHaveBeenNthCalledWith(2, "login-ip", "203.0.113.9", 100, 900_000, 30_000);
        expect(result).toEqual({ allowed: false, retryAfterSeconds: 60 });
    });

    it("fails closed when the shared counter store is unavailable", async () => {
        const consume = vi.fn().mockRejectedValue(new Error("database unavailable"));
        await expect(
            checkAuthAttemptLimits("recovery", "person@example.com", "203.0.113.9", {
                now: 30_000,
                consume,
                env: {},
            })
        ).rejects.toThrow("database unavailable");
        expect(consume).toHaveBeenCalledTimes(2);
    });
});
