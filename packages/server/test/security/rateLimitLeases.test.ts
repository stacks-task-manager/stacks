// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import { sequelize } from "@stacks/db";
import { getCookieSecret } from "../../src/config/secrets";
import {
    acquireRateLimitLease,
    deleteExpiredRateLimitLeases,
    releaseRateLimitLease,
    rateLimitKeyHash,
} from "../../src/utils/rateLimit";

const secret = "rate-limit-lease-test-secret";
const originalSecret = process.env.COOKIE_SECRET;
const leases: string[] = [];
const keys = new Set<string>();

afterEach(async () => {
    if (originalSecret === undefined) delete process.env.COOKIE_SECRET;
    else process.env.COOKIE_SECRET = originalSecret;
    if (leases.length > 0) {
        for (const id of leases.splice(0)) await releaseRateLimitLease(id);
    }
    if (keys.size > 0) {
        await sequelize
            .query('DELETE FROM "rate_limit_leases" WHERE "keyHash" IN (:keys)', {
                replacements: { keys: [...keys] },
            })
            .catch(() => undefined);
        keys.clear();
    }
});

describe("shared PostgreSQL rate-limit leases", () => {
    it("enforces a concurrent capacity across callers and releases a lease", async () => {
        process.env.COOKIE_SECRET = secret;
        const scope = "fixture-ai-concurrency";
        const subject = crypto.randomUUID();
        keys.add(rateLimitKeyHash(scope, subject, secret));
        const acquired = await Promise.all(
            Array.from({ length: 8 }, () => acquireRateLimitLease(scope, subject, 2, 60_000, 100_000))
        );
        const held = acquired.filter((lease): lease is NonNullable<typeof lease> => lease !== undefined);
        leases.push(...held.map(lease => lease.id));

        expect(held).toHaveLength(2);
        await releaseRateLimitLease(held[0].id);
        leases.splice(leases.indexOf(held[0].id), 1);
        const replacement = await acquireRateLimitLease(scope, subject, 2, 60_000, 100_001);
        expect(replacement).toBeDefined();
        if (replacement) leases.push(replacement.id);
    });

    it("reclaims expired leases before enforcing the active limit", async () => {
        process.env.COOKIE_SECRET = secret;
        const scope = "fixture-expiring-lease";
        const subject = crypto.randomUUID();
        keys.add(rateLimitKeyHash(scope, subject, secret));

        const first = await acquireRateLimitLease(scope, subject, 1, 1000, 200_000);
        expect(first).toBeDefined();
        if (first) leases.push(first.id);
        const replacement = await acquireRateLimitLease(scope, subject, 1, 1000, 201_000);
        expect(replacement).toBeDefined();
        if (replacement) leases.push(replacement.id);
    });

    it("deletes expired lease rows in bounded cleanup", async () => {
        process.env.COOKIE_SECRET = secret;
        const scope = "fixture-cleanup-expired-lease";
        const subject = crypto.randomUUID();
        keys.add(rateLimitKeyHash(scope, subject, secret));
        const lease = await acquireRateLimitLease(scope, subject, 1, 1000, 300_000);
        expect(lease).toBeDefined();
        if (lease) leases.push(lease.id);

        expect(await deleteExpiredRateLimitLeases(301_000, 1)).toBe(1);
        if (lease) leases.splice(leases.indexOf(lease.id), 1);
    });
});
