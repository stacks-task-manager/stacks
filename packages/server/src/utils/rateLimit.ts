// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { createHmac, randomUUID } from "node:crypto";
import { sequelize } from "@stacks/db";
import { getCookieSecret } from "../config/secrets";

const COUNTER_RETENTION_WINDOWS = 2;

export type RateLimitLease = { id: string; expiresAt: number };

export type RateLimitDecision = { allowed: boolean; count: number; resetAt: number };

export function rateLimitWindowStart(now: number, windowMs: number): number {
    if (!Number.isSafeInteger(now) || now < 0) throw new RangeError("Invalid rate limit time");
    if (!Number.isSafeInteger(windowMs) || windowMs <= 0) throw new RangeError("Invalid rate limit window");
    return Math.floor(now / windowMs) * windowMs;
}

/** HMAC keeps account identifiers and IP addresses out of the database. */
export function rateLimitKeyHash(scope: string, subject: string, secret = getCookieSecret()): string {
    if (!scope || !subject || !secret) throw new Error("Rate limit scope, subject, and secret are required");
    return createHmac("sha256", secret).update(`stacks-rate-limit-v1\0${scope}\0${subject}`).digest("hex");
}

/** One atomic UPSERT serializes increments across processes and server instances. */
export async function consumeRateLimit(
    scope: string,
    subject: string,
    limit: number,
    windowMs: number,
    now = Date.now()
): Promise<RateLimitDecision> {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("Invalid rate limit count");
    const windowStart = rateLimitWindowStart(now, windowMs);
    const resetAt = windowStart + windowMs;
    const keyHash = rateLimitKeyHash(scope, subject);
    const [rows] = await sequelize.query(
        `INSERT INTO "rate_limit_counters" ("keyHash", "windowStart", "hits", "expiresAt")
         VALUES (:keyHash, :windowStart, 1, :expiresAt)
         ON CONFLICT ("keyHash", "windowStart") DO UPDATE
         SET "hits" = "rate_limit_counters"."hits" + 1
         RETURNING "hits"`,
        {
            replacements: {
                keyHash,
                windowStart,
                expiresAt: new Date(windowStart + windowMs * COUNTER_RETENTION_WINDOWS),
            },
        }
    );
    const count = Number((rows as Array<{ hits: number }>)[0]?.hits);
    if (!Number.isSafeInteger(count) || count < 1)
        throw new Error("Rate limit counter did not return a valid count");
    return { allowed: count <= limit, count, resetAt };
}

/** Delete a bounded batch so cleanup cannot monopolize a database connection. */
export async function deleteExpiredRateLimitCounters(now = Date.now(), batchSize = 1000): Promise<number> {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 10_000) {
        throw new RangeError("Invalid rate limit cleanup batch size");
    }
    const [rows] = await sequelize.query(
        `WITH expired AS (
            SELECT "keyHash", "windowStart" FROM "rate_limit_counters"
            WHERE "expiresAt" <= :now ORDER BY "expiresAt" LIMIT :batchSize
         )
         DELETE FROM "rate_limit_counters" AS counters
         USING expired
         WHERE counters."keyHash" = expired."keyHash" AND counters."windowStart" = expired."windowStart"
         RETURNING 1`,
        { replacements: { now: new Date(now), batchSize } }
    );
    return (rows as unknown[]).length;
}

/** Atomically reserve a shared active-work slot; return undefined at capacity. */
export async function acquireRateLimitLease(
    scope: string,
    subject: string,
    limit: number,
    ttlMs: number,
    now = Date.now()
): Promise<RateLimitLease | undefined> {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("Invalid lease capacity");
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 1000 || ttlMs > 86_400_000) {
        throw new RangeError("Invalid rate limit lease lifetime");
    }
    const keyHash = rateLimitKeyHash(scope, subject);
    const transaction = await sequelize.transaction();
    let transactionOpen = true;
    try {
        await sequelize.query("SELECT pg_advisory_xact_lock(hashtextextended(:keyHash, 0))", {
            replacements: { keyHash },
            transaction,
        });
        await sequelize.query(
            'DELETE FROM "rate_limit_leases" WHERE "keyHash" = :keyHash AND "expiresAt" <= :now',
            { replacements: { keyHash, now: new Date(now) }, transaction }
        );
        const [rows] = await sequelize.query(
            'SELECT COUNT(*)::int AS "activeCount" FROM "rate_limit_leases" WHERE "keyHash" = :keyHash AND "expiresAt" > :now',
            { replacements: { keyHash, now: new Date(now) }, transaction }
        );
        const activeCount = Number((rows as Array<{ activeCount: number }>)[0]?.activeCount);
        if (!Number.isSafeInteger(activeCount) || activeCount < 0) {
            throw new Error("Rate limit lease count is invalid");
        }
        if (activeCount >= limit) {
            await transaction.rollback();
            transactionOpen = false;
            return undefined;
        }

        const id = randomUUID();
        const expiresAt = now + ttlMs;
        await sequelize.query(
            'INSERT INTO "rate_limit_leases" ("id", "keyHash", "expiresAt") VALUES (:id, :keyHash, :expiresAt)',
            { replacements: { id, keyHash, expiresAt: new Date(expiresAt) }, transaction }
        );
        await transaction.commit();
        transactionOpen = false;
        return { id, expiresAt };
    } catch (error) {
        if (transactionOpen) await transaction.rollback();
        throw error;
    }
}

export async function releaseRateLimitLease(id: string): Promise<void> {
    await sequelize.query('DELETE FROM "rate_limit_leases" WHERE "id" = :id', {
        replacements: { id },
    });
}

export async function renewRateLimitLease(id: string, ttlMs: number, now = Date.now()): Promise<boolean> {
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 1000 || ttlMs > 86_400_000) {
        throw new RangeError("Invalid rate limit lease lifetime");
    }
    const [rows] = await sequelize.query(
        'UPDATE "rate_limit_leases" SET "expiresAt" = :expiresAt WHERE "id" = :id AND "expiresAt" > :now RETURNING "id"',
        { replacements: { id, now: new Date(now), expiresAt: new Date(now + ttlMs) } }
    );
    return (rows as unknown[]).length === 1;
}

export async function deleteExpiredRateLimitLeases(now = Date.now(), batchSize = 1000): Promise<number> {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 10_000) {
        throw new RangeError("Invalid rate limit cleanup batch size");
    }
    const [rows] = await sequelize.query(
        `WITH expired AS (
            SELECT "id" FROM "rate_limit_leases"
            WHERE "expiresAt" <= :now ORDER BY "expiresAt" LIMIT :batchSize
         )
         DELETE FROM "rate_limit_leases" AS leases
         USING expired
         WHERE leases."id" = expired."id"
         RETURNING 1`,
        { replacements: { now: new Date(now), batchSize } }
    );
    return (rows as unknown[]).length;
}

/** Start bounded periodic cleanup after the DB connection and schema are ready. */
export function startRateLimitCounterCleanup(
    cleanup: () => Promise<number> = async () => {
        const [counterCount, leaseCount] = await Promise.all([
            deleteExpiredRateLimitCounters(),
            deleteExpiredRateLimitLeases(),
        ]);
        return counterCount + leaseCount;
    }
): ReturnType<typeof setInterval> {
    const run = () => {
        void cleanup().catch(() => {
            console.error("Rate-limit counter cleanup failed");
        });
    };
    run();
    const timer = setInterval(run, 60_000);
    timer.unref?.();
    return timer;
}
