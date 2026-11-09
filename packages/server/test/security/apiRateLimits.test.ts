// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it } from "vitest";
import { RateLimitCounterEntity, SessionEntity, UserEntity } from "@stacks/db";
import { getCookieSecret } from "../../src/config/secrets";
import app from "../../src/index";
import { rateLimitKeyHash } from "../../src/utils/rateLimit";
import { issueSession } from "../../src/services/sessions";

const ip = "203.0.113.66";
const key = rateLimitKeyHash("unauthenticated-api-ip", ip, getCookieSecret());
const originalLimit = process.env.RATE_LIMIT_UNAUTH_API_IP_MAX;
const originalUserLimit = process.env.RATE_LIMIT_AUTH_API_USER_MAX;
const userKeys: string[] = [];
let sessionId: string | undefined;

afterEach(async () => {
    if (originalLimit === undefined) delete process.env.RATE_LIMIT_UNAUTH_API_IP_MAX;
    else process.env.RATE_LIMIT_UNAUTH_API_IP_MAX = originalLimit;
    if (originalUserLimit === undefined) delete process.env.RATE_LIMIT_AUTH_API_USER_MAX;
    else process.env.RATE_LIMIT_AUTH_API_USER_MAX = originalUserLimit;
    await RateLimitCounterEntity.destroy({ where: { keyHash: [key, ...userKeys] } });
    userKeys.length = 0;
    if (sessionId) await SessionEntity.destroy({ where: { id: sessionId }, force: true });
    sessionId = undefined;
});

describe("unauthenticated API rate limit", () => {
    it("limits public API requests by the direct peer IP", async () => {
        process.env.RATE_LIMIT_UNAUTH_API_IP_MAX = "1";
        const request = () => app.request("/api/info", {}, { incoming: { socket: { remoteAddress: ip } } });

        expect((await request()).status).toBe(200);
        const limited = await request();

        expect(limited.status).toBe(429);
        expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
        expect(await limited.json()).toEqual({ error: "Too many requests" });
    });

    it("limits authenticated API requests by resolved user ID", async () => {
        process.env.RATE_LIMIT_AUTH_API_USER_MAX = "1";
        const user = await UserEntity.findOne({ where: { email: "cris@stacks.rocks" } });
        expect(user).not.toBeNull();
        const userId = String(user!.get("id"));
        const { sid, token } = await issueSession(userId, String(user!.get("tenant")));
        sessionId = sid;
        userKeys.push(rateLimitKeyHash("authenticated-api-user", userId, getCookieSecret()));
        const request = () =>
            app.request(
                "/api/boot",
                { headers: { Authorization: `Bearer ${token}` } },
                { incoming: { socket: { remoteAddress: ip } } }
            );

        expect((await request()).status).toBe(200);
        const limited = await request();

        expect(limited.status).toBe(429);
        expect(await limited.json()).toEqual({ error: "Too many requests" });
    });
});
