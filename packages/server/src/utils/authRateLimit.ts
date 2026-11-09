// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { randomUUID } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { getClientIP } from "./clientIp";
import { consumeRateLimit } from "./rateLimit";

export type AuthAttemptKind = "login" | "recovery" | "registration" | "email-change";
export type ApiRateLimitKind = "unauthenticated-api-ip" | "authenticated-api-user";
type AuthAttemptLimits = { account: number; ip: number };
type AuthRateLimitConfig = {
    windowMs: number;
    login: AuthAttemptLimits;
    recovery: AuthAttemptLimits;
    registration: AuthAttemptLimits;
    "email-change": AuthAttemptLimits;
};

type Counter = (
    scope: string,
    subject: string,
    limit: number,
    windowMs: number,
    now: number
) => Promise<{ allowed: boolean; count: number; resetAt: number }>;

const DEFAULT_CONFIG: AuthRateLimitConfig = {
    windowMs: 15 * 60_000,
    login: { account: 10, ip: 100 },
    recovery: { account: 5, ip: 30 },
    registration: { account: 5, ip: 30 },
    "email-change": { account: 3, ip: 10 },
};

function positiveBound(env: NodeJS.ProcessEnv, name: string, fallback: number, max: number): number {
    const raw = env[name];
    if (raw === undefined) return fallback;
    if (!/^\d+$/.test(raw.trim())) throw new RangeError(`${name} must be a positive integer`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 1 || value > max) {
        throw new RangeError(`${name} is outside the supported range`);
    }
    return value;
}

export function authAttemptLimits(env: NodeJS.ProcessEnv = process.env): AuthRateLimitConfig {
    const windowMs = positiveBound(env, "RATE_LIMIT_AUTH_WINDOW_MS", DEFAULT_CONFIG.windowMs, 86_400_000);
    if (windowMs < 1000) throw new RangeError("RATE_LIMIT_AUTH_WINDOW_MS must be at least 1000");
    return {
        windowMs,
        login: {
            account: positiveBound(env, "RATE_LIMIT_LOGIN_ACCOUNT_MAX", 10, 1_000_000),
            ip: positiveBound(env, "RATE_LIMIT_LOGIN_IP_MAX", 100, 1_000_000),
        },
        recovery: {
            account: positiveBound(env, "RATE_LIMIT_RECOVERY_ACCOUNT_MAX", 5, 1_000_000),
            ip: positiveBound(env, "RATE_LIMIT_RECOVERY_IP_MAX", 30, 1_000_000),
        },
        registration: {
            account: positiveBound(env, "RATE_LIMIT_REGISTER_ACCOUNT_MAX", 5, 1_000_000),
            ip: positiveBound(env, "RATE_LIMIT_REGISTER_IP_MAX", 30, 1_000_000),
        },
        "email-change": {
            account: positiveBound(env, "RATE_LIMIT_EMAIL_CHANGE_ACCOUNT_MAX", 3, 1_000_000),
            ip: positiveBound(env, "RATE_LIMIT_EMAIL_CHANGE_IP_MAX", 10, 1_000_000),
        },
    };
}

export function apiRateLimits(env: NodeJS.ProcessEnv = process.env) {
    const windowMs = positiveBound(env, "RATE_LIMIT_API_WINDOW_MS", 60_000, 86_400_000);
    if (windowMs < 1000) throw new RangeError("RATE_LIMIT_API_WINDOW_MS must be at least 1000");
    return {
        windowMs,
        unauthenticatedIp: positiveBound(env, "RATE_LIMIT_UNAUTH_API_IP_MAX", 600, 1_000_000),
        authenticatedUser: positiveBound(env, "RATE_LIMIT_AUTH_API_USER_MAX", 300, 1_000_000),
    };
}

// Routes import this module during boot, so invalid configured budgets fail startup.
authAttemptLimits();
apiRateLimits();

export async function checkAuthAttemptLimits(
    kind: AuthAttemptKind,
    account: string,
    ip: string,
    options: { now?: number; env?: NodeJS.ProcessEnv; consume?: Counter } = {}
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
    const config = authAttemptLimits(options.env);
    const now = options.now ?? Date.now();
    const consume = options.consume ?? consumeRateLimit;
    const normalizedAccount = account.trim().toLowerCase();
    const limits = config[kind];
    const [accountDecision, ipDecision] = await Promise.all([
        consume(`${kind}-account`, normalizedAccount, limits.account, config.windowMs, now),
        consume(`${kind}-ip`, ip, limits.ip, config.windowMs, now),
    ]);
    if (accountDecision.allowed && ipDecision.allowed) return { allowed: true };
    const resetAt = Math.max(accountDecision.resetAt, ipDecision.resetAt);
    return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
}

/** Fail-closed response for a request whose rate-limit decision could not be made. */
function respondRateLimitUnavailable(c: Context): Response {
    return c.json({ error: "Request temporarily unavailable" }, 503);
}

/** Renders a denied rate-limit decision for the window that produced `retryAfterSeconds`. */
function respondTooManyRequests(c: Context, retryAfterSeconds: number): Response {
    c.header("Retry-After", String(retryAfterSeconds));
    return c.json({ error: "Too many requests" }, 429);
}

export async function enforceAuthAttemptLimit(
    c: Context,
    kind: AuthAttemptKind,
    account: string,
    tenant?: string
): Promise<Response | undefined> {
    let ip = getClientIP(c);
    if (ip === "unknown") {
        if (process.env.NODE_ENV !== "test") {
            return respondRateLimitUnavailable(c);
        }
        // app.request has no Node socket. Keep test requests isolated; production always requires a peer IP.
        ip = `test-${randomUUID()}`;
    }
    const accountKey = kind === "registration" ? `${tenant ?? ""}:${account}` : account;
    try {
        const result = await checkAuthAttemptLimits(kind, accountKey, ip);
        if (result.allowed) return undefined;
        return respondTooManyRequests(c, result.retryAfterSeconds);
    } catch {
        return respondRateLimitUnavailable(c);
    }
}

async function resolveRateLimitIp(c: Context): Promise<string | Response> {
    let ip = getClientIP(c);
    if (ip !== "unknown") return ip;
    if (process.env.NODE_ENV === "test") return `test-${randomUUID()}`;
    return respondRateLimitUnavailable(c);
}

export async function enforceApiRateLimit(
    c: Context,
    kind: ApiRateLimitKind,
    userId?: string
): Promise<Response | undefined> {
    const config = apiRateLimits();
    const ip = await resolveRateLimitIp(c);
    if (typeof ip !== "string") return ip;
    const subject = kind === "authenticated-api-user" ? userId : ip;
    if (!subject) return respondRateLimitUnavailable(c);
    const limit = kind === "authenticated-api-user" ? config.authenticatedUser : config.unauthenticatedIp;
    try {
        const result = await consumeRateLimit(kind, subject, limit, config.windowMs);
        if (result.allowed) return undefined;
        return respondTooManyRequests(c, Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)));
    } catch {
        return respondRateLimitUnavailable(c);
    }
}

export const unauthenticatedApiRateLimit: MiddlewareHandler = async (c, next) => {
    const limited = await enforceApiRateLimit(c, "unauthenticated-api-ip");
    if (limited) return limited;
    await next();
};

export const authenticatedApiRateLimit: MiddlewareHandler = async (c, next) => {
    const limited = await enforceApiRateLimit(c, "authenticated-api-user", c.get("userId"));
    if (limited) return limited;
    await next();
};
