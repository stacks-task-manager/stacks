// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import { RateLimitCounterEntity } from "@stacks/db";
import {
    consumeRateLimit,
    deleteExpiredRateLimitCounters,
    rateLimitKeyHash,
} from "../../src/utils/rateLimit";

const originalSecret = process.env.COOKIE_SECRET;
const secret = "rate-limit-test-secret-with-enough-entropy";
const subjects: Array<{ scope: string; subject: string }> = [];

afterEach(async () => {
    if (originalSecret === undefined) delete process.env.COOKIE_SECRET;
    else process.env.COOKIE_SECRET = originalSecret;
    for (const { scope, subject } of subjects.splice(0)) {
        await RateLimitCounterEntity.destroy({
            where: { keyHash: rateLimitKeyHash(scope, subject, secret) },
        });
    }
});

describe("shared PostgreSQL rate limit counters", () => {
    it("serializes concurrent increments and shares the budget across callers", async () => {
        process.env.COOKIE_SECRET = secret;
        const subject = `fixture-${crypto.randomUUID()}@example.test`;
        const scope = "integration-login-account";
        subjects.push({ scope, subject });
        const now = 1_800_000_000_000;

        const decisions = await Promise.all(
            Array.from({ length: 24 }, () => consumeRateLimit(scope, subject, 10, 60_000, now))
        );

        expect(decisions.map(decision => decision.count).sort((a, b) => a - b)).toEqual(
            Array.from({ length: 24 }, (_, index) => index + 1)
        );
        expect(decisions.filter(decision => decision.allowed)).toHaveLength(10);
        expect(decisions.every(decision => decision.resetAt === now + 60_000)).toBe(true);
        const nextWindow = await consumeRateLimit(scope, subject, 10, 60_000, now + 60_000);
        expect(nextWindow).toMatchObject({ allowed: true, count: 1, resetAt: now + 120_000 });
    });

    it("expires counters after the retention period and bounds each cleanup batch", async () => {
        process.env.COOKIE_SECRET = secret;
        const subject = `cleanup-${crypto.randomUUID()}`;
        const scope = "integration-cleanup";
        subjects.push({ scope, subject });
        const created = await consumeRateLimit(scope, subject, 1, 1000, 100_000);
        const hash = rateLimitKeyHash(scope, subject, secret);
        const counter = await RateLimitCounterEntity.findOne({ where: { keyHash: hash } });
        expect(counter?.get("expiresAt")).toEqual(new Date(102_000));
        await RateLimitCounterEntity.update(
            { expiresAt: new Date(99_999) },
            { where: { keyHash: hash, windowStart: created.resetAt - 1000 } }
        );

        await expect(deleteExpiredRateLimitCounters(100_000, 0)).rejects.toThrow(RangeError);
        await expect(deleteExpiredRateLimitCounters(100_000, 1)).resolves.toBe(1);
        await expect(RateLimitCounterEntity.count({ where: { keyHash: hash } })).resolves.toBe(0);
    });
});
